// Central axios instance used by every component so the backend base URL and auth header are configured in one place.

import axios from "axios";

// The baseURL points to the deployed Hugging Face Space backend. Switching between cloud and local backends only requires changing this single value.
const api = axios.create({
  baseURL: "https://b1sso-coursematic-backend.hf.space",
});

// Request interceptor attaches the JWT from localStorage to every outgoing request so protected endpoints receive the Authorization header automatically.
// Using an interceptor avoids having to remember to add the header at every call site.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
