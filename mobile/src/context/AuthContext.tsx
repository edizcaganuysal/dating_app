import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, RegisterData, RegisterResponse } from "../types";
import * as authApi from "../api/auth";
import { registerForPushNotifications } from "../hooks/useNotifications";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStoredToken();
  }, []);

  async function checkStoredToken() {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        const me = await authApi.getMe();
        setUser(me);
        // Register push token silently
        registerForPushNotifications().catch(() => {});
      }
    } catch {
      await AsyncStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(email: string, password: string) {
    const response = await authApi.login(email, password);
    setToken(response.access_token);
    const me = await authApi.getMe();
    setUser(me);
    // Register push token after login
    registerForPushNotifications().catch(() => {});
  }

  async function handleRegister(data: RegisterData): Promise<RegisterResponse> {
    return authApi.register(data);
  }

  async function handleVerifyEmail(email: string, otp: string) {
    await authApi.verifyEmail(email, otp);
  }

  function handleLogout() {
    authApi.logout();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        verifyEmail: handleVerifyEmail,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
