package groups

import (
	"errors"
	"net/http"

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

// RegisterRoutes wires all group routes onto the given (protected) router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/groups", h.ListGroups)
	rg.POST("/groups", h.CreateGroup)
	rg.GET("/groups/:id", h.GetGroup)
	rg.GET("/groups/:id/members", h.GetMembers)
	rg.POST("/groups/:id/join", h.JoinGroup)
	rg.POST("/groups/:id/leave", h.LeaveGroup)
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

// ── GET /groups ───────────────────────────────────────────────────────────────

// ListGroups godoc
// @Summary      List public study groups
// @Tags         Groups
// @Produce      json
// @Param        subject query string false "Filter by subject (partial match)"
// @Param        search  query string false "Search by group name (partial match)"
// @Success      200 {array} Group
// @Router       /groups [get]
func (h *Handler) ListGroups(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	params := ListGroupsParams{}
	if s := c.Query("subject"); s != "" {
		params.Subject = &s
	}
	if s := c.Query("search"); s != "" {
		params.Search = &s
	}

	list, err := h.repo.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Populate is_member for the caller
	for _, g := range list {
		g.IsMember, _ = h.repo.IsMember(c.Request.Context(), g.ID, caller.ID)
	}

	c.JSON(http.StatusOK, list)
}

// ── POST /groups ──────────────────────────────────────────────────────────────

type createGroupRequest struct {
	Name        string  `json:"name"        binding:"required,min=3,max=100"`
	Description *string `json:"description"`
	Subject     *string `json:"subject"`
	AvatarURL   *string `json:"avatar_url"`
	IsPrivate   bool    `json:"is_private"`
}

// CreateGroup godoc
// @Summary      Create a new study group
// @Tags         Groups
// @Accept       json
// @Produce      json
// @Param        body body createGroupRequest true "Group payload"
// @Success      201 {object} Group
// @Router       /groups [post]
func (h *Handler) CreateGroup(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	var req createGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	group, err := h.repo.Create(c.Request.Context(), CreateGroupParams{
		Name:        req.Name,
		Description: req.Description,
		Subject:     req.Subject,
		AdminID:     caller.ID,
		AvatarURL:   req.AvatarURL,
		IsPrivate:   req.IsPrivate,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	group.IsMember = true // creator is always a member
	c.JSON(http.StatusCreated, group)
}

// ── GET /groups/:id ───────────────────────────────────────────────────────────

// GetGroup godoc
// @Summary      Get a single group by ID
// @Tags         Groups
// @Produce      json
// @Param        id path string true "Group UUID"
// @Success      200 {object} Group
// @Failure      404 {object} ErrorResponse
// @Router       /groups/{id} [get]
func (h *Handler) GetGroup(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	group, err := h.repo.GetByID(c.Request.Context(), c.Param("id"))
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "group not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	group.IsMember, _ = h.repo.IsMember(c.Request.Context(), group.ID, caller.ID)
	c.JSON(http.StatusOK, group)
}

// ── POST /groups/:id/join ─────────────────────────────────────────────────────

// JoinGroup godoc
// @Summary      Join a study group
// @Tags         Groups
// @Param        id path string true "Group UUID"
// @Success      204
// @Failure      404 {object} ErrorResponse
// @Router       /groups/{id}/join [post]
func (h *Handler) JoinGroup(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	groupID := c.Param("id")

	// Verify group exists
	if _, err := h.repo.GetByID(c.Request.Context(), groupID); errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "group not found"})
		return
	}

	if err := h.repo.Join(c.Request.Context(), groupID, caller.ID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ── POST /groups/:id/leave ────────────────────────────────────────────────────

// LeaveGroup godoc
// @Summary      Leave a study group (admin cannot leave)
// @Tags         Groups
// @Param        id path string true "Group UUID"
// @Success      204
// @Failure      403 {object} ErrorResponse
// @Router       /groups/{id}/leave [post]
func (h *Handler) LeaveGroup(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	err := h.repo.Leave(c.Request.Context(), c.Param("id"), caller.ID)
	if errors.Is(err, ErrIsAdmin) {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Message: "admin cannot leave — transfer ownership or delete the group first",
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ── GET /groups/:id/members ───────────────────────────────────────────────────

// GetMembers godoc
// @Summary      Get members of a group
// @Tags         Groups
// @Produce      json
// @Param        id path string true "Group UUID"
// @Success      200 {array} Member
// @Failure      404 {object} ErrorResponse
// @Router       /groups/{id}/members [get]
func (h *Handler) GetMembers(c *gin.Context) {
	groupID := c.Param("id")

	// Verify group exists
	if _, err := h.repo.GetByID(c.Request.Context(), groupID); errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "group not found"})
		return
	}

	members, err := h.repo.GetMembers(c.Request.Context(), groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.JSON(http.StatusOK, members)
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Message string `json:"message"`
}
