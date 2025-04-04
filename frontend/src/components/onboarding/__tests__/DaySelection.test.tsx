import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaySelection } from "../DaySelection";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

const renderWithProvider = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("DaySelection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders correctly", () => {
    renderWithProvider(
      <DaySelection onDaySelected={() => {}} selectedDay={null} />
    );
    expect(screen.getByText(/What day works best/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 5/i)).toBeInTheDocument();
  });

  it("displays all days of the week", () => {
    renderWithProvider(
      <DaySelection onDaySelected={() => {}} selectedDay={null} />
    );

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    days.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it("allows selecting a day", async () => {
    const handleDaySelected = jest.fn();
    renderWithProvider(
      <DaySelection onDaySelected={handleDaySelected} selectedDay={null} />
    );

    // Click on Monday (index 1)
    const monday = screen.getByText("Monday");
    fireEvent.click(monday);

    // Verify the callback was called with correct day index
    expect(handleDaySelected).toHaveBeenCalledWith(1);
  });

  it("highlights selected day", () => {
    renderWithProvider(
      <DaySelection onDaySelected={() => {}} selectedDay={1} />
    );

    // Check that Monday has the selected styling
    const monday = screen.getByText("Monday");
    expect(monday.closest("button")).toHaveClass("bg-[#201D1F]");

    // Verify other days don't have selected styling
    const tuesday = screen.getByText("Tuesday");
    expect(tuesday.closest("button")).not.toHaveClass("bg-[#201D1F]");
  });

  it("shows appropriate descriptions for each day", () => {
    renderWithProvider(
      <DaySelection onDaySelected={() => {}} selectedDay={null} />
    );

    // Check for weekday descriptions
    const weekdayDesc = screen.getAllByText(/Perfect for work week updates/i);
    expect(weekdayDesc.length).toBeGreaterThan(0);

    // Check for weekend descriptions
    const weekendDesc = screen.getAllByText(/Weekend check-in/i);
    expect(weekendDesc.length).toBeGreaterThan(0);
  });

  it("maintains selected day when re-rendered", () => {
    const { rerender } = renderWithProvider(
      <DaySelection onDaySelected={() => {}} selectedDay={1} />
    );

    // Verify initial selection
    expect(screen.getByText("Monday").closest("button")).toHaveClass(
      "bg-[#201D1F]"
    );

    // Re-render with same selection
    rerender(
      <OnboardingProvider>
        <DaySelection onDaySelected={() => {}} selectedDay={1} />
      </OnboardingProvider>
    );

    // Verify selection is maintained
    expect(screen.getByText("Monday").closest("button")).toHaveClass(
      "bg-[#201D1F]"
    );
  });

  it("allows changing day selection", () => {
    const handleDaySelected = jest.fn();
    renderWithProvider(
      <DaySelection onDaySelected={handleDaySelected} selectedDay={1} />
    );

    // Initially Monday is selected
    expect(screen.getByText("Monday").closest("button")).toHaveClass(
      "bg-[#201D1F]"
    );

    // Click Wednesday
    fireEvent.click(screen.getByText("Wednesday"));

    // Verify callback was called with new day
    expect(handleDaySelected).toHaveBeenCalledWith(3);
  });

  it("displays days in correct order starting with Sunday", () => {
    renderWithProvider(
      <DaySelection onDaySelected={() => {}} selectedDay={null} />
    );

    const days = screen.getAllByRole("button");
    expect(days[0]).toHaveTextContent("Sunday");
    expect(days[1]).toHaveTextContent("Monday");
    expect(days[6]).toHaveTextContent("Saturday");
  });

  it("handles keyboard navigation", () => {
    const handleDaySelected = jest.fn();
    renderWithProvider(
      <DaySelection onDaySelected={handleDaySelected} selectedDay={null} />
    );

    // Focus on Monday
    const monday = screen.getByText("Monday");
    monday.focus();

    // Press Enter to select
    fireEvent.keyDown(monday, { key: "Enter", code: "Enter" });
    expect(handleDaySelected).toHaveBeenCalledWith(1);

    // Press Space to select
    fireEvent.keyDown(monday, { key: " ", code: "Space" });
    expect(handleDaySelected).toHaveBeenCalledWith(1);
  });
});
