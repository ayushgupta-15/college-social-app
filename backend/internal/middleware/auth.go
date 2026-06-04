package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	firebasepkg "github.com/ayushgupta-15/college-social-app/backend/pkg/firebase"
)

// ContextKeyUID is the gin context key under which the verified Firebase UID is stored.
const ContextKeyUID = "firebase_uid"

// Auth returns a Gin middleware that validates a Firebase ID token from the
// Authorization header ("Bearer <token>") and injects the UID into the context.
func Auth(fb *firebasepkg.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "missing or malformed Authorization header",
			})
			return
		}

		idToken := strings.TrimPrefix(header, "Bearer ")

		token, err := fb.VerifyIDToken(c.Request.Context(), idToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "invalid or expired Firebase token",
			})
			return
		}

		// Attach the verified UID so handlers can read it with:
		//   uid := c.GetString(middleware.ContextKeyUID)
		c.Set(ContextKeyUID, token.UID)
		c.Next()
	}
}
