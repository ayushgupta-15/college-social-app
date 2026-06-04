package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	firebasepkg "github.com/ayushgupta-15/college-social-app/backend/pkg/firebase"
)

// WSAuth is like Auth but reads the Firebase ID token from the
// "token" query parameter instead of the Authorization header.
// WebSocket upgrade requests from mobile clients cannot set custom headers,
// so the token is passed as: /ws?token=<firebase_jwt>
func WSAuth(fb *firebasepkg.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		idToken := c.Query("token")
		if idToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "missing 'token' query parameter",
			})
			return
		}

		token, err := fb.VerifyIDToken(c.Request.Context(), idToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "invalid or expired Firebase token",
			})
			return
		}

		c.Set(ContextKeyUID, token.UID)
		c.Next()
	}
}
