import React from "react";
import { render, screen } from "@testing-library/react-native";
import LoginScreen from "../../src/screens/LoginScreen";

jest.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({
    login: jest.fn(),
    user: null,
    token: null,
    isLoading: false,
    register: jest.fn(),
    verifyEmail: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock("../../src/api/client", () => ({
  API_BASE_URL: "http://localhost:8000",
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

const mockRoute = {
  params: undefined,
  key: "login",
  name: "Login" as const,
} as any;

describe("LoginScreen", () => {
  it("renders email input", () => {
    render(<LoginScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByTestId("email-input")).toBeTruthy();
  });

  it("renders password input", () => {
    render(<LoginScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByTestId("password-input")).toBeTruthy();
  });

  it("renders register link", () => {
    render(<LoginScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByTestId("register-link")).toBeTruthy();
  });

  it("renders the Yuni tagline", () => {
    render(<LoginScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByText(/university students/i)).toBeTruthy();
  });
});
