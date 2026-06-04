package firebase

import (
	"context"
	"log"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

type Client struct {
	Auth      *auth.Client
	Messaging *messaging.Client
}

// NewClient initialises the Firebase Admin SDK.
//
// Credential resolution order (first match wins):
//  1. FIREBASE_CREDENTIALS env var — full service account JSON string (Render / any PaaS)
//  2. credentialFile arg starts with '{' — inline JSON passed as "path" by mistake, handled gracefully
//  3. credentialFile arg is a real file path — local dev (e.g. ./serviceAccountKey.json)
func NewClient(credentialFile string) *Client {
	var opt option.ClientOption

	switch {
	case os.Getenv("FIREBASE_CREDENTIALS") != "":
		// Production: JSON injected via env var — never log its contents
		opt = option.WithCredentialsJSON([]byte(os.Getenv("FIREBASE_CREDENTIALS")))
		log.Println("🔑 Firebase: using FIREBASE_CREDENTIALS env var")

	case strings.HasPrefix(strings.TrimSpace(credentialFile), "{"):
		// Defensive: someone set the "file path" config to raw JSON instead of a path.
		// Use it directly rather than crashing with "file name too long".
		opt = option.WithCredentialsJSON([]byte(credentialFile))
		log.Println("🔑 Firebase: using inline JSON credentials (FIREBASE_CREDENTIAL_FILE contained JSON)")

	default:
		// Local dev: real file path, safe to use
		opt = option.WithCredentialsFile(credentialFile)
		log.Println("🔑 Firebase: using local credential file")
		// Intentionally NOT logging the path — it could contain secrets if misconfigured
	}

	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase app: %v", err)
	}

	authClient, err := app.Auth(context.Background())
	if err != nil {
		log.Fatalf("Failed to initialize Firebase Auth client: %v", err)
	}

	msgClient, err := app.Messaging(context.Background())
	if err != nil {
		log.Printf("⚠️  Firebase Messaging unavailable (push notifications disabled): %v", err)
	}

	log.Println("✅ Firebase Admin SDK initialized")
	return &Client{Auth: authClient, Messaging: msgClient}
}

// VerifyIDToken validates a Firebase ID token and returns the decoded token.
func (c *Client) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	return c.Auth.VerifyIDToken(ctx, idToken)
}

