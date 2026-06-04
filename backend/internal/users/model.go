package users

import (
	"database/sql"
	"time"
)

// User represents a row in the users table.
type User struct {
	ID                uuid      `json:"id"`
	FirebaseUID       string    `json:"firebase_uid,omitempty"`
	Email             string    `json:"email"`
	Username          string    `json:"username"`
	FullName          string    `json:"full_name"`
	Bio               *string   `json:"bio"`
	AvatarURL         *string   `json:"avatar_url"`
	College           *string   `json:"college"`
	Major             *string   `json:"major"`
	GradYear          *int16    `json:"grad_year"`
	IsOpenToReferral  bool      `json:"is_open_to_referral"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// uuid is an alias kept simple; we store/read as string from Postgres.
type uuid = string

// NullableString scans a sql.NullString into *string.
func NullableString(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}

// NullableInt16 scans a sql.NullInt16 into *int16.
func NullableInt16(ni sql.NullInt16) *int16 {
	if !ni.Valid {
		return nil
	}
	return &ni.Int16
}
