package notifications

import (
	"context"
	"log"

	"firebase.google.com/go/v4/messaging"
)

// Service handles both DB persistence and FCM push delivery for notifications.
// It is designed to be called fire-and-forget (go svc.Send(...)) from handlers.
type Service struct {
	repo      *Repository
	fcmClient *messaging.Client // nil if FCM not available
}

func NewService(repo *Repository, fcmClient *messaging.Client) *Service {
	return &Service{repo: repo, fcmClient: fcmClient}
}

// Send creates a notification in the DB and, if the recipient has a device token,
// sends an FCM push notification.
//
// Always call as a goroutine: go notifSvc.Send(...)
// Errors are logged, never propagated — a notification failure should never
// break the action that triggered it.
func (s *Service) Send(
	ctx context.Context,
	toUserID string,   // recipient's internal UUID
	actorID *string,   // who triggered it (nil for system notifications)
	notifType string,  // matches notification_type_enum: like | comment | follow | etc.
	message string,    // human-readable text for the push notification body
	entityID *string,  // the post/group/event UUID this relates to (optional)
	entityType *string, // "post" | "comment" | "group" | "event" | "message"
) {
	msg := message
	// 1. Always persist to DB
	_, err := s.repo.Create(ctx, toUserID, actorID, notifType, &msg, entityID, entityType)
	if err != nil {
		log.Printf("notifications: failed to create DB record: %v", err)
		return
	}

	// 2. Fetch device token (skip FCM if none or client not initialized)
	if s.fcmClient == nil {
		return
	}
	token, err := s.repo.GetFcmToken(ctx, toUserID)
	if err != nil || token == nil {
		return // no token = user hasn't enabled push, silently skip
	}

	// 3. Send FCM push (best-effort — log and continue on failure)
	fcmMsg := &messaging.Message{
		Token: *token,
		Notification: &messaging.Notification{
			Title: notifTypeTitle(notifType),
			Body:  message,
		},
		Data: map[string]string{
			"type":        notifType,
			"entity_id":   strOrEmpty(entityID),
			"entity_type": strOrEmpty(entityType),
		},
		Android: &messaging.AndroidConfig{
			Priority: "high",
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{Sound: "default"},
			},
		},
	}

	if _, err := s.fcmClient.Send(ctx, fcmMsg); err != nil {
		log.Printf("notifications: FCM send failed for user %s: %v", toUserID, err)
	}
}

// ── helpers ───────────────────────────────────────────────────────────────────

func notifTypeTitle(t string) string {
	switch t {
	case "like":
		return "Someone liked your post"
	case "comment":
		return "New comment on your post"
	case "follow":
		return "New follower"
	case "group_join":
		return "Someone joined your group"
	case "event":
		return "Upcoming event reminder"
	case "message":
		return "New message"
	default:
		return "CampusConnect"
	}
}

func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
