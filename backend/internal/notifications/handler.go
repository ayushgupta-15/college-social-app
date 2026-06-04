package notifications

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/internal/middleware"
)

// NotifHandler handles notification REST endpoints.
// getUserID is a closure supplied from main.go that resolves a Firebase UID to
// the internal user UUID without creating a circular import on the users package.
type NotifHandler struct {
	repo      *Repository
	getUserID func(firebaseUID string, c *gin.Context) (string, bool)
}

func NewHandler(repo *Repository, getUserID func(firebaseUID string, c *gin.Context) (string, bool)) *NotifHandler {
	return &NotifHandler{repo: repo, getUserID: getUserID}
}

// RegisterRoutes wires notification REST endpoints.
func (h *NotifHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/notifications", h.GetNotifications)
	rg.POST("/notifications/read-all", h.MarkAllRead)
}


// ── GET /notifications ────────────────────────────────────────────────────────

// GetNotifications godoc
// @Summary      List notifications for the authenticated user
// @Tags         Notifications
// @Produce      json
// @Param        unread_only query boolean false "Only return unread notifications"
// @Success      200 {array} Notification
// @Router       /notifications [get]
func (h *NotifHandler) GetNotifications(c *gin.Context) {
	userID, ok := h.getUserID(c.GetString(middleware.ContextKeyUID), c)
	if !ok {
		return
	}

	unreadOnly := c.Query("unread_only") == "true"

	list, err := h.repo.GetForUser(c.Request.Context(), userID, unreadOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

// ── POST /notifications/read-all ─────────────────────────────────────────────

// MarkAllRead godoc
// @Summary      Mark all notifications as read
// @Tags         Notifications
// @Success      204
// @Router       /notifications/read-all [post]
func (h *NotifHandler) MarkAllRead(c *gin.Context) {
	userID, ok := h.getUserID(c.GetString(middleware.ContextKeyUID), c)
	if !ok {
		return
	}

	if err := h.repo.MarkAllRead(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
