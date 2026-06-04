package chat

import "time"

// Message represents a row in the messages table.
type Message struct {
	ID         string    `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	MediaURL   *string   `json:"media_url"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

// InboundMessage is the JSON shape a client sends over the WebSocket.
type InboundMessage struct {
	To      string  `json:"to"`      // recipient's internal UUID
	Content string  `json:"content"`
	MediaURL *string `json:"media_url"`
}

// OutboundMessage is what gets broadcast to the recipient's WebSocket.
type OutboundMessage struct {
	ID         string    `json:"id"`
	From       string    `json:"from"`        // sender's internal UUID
	To         string    `json:"to"`
	Content    string    `json:"content"`
	MediaURL   *string   `json:"media_url"`
	CreatedAt  time.Time `json:"created_at"`
}

// HistoryResponse wraps paginated messages with a next-page cursor.
type HistoryResponse struct {
	Messages   []*Message `json:"messages"`
	NextCursor *string    `json:"next_cursor"` // RFC3339 of oldest message; nil = no more pages
}
