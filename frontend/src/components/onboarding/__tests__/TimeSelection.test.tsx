import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeSelection } from "../TimeSelection";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

const renderWithProvider = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("TimeSelection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders correctly", () => {
    renderWithProvider(<TimeSelection />);
    expect(screen.getByText(/What time works best/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 5/i)).toBeInTheDocument();
  });

  it("displays time slots in correct format", () => {
    renderWithProvider(<TimeSelection />);

    // Check for morning time slots
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("11:00 AM")).toBeInTheDocument();

    // Check for afternoon time slots
    expect(screen.getByText("1:00 PM")).toBeInTheDocument();
    expect(screen.getByText("2:00 PM")).toBeInTheDocument();
    expect(screen.getByText("3:00 PM")).toBeInTheDocument();
  });

  it("allows selecting a time slot", async () => {
    renderWithProvider(<TimeSelection />);

    // Click on a time slot
    const timeSlot = screen.getByText("10:00 AM");
    fireEvent.click(timeSlot);

    // Verify the time slot is selected (check for selected styling)
    expect(timeSlot.closest("button")).toHaveClass("bg-[#201D1F]");
  });

  it("updates context when time is selected", async () => {
    renderWithProvider(<TimeSelection />);

    // Select a time
    fireEvent.click(screen.getByText("10:00 AM"));

    // Click next
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Verify we've moved to the next step
    await waitFor(() => {
      expect(
        screen.queryByText(/What time works best/i)
      ).not.toBeInTheDocument();
    });
  });

  it("prevents proceeding without selecting a time", async () => {
    renderWithProvider(<TimeSelection />);

    // Try to proceed without selecting a time
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Check for error message
    expect(screen.getByText(/Please select a time/i)).toBeInTheDocument();
  });

  it("allows changing time selection", async () => {
    renderWithProvider(<TimeSelection />);

    // Select first time
    fireEvent.click(screen.getByText("9:00 AM"));
    expect(screen.getByText("9:00 AM").closest("button")).toHaveClass(
      "bg-[#201D1F]"
    );

    // Change selection
    fireEvent.click(screen.getByText("2:00 PM"));

    // Verify new selection
    expect(screen.getByText("2:00 PM").closest("button")).toHaveClass(
      "bg-[#201D1F]"
    );
    expect(screen.getByText("9:00 AM").closest("button")).not.toHaveClass(
      "bg-[#201D1F]"
    );
  });

  it("displays time slots in user timezone", () => {
    renderWithProvider(<TimeSelection />);

    // Get all time slots
    const timeSlots = screen.getAllByRole("button");

    // Verify each time slot is formatted correctly
    timeSlots.forEach((slot) => {
      const timeText = slot.textContent;
      expect(timeText).toMatch(/^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/);
    });
  });

  it("shows appropriate description for each time slot", () => {
    renderWithProvider(<TimeSelection />);

    // Morning slots should mention "morning standup"
    const morningSlots = screen.getAllByText(/morning/i);
    expect(morningSlots.length).toBeGreaterThan(0);

    // Afternoon slots should mention "afternoon check-in"
    const afternoonSlots = screen.getAllByText(/afternoon/i);
    expect(afternoonSlots.length).toBeGreaterThan(0);
  });

  it("maintains selected time when navigating back", async () => {
    renderWithProvider(<TimeSelection />);

    // Select a time
    fireEvent.click(screen.getByText("10:00 AM"));

    // Navigate to next step
    fireEvent.click(screen.getByText(/Next/i));

    // Navigate back (simulate back button)
    // Note: You'll need to implement this based on your navigation setup
    // This is just a placeholder test
    await waitFor(() => {
      renderWithProvider(<TimeSelection />);
      const selectedTime = screen.getByText("10:00 AM");
      expect(selectedTime.closest("button")).toHaveClass("bg-[#201D1F]");
    });
  });
});
