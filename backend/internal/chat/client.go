package chat

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer (bytes).
	maxMessageSize = 4096
)

// Client is a middleman between the WebSocket connection and the Hub.
type Client struct {
	userID string
	conn   *websocket.Conn
	send   chan []byte // buffered channel of outbound messages
	hub    *Hub
	repo   *Repository
}

func NewClient(userID string, conn *websocket.Conn, hub *Hub, repo *Repository) *Client {
	return &Client{
		userID: userID,
		conn:   conn,
		send:   make(chan []byte, 256),
		hub:    hub,
		repo:   repo,
	}
}

// ReadPump pumps messages from the WebSocket to the Hub.
// Runs in its own goroutine. On exit it unregisters the client.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
			) {
				log.Printf("chat: unexpected close for user %s: %v", c.userID, err)
			}
			break
		}

		var msg InboundMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			log.Printf("chat: malformed message from user %s: %v", c.userID, err)
			continue
		}
		if msg.To == "" || msg.Content == "" {
			continue
		}

		// 1. Persist to DB
		saved, err := c.repo.SaveMessage(
			context.Background(),
			c.userID, msg.To, msg.Content, msg.MediaURL,
		)
		if err != nil {
			log.Printf("chat: SaveMessage error: %v", err)
			continue
		}

		// 2. Build outbound payload
		out := OutboundMessage{
			ID:        saved.ID,
			From:      c.userID,
			To:        msg.To,
			Content:   saved.Content,
			MediaURL:  saved.MediaURL,
			CreatedAt: saved.CreatedAt,
		}
		payload, err := json.Marshal(out)
		if err != nil {
			log.Printf("chat: marshal error: %v", err)
			continue
		}

		// 3. Deliver to recipient if online (Hub handles offline case gracefully)
		c.hub.Deliver(msg.To, payload)

		// 4. Echo back to sender so their UI updates immediately
		select {
		case c.send <- payload:
		default:
		}
	}
}

// WritePump pumps messages from the send channel to the WebSocket.
// Runs in its own goroutine.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel — send a close frame and exit.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Flush any queued messages in the same WebSocket frame batch.
			n := len(c.send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte{'\n'})
				_, _ = w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
