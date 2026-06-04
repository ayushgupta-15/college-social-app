package posts

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/internal/middleware"
	"github.com/ayushgupta-15/college-social-app/backend/internal/notifications"
	"github.com/ayushgupta-15/college-social-app/backend/internal/users"
)

type Handler struct {
	repo     *Repository
	userRepo *users.Repository
	notifSvc *notifications.Service
}

func NewHandler(repo *Repository, userRepo *users.Repository, notifSvc *notifications.Service) *Handler {
	return &Handler{repo: repo, userRepo: userRepo, notifSvc: notifSvc}
}

// RegisterRoutes wires all post routes onto the given (protected) router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/posts", h.GetFeed)
	rg.POST("/posts", h.CreatePost)
	rg.GET("/posts/:id", h.GetPost)
	rg.DELETE("/posts/:id", h.DeletePost)
	rg.POST("/posts/:id/like", h.ToggleLike)
	rg.GET("/posts/:id/comments", h.GetComments)
	rg.POST("/posts/:id/comments", h.AddComment)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// callerUser resolves the Firebase UID in context to our internal User row.
func (h *Handler) callerUser(c *gin.Context) (*users.User, bool) {
	uid := c.GetString(middleware.ContextKeyUID)
	user, err := h.userRepo.GetByFirebaseUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Message: "authenticated user not found"})
		return nil, false
	}
	return user, true
}

// ── GET /posts ─────────────────────────────────────────────────────────────────

// GetFeed godoc
// @Summary      Paginated post feed
// @Tags         Posts
// @Produce      json
// @Param        before query string  false "Cursor — RFC3339 timestamp (created_at of last post)"
// @Param        type   query string  false "Filter by post type: general | opportunity | announcement"
// @Param        limit  query integer false "Page size (default 20, max 50)"
// @Success      200 {object} FeedResponse
// @Router       /posts [get]
func (h *Handler) GetFeed(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	params := GetFeedParams{}

	// ?limit=
	if lStr := c.Query("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil {
			params.Limit = l
		}
	}

	// ?before=<RFC3339>
	if bStr := c.Query("before"); bStr != "" {
		t, err := time.Parse(time.RFC3339, bStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Message: "invalid 'before' timestamp, use RFC3339"})
			return
		}
		params.Before = &t
	}

	// ?type=
	if tStr := c.Query("type"); tStr != "" {
		pt := PostType(tStr)
		params.PostType = &pt
	}

	postList, err := h.repo.GetFeed(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Populate liked_by_me for each post
	for _, p := range postList {
		liked, _ := h.repo.IsLikedBy(c.Request.Context(), p.ID, caller.ID)
		p.LikedByMe = liked
	}

	// Build next cursor from the last post's created_at
	resp := FeedResponse{Posts: postList}
	if len(postList) > 0 {
		cursor := postList[len(postList)-1].CreatedAt.UTC().Format(time.RFC3339Nano)
		resp.NextCursor = &cursor
	}

	c.JSON(http.StatusOK, resp)
}

// ── POST /posts ───────────────────────────────────────────────────────────────

type createPostRequest struct {
	Content  string   `json:"content"  binding:"required,min=1"`
	MediaURL *string  `json:"media_url"`
	PostType PostType `json:"post_type"`
}

