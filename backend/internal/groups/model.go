package groups

import "time"

// MemberRole maps to group_role_enum in Postgres.
type MemberRole string

const (
	RoleAdmin     MemberRole = "admin"
	RoleModerator MemberRole = "moderator"
	RoleMember    MemberRole = "member"
)

// Group represents a row in the groups table.
type Group struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Subject     *string   `json:"subject"`
	AdminID     string    `json:"admin_id"`
	AdminName   string    `json:"admin_name"`   // joined from users.full_name
	AvatarURL   *string   `json:"avatar_url"`
	IsPrivate   bool      `json:"is_private"`
	MemberCount int       `json:"member_count"` // COUNT from group_memberships
	IsMember    bool      `json:"is_member"`    // populated per-caller in handler
	CreatedAt   time.Time `json:"created_at"`
}

// Member is a group_memberships row with user details joined.
type Member struct {
	UserID     string     `json:"user_id"`
	Username   string     `json:"username"`
	FullName   string     `json:"full_name"`
	AvatarURL  *string    `json:"avatar_url"`
	Role       MemberRole `json:"role"`
	JoinedAt   time.Time  `json:"joined_at"`
}
