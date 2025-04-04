import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingFlow } from "../OnboardingFlow";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

// Mock child components
jest.mock("../DaySelection", () => ({
  DaySelection: ({
    onDaySelected,
  }: {
    onDaySelected: (day: number) => void;
  }) => (
    <div data-testid="day-selection">
      <button onClick={() => onDaySelected(1)}>Next</button>
    </div>
  ),
}));

jest.mock("../TimeSelection", () => ({
  TimeSelection: () => {
    const { nextStep } =
      require("../../../context/OnboardingContext").useOnboarding();
    return (
      <div data-testid="time-selection">
        <button
          onClick={() => {
            nextStep();
          }}
        >
          Next
        </button>
      </div>
    );
  },
}));

jest.mock("../TeamCreation", () => ({
  TeamCreation: () => {
    const { nextStep } =
      require("../../../context/OnboardingContext").useOnboarding();
    return (
      <div data-testid="team-creation">
        <button
          onClick={() => {
            nextStep();
          }}
        >
          Next
        </button>
      </div>
    );
  },
}));

jest.mock("../TeamMembers", () => ({
  TeamMembers: () => {
    const { nextStep } =
      require("../../../context/OnboardingContext").useOnboarding();
    return (
      <div data-testid="team-members">
        <button
          onClick={() => {
            nextStep();
          }}
        >
          Next
        </button>
      </div>
    );
  },
}));

jest.mock("../AccountCreation", () => ({
  AccountCreation: () => (
    <div data-testid="account-creation">
      <button>Create Account</button>
    </div>
  ),
}));

jest.mock("../ThankYou", () => ({
  ThankYou: () => <div data-testid="thank-you">Thank You</div>,
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("OnboardingFlow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with day selection step", () => {
    renderWithProvider(<OnboardingFlow />);
    expect(screen.getByTestId("day-selection")).toBeInTheDocument();
  });

  it("progresses through all steps correctly", async () => {
    renderWithProvider(<OnboardingFlow />);

    // Step 1: Day Selection
    const daySelectionNext = screen
      .getByTestId("day-selection")
      .querySelector("button");
    expect(daySelectionNext).toBeInTheDocument();
    fireEvent.click(daySelectionNext!);

    // Step 2: Time Selection
    await waitFor(() => {
      expect(screen.getByTestId("time-selection")).toBeInTheDocument();
    });
    const timeSelectionNext = screen
      .getByTestId("time-selection")
      .querySelector("button");
    expect(timeSelectionNext).toBeInTheDocument();
    fireEvent.click(timeSelectionNext!);

    // Step 3: Team Creation
    await waitFor(() => {
      expect(screen.getByTestId("team-creation")).toBeInTheDocument();
    });
    const teamCreationNext = screen
      .getByTestId("team-creation")
      .querySelector("button");
    expect(teamCreationNext).toBeInTheDocument();
    fireEvent.click(teamCreationNext!);

    // Step 4: Team Members
    await waitFor(() => {
      expect(screen.getByTestId("team-members")).toBeInTheDocument();
    });
    const teamMembersNext = screen
      .getByTestId("team-members")
      .querySelector("button");
    expect(teamMembersNext).toBeInTheDocument();
    fireEvent.click(teamMembersNext!);

    // Step 5: Account Creation
    await waitFor(() => {
      expect(screen.getByTestId("account-creation")).toBeInTheDocument();
    });
  });
});
