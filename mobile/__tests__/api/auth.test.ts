import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../src/api/client";
import { register, login, logout } from "../../src/api/auth";

jest.mock("../../src/api/client");

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("auth API", () => {
  describe("register", () => {
    it("calls POST /api/auth/register with correct payload", async () => {
      const registerData = {
        email: "test@utoronto.ca",
        password: "password123",
        first_name: "Jane",
        last_name: "Doe",
        phone: "4161234567",
        gender: "female",
        age: 21,
      };
      const responseData = {
        id: "uuid-123",
        email: "test@utoronto.ca",
        otp: "123456",
      };
      mockedClient.post.mockResolvedValueOnce({ data: responseData });

      const result = await register(registerData);

      expect(mockedClient.post).toHaveBeenCalledWith(
        "/api/auth/register",
        registerData
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("login", () => {
    it("calls POST /api/auth/login and stores token", async () => {
      const responseData = {
        access_token: "jwt-token-123",
        token_type: "bearer",
      };
      mockedClient.post.mockResolvedValueOnce({ data: responseData });

      const result = await login("test@utoronto.ca", "password123");

      expect(mockedClient.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "test@utoronto.ca",
        password: "password123",
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "token",
        "jwt-token-123"
      );
      expect(result).toEqual(responseData);
    });
  });

  describe("logout", () => {
    it("clears token from AsyncStorage", async () => {
      await logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("token");
    });
  });
});
