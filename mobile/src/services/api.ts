import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Base URL ──────────────────────────────────────────────────────────────────
// Using Render for both dev + prod since the Go backend isn't running locally.
// To test against a local server: swap RENDER_BASE_URL → 'http://10.0.2.2:8080/api/v1'
export const RENDER_BASE_URL = 'https://college-social-app-d7mm.onrender.com/api/v1';

const BASE_URL = RENDER_BASE_URL;

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
