package chat

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// SaveMessage persists an outbound message to the messages table.
func (r *Repository) SaveMessage(ctx context.Context, senderID, receiverID, content string, mediaURL *string) (*Message, error) {
	var m Message
	var media sql.NullString

	err := r.db.QueryRowContext(ctx, `
		INSERT INTO messages (sender_id, receiver_id, content, media_url)
		VALUES ($1, $2, $3, $4)
		RETURNING id, sender_id, receiver_id, content, media_url, is_read, created_at
	`, senderID, receiverID, content, mediaURL).Scan(
		&m.ID, &m.SenderID, &m.ReceiverID, &m.Content,
		&media, &m.IsRead, &m.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("SaveMessage: %w", err)
	}
	if media.Valid {
		m.MediaURL = &media.String
	}
	return &m, nil
}

// GetConversation returns cursor-paginated messages between two users.
// uid1 and uid2 are the two internal user UUIDs (order does not matter).
// before is an optional cursor — fetch messages older than this timestamp.
func (r *Repository) GetConversation(ctx context.Context, uid1, uid2 string, before *time.Time, limit int) ([]*Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	query := `
		SELECT id, sender_id, receiver_id, content, media_url, is_read, created_at
		FROM messages
		WHERE (
		    (sender_id = $1 AND receiver_id = $2)
		 OR (sender_id = $2 AND receiver_id = $1)
		)`
	args := []any{uid1, uid2}

	if before != nil {
		query += fmt.Sprintf(` AND created_at < $%d`, len(args)+1)
		args = append(args, *before)
	}

	query += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d`, len(args)+1)
	args = append(args, limit)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("GetConversation: %w", err)
	}
	defer rows.Close()

	var msgs []*Message
	for rows.Next() {
		var m Message
		var media sql.NullString
		if err := rows.Scan(
			&m.ID, &m.SenderID, &m.ReceiverID, &m.Content,
			&media, &m.IsRead, &m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("GetConversation scan: %w", err)
		}
		if media.Valid {
			m.MediaURL = &media.String
		}
		msgs = append(msgs, &m)
	}
	return msgs, rows.Err()
}

// MarkRead marks all messages sent by senderID to receiverID as read.
func (r *Repository) MarkRead(ctx context.Context, senderID, receiverID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE messages SET is_read = TRUE
		WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
	`, senderID, receiverID)
	return err
}
