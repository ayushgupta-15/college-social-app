package users

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/internal/middleware"
	"github.com/ayushgupta-15/college-social-app/backend/internal/notifications"
)

type Handler struct {
	repo      *Repository
	notifSvc  *notifications.Service
}

func NewHandler(repo *Repository, notifSvc *notifications.Service) *Handler {
	return &Handler{repo: repo, notifSvc: notifSvc}
}

// RegisterRoutes wires all user and follow routes onto the given (protected) group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/users/me", h.GetMe)
	rg.PATCH("/users/me", h.UpdateMe)
	rg.GET("/users/:id", h.GetByID)

	rg.POST("/users/:id/follow", h.Follow)
	rg.DELETE("/users/:id/follow", h.Unfollow)
	rg.GET("/users/:id/followers", h.GetFollowers)
	rg.GET("/users/:id/following", h.GetFollowing)
}

// GetMe godoc
// @Summary      Get the authenticated user's profile
// @Tags         Users
// @Produce      json
// @Success      200 {object} User
// @Failure      401 {object} ErrorResponse
// @Router       /users/me [get]
func (h *Handler) GetMe(c *gin.Context) {
	uid := c.GetString(middleware.ContextKeyUID)

	user, err := h.repo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, ErrorResponse{Message: err.Error()})
		return
	}

	user.FirebaseUID = "" // never expose in API responses
	c.JSON(http.StatusOK, user)
}

// updateMeRequest extends UpdateUserParams with the FCM token field.
type updateMeRequest struct {
	FullName         *string `json:"full_name"`
	Bio              *string `json:"bio"`
	AvatarURL        *string `json:"avatar_url"`
	College          *string `json:"college"`
	Major            *string `json:"major"`
	GradYear         *int16  `json:"grad_year"`
	IsOpenToReferral *bool   `json:"is_open_to_referral"`
	FcmToken         *string `json:"fcm_token"` // device push token — stored separately, never returned
}

// UpdateMe godoc
// @Summary      Partially update the authenticated user's profile
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        body body updateMeRequest true "Fields to update (all optional)"
// @Success      200 {object} User
// @Failure      400 {object} ErrorResponse
// @Router       /users/me [patch]
func (h *Handler) UpdateMe(c *gin.Context) {
	uid := c.GetString(middleware.ContextKeyUID)

	me, err := h.repo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Message: "user not found"})
		return
	}

	var req updateMeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	// Store FCM token separately — never returned in API responses
	if req.FcmToken != nil && *req.FcmToken != "" {
		_ = h.repo.UpdateFcmToken(c.Request.Context(), me.ID, *req.FcmToken)
	}

	updated, err := h.repo.Update(c.Request.Context(), me.ID, UpdateUserParams{
		FullName:         req.FullName,
		Bio:              req.Bio,
		AvatarURL:        req.AvatarURL,
		College:          req.College,
		Major:            req.Major,
		GradYear:         req.GradYear,
		IsOpenToReferral: req.IsOpenToReferral,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	updated.FirebaseUID = ""
	c.JSON(http.StatusOK, updated)
}

// GetByID godoc
// @Summary      Get a public user profile by UUID
// @Tags         Users
// @Produce      json
// @Param        id path string true "User UUID"
// @Success      200 {object} User
// @Failure      404 {object} ErrorResponse
// @Router       /users/{id} [get]
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	user, err := h.repo.GetByID(c.Request.Context(), id)
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "user not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	user.FirebaseUID = ""
	c.JSON(http.StatusOK, user)
}

// Follow godoc
// @Summary      Follow a user
// @Tags         Users
// @Param        id path string true "User UUID to follow"
// @Success      204
// @Failure      400 {object} ErrorResponse
// @Router       /users/{id}/follow [post]
func (h *Handler) Follow(c *gin.Context) {
	uid := c.GetString(middleware.ContextKeyUID)
	targetID := c.Param("id")

	me, err := h.repo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Message: "user not found"})
		return
	}

	if me.ID == targetID {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "cannot follow yourself"})
		return
	}

	if err := h.repo.Follow(c.Request.Context(), me.ID, targetID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Fire-and-forget: notify the followed user
	actorID := me.ID
	entityType := "post" // generic — no specific entity for a follow
	go h.notifSvc.Send(
		context.Background(),
		targetID,
		&actorID,
		"follow",
		me.FullName+" started following you",
		nil,
		&entityType,
	)

	c.Status(http.StatusNoContent)
}

// Unfollow godoc
// @Summary      Unfollow a user
// @Tags         Users
// @Param        id path string true "User UUID to unfollow"
// @Success      204
// @Router       /users/{id}/follow [delete]
func (h *Handler) Unfollow(c *gin.Context) {
	uid := c.GetString(middleware.ContextKeyUID)
	targetID := c.Param("id")

	me, err := h.repo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Message: "user not found"})
		return
	}

	if err := h.repo.Unfollow(c.Request.Context(), me.ID, targetID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetFollowers godoc
// @Summary      List users who follow the given user
// @Tags         Users
// @Param        id path string true "User UUID"
// @Success      200 {array} User
// @Router       /users/{id}/followers [get]
func (h *Handler) GetFollowers(c *gin.Context) {
	id := c.Param("id")

	followers, err := h.repo.GetFollowers(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	for _, u := range followers {
		u.FirebaseUID = ""
	}
	c.JSON(http.StatusOK, followers)
}

// GetFollowing godoc
// @Summary      List users the given user follows
// @Tags         Users
// @Param        id path string true "User UUID"
// @Success      200 {array} User
// @Router       /users/{id}/following [get]
func (h *Handler) GetFollowing(c *gin.Context) {
	id := c.Param("id")

	following, err := h.repo.GetFollowing(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	for _, u := range following {
		u.FirebaseUID = ""
	}
	c.JSON(http.StatusOK, following)
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Message string `json:"message"`
}

