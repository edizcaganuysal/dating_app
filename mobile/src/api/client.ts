import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use your Mac's local IP so the phone can reach the backend.
// If this IP changes, update it here or set EXPO_PUBLIC_API_URL env var.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://100.70.71.80:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
