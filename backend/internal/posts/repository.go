package posts

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var ErrNotFound = errors.New("post not found")
var ErrForbidden = errors.New("you are not the author of this post")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ── shared scan helpers ───────────────────────────────────────────────────────

func scanPost(row interface{ Scan(...any) error }) (*Post, error) {
	var p Post
	var mediaURL sql.NullString
	var authorAvatar sql.NullString

	err := row.Scan(
		&p.ID, &p.AuthorID, &p.AuthorName, &authorAvatar,
		&p.Content, &mediaURL, &p.PostType,
		&p.LikeCount, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if mediaURL.Valid {
		p.MediaURL = &mediaURL.String
	}
	if authorAvatar.Valid {
		p.AuthorAvatar = &authorAvatar.String
	}
	return &p, nil
}

// selectPostCols includes a JOIN to pull the author's display name and avatar.
const selectPostCols = `
	SELECT p.id, p.author_id, u.full_name, u.avatar_url,
	       p.content, p.media_url, p.post_type,
	       p.like_count, p.created_at, p.updated_at
	FROM posts p
	JOIN users u ON u.id = p.author_id`

// ── GetFeed ───────────────────────────────────────────────────────────────────

type GetFeedParams struct {
	Before   *time.Time // cursor — fetch posts older than this timestamp
	PostType *PostType  // optional filter
	Limit    int        // max rows to return (capped at 50)
}

// GetFeed returns a cursor-paginated slice of posts.
func (r *Repository) GetFeed(ctx context.Context, p GetFeedParams) ([]*Post, error) {
	if p.Limit <= 0 || p.Limit > 50 {
		p.Limit = 20
	}

	// Build query dynamically based on optional filters
	query := selectPostCols + ` WHERE 1=1`
	args := []any{}
	argN := 1

	if p.Before != nil {
		query += fmt.Sprintf(` AND p.created_at < $%d`, argN)
		args = append(args, *p.Before)
		argN++
	}
	if p.PostType != nil {
		query += fmt.Sprintf(` AND p.post_type = $%d`, argN)
		args = append(args, string(*p.PostType))
		argN++
	}

	query += fmt.Sprintf(` ORDER BY p.created_at DESC LIMIT $%d`, argN)
	args = append(args, p.Limit)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("GetFeed: %w", err)
	}
	defer rows.Close()

	var posts []*Post
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, fmt.Errorf("GetFeed scan: %w", err)
		}
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func (r *Repository) GetByID(ctx context.Context, id string) (*Post, error) {
	row := r.db.QueryRowContext(ctx, selectPostCols+` WHERE p.id = $1`, id)
	post, err := scanPost(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return post, nil
}

// ── Create ────────────────────────────────────────────────────────────────────

type CreatePostParams struct {
	AuthorID string
	Content  string
	MediaURL *string
	PostType PostType
}

func (r *Repository) Create(ctx context.Context, p CreatePostParams) (*Post, error) {
	query := `
		INSERT INTO posts (author_id, content, media_url, post_type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, author_id, content, media_url, post_type, like_count, created_at, updated_at
	`
	// We need the author's name, so fetch post then re-query with JOIN
	var id string
	err := r.db.QueryRowContext(ctx, query,
		p.AuthorID, p.Content, p.MediaURL, string(p.PostType),
	).Scan(&id, new(string), new(string), new(sql.NullString),
		new(string), new(sql.NullInt64), new(time.Time), new(time.Time))
	if err != nil {
		return nil, fmt.Errorf("Create post: %w", err)
	}
	return r.GetByID(ctx, id)
}

// ── Delete ────────────────────────────────────────────────────────────────────

// Delete removes a post. Returns ErrForbidden if callerID does not own it.
func (r *Repository) Delete(ctx context.Context, id, callerID string) error {
	post, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if post.AuthorID != callerID {
		return ErrForbidden
	}

	_, err = r.db.ExecContext(ctx, `DELETE FROM posts WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete post: %w", err)
	}
	return nil
}

// ── ToggleLike ────────────────────────────────────────────────────────────────

// ToggleLike inserts or deletes a post_like row.
// The DB trigger keeps posts.like_count in sync automatically.
// Returns true if the post is now liked, false if unliked.
func (r *Repository) ToggleLike(ctx context.Context, postID, userID string) (bool, error) {
	// Check if already liked
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM post_likes WHERE post_id = $1 AND user_id = $2`,
		postID, userID,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("ToggleLike check: %w", err)
	}

	if count > 0 {
		// Unlike
		_, err = r.db.ExecContext(ctx,
			`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
			postID, userID,
		)
		return false, err
	}

	// Like
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		postID, userID,
	)
	return true, err
}

// IsLikedBy returns whether the given user has liked the post.
func (r *Repository) IsLikedBy(ctx context.Context, postID, userID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM post_likes WHERE post_id = $1 AND user_id = $2`,
		postID, userID,
	).Scan(&count)
	return count > 0, err
}

// ── Comments ──────────────────────────────────────────────────────────────────

func scanComment(row interface{ Scan(...any) error }) (*Comment, error) {
	var c Comment
	var authorAvatar sql.NullString

	err := row.Scan(
		&c.ID, &c.PostID, &c.AuthorID, &c.AuthorName, &authorAvatar,
		&c.Content, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if authorAvatar.Valid {
		c.AuthorAvatar = &authorAvatar.String
	}
	return &c, nil
}

const selectCommentCols = `
	SELECT c.id, c.post_id, c.author_id, u.full_name, u.avatar_url,
	       c.content, c.created_at
	FROM comments c
	JOIN users u ON u.id = c.author_id`

// GetComments returns all comments for a post in chronological order.
func (r *Repository) GetComments(ctx context.Context, postID string) ([]*Comment, error) {
	rows, err := r.db.QueryContext(ctx,
		selectCommentCols+` WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
		postID,
	)
	if err != nil {
		return nil, fmt.Errorf("GetComments: %w", err)
	}
	defer rows.Close()

	var comments []*Comment
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, fmt.Errorf("GetComments scan: %w", err)
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

// AddComment inserts a comment and returns it with the author joined.
func (r *Repository) AddComment(ctx context.Context, postID, authorID, content string) (*Comment, error) {
	var id string
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING id`,
		postID, authorID, content,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("AddComment: %w", err)
	}

	row := r.db.QueryRowContext(ctx, selectCommentCols+` WHERE c.id = $1`, id)
	return scanComment(row)
}
