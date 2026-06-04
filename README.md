# 🎓 CampusConnect — College Social App

> A full-stack mobile platform for college students to network, find referrals, join study groups, discover events, and connect with opportunities — all in one place.

---

## 📸 Preview

> _Architecture diagram and UI screenshots coming soon._

---

## 🚀 What This App Does

CampusConnect solves a real problem: **college students have no single platform** for academic networking, peer referrals, study collaboration, and campus events. LinkedIn is too formal. Instagram is too personal. CampusConnect is built specifically for the college context.

### Core Features (MVP)

| Feature | Description |
|---------|-------------|
| 🔐 Authentication | Firebase Auth — email/password + college email verification |
| 👤 Profiles | Student profiles with major, year, skills, and referral availability |
| 📰 Feed | Post updates, opportunities, and announcements |
| 📚 Study Groups | Create and join subject-specific study groups |
| 📅 Events | Browse and register for campus events |
| 💬 Messaging | Real-time direct messaging between students |
| 🔔 Notifications | Push notifications via Firebase Cloud Messaging |

### Future Features

- 🤖 AI Resume Review
- 🧭 AI Career Guidance
- 🤝 Referral Marketplace
- 📊 Placement Tracker

---

## 🏗️ Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| 📱 Mobile | React Native + Expo SDK + TypeScript | Cross-platform, fast iteration |
| ⚙️ Backend | Golang + Gin | High concurrency, low latency |
| 🗄️ Database | PostgreSQL | Relational integrity for social graph |
| ⚡ Cache | Redis | Session store + feed caching |
| 🔐 Auth | Firebase Auth | Managed auth, easy college email rules |
| 🖼️ Storage | Cloudinary | CDN-backed media uploads |
| 🔔 Push Notifs | Firebase Cloud Messaging | Cross-platform push delivery |
| ☁️ Deployment | Railway + Neon PostgreSQL | Zero-config cloud deployment |
| 🎨 Design | Figma | Clickable prototype before any code |
| 📄 API Docs | Swagger / OpenAPI | Self-documenting REST API |

---

## 🗺️ System Architecture

> _See [`docs/architecture.png`](./docs/architecture.png) for the full diagram._

```
React Native App (Expo)
        │
   API Gateway (Gin Router)
        │
┌───────┬──────┬──────┬──────────┐
│       │      │      │          │
Auth   Feed  Chat  Events    Notifs
        │
   PostgreSQL ──── Redis
        │
   Firebase Auth / FCM
   Cloudinary (Media)
```

---

## 🗄️ Database Schema

> _See [`docs/er-diagram.png`](./docs/er-diagram.png) for the full ER diagram._

Core tables: `users`, `posts`, `comments`, `groups`, `group_memberships`, `messages`, `events`, `event_registrations`, `notifications`

---

## 📁 Project Structure

```
college-social-app/
├── README.md
├── backend/              # Golang + Gin API
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── posts/
│   │   ├── groups/
│   │   ├── events/
│   │   └── chat/
│   └── pkg/
│       ├── config/
│       └── database/
├── mobile/               # React Native + Expo
│   └── src/
│       ├── components/
│       ├── screens/
│       ├── navigation/
│       ├── hooks/
│       ├── services/
│       ├── context/
│       ├── types/
│       ├── utils/
│       └── assets/
└── docs/
    ├── architecture.png
    ├── er-diagram.png
    └── api.yaml
```

---

## 📡 API Overview

> Full documentation available in [`docs/api.yaml`](./docs/api.yaml) (Swagger/OpenAPI 3.0)

### Auth
```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
```

### Posts
```
GET    /posts
POST   /posts
GET    /posts/:id
DELETE /posts/:id
POST   /posts/:id/like
POST   /posts/:id/comment
```

### Messaging
```
GET    /messages/:chatId
POST   /messages/send
```

### Groups & Events
```
GET    /groups
POST   /groups
POST   /groups/:id/join

GET    /events
POST   /events
POST   /events/:id/register
```

---

## 🛣️ Development Roadmap

| Sprint | Feature | Status |
|--------|---------|--------|
| 1 | Authentication | ⬜ Not Started |
| 2 | User Profiles | ⬜ Not Started |
| 3 | Posts Feed | ⬜ Not Started |
| 4 | Study Groups | ⬜ Not Started |
| 5 | Events | ⬜ Not Started |
| 6 | Messaging | ⬜ Not Started |
| 7 | Notifications | ⬜ Not Started |
| 8 | Testing + Deployment | ⬜ Not Started |

---

## 🧑‍💻 Local Development

> _Setup instructions will be added as each service is scaffolded._

### Prerequisites
- Go 1.22+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Expo CLI

### Backend
```bash
cd backend
go mod download
go run cmd/server/main.go
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

---

## 🎯 Interview Artifacts

| Artifact | Status | Link |
|----------|--------|------|
| Architecture Diagram | 🟡 In Progress | `docs/architecture.png` |
| ER Diagram | 🟡 In Progress | `docs/er-diagram.png` |
| API Documentation | ⬜ Planned | `docs/api.yaml` |
| Demo Video | ⬜ Planned | — |
| Live Deployment | ⬜ Planned | Railway + Neon |

---

## 📄 License

MIT © 2026
