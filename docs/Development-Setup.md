# Development Setup

This guide will help you get CampusConnect running on your local machine for development and testing.

## Prerequisites

- **Go 1.22+**
- **Node.js 20+**
- **PostgreSQL 16+**
- **Redis 7+**
- **Expo CLI** (`npm install -g expo-cli`)
- A Firebase project with:
  - `google-services.json` (for Android mobile)
  - `serviceAccountKey.json` (for backend Admin SDK)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the environment variables template and configure it:
   ```bash
   cp .env.example .env
   ```
   *Make sure to provide your local `DATABASE_URL`, `REDIS_URL`, and `FIREBASE_PROJECT_ID`.*
3. Download dependencies:
   ```bash
   go mod download
   ```
4. Start the server:
   ```bash
   go run cmd/server/main.go
   ```
   *The backend should now be running on `http://localhost:8080`.*

## Mobile App Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add your `google-services.json` to the root of the mobile folder.
4. Start the Expo development server:
   ```bash
   npx expo start
   ```
5. Scan the QR code with the **Expo Go** app on your physical device, or press `a`/`i` to launch an Android emulator or iOS simulator.
