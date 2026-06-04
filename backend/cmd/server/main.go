package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ayushgupta-15/college-social-app/backend/internal/auth"
	"github.com/ayushgupta-15/college-social-app/backend/internal/chat"
	"github.com/ayushgupta-15/college-social-app/backend/internal/events"
	"github.com/ayushgupta-15/college-social-app/backend/internal/groups"
	"github.com/ayushgupta-15/college-social-app/backend/internal/middleware"
	"github.com/ayushgupta-15/college-social-app/backend/internal/notifications"
	"github.com/ayushgupta-15/college-social-app/backend/internal/posts"
	"github.com/ayushgupta-15/college-social-app/backend/internal/users"
	"github.com/ayushgupta-15/college-social-app/backend/pkg/config"
	"github.com/ayushgupta-15/college-social-app/backend/pkg/database"
	firebasepkg "github.com/ayushgupta-15/college-social-app/backend/pkg/firebase"
)

func main() {
	// Load config
	cfg := config.Load()

	// Set Gin mode
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to Neon PostgreSQL
	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	// Initialize Firebase Admin SDK (Auth + Messaging)
	fbClient := firebasepkg.NewClient(cfg.FirebaseCredentialFile)

	// Start the WebSocket Hub — runs for the lifetime of the server
	hub := chat.NewHub()
	go hub.Run()

	// ── Repositories ──────────────────────────────────────────────────────────
	userRepo  := users.NewRepository(db)
	postRepo  := posts.NewRepository(db)
	groupRepo := groups.NewRepository(db)
	eventRepo := events.NewRepository(db)
	chatRepo  := chat.NewRepository(db)
	notifRepo := notifications.NewRepository(db)

	// ── Notification service (shared across handlers) ─────────────────────────
	notifSvc := notifications.NewService(notifRepo, fbClient.Messaging)

	// ── Services & Handlers ───────────────────────────────────────────────────
	authService  := auth.NewService(fbClient, userRepo)
	authHandler  := auth.NewHandler(authService)
	userHandler  := users.NewHandler(userRepo, notifSvc)
	postHandler  := posts.NewHandler(postRepo, userRepo, notifSvc)
	groupHandler := groups.NewHandler(groupRepo, userRepo)
	eventHandler := events.NewHandler(eventRepo, userRepo)
	chatHandler  := chat.NewHandler(hub, chatRepo, userRepo)

	// getUserID is a closure that resolves a Firebase UID to the internal UUID.
	// Passed to notifications.Handler to avoid circular imports.
	getUserID := func(firebaseUID string, c *gin.Context) (string, bool) {
		u, err := userRepo.GetByFirebaseUID(c.Request.Context(), firebaseUID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "user not found"})
			return "", false
		}
		return u.ID, true
	}
	notifHandler := notifications.NewHandler(notifRepo, getUserID)

	// ── Router ────────────────────────────────────────────────────────────────
	r := gin.Default()

	// Health check (no auth required)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// WebSocket — token in query param (/ws?token=<firebase_jwt>)
	r.GET("/ws", middleware.WSAuth(fbClient), chatHandler.ServeWS)

	// API v1
	v1 := r.Group("/api/v1")

	// Public routes — no JWT required
	authHandler.RegisterRoutes(v1)

	// Protected routes — all require a valid Firebase JWT
	protected := v1.Group("/")
	protected.Use(middleware.Auth(fbClient))
	{
		userHandler.RegisterRoutes(protected)
		postHandler.RegisterRoutes(protected)
		groupHandler.RegisterRoutes(protected)
		eventHandler.RegisterRoutes(protected)
		chatHandler.RegisterRoutes(protected)
		notifHandler.RegisterRoutes(protected)
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Server running on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

