package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ayushgupta-15/college-social-app/backend/internal/middleware"
	"github.com/ayushgupta-15/college-social-app/backend/internal/users"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins — tighten in production with a whitelist
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Handler struct {
	hub      *Hub
	repo     *Repository
	userRepo *users.Repository
}

func NewHandler(hub *Hub, repo *Repository, userRepo *users.Repository) *Handler {
	return &Handler{hub: hub, repo: repo, userRepo: userRepo}
}

// RegisterRoutes wires chat routes.
// Note: ServeWS is wired directly on the root router in main.go (not here)
// because it needs the WS-specific auth middleware.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/messages/:chatId", h.GetHistory)
	rg.POST("/messages/send", h.SendMessage) // REST fallback for offline-capable clients
}

// ── chatID helper ─────────────────────────────────────────────────────────────

// buildChatID returns the canonical chat room ID for two users.
// UUIDs are sorted so the result is always the same regardless of who initiates.
// Format: "<uuid-aaa>_<uuid-zzz>" — two 36-char UUIDs separated by exactly one "_".
func buildChatID(uid1, uid2 string) string {
	ids := []string{uid1, uid2}
	sort.Strings(ids)
	return strings.Join(ids, "_")
}

// parseChatID splits a chatId back into the two user UUIDs.
// Returns an error if the format is invalid.
func parseChatID(chatID string) (string, string, error) {
	// Each UUID is exactly 36 characters; separator is "_" at position 36.
	if len(chatID) != 73 { // 36 + 1 + 36
		return "", "", fmt.Errorf("invalid chatId format")
	}
	uid1 := chatID[:36]
	uid2 := chatID[37:]
	if chatID[36] != '_' {
		return "", "", fmt.Errorf("invalid chatId format")
	}
	return uid1, uid2, nil
}

// ── GET /ws ───────────────────────────────────────────────────────────────────

// ServeWS upgrades an HTTP connection to WebSocket, registers the client in the Hub,
// and starts the read/write pumps. The Firebase UID must already be in context
// (set by WSAuthMiddleware).
func (h *Handler) ServeWS(c *gin.Context) {
	uid := c.GetString(middleware.ContextKeyUID)

	// Resolve Firebase UID → internal user UUID
	user, err := h.userRepo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "user not found"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// Upgrade already writes the error response
		return
	}

	client := NewClient(user.ID, conn, h.hub, h.repo)
	h.hub.register <- client

	// Each client gets exactly 2 goroutines
	go client.WritePump()
	go client.ReadPump()
}

// ── GET /messages/:chatId ─────────────────────────────────────────────────────

// GetHistory godoc
// @Summary      Fetch paginated message history for a chat pair
// @Tags         Chat
// @Produce      json
// @Param        chatId path   string true  "Sorted UUID pair: <uid1>_<uid2>"
// @Param        before query  string false "Cursor — RFC3339 timestamp of oldest seen message"
// @Param        limit  query  int    false "Page size (default 30, max 100)"
// @Success      200 {object} HistoryResponse
// @Router       /messages/{chatId} [get]
func (h *Handler) GetHistory(c *gin.Context) {
	callerUID := c.GetString(middleware.ContextKeyUID)
	caller, err := h.userRepo.GetByFirebaseUID(c.Request.Context(), callerUID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "user not found"})
		return
	}

	uid1, uid2, err := parseChatID(c.Param("chatId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	// Security: caller must be one of the two participants
	if caller.ID != uid1 && caller.ID != uid2 {
		c.JSON(http.StatusForbidden, gin.H{"message": "access denied"})
		return
	}

	// ?before= cursor
	var before *time.Time
	if bStr := c.Query("before"); bStr != "" {
		t, err := time.Parse(time.RFC3339, bStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid 'before' timestamp, use RFC3339"})
			return
		}
		before = &t
	}

	// ?limit=
	limit := 30
	if lStr := c.Query("limit"); lStr != "" {
		fmt.Sscan(lStr, &limit)
	}

	msgs, err := h.repo.GetConversation(c.Request.Context(), uid1, uid2, before, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	// Mark messages sent to the caller as read
	go func() {
		_ = h.repo.MarkRead(c.Request.Context(), uid2, caller.ID)
	}()

	resp := HistoryResponse{Messages: msgs}
	if len(msgs) > 0 {
		cursor := msgs[len(msgs)-1].CreatedAt.UTC().Format(time.RFC3339Nano)
		resp.NextCursor = &cursor
	}

	c.JSON(http.StatusOK, resp)
}

// ── POST /messages/send ───────────────────────────────────────────────────────

type sendMessageRequest struct {
	To       string  `json:"to"      binding:"required"`
	Content  string  `json:"content" binding:"required,min=1"`
	MediaURL *string `json:"media_url"`
}

// SendMessage is a REST fallback for clients that prefer HTTP over WebSocket.
// Saves the message and attempts live delivery via the Hub.
func (h *Handler) SendMessage(c *gin.Context) {
	callerUID := c.GetString(middleware.ContextKeyUID)
	caller, err := h.userRepo.GetByFirebaseUID(c.Request.Context(), callerUID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "user not found"})
		return
	}

	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if caller.ID == req.To {
		c.JSON(http.StatusBadRequest, gin.H{"message": "cannot message yourself"})
		return
	}

	saved, err := h.repo.SaveMessage(c.Request.Context(), caller.ID, req.To, req.Content, req.MediaURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	// Best-effort live delivery — no error if recipient is offline
	out := OutboundMessage{
		ID:        saved.ID,
		From:      caller.ID,
		To:        req.To,
		Content:   saved.Content,
		MediaURL:  saved.MediaURL,
		CreatedAt: saved.CreatedAt,
	}
	if payload, err := marshalJSON(out); err == nil {
		h.hub.Deliver(req.To, payload)
	}

	c.JSON(http.StatusCreated, saved)
}

// ── util ──────────────────────────────────────────────────────────────────────

func marshalJSON(v any) ([]byte, error) {
	return json.Marshal(v)
}