// CreatePost godoc
// @Summary      Create a new post
// @Tags         Posts
// @Accept       json
// @Produce      json
// @Param        body body createPostRequest true "Post payload"
// @Success      201 {object} Post
// @Router       /posts [post]
func (h *Handler) CreatePost(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	var req createPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	// Default to "general" if not provided
	if req.PostType == "" {
		req.PostType = PostTypeGeneral
	}

	post, err := h.repo.Create(c.Request.Context(), CreatePostParams{
		AuthorID: caller.ID,
		Content:  req.Content,
		MediaURL: req.MediaURL,
		PostType: req.PostType,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// ── GET /posts/:id ────────────────────────────────────────────────────────────

// GetPost godoc
// @Summary      Get a single post by ID
// @Tags         Posts
// @Produce      json
// @Param        id path string true "Post UUID"
// @Success      200 {object} Post
// @Failure      404 {object} ErrorResponse
// @Router       /posts/{id} [get]
func (h *Handler) GetPost(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	post, err := h.repo.GetByID(c.Request.Context(), c.Param("id"))
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "post not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	post.LikedByMe, _ = h.repo.IsLikedBy(c.Request.Context(), post.ID, caller.ID)
	c.JSON(http.StatusOK, post)
}

// ── DELETE /posts/:id ─────────────────────────────────────────────────────────

// DeletePost godoc
// @Summary      Delete a post (author only)
// @Tags         Posts
// @Param        id path string true "Post UUID"
// @Success      204
// @Failure      403 {object} ErrorResponse
// @Router       /posts/{id} [delete]
func (h *Handler) DeletePost(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	err := h.repo.Delete(c.Request.Context(), c.Param("id"), caller.ID)
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, ErrorResponse{Message: "post not found"})
		return
	}
	if errors.Is(err, ErrForbidden) {
		c.JSON(http.StatusForbidden, ErrorResponse{Message: "you are not the author of this post"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ── POST /posts/:id/like ──────────────────────────────────────────────────────

type likeResponse struct {
	Liked     bool `json:"liked"`
	LikeCount int  `json:"like_count"`
}

// ToggleLike godoc
// @Summary      Toggle like on a post
// @Tags         Posts
// @Param        id path string true "Post UUID"
// @Success      200 {object} likeResponse
// @Router       /posts/{id}/like [post]
func (h *Handler) ToggleLike(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	postID := c.Param("id")

	liked, err := h.repo.ToggleLike(c.Request.Context(), postID, caller.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Re-fetch to get the updated like_count from the DB trigger
	post, err := h.repo.GetByID(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Fire-and-forget: notify post author only on like (not unlike)
	if liked && post.AuthorID != caller.ID {
		actorID := caller.ID
		entityID := postID
		entityType := "post"
		go h.notifSvc.Send(
			context.Background(),
			post.AuthorID,
			&actorID,
			"like",
			caller.FullName+" liked your post",
			&entityID,
			&entityType,
		)
	}

	c.JSON(http.StatusOK, likeResponse{Liked: liked, LikeCount: post.LikeCount})
}

// ── GET /posts/:id/comments ───────────────────────────────────────────────────

// GetComments godoc
// @Summary      List comments on a post
// @Tags         Posts
// @Param        id path string true "Post UUID"
// @Success      200 {array} Comment
// @Router       /posts/{id}/comments [get]
func (h *Handler) GetComments(c *gin.Context) {
	comments, err := h.repo.GetComments(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, comments)
}

// ── POST /posts/:id/comments ──────────────────────────────────────────────────

type addCommentRequest struct {
	Content string `json:"content" binding:"required,min=1"`
}

// AddComment godoc
// @Summary      Add a comment to a post
// @Tags         Posts
// @Accept       json
// @Produce      json
// @Param        id   path string          true "Post UUID"
// @Param        body body addCommentRequest true "Comment content"
// @Success      201 {object} Comment
// @Router       /posts/{id}/comments [post]
func (h *Handler) AddComment(c *gin.Context) {
	caller, ok := h.callerUser(c)
	if !ok {
		return
	}

	var req addCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	comment, err := h.repo.AddComment(c.Request.Context(), c.Param("id"), caller.ID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: err.Error()})
		return
	}

	// Fire-and-forget: notify post author (skip if commenting on own post)
	post, _ := h.repo.GetByID(c.Request.Context(), c.Param("id"))
	if post != nil && post.AuthorID != caller.ID {
		actorID := caller.ID
		entityID := post.ID
		entityType := "post"
		go h.notifSvc.Send(
			context.Background(),
			post.AuthorID,
			&actorID,
			"comment",
			caller.FullName+" commented on your post",
			&entityID,
			&entityType,
		)
	}

	c.JSON(http.StatusCreated, comment)
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Message string `json:"message"`
}
