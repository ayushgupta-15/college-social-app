package users

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("user not found")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// scanUser is a shared helper to scan a full user row into a User struct.
func scanUser(row interface {
	Scan(...any) error
}) (*User, error) {
	var u User
	var bio, avatarURL, college, major sql.NullString
	var gradYear sql.NullInt16

	err := row.Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.Username, &u.FullName,
		&bio, &avatarURL, &college, &major, &gradYear,
		&u.IsOpenToReferral, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	u.Bio = NullableString(bio)
	u.AvatarURL = NullableString(avatarURL)
	u.College = NullableString(college)
	u.Major = NullableString(major)
	u.GradYear = NullableInt16(gradYear)

	return &u, nil
}

const selectUserCols = `
	SELECT id, firebase_uid, email, username, full_name,
	       bio, avatar_url, college, major, grad_year,
	       is_open_to_referral, created_at, updated_at
	FROM users`

// GetByFirebaseUID fetches a user by their Firebase UID.
func (r *Repository) GetByFirebaseUID(ctx context.Context, firebaseUID string) (*User, error) {
	row := r.db.QueryRowContext(ctx, selectUserCols+` WHERE firebase_uid = $1`, firebaseUID)
	u, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("GetByFirebaseUID: %w", err)
	}
	return u, nil
}

// GetByID fetches a user by their UUID (public profile lookup).
func (r *Repository) GetByID(ctx context.Context, id string) (*User, error) {
	row := r.db.QueryRowContext(ctx, selectUserCols+` WHERE id = $1`, id)
	u, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return u, nil
}

// ExistsByUsername checks if a username is already taken.
func (r *Repository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM users WHERE username = $1`, username,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("ExistsByUsername: %w", err)
	}
	return count > 0, nil
}

// Create inserts a new user and returns the created record.
func (r *Repository) Create(ctx context.Context, params CreateUserParams) (*User, error) {
	query := `
		INSERT INTO users (firebase_uid, email, username, full_name)
		VALUES ($1, $2, $3, $4)
		RETURNING id, firebase_uid, email, username, full_name,
		          bio, avatar_url, college, major, grad_year,
		          is_open_to_referral, created_at, updated_at
	`
	row := r.db.QueryRowContext(ctx, query,
		params.FirebaseUID, params.Email, params.Username, params.FullName,
	)
	u, err := scanUser(row)
	if err != nil {
		return nil, fmt.Errorf("Create user: %w", err)
	}
	return u, nil
}

// Update applies a partial update to the authenticated user's own profile.
func (r *Repository) Update(ctx context.Context, id string, params UpdateUserParams) (*User, error) {
	query := `
		UPDATE users SET
		    bio                 = COALESCE($2, bio),
		    avatar_url          = COALESCE($3, avatar_url),
		    college             = COALESCE($4, college),
		    major               = COALESCE($5, major),
		    grad_year           = COALESCE($6, grad_year),
		    is_open_to_referral = COALESCE($7, is_open_to_referral),
		    full_name           = COALESCE($8, full_name)
		WHERE id = $1
		RETURNING id, firebase_uid, email, username, full_name,
		          bio, avatar_url, college, major, grad_year,
		          is_open_to_referral, created_at, updated_at
	`
	row := r.db.QueryRowContext(ctx, query,
		id,
		params.Bio,
		params.AvatarURL,
		params.College,
		params.Major,
		params.GradYear,
		params.IsOpenToReferral,
		params.FullName,
	)
	u, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("Update user: %w", err)
	}
	return u, nil
}

// UpdateFcmToken stores or clears the user's FCM device token.
// Called from PATCH /users/me when the mobile client sends its Expo push token.
func (r *Repository) UpdateFcmToken(ctx context.Context, userID, token string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET fcm_token = $2 WHERE id = $1`, userID, token,
	)
	if err != nil {
		return fmt.Errorf("UpdateFcmToken: %w", err)
	}
	return nil
}

// Follow inserts a follower → following relationship.
func (r *Repository) Follow(ctx context.Context, followerID, followingID string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO follows (follower_id, following_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, followerID, followingID)
	if err != nil {
		return fmt.Errorf("Follow: %w", err)
	}
	return nil
}

// Unfollow removes a follower → following relationship.
func (r *Repository) Unfollow(ctx context.Context, followerID, followingID string) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM follows WHERE follower_id = $1 AND following_id = $2
	`, followerID, followingID)
	if err != nil {
		return fmt.Errorf("Unfollow: %w", err)
	}
	return nil
}

// GetFollowers returns all users who follow the given user.
func (r *Repository) GetFollowers(ctx context.Context, userID string) ([]*User, error) {
	query := selectUserCols + `
		INNER JOIN follows ON users.id = follows.follower_id
		WHERE follows.following_id = $1
		ORDER BY follows.created_at DESC
	`
	return r.queryUsers(ctx, query, userID)
}

// GetFollowing returns all users the given user follows.
func (r *Repository) GetFollowing(ctx context.Context, userID string) ([]*User, error) {
	query := selectUserCols + `
		INNER JOIN follows ON users.id = follows.following_id
		WHERE follows.follower_id = $1
		ORDER BY follows.created_at DESC
	`
	return r.queryUsers(ctx, query, userID)
}

// queryUsers is a shared helper for list queries.
func (r *Repository) queryUsers(ctx context.Context, query, arg string) ([]*User, error) {
	rows, err := r.db.QueryContext(ctx, query, arg)
	if err != nil {
		return nil, fmt.Errorf("queryUsers: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("queryUsers scan: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// ── Params ────────────────────────────────────────────────────────────────────

type CreateUserParams struct {
	FirebaseUID string
	Email       string
	Username    string
	FullName    string
}

// UpdateUserParams uses pointers so PATCH can distinguish "not provided" from zero value.
type UpdateUserParams struct {
	FullName         *string
	Bio              *string
	AvatarURL        *string
	College          *string
	Major            *string
	GradYear         *int16
	IsOpenToReferral *bool
}

