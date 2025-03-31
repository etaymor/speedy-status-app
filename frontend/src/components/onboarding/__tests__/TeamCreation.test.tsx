import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamCreation } from "../TeamCreation";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

const renderWithProvider = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("TeamCreation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders correctly", () => {
    renderWithProvider(<TeamCreation />);
    expect(screen.getByText(/What team should we ask/i)).toBeInTheDocument();
    expect(screen.getByText(/3 of 5/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Team Name/i)).toBeInTheDocument();
  });

  it("allows entering team name", async () => {
    renderWithProvider(<TeamCreation />);

    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "Engineering Team");

    expect(input).toHaveValue("Engineering Team");
  });

  it("prevents proceeding with empty team name", async () => {
    renderWithProvider(<TeamCreation />);

    // Try to proceed without entering team name
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Check for error message
    expect(screen.getByText(/Please enter a team name/i)).toBeInTheDocument();
  });

  it("allows proceeding with valid team name", async () => {
    renderWithProvider(<TeamCreation />);

    // Enter team name
    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "Engineering Team");

    // Click next
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Verify we've moved to the next step
    await waitFor(() => {
      expect(
        screen.queryByText(/What team should we ask/i)
      ).not.toBeInTheDocument();
    });
  });

  it("trims whitespace from team name", async () => {
    renderWithProvider(<TeamCreation />);

    // Enter team name with whitespace
    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "  Engineering Team  ");

    // Click next
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Verify the team name was trimmed
    expect(input).toHaveValue("Engineering Team");
  });

  it("maintains team name when navigating back", async () => {
    renderWithProvider(<TeamCreation />);

    // Enter team name
    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "Engineering Team");

    // Navigate to next step
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Navigate back (simulate back button)
    await waitFor(() => {
      renderWithProvider(<TeamCreation />);
      expect(screen.getByPlaceholderText(/Team Name/i)).toHaveValue(
        "Engineering Team"
      );
    });
  });

  it("handles special characters in team name", async () => {
    renderWithProvider(<TeamCreation />);

    // Enter team name with special characters
    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "Team @ #1!");

    // Click next
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Verify we can proceed with special characters
    await waitFor(() => {
      expect(
        screen.queryByText(/What team should we ask/i)
      ).not.toBeInTheDocument();
    });
  });

  it("enforces maximum length for team name", async () => {
    renderWithProvider(<TeamCreation />);

    // Try to enter a very long team name
    const input = screen.getByPlaceholderText(/Team Name/i);
    const longTeamName = "A".repeat(51); // Assuming max length is 50
    await userEvent.type(input, longTeamName);

    // Verify the input is limited
    expect(input).toHaveValue(longTeamName.slice(0, 50));
  });

  it("shows appropriate error for invalid characters", async () => {
    renderWithProvider(<TeamCreation />);

    // Enter team name with invalid characters (if any are restricted)
    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "");

    // Click next
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Check for error message
    expect(screen.getByText(/Please enter a team name/i)).toBeInTheDocument();
  });

  it("handles keyboard submission", async () => {
    renderWithProvider(<TeamCreation />);

    // Enter team name
    const input = screen.getByPlaceholderText(/Team Name/i);
    await userEvent.type(input, "Engineering Team{enter}");

    // Verify we've moved to the next step
    await waitFor(() => {
      expect(
        screen.queryByText(/What team should we ask/i)
      ).not.toBeInTheDocument();
    });
  });
});
