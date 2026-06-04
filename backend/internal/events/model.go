package events

import "time"

// RegistrationStatus maps to registration_status_enum in Postgres.
type RegistrationStatus string

const (
	StatusConfirmed  RegistrationStatus = "confirmed"
	StatusWaitlisted RegistrationStatus = "waitlisted"
	StatusCancelled  RegistrationStatus = "cancelled"
)

// Event represents a row in the events table.
type Event struct {
	ID                string     `json:"id"`
	OrganizerID       string     `json:"organizer_id"`
	OrganizerName     string     `json:"organizer_name"`   // joined from users.full_name
	OrganizerAvatar   *string    `json:"organizer_avatar"` // joined from users.avatar_url
	Title             string     `json:"title"`
	Description       *string    `json:"description"`
	Location          *string    `json:"location"`
	EventDate         time.Time  `json:"event_date"`
	BannerURL         *string    `json:"banner_url"`
	MaxCapacity       *int       `json:"max_capacity"`      // nil = unlimited
	IsOnline          bool       `json:"is_online"`
	MeetLink          *string    `json:"meet_link"`
	RegistrationCount int        `json:"registration_count"` // COUNT from event_registrations
	IsRegistered      bool       `json:"is_registered"`      // populated per-caller in handler
	CreatedAt         time.Time  `json:"created_at"`
}

// Registration represents a row in the event_registrations table.
type Registration struct {
	UserID       string             `json:"user_id"`
	EventID      string             `json:"event_id"`
	Status       RegistrationStatus `json:"status"`
	RegisteredAt time.Time          `json:"registered_at"`
}
