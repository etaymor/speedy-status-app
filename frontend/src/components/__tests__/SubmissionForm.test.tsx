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

  it("shows name input when name is not provided", () => {
    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
  });

  it("hides name input when name is provided", () => {
    const searchParams =
      "token=test-token&team_id=test-team&user_id=test-user&name=Test%20User";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );
    expect(screen.queryByLabelText("Your Name")).not.toBeInTheDocument();
  });

  it("exchanges magic link token for access token on mount", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ access_token: "test-access-token" }),
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
      })
    );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    await waitFor(() => {
      expect(
        screen.getByText("Invalid or expired magic link")
      ).toBeInTheDocument();
    });
  });

  it("submits form successfully", async () => {
    // Mock token exchange
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: "test-access-token" }),
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

    // Wait for token exchange
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/magic-links/test-token",
        expect.any(Object)
      );
    });

    // Fill in status
    fireEvent.change(screen.getByLabelText("Status Update"), {
      target: { value: "Test status" },
    });

    // Submit form
    fireEvent.click(screen.getByText("Submit Status Update"));

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
    // Mock token exchange
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: "test-access-token" }),
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

    // Wait for token exchange
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/magic-links/test-token",
        expect.any(Object)
      );
    });

    // Fill in status
    fireEvent.change(screen.getByLabelText("Status Update"), {
      target: { value: "Test status" },
    });

    // Submit form
    fireEvent.click(screen.getByText("Submit Status Update"));

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });
  });
});
