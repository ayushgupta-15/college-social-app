package notifications

import (
	"context"
	"database/sql"
	"fmt"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Create inserts a notification row. actorID, entityID, and entityType are optional.
func (r *Repository) Create(
	ctx context.Context,
	userID string,
	actorID *string,
	notifType string,
	message *string,
	entityID *string,
	entityType *string,
) (*Notification, error) {
	var n Notification
	var actorName sql.NullString
	var aid, eid, etype, msg sql.NullString

	err := r.db.QueryRowContext(ctx, `
		INSERT INTO notifications (user_id, actor_id, type, message, entity_id, entity_type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, actor_id, NULL as actor_name,
		          type, entity_id, entity_type, message, is_read, created_at
	`, userID, actorID, notifType, message, entityID, entityType).Scan(
		&n.ID, &n.UserID, &aid, &actorName,
		&n.Type, &eid, &etype, &msg,
		&n.IsRead, &n.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("Create notification: %w", err)
	}

	if aid.Valid {
		n.ActorID = &aid.String
	}
	if actorName.Valid {
		n.ActorName = &actorName.String
	}
	if eid.Valid {
		n.EntityID = &eid.String
	}
	if etype.Valid {
		n.EntityType = &etype.String
	}
	if msg.Valid {
		n.Message = &msg.String
	}
	return &n, nil
}

// GetForUser returns notifications for a user, newest first.
// If unreadOnly is true, only returns unread notifications.
func (r *Repository) GetForUser(ctx context.Context, userID string, unreadOnly bool) ([]*Notification, error) {
	query := `
		SELECT n.id, n.user_id, n.actor_id, u.full_name,
		       n.type, n.entity_id, n.entity_type, n.message, n.is_read, n.created_at
		FROM notifications n
		LEFT JOIN users u ON u.id = n.actor_id
		WHERE n.user_id = $1`

	if unreadOnly {
		query += ` AND n.is_read = FALSE`
	}
	query += ` ORDER BY n.created_at DESC LIMIT 50`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("GetForUser: %w", err)
	}
	defer rows.Close()

	var list []*Notification
	for rows.Next() {
		var n Notification
		var actorID, actorName, entityID, entityType, message sql.NullString

		if err := rows.Scan(
			&n.ID, &n.UserID, &actorID, &actorName,
			&n.Type, &entityID, &entityType, &message,
			&n.IsRead, &n.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("GetForUser scan: %w", err)
		}

		if actorID.Valid {
			n.ActorID = &actorID.String
		}
		if actorName.Valid {
			n.ActorName = &actorName.String
		}
		if entityID.Valid {
			n.EntityID = &entityID.String
		}
		if entityType.Valid {
			n.EntityType = &entityType.String
		}
		if message.Valid {
			n.Message = &message.String
		}
		list = append(list, &n)
	}
	return list, rows.Err()
}

// MarkAllRead marks all unread notifications for a user as read.
func (r *Repository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE
		WHERE user_id = $1 AND is_read = FALSE
	`, userID)
	if err != nil {
		return fmt.Errorf("MarkAllRead: %w", err)
	}
	return nil
}

// GetFcmToken fetches a user's FCM device token directly (avoids cross-package import).
func (r *Repository) GetFcmToken(ctx context.Context, userID string) (*string, error) {
	var token sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT fcm_token FROM users WHERE id = $1`, userID,
	).Scan(&token)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, nil
	}
	return &token.String, nil
}
