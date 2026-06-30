# Deployment Guide

CampusConnect is designed to be easily deployed using modern cloud services. The backend is currently configured for deployment on **Render**, using Docker and a managed PostgreSQL instance.

## Backend Deployment (Render)

1. Create a new **Web Service** on Render and link the GitHub repository.
2. Select **Docker** as the environment.
3. Configure the following environment variables:
   - `DATABASE_URL` (Provided by your Render PostgreSQL instance)
   - `REDIS_URL` (Provided by your managed Redis provider)
   - `PORT` (Typically 8080 or let Render assign one)
   - `FIREBASE_PROJECT_ID`
   - `GOOGLE_APPLICATION_CREDENTIALS` (Store the contents of `serviceAccountKey.json` as a secret file or base64 encoded string)

## Database (Render PostgreSQL)

- Spin up a Render PostgreSQL database.
- Obtain the `Internal Database URL` and use it as `DATABASE_URL` for the Web Service.
- The Go app will automatically run migrations upon startup if configured, or you can run migrations manually.

## Mobile Application

The React Native application is built using Expo.

- **Development**: Use `npx expo start` to run locally via the Expo Go app.
- **Production Build (EAS)**:
  Use Expo Application Services (EAS) to build standalone APK/AAB or IPA files.
  ```bash
  eas build --platform all
  ```
  Ensure that you update the API base URL in your mobile app to point to your deployed Render URL before building.
