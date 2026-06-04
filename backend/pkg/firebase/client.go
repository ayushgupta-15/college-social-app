package firebase

import (
	"context"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

type Client struct {
	Auth      *auth.Client
	Messaging *messaging.Client // used by notifications.Service for FCM push delivery
}

// NewClient initialises the Firebase Admin SDK.
//
// Credential resolution order:
//  1. FIREBASE_CREDENTIALS env var — full service account JSON (used on Render/production)
//  2. credentialFile path argument — local serviceAccountKey.json (used in dev)
func NewClient(credentialFile string) *Client {
	var opt option.ClientOption

	if creds := os.Getenv("FIREBASE_CREDENTIALS"); creds != "" {
		// Production: credentials injected as env var
		opt = option.WithCredentialsJSON([]byte(creds))
		log.Println("🔑 Firebase: using FIREBASE_CREDENTIALS env var")
	} else {
		// Local dev: credentials loaded from file
		opt = option.WithCredentialsFile(credentialFile)
		log.Printf("🔑 Firebase: using credential file %s", credentialFile)
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
		// Non-fatal — FCM push is optional; in-app notifications still work
		log.Printf("⚠️  Firebase Messaging unavailable (push notifications disabled): %v", err)
	}

	log.Println("✅ Firebase Admin SDK initialized")
	return &Client{Auth: authClient, Messaging: msgClient}
}

// VerifyIDToken validates a Firebase ID token and returns the decoded token.
func (c *Client) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	return c.Auth.VerifyIDToken(ctx, idToken)
}

