package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/internal/users"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers auth routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/signup", h.Signup)
		auth.POST("/login", h.Login)
	}
}

// Signup godoc
// @Summary      Register a new user
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body body SignupRequest true "Signup payload"
// @Success      201 {object} users.User
// @Failure      400 {object} ErrorResponse
// @Failure      409 {object} ErrorResponse
// @Router       /auth/signup [post]
func (h *Handler) Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	user, err := h.service.Signup(c.Request.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		if isClientError(err) {
			status = http.StatusConflict
		}
		c.JSON(status, ErrorResponse{Message: err.Error()})
		return
	}

	// Don't expose firebase_uid in responses
	user.FirebaseUID = ""
	c.JSON(http.StatusCreated, user)
}

// Login godoc
// @Summary      Verify Firebase token and return user
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body body LoginRequest true "Login payload"
// @Success      200 {object} users.User
// @Failure      400 {object} ErrorResponse
// @Failure      404 {object} ErrorResponse
// @Router       /auth/login [post]
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	user, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, users.ErrNotFound) || isClientError(err) {
			status = http.StatusNotFound
		}
		c.JSON(status, ErrorResponse{Message: err.Error()})
		return
	}

	user.FirebaseUID = ""
	c.JSON(http.StatusOK, user)
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Message string `json:"message"`
}

// isClientError returns true for errors caused by bad input (not server faults).
func isClientError(err error) bool {
	msg := err.Error()
	clientPhrases := []string{
		"already exists",
		"already taken",
		"invalid firebase token",
		"no account found",
	}
	for _, p := range clientPhrases {
		if len(msg) >= len(p) {
			for i := 0; i <= len(msg)-len(p); i++ {
				if msg[i:i+len(p)] == p {
					return true
				}
			}
		}
	}
	return false
}
