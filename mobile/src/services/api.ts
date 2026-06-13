import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Base URL ──────────────────────────────────────────────────────────────────
// For local dev on a physical device replace the emulator loopback with your
// machine's LAN IP: e.g. http://192.168.1.x:8080/api/v1
const BASE_URL = __DEV__
  ? 'http://10.0.2.2:8080/api/v1'                          // Android emulator → host loopback
  : 'https://college-social-app-d7mm.onrender.com/api/v1'; // production ✅

export const RENDER_BASE_URL = 'https://college-social-app-d7mm.onrender.com/api/v1';

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 25000, // 25s — Render free tier cold start can take ~18s
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach JWT on every call ────────────────────────────
// Written once here; every screen just imports api and calls api.get/post/etc.
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — standardise errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear storage so AuthContext re-routes to login
      await SecureStore.deleteItemAsync('token');
    }
    // Re-throw with backend message if available
    const message =
      error.response?.data?.message ?? error.message ?? 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export default api;
