import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useNavigate } from "react-router-dom";
import { ThankYou } from "../ThankYou";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

const renderWithProvider = (component: React.ReactElement) => {
  (useNavigate as jest.Mock).mockImplementation(() => mockNavigate);
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("ThankYou", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockNavigate.mockClear();
  });

  it("renders correctly", () => {
    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/Welcome to Speedy Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Dashboard/i)).toBeInTheDocument();
  });

  it("displays selected day from context", () => {
    // Mock the context with a selected day
    const mockState = {
      selectedDay: 1, // Monday
      selectedTime: "10:00 AM",
      teamName: "Engineering Team",
      teamMembers: [{ fullName: "John Doe", email: "john@example.com" }],
    };

    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/Monday/i)).toBeInTheDocument();
  });

  it("displays selected time from context", () => {
    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/10:00 AM/i)).toBeInTheDocument();
  });

  it("displays team name from context", () => {
    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/Engineering Team/i)).toBeInTheDocument();
  });

  it("navigates to dashboard when button is clicked", () => {
    renderWithProvider(<ThankYou />);

    const dashboardButton = screen.getByText(/Go to Dashboard/i);
    fireEvent.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("displays success icon", () => {
    renderWithProvider(<ThankYou />);

    // Check for the checkmark icon
    const checkmarkIcon = screen.getByRole("img", { hidden: true });
    expect(checkmarkIcon).toBeInTheDocument();
  });

  it("displays team member count", () => {
    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/1 team member/i)).toBeInTheDocument();
  });

  it("handles plural team member count correctly", () => {
    // Mock context with multiple team members
    const mockState = {
      selectedDay: 1,
      selectedTime: "10:00 AM",
      teamName: "Engineering Team",
      teamMembers: [
        { fullName: "John Doe", email: "john@example.com" },
        { fullName: "Jane Smith", email: "jane@example.com" },
      ],
    };

    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/2 team members/i)).toBeInTheDocument();
  });

  it("displays confirmation message", () => {
    renderWithProvider(<ThankYou />);
    expect(screen.getByText(/You're all set/i)).toBeInTheDocument();
  });

  it("maintains consistent styling", () => {
    renderWithProvider(<ThankYou />);

    // Check for Urbanist font class
    const heading = screen.getByText(/Welcome to Speedy Status/i);
    expect(heading).toHaveClass("font-['Urbanist']");

    // Check for accent color
    expect(heading.innerHTML).toContain("border-[#fda303]");
  });

  it("handles keyboard navigation", () => {
    renderWithProvider(<ThankYou />);

    const dashboardButton = screen.getByText(/Go to Dashboard/i);
    dashboardButton.focus();

    // Press Enter
    fireEvent.keyDown(dashboardButton, { key: "Enter", code: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");

    mockNavigate.mockClear();

    // Press Space
    fireEvent.keyDown(dashboardButton, { key: " ", code: "Space" });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
