package events

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/internal/middleware"
	"github.com/ayushgupta-15/college-social-app/backend/internal/users"
)

type Handler struct {
	repo     *Repository
	userRepo *users.Repository
}

func NewHandler(repo *Repository, userRepo *users.Repository) *Handler {
	return &Handler{repo: repo, userRepo: userRepo}
}

// RegisterRoutes wires all event routes onto the given (protected) router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/events", h.ListEvents)
	rg.POST("/events", h.CreateEvent)
	rg.GET("/events/:id", h.GetEvent)
	rg.POST("/events/:id/register", h.Register)
	rg.DELETE("/events/:id/register", h.CancelRegistration)
}

// ── helper ────────────────────────────────────────────────────────────────────

func (h *Handler) callerUser(c *gin.Context) (*users.User, bool) {
	uid := c.GetString(middleware.ContextKeyUID)
	user, err := h.userRepo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Message: "authenticated user not found"})
		return nil, false
	}
	return user, true
}

// ── GET /events ───────────────────────────────────────────────────────────────

// ListEvents godoc
// @Summary      List upcoming events
// @Tags         Events
// @Produce      json
// @Param        is_online query boolean false "Filter online-only events"
// @Param        from_date query string  false "Only show events from this date (RFC3339)"
// @Success      200 {array} Event
// @Router       /events [get]
func (h *Handler) ListEvents(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	params := ListEventsParams{}

	if v := c.Query("is_online"); v != "" {
		online := v == "true"
		params.IsOnline = &online
	}
	if v := c.Query("from_date"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid 'from_date', use RFC3339"})
			return
		}
		params.FromDate = &t
	}

	list, err := h.repo.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Populate is_registered for the caller
	for _, ev := range list {
		ev.IsRegistered, _ = h.repo.IsRegistered(c.Request.Context(), ev.ID, caller.ID)
	}

	c.JSON(http.StatusOK, list)
}

// ── POST /events ──────────────────────────────────────────────────────────────

type createEventRequest struct {
	Title       string  `json:"title"       binding:"required,min=3,max=150"`
	Description *string `json:"description"`
	Location    *string `json:"location"`
	EventDate   string  `json:"event_date"  binding:"required"` // RFC3339
	BannerURL   *string `json:"banner_url"`
	MaxCapacity *int    `json:"max_capacity"`
	IsOnline    bool    `json:"is_online"`
	MeetLink    *string `json:"meet_link"`
}

// CreateEvent godoc
// @Summary      Create a new event
// @Tags         Events
// @Accept       json
// @Produce      json
// @Param        body body createEventRequest true "Event payload"
// @Success      201 {object} Event
// @Router       /events [post]
func (h *Handler) CreateEvent(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	var req createEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	eventDate, err := time.Parse(time.RFC3339, req.EventDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid 'event_date', use RFC3339"})
		return
	}
	if eventDate.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "event_date must be in the future"})
		return
	}

	ev, err := h.repo.Create(c.Request.Context(), CreateEventParams{
		OrganizerID: caller.ID,
		Title:       req.Title,
		Description: req.Description,
		Location:    req.Location,
		EventDate:   eventDate,
		BannerURL:   req.BannerURL,
		MaxCapacity: req.MaxCapacity,
		IsOnline:    req.IsOnline,
		MeetLink:    req.MeetLink,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ev)
}

// ── GET /events/:id ───────────────────────────────────────────────────────────

// GetEvent godoc
// @Summary      Get a single event by ID
// @Tags         Events
// @Produce      json
// @Param        id path string true "Event UUID"
// @Success      200 {object} Event
// @Failure      404 {object} ErrorResponse
// @Router       /events/{id} [get]
func (h *Handler) GetEvent(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	ev, err := h.repo.GetByID(c.Request.Context(), c.Param("id"))
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "event not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	ev.IsRegistered, _ = h.repo.IsRegistered(c.Request.Context(), ev.ID, caller.ID)
	c.JSON(http.StatusOK, ev)
}

// ── POST /events/:id/register ─────────────────────────────────────────────────

// Register godoc
// @Summary      Register for an event
// @Tags         Events
// @Param        id path string true "Event UUID"
// @Success      201 {object} Registration
// @Failure      409 {object} ErrorResponse "Event is at capacity"
// @Router       /events/{id}/register [post]
func (h *Handler) Register(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	eventID := c.Param("id")

	// Verify event exists before attempting registration
	if _, err := h.repo.GetByID(c.Request.Context(), eventID); errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "event not found"})
		return
	}

	reg, err := h.repo.Register(c.Request.Context(), eventID, caller.ID)
	if errors.Is(err, ErrCapacityFull) {
		c.JSON(http.StatusConflict, ErrorResponse{Message: "event is at full capacity"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, reg)
}

// ── DELETE /events/:id/register ───────────────────────────────────────────────

// CancelRegistration godoc
// @Summary      Cancel registration for an event
// @Tags         Events
// @Param        id path string true "Event UUID"
// @Success      204
// @Router       /events/{id}/register [delete]
func (h *Handler) CancelRegistration(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	if err := h.repo.CancelRegistration(c.Request.Context(), c.Param("id"), caller.ID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Message string `json:"message"`
}
