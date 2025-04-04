import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountCreation } from "../AccountCreation";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: "",
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

const mockOnboardingState = {
  selectedDay: 1,
  selectedTime: "10:00",
  teamName: "Test Team",
  teamMembers: [
    { fullName: "John Doe", email: "john@example.com" },
    { fullName: "Jane Smith", email: "jane@example.com" },
  ],
  accountEmail: "",
  accountPassword: "",
  currentStep: 5,
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("AccountCreation", () => {
  beforeEach(() => {
    mockLocation.href = "";
    mockFetch.mockClear();
  });

  it("renders correctly", () => {
    renderWithProvider(<AccountCreation />);
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("validates email format", async () => {
    renderWithProvider(<AccountCreation />);
    const emailInput = screen.getByPlaceholderText("Email Address");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);

    // Wait for validation message
    await waitFor(() => {
      const errorMessage = screen.getByText(
        "Please enter a valid email address"
      );
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it("validates password requirements", async () => {
    renderWithProvider(<AccountCreation />);
    const passwordInput = screen.getByPlaceholderText("Password");
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    fireEvent.blur(passwordInput);

    // Wait for validation message
    await waitFor(() => {
      const errorMessage = screen.getByText(
        /Password must be at least 8 characters/
      );
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it("handles successful account creation", async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "mock-access-token",
              refresh_token: "mock-refresh-token",
            }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "team-id" }),
        })
      );

    renderWithProvider(<AccountCreation />);

    // Fill in form
    await userEvent.type(
      screen.getByPlaceholderText("Email Address"),
      "test@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Password"),
      "ValidPass123"
    );

    // Submit form
    const submitButton = screen.getByText("Create Account").closest("button");
    fireEvent.click(submitButton!);

    // Verify API calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Verify first API call (registration)
    expect(mockFetch.mock.calls[0][0]).toBe("/api/v1/auth/register");
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      email: "test@example.com",
      password: "ValidPass123",
    });

    // Verify second API call (team creation)
    expect(mockFetch.mock.calls[1][0]).toBe("/api/v1/teams");
    expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer mock-access-token"
    );

    // Verify tokens were stored
    expect(localStorage.getItem("accessToken")).toBe("mock-access-token");
    expect(localStorage.getItem("refreshToken")).toBe("mock-refresh-token");
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            detail: "Email already exists",
          }),
      })
    );

    renderWithProvider(<AccountCreation />);

    await userEvent.type(
      screen.getByPlaceholderText("Email Address"),
      "test@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Password"),
      "ValidPass123"
    );

    fireEvent.click(screen.getByText("Create Account"));

    expect(await screen.findByText("Email already exists")).toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    mockFetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      access_token: "test-token",
                      refresh_token: "test-refresh-token",
                    }),
                }),
              100
            )
          )
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1 }),
        })
      );

    renderWithProvider(<AccountCreation />);

    // Fill in valid data
    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "ValidPass123" },
    });

    // Get the submit button specifically
    const submitButton = screen.getByText("Create Account").closest("button");
    expect(submitButton).toBeInTheDocument();

    // Click the submit button
    fireEvent.click(submitButton!);

    // Check loading state
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("redirects to thank you page on successful submission", async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "test-token",
              refresh_token: "test-refresh-token",
            }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1 }),
        })
      );

    renderWithProvider(<AccountCreation />);

    // Fill in valid data
    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "ValidPass123" },
    });

    // Submit the form
    const submitButton = screen.getByText("Create Account").closest("button");
    fireEvent.click(submitButton!);

    // Wait for redirect
    await waitFor(() => {
      expect(mockLocation.href).toBe("/thank-you");
    });
  });
});
