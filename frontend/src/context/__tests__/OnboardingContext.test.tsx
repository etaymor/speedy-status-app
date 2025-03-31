import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { OnboardingProvider, useOnboarding } from "../OnboardingContext";
import "@testing-library/jest-dom";

// Test component that uses the context
const TestComponent: React.FC = () => {
  const {
    state,
    setSelectedDay,
    setSelectedTime,
    setTeamName,
    addTeamMember,
    removeTeamMember,
    setAccountEmail,
    setAccountPassword,
    nextStep,
    prevStep,
  } = useOnboarding();

  return (
    <div>
      <div data-testid="current-state">{JSON.stringify(state)}</div>
      <button onClick={() => setSelectedDay(1)}>Set Day</button>
      <button onClick={() => setSelectedTime("10:00 AM")}>Set Time</button>
      <button onClick={() => setTeamName("Engineering Team")}>
        Set Team Name
      </button>
      <button
        onClick={() =>
          addTeamMember({ fullName: "John Doe", email: "john@example.com" })
        }
      >
        Add Member
      </button>
      <button onClick={() => removeTeamMember("john@example.com")}>
        Remove Member
      </button>
      <button onClick={() => setAccountEmail("test@example.com")}>
        Set Email
      </button>
      <button onClick={() => setAccountPassword("password123")}>
        Set Password
      </button>
      <button onClick={nextStep}>Next Step</button>
      <button onClick={prevStep}>Previous Step</button>
    </div>
  );
};

describe("OnboardingContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("provides initial state", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state).toEqual({
      currentStep: 1,
      selectedDay: null,
      selectedTime: "",
      teamName: "",
      teamMembers: [],
      accountEmail: "",
      accountPassword: "",
    });
  });

  it("updates selected day", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Set Day"));

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.selectedDay).toBe(1);
  });

  it("updates selected time", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Set Time"));

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.selectedTime).toBe("10:00 AM");
  });

  it("updates team name", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Set Team Name"));

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.teamName).toBe("Engineering Team");
  });

  it("manages team members", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    // Add member
    fireEvent.click(screen.getByText("Add Member"));
    let state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.teamMembers).toHaveLength(1);
    expect(state.teamMembers[0]).toEqual({
      fullName: "John Doe",
      email: "john@example.com",
    });

    // Remove member
    fireEvent.click(screen.getByText("Remove Member"));
    state = JSON.parse(screen.getByTestId("current-state").textContent || "{}");
    expect(state.teamMembers).toHaveLength(0);
  });

  it("updates account credentials", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Set Email"));
    fireEvent.click(screen.getByText("Set Password"));

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.accountEmail).toBe("test@example.com");
    expect(state.accountPassword).toBe("password123");
  });

  it("handles step navigation", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    // Move forward
    fireEvent.click(screen.getByText("Next Step"));
    let state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.currentStep).toBe(2);

    // Move backward
    fireEvent.click(screen.getByText("Previous Step"));
    state = JSON.parse(screen.getByTestId("current-state").textContent || "{}");
    expect(state.currentStep).toBe(1);
  });

  it("prevents going below step 1", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    fireEvent.click(screen.getByText("Previous Step"));
    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.currentStep).toBe(1);
  });

  it("prevents going above step 6", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    // Try to go beyond step 6
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText("Next Step"));
    }

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.currentStep).toBe(6);
  });

  it("persists state in localStorage", () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    // Make some changes
    fireEvent.click(screen.getByText("Set Day"));
    fireEvent.click(screen.getByText("Set Time"));
    fireEvent.click(screen.getByText("Set Team Name"));

    // Check localStorage
    const storedState = JSON.parse(
      localStorage.getItem("onboardingState") || "{}"
    );
    expect(storedState.selectedDay).toBe(1);
    expect(storedState.selectedTime).toBe("10:00 AM");
    expect(storedState.teamName).toBe("Engineering Team");
  });

  it("loads persisted state from localStorage", () => {
    // Set up initial state in localStorage
    const initialState = {
      currentStep: 2,
      selectedDay: 1,
      selectedTime: "10:00 AM",
      teamName: "Engineering Team",
      teamMembers: [],
      accountEmail: "",
      accountPassword: "",
    };
    localStorage.setItem("onboardingState", JSON.stringify(initialState));

    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state).toEqual(initialState);
  });

  it("handles invalid localStorage data", () => {
    // Set invalid JSON in localStorage
    localStorage.setItem("onboardingState", "invalid json");

    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );

    // Should fall back to initial state
    const state = JSON.parse(
      screen.getByTestId("current-state").textContent || "{}"
    );
    expect(state.currentStep).toBe(1);
  });
});
