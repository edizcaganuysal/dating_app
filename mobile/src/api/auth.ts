import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./client";
import { LoginResponse, RegisterData, RegisterResponse, User } from "../types";

export async function register(data: RegisterData): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>(
    "/api/auth/register",
    data
  );
  return response.data;
}

export async function verifyEmail(
  email: string,
  otp: string
): Promise<void> {
  await apiClient.post("/api/auth/verify-email", { email, otp });
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/api/auth/login", {
    email,
    password,
  });
  await AsyncStorage.setItem("token", response.data.access_token);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>("/api/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem("token");
}
