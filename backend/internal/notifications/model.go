package notifications

import "time"

// Notification represents a row in the notifications table.
type Notification struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	ActorID    *string   `json:"actor_id"`
	ActorName  *string   `json:"actor_name"` // joined from users.full_name
	Type       string    `json:"type"`        // like | comment | follow | group_join | event | message
	EntityID   *string   `json:"entity_id"`
	EntityType *string   `json:"entity_type"` // post | comment | group | event | message
	Message    *string   `json:"message"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}
