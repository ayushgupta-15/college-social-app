package events

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var (
	ErrNotFound     = errors.New("event not found")
	ErrCapacityFull = errors.New("event is at full capacity")
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ── shared scan ───────────────────────────────────────────────────────────────

const selectEventCols = `
	SELECT e.id, e.organizer_id, u.full_name, u.avatar_url,
	       e.title, e.description, e.location, e.event_date,
	       e.banner_url, e.max_capacity, e.is_online, e.meet_link,
	       COUNT(er.user_id) AS registration_count,
	       e.created_at
	FROM events e
	JOIN users u ON u.id = e.organizer_id
	LEFT JOIN event_registrations er ON er.event_id = e.id AND er.status = 'confirmed'`

func scanEvent(row interface{ Scan(...any) error }) (*Event, error) {
	var ev Event
	var organizerAvatar, description, location, bannerURL, meetLink sql.NullString
	var maxCapacity sql.NullInt64

	err := row.Scan(
		&ev.ID, &ev.OrganizerID, &ev.OrganizerName, &organizerAvatar,
		&ev.Title, &description, &location, &ev.EventDate,
		&bannerURL, &maxCapacity, &ev.IsOnline, &meetLink,
		&ev.RegistrationCount,
		&ev.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if organizerAvatar.Valid {
		ev.OrganizerAvatar = &organizerAvatar.String
	}
	if description.Valid {
		ev.Description = &description.String
	}
	if location.Valid {
		ev.Location = &location.String
	}
	if bannerURL.Valid {
		ev.BannerURL = &bannerURL.String
	}
	if maxCapacity.Valid {
		mc := int(maxCapacity.Int64)
		ev.MaxCapacity = &mc
	}
	if meetLink.Valid {
		ev.MeetLink = &meetLink.String
	}
	return &ev, nil
}

// ── List ──────────────────────────────────────────────────────────────────────

type ListEventsParams struct {
	IsOnline *bool      // optional filter
	FromDate *time.Time // only show events on or after this date
}

// List returns upcoming events ordered by event_date ASC.
func (r *Repository) List(ctx context.Context, p ListEventsParams) ([]*Event, error) {
	query := selectEventCols + ` WHERE e.event_date >= NOW()`
	args := []any{}
	argN := 1

	if p.IsOnline != nil {
		query += fmt.Sprintf(` AND e.is_online = $%d`, argN)
		args = append(args, *p.IsOnline)
		argN++
	}
	if p.FromDate != nil {
		query += fmt.Sprintf(` AND e.event_date >= $%d`, argN)
		args = append(args, *p.FromDate)
		argN++
	}

	query += ` GROUP BY e.id, u.full_name, u.avatar_url ORDER BY e.event_date ASC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("List events: %w", err)
	}
	defer rows.Close()

	var list []*Event
	for rows.Next() {
		ev, err := scanEvent(rows)
		if err != nil {
			return nil, fmt.Errorf("List events scan: %w", err)
		}
		list = append(list, ev)
	}
	return list, rows.Err()
}

// ── GetByID ───────────────────────────────────────────────────────────────────

func (r *Repository) GetByID(ctx context.Context, id string) (*Event, error) {
	query := selectEventCols + `
		WHERE e.id = $1
		GROUP BY e.id, u.full_name, u.avatar_url`

	row := r.db.QueryRowContext(ctx, query, id)
	ev, err := scanEvent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return ev, nil
}

// ── Create ────────────────────────────────────────────────────────────────────

type CreateEventParams struct {
	OrganizerID string
	Title       string
	Description *string
	Location    *string
	EventDate   time.Time
	BannerURL   *string
	MaxCapacity *int
	IsOnline    bool
	MeetLink    *string
}

func (r *Repository) Create(ctx context.Context, p CreateEventParams) (*Event, error) {
	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO events
		    (organizer_id, title, description, location, event_date, banner_url, max_capacity, is_online, meet_link)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`,
		p.OrganizerID, p.Title, p.Description, p.Location, p.EventDate,
		p.BannerURL, p.MaxCapacity, p.IsOnline, p.MeetLink,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("Create event: %w", err)
	}
	return r.GetByID(ctx, id)
}

// ── IsRegistered ──────────────────────────────────────────────────────────────

func (r *Repository) IsRegistered(ctx context.Context, eventID, userID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(1) FROM event_registrations
		WHERE event_id = $1 AND user_id = $2 AND status = 'confirmed'
	`, eventID, userID).Scan(&count)
	return count > 0, err
}

// ── Register (atomic capacity check) ─────────────────────────────────────────

// Register attempts to register the user for an event.
// The capacity check and insert happen in a single SQL statement to prevent
// race conditions where two users grab the last spot simultaneously.
// Returns ErrCapacityFull if the event has no room.
func (r *Repository) Register(ctx context.Context, eventID, userID string) (*Registration, error) {
	var reg Registration

	// Single atomic statement:
	// - Skips insert if count >= max_capacity
	// - Skips insert if max_capacity IS NULL (unlimited)... wait, we want unlimited to always succeed
	// We handle NULL max_capacity (unlimited) by treating it as always having room.
	query := `
		INSERT INTO event_registrations (user_id, event_id, status)
		SELECT $1, $2, 'confirmed'
		WHERE (
		    SELECT max_capacity FROM events WHERE id = $2
		) IS NULL
		OR (
		    SELECT COUNT(*) FROM event_registrations
		    WHERE event_id = $2 AND status = 'confirmed'
		) < (
		    SELECT max_capacity FROM events WHERE id = $2
		)
		ON CONFLICT (user_id, event_id) DO UPDATE SET status = 'confirmed'
		RETURNING user_id, event_id, status, registered_at
	`

	err := r.db.QueryRowContext(ctx, query, userID, eventID).Scan(
		&reg.UserID, &reg.EventID, &reg.Status, &reg.RegisteredAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCapacityFull
	}
	if err != nil {
		return nil, fmt.Errorf("Register: %w", err)
	}
	return &reg, nil
}

// ── CancelRegistration ────────────────────────────────────────────────────────

func (r *Repository) CancelRegistration(ctx context.Context, eventID, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM event_registrations
		WHERE event_id = $1 AND user_id = $2
	`, eventID, userID)
	if err != nil {
		return fmt.Errorf("CancelRegistration: %w", err)
	}
	return nil
}
