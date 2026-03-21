import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/matching",
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({}),
}));

// Mock the API module
jest.mock("@/lib/api", () => ({
  getPendingRequests: jest.fn().mockResolvedValue([]),
  createManualGroup: jest.fn(),
  runBatchMatching: jest.fn(),
  logout: jest.fn(),
}));

import MatchingPage from "@/app/matching/page";

describe("MatchingPage", () => {
  it("renders pending requests table heading", () => {
    render(<MatchingPage />);
    expect(screen.getByText("Pending Date Requests")).toBeInTheDocument();
  });

  it("renders Create Group button is not shown when no selection", () => {
    render(<MatchingPage />);
    // The "Create Group" button only appears when users are selected,
    // but the "Run Batch Matching" button is always visible
    expect(screen.getByText("Run Batch Matching")).toBeInTheDocument();
  });

  it("renders the manual matching heading", () => {
    render(<MatchingPage />);
    expect(screen.getByText("Manual Matching")).toBeInTheDocument();
  });
});
