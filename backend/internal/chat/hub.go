package chat

import (
	"log"
	"sync"
)

// Hub maintains the set of active WebSocket clients and routes messages between them.
// One Hub is created at startup and runs for the lifetime of the server.
type Hub struct {
	// clients maps an internal user UUID to their active WebSocket client.
	// Only one connection per user is tracked — a new login replaces the old one.
	clients map[string]*Client

	register   chan *Client
	unregister chan *Client

	// broadcast carries messages destined for a specific user.
	broadcast chan *delivery

	mu sync.RWMutex
}

// delivery wraps a serialized message and its intended recipient.
type delivery struct {
	toUserID string
	payload  []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		broadcast:  make(chan *delivery, 256),
	}
}

// Run is the Hub's event loop. Must be called in its own goroutine from main.go.
func (h *Hub) Run() {
	for {
		select {

		case client := <-h.register:
			h.mu.Lock()
			// If the user already has a connection, close the old one gracefully.
			if old, exists := h.clients[client.userID]; exists {
				close(old.send)
			}
			h.clients[client.userID] = client
			h.mu.Unlock()
			log.Printf("chat: user %s connected (%d online)", client.userID, h.onlineCount())

		case client := <-h.unregister:
			h.mu.Lock()
			if curr, exists := h.clients[client.userID]; exists && curr == client {
				delete(h.clients, client.userID)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("chat: user %s disconnected (%d online)", client.userID, h.onlineCount())

		case d := <-h.broadcast:
			h.mu.RLock()
			recipient, online := h.clients[d.toUserID]
			h.mu.RUnlock()

			if online {
				select {
				case recipient.send <- d.payload:
					// delivered live
				default:
					// recipient's send buffer is full — drop rather than block
					log.Printf("chat: send buffer full for user %s, dropping message", d.toUserID)
				}
			}
			// If offline, the message is already persisted in the DB — client fetches on reconnect.
		}
	}
}

// Deliver queues a payload for delivery to the given user (non-blocking).
func (h *Hub) Deliver(toUserID string, payload []byte) {
	h.broadcast <- &delivery{toUserID: toUserID, payload: payload}
}

func (h *Hub) onlineCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
