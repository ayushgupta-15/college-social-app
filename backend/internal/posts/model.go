package posts

import "time"

// PostType maps to the post_type_enum in Postgres.
type PostType string

const (
	PostTypeGeneral      PostType = "general"
	PostTypeOpportunity  PostType = "opportunity"
	PostTypeAnnouncement PostType = "announcement"
)

// Post represents a row in the posts table, with the author's username joined in.
type Post struct {
	ID           string    `json:"id"`
	AuthorID     string    `json:"author_id"`
	AuthorName   string    `json:"author_name"`   // joined from users.full_name
	AuthorAvatar *string   `json:"author_avatar"` // joined from users.avatar_url
	Content      string    `json:"content"`
	MediaURL     *string   `json:"media_url"`
	PostType     PostType  `json:"post_type"`
	LikeCount    int       `json:"like_count"`
	LikedByMe    bool      `json:"liked_by_me"` // populated by handler when caller UID is known
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Comment represents a row in the comments table.
type Comment struct {
	ID           string    `json:"id"`
	PostID       string    `json:"post_id"`
	AuthorID     string    `json:"author_id"`
	AuthorName   string    `json:"author_name"`
	AuthorAvatar *string   `json:"author_avatar"`
	Content      string    `json:"content"`
	CreatedAt    time.Time `json:"created_at"`
}

// FeedResponse wraps a page of posts with a cursor for the next page.
type FeedResponse struct {
	Posts      []*Post `json:"posts"`
	NextCursor *string `json:"next_cursor"` // RFC3339 timestamp of the last post; nil = no more pages
}
