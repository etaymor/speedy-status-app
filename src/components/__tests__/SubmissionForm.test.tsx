import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubmissionForm } from "../SubmissionForm";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockOnSubmitSuccess = jest.fn();

const renderWithRouter = (
  component: React.ReactNode,
  searchParams: string = ""
) => {
  return render(
    <MemoryRouter initialEntries={[`/submit?${searchParams}`]}>
      <Routes>
        <Route path="/submit" element={component} />
      </Routes>
    </MemoryRouter>
  );
};

describe("SubmissionForm", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockOnSubmitSuccess.mockClear();
  });

  it("shows error when magic link is invalid", () => {
    renderWithRouter(<SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />);
    expect(screen.getByText("Invalid Link")).toBeInTheDocument();
  });

  it("displays user name when user data is loaded", async () => {
    // Mock token exchange and user data fetch
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "test-access-token",
              token_type: "bearer",
            }),
        })
      )
      // Mock user data fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "test-user",
              name: "Test User",
              email: "test@example.com",
              role: "member",
            }),
        })
      );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    await waitFor(() => {
      expect(
        screen.getByText("Test User", { exact: false })
      ).toBeInTheDocument();
    });
  });

  it("exchanges magic link token for access token on mount", async () => {
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "test-access-token",
              token_type: "bearer",
            }),
        })
      )
      // Mock user data fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "test-user",
              name: "Test User",
              email: "test@example.com",
              role: "member",
            }),
        })
      );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/magic-links/test-token",
        expect.any(Object)
      );
    });
  });

  it("shows error when token exchange fails", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({ detail: "Failed to validate magic link" }),
      })
    );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to validate magic link")
      ).toBeInTheDocument();
    });
  });

  it("submits form successfully", async () => {
    // Mock token exchange and user data fetch
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "test-access-token",
              token_type: "bearer",
            }),
        })
      )
      // Mock user data fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "test-user",
              name: "Test User",
              email: "test@example.com",
              role: "member",
            }),
        })
      )
      // Mock submission
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ id: "test-id", content: "Test status" }),
        })
      );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    // Fill in status
    fireEvent.change(screen.getByLabelText("Status Update"), {
      target: { value: "Test status" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /submit status update/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-access-token",
        },
        body: JSON.stringify({
          content: "Test status",
          team_id: "test-team",
          user_id: "test-user",
        }),
      });
      expect(mockOnSubmitSuccess).toHaveBeenCalled();
    });
  });

  it("shows error when submission fails", async () => {
    // Mock token exchange and user data fetch
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "test-access-token",
              token_type: "bearer",
            }),
        })
      )
      // Mock user data fetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "test-user",
              name: "Test User",
              email: "test@example.com",
              role: "member",
            }),
        })
      )
      // Mock failed submission
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ detail: "Submission failed" }),
        })
      );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    // Fill in status
    fireEvent.change(screen.getByLabelText("Status Update"), {
      target: { value: "Test status" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /submit status update/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });
  });
});
