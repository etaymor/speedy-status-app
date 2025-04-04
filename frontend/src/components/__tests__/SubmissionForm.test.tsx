import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubmissionForm } from "../SubmissionForm";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import fetchMock from "jest-fetch-mock";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

const mockOnSubmitSuccess = jest.fn();

// Mock react-markdown and remark-gfm
jest.mock("react-markdown", () => (props: any) => <>{props.children}</>);
jest.mock("remark-gfm", () => jest.fn());

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

const mockSuccessfulApi = () => {
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
};

beforeEach(() => {
  fetchMock.resetMocks();
});

const mockToken = "mock.jwt.token";
const mockUserId = "user123";
const mockTeamId = "team123";
const mockAccessToken = "mock.access.token";

// Mock JWT payload
const mockJwtPayload = {
  sub: mockUserId,
  team_id: mockTeamId,
  type: "access",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

// Create base64 encoded JWT payload
const mockJwtPayloadBase64 = btoa(JSON.stringify(mockJwtPayload));

describe("SubmissionForm", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockOnSubmitSuccess.mockClear();
    // Mock successful API calls for most tests unless specified otherwise
    mockSuccessfulApi();
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
      expect(screen.getByText("Submitting as: Test User")).toBeInTheDocument();
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
    // Mock submission API call separately for this test
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "test-id", content: "Test status" }),
      })
    );

    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText("Submitting as: Test User")).toBeInTheDocument();
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
    // Mock failed submission API call separately for this test
    mockFetch.mockImplementationOnce(() =>
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

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByText("Submitting as: Test User")).toBeInTheDocument();
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

  // Tests for Markdown Preview
  it("shows textarea and preview button initially", async () => {
    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Status Update")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Preview" })
      ).toBeInTheDocument();
      expect(screen.getByText(/Markdown is supported/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Edit" })
      ).not.toBeInTheDocument();
    });
  });

  it("switches to preview mode when preview button is clicked", async () => {
    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Status Update")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Status Update"), {
      target: { value: "# Heading\n\n* List item" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Status Update")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Markdown is supported/i)
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      expect(screen.getByText(/# Heading\n\n* List item/)).toBeInTheDocument(); // Check rendered markdown content
    });
  });

  it("switches back to edit mode when edit button is clicked", async () => {
    const searchParams = "token=test-token&team_id=test-team&user_id=test-user";
    renderWithRouter(
      <SubmissionForm onSubmitSuccess={mockOnSubmitSuccess} />,
      searchParams
    );

    // Wait for load and switch to preview
    await waitFor(() => {
      expect(screen.getByLabelText("Status Update")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    // Switch back to edit
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Status Update")).toBeInTheDocument();
      expect(screen.getByText(/Markdown is supported/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Preview" })
      ).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    const mockInitialContent = "Initial status content";
    const mockSubmissionId = "submission123";
    const mockUpdatedContent = "Updated status content";

    beforeEach(() => {
      // Mock token exchange
      fetchMock.mockResponseOnce(
        JSON.stringify({
          access_token: mockAccessToken,
          token_type: "bearer",
        })
      );

      // Mock user data
      fetchMock.mockResponseOnce(
        JSON.stringify({
          id: mockUserId,
          name: "Test User",
          email: "test@example.com",
          role: "member",
        })
      );
    });

    it("renders in edit mode with initial content", () => {
      render(
        <MemoryRouter initialEntries={[`/submit?token=${mockToken}`]}>
          <SubmissionForm
            onSubmitSuccess={jest.fn()}
            initialContent={mockInitialContent}
            submissionId={mockSubmissionId}
            isEditMode={true}
          />
        </MemoryRouter>
      );

      expect(screen.getByText("Edit Your Status Update")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue(mockInitialContent);
    });

    it("successfully updates a submission", async () => {
      const mockOnSubmitSuccess = jest.fn();

      // Mock successful update response
      fetchMock.mockResponseOnce(
        JSON.stringify({
          id: mockSubmissionId,
          content: mockUpdatedContent,
          submitted_at: new Date().toISOString(),
          is_late: false,
          week_start_date: new Date().toISOString(),
        })
      );

      render(
        <MemoryRouter initialEntries={[`/submit?token=${mockToken}`]}>
          <SubmissionForm
            onSubmitSuccess={mockOnSubmitSuccess}
            initialContent={mockInitialContent}
            submissionId={mockSubmissionId}
            isEditMode={true}
          />
        </MemoryRouter>
      );

      // Wait for initial data loading
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Update content
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: mockUpdatedContent } });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /save changes/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Verify API call
        expect(fetchMock.mock.calls[2][0]).toBe(
          `/api/v1/submissions/${mockSubmissionId}`
        );
        expect(fetchMock.mock.calls[2][1]).toMatchObject({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify({ content: mockUpdatedContent }),
        });

        // Verify callback
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith(
          mockUpdatedContent,
          mockSubmissionId
        );
      });
    });

    it("handles update errors", async () => {
      const errorMessage = "Failed to update submission";

      // Mock error response
      fetchMock.mockResponseOnce(JSON.stringify({ detail: errorMessage }), {
        status: 400,
      });

      render(
        <MemoryRouter initialEntries={[`/submit?token=${mockToken}`]}>
          <SubmissionForm
            onSubmitSuccess={jest.fn()}
            initialContent={mockInitialContent}
            submissionId={mockSubmissionId}
            isEditMode={true}
          />
        </MemoryRouter>
      );

      // Wait for initial data loading
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Update content
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: mockUpdatedContent } });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /save changes/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("preserves markdown preview in edit mode", async () => {
      render(
        <MemoryRouter initialEntries={[`/submit?token=${mockToken}`]}>
          <SubmissionForm
            onSubmitSuccess={jest.fn()}
            initialContent="**Bold** and *italic*"
            submissionId={mockSubmissionId}
            isEditMode={true}
          />
        </MemoryRouter>
      );

      // Wait for initial data loading
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });

      // Toggle preview
      const previewButton = screen.getByRole("button", { name: /preview/i });
      fireEvent.click(previewButton);

      // Check markdown rendering
      expect(screen.getByText("Bold")).toHaveStyle("font-weight: bold");
      expect(screen.getByText("italic")).toHaveStyle("font-style: italic");
    });
  });
});
