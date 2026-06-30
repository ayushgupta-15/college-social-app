<div align="center">
  <img src="docs/assets/hero_banner.png" alt="CampusConnect Banner" width="100%">
  
  <h3>The all-in-one social platform built for college students.</h3>
  <p>Network. Study. Chat. Events. Referrals.</p>

  <p>
    <a href="https://github.com/ayushgupta-15/college-social-app/commits/main">
      <img src="https://img.shields.io/github/last-commit/ayushgupta-15/college-social-app?style=for-the-badge&logo=github&color=000000&labelColor=222222" alt="Last Commit">
    </a>
    <a href="https://github.com/ayushgupta-15/college-social-app/stargazers">
      <img src="https://img.shields.io/github/stars/ayushgupta-15/college-social-app?style=for-the-badge&logo=github&color=000000&labelColor=222222" alt="Stars">
    </a>
    <a href="https://github.com/ayushgupta-15/college-social-app/issues">
      <img src="https://img.shields.io/github/issues/ayushgupta-15/college-social-app?style=for-the-badge&logo=github&color=000000&labelColor=222222" alt="Issues">
    </a>
  </p>

  > **Full-stack college social networking platform with React Native, Go, WebSockets, Firebase Auth, PostgreSQL, Redis, and real-time messaging.**
</div>

---

## 🎥 Demo

<div align="center">
  ![CampusConnect Demo](docs/assets/demo.mp4)
  <p><i>Login • Feed • Create post • Join group • Register event • Chat • Profile</i></p>
</div>

---

## 🎯 Why CampusConnect?

Students use multiple disconnected platforms:
- **LinkedIn** for networking
- **Discord** for chats
- **WhatsApp** for groups
- **Google Sheets** for referrals

**CampusConnect** unifies them into one mobile-first platform built specifically for college communities.

---

## ✨ Features

- **Auth & Profiles**: Firebase Auth, JWT, rich student profiles (major, graduation year, skills).
- **Social Feed**: Real-time cursor-paginated feed with optimistic likes and threaded comments.
- **Study Groups**: Discover and join subject-specific study groups.
- **Campus Events**: Browse, register, and track campus events with capacity enforcement.
- **Direct Messaging**: Real-time WebSocket chat with delivery states.
- **Notifications**: Real-time FCM push notifications for social actions.

---

## 🏗️ System Architecture

<div align="center">
  <img src="docs/architecture.png" alt="Architecture Diagram" width="800">
</div>

The platform is designed for scale and real-time responsiveness. Check out the [**Architecture Documentation**](docs/Architecture.md) for a deep dive into the system design.

---

## 📱 Mobile Experience

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="docs/assets/screen_feed.png" width="100%"><br><b>Feed</b></td>
      <td align="center"><img src="docs/assets/screen_groups.png" width="100%"><br><b>Groups</b></td>
      <td align="center"><img src="docs/assets/screen_events.png" width="100%"><br><b>Events</b></td>
    </tr>
    <tr>
      <td align="center"><img src="docs/assets/screen_messages.png" width="100%"><br><b>Messages</b></td>
      <td align="center"><img src="docs/assets/screen_profile.png" width="100%"><br><b>Profile</b></td>
      <td align="center"><img src="docs/assets/screen_create_post.png" width="100%"><br><b>Create Post</b></td>
    </tr>
  </table>
</div>

---

## ⚙️ Backend Architecture

Our Go-based backend manages data across multiple scalable services. 

Read more in the [**Architecture Wiki**](docs/Architecture.md).

---

## 🗄️ Database Design

The relational nature of our social graph (Users, Posts, Likes, Follows, Groups) is modeled in PostgreSQL.

<div align="center">
  <img src="docs/er-diagram.png" alt="Database Diagram" width="800">
</div>

For a full schema breakdown, see the [**Database Design Wiki**](docs/Database-Design.md).

---

## 📡 API Overview

A robust RESTful API paired with WebSockets. 

| Module        | Endpoints |
| ------------- | --------- |
| Auth          | 4         |
| Users         | 5         |
| Feed          | 7         |
| Groups        | 5         |
| Events        | 5         |
| Chat          | 3         |
| Notifications | 2         |

Explore the complete API specification in the [**API Reference Wiki**](docs/API-Reference.md).

---

## 🧩 Engineering Challenges

Building CampusConnect involved solving complex system design problems:
- **JWT authentication** bridging Firebase and backend sessions.
- **WebSocket scaling** for real-time messaging.
- **Cursor pagination** for a drift-free feed experience.
- **Transactional joins** across highly relational data.
- **Push notifications** integration via Firebase Cloud Messaging.
- **Cloudinary uploads** for high-performance media delivery.
- **Firebase integration** handling robust authentication lifecycle.
- **Redis session caching** for rapid access and reduced database load.

---

## 🛠 Tech Stack

**Mobile**
![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

**Backend**
![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/gin-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)

**Database & Cache**
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=black)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)

**Infrastructure & Services**
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=Cloudinary&logoColor=white)
![Render](https://img.shields.io/badge/Render-%46E3B7.svg?style=for-the-badge&logo=render&logoColor=white)

---

## 📁 Folder Structure

```
college-social-app/
├── backend/                    # Go + Gin REST API & WebSockets
├── mobile/                     # React Native + Expo App
└── docs/                       # Project Documentation
```

---

## 🚀 Setup & Deployment

- **[Development Setup](docs/Development-Setup.md)**: Instructions for running the mobile app and backend locally.
- **[Deployment Guide](docs/Deployment-Guide.md)**: Details on deploying to Render and configuring production services.

---

## 🗺️ Roadmap

- [ ] AI Resume Review & Career Guidance
- [ ] Referral Marketplace between seniors and juniors
- [ ] Placement & Internship Tracker
- [ ] Global cross-entity search
- [ ] Media uploads for avatars, posts, and event banners

---

## 📄 License

MIT © 2026
