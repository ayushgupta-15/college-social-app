# API Reference

All protected routes require an `Authorization: Bearer <firebase_id_token>` header.

### Auth
```text
POST   /auth/register          → Create user record after Firebase signup
```

### Users
```text
GET    /users/me               → Own profile
PATCH  /users/me               → Update profile
GET    /users/:id              → Public profile
POST   /users/:id/follow       → Follow
DELETE /users/:id/follow       → Unfollow
GET    /users/:id/followers    → Follower list
GET    /users/:id/following    → Following list
```

### Feed
```text
GET    /posts                  → Cursor-paginated feed (?before=RFC3339)
POST   /posts                  → Create post
DELETE /posts/:id              → Delete own post
POST   /posts/:id/like         → Toggle like → {liked, like_count}
GET    /posts/:id/comments     → List comments
POST   /posts/:id/comments     → Add comment
```

### Groups
```text
GET    /groups                 → List (?subject=, ?search=)
GET    /groups/:id             → Single group
POST   /groups                 → Create group
POST   /groups/:id/join        → Join
POST   /groups/:id/leave       → Leave
```

### Events
```text
GET    /events                 → List (?is_online=, ?from_date=RFC3339)
GET    /events/:id             → Single event
POST   /events                 → Create event
POST   /events/:id/register    → Register (201 / 409 capacity full)
DELETE /events/:id/register    → Cancel registration
```

### Messaging & Notifications
```text
WS     /ws/chat                → WebSocket real-time direct messaging
GET    /messages/:chatId       → Message history (REST)
GET    /notifications          → Notification list
PATCH  /notifications/read     → Mark all as read
POST   /notifications/fcm      → Register FCM push token
```
