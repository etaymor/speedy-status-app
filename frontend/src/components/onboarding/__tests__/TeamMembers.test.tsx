import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamMembers } from "../TeamMembers";
import { OnboardingProvider } from "../../../context/OnboardingContext";
import "@testing-library/jest-dom";

const renderWithProvider = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe("TeamMembers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders correctly", () => {
    renderWithProvider(<TeamMembers />);
    expect(screen.getByText(/Who's on the team/i)).toBeInTheDocument();
    expect(screen.getByText(/4 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Team Member/i)).toBeInTheDocument();
  });

  it("allows adding a team member", async () => {
    renderWithProvider(<TeamMembers />);

    // Click add team member button
    const addButton = screen.getByText(/Add Team Member/i);
    fireEvent.click(addButton);

    // Fill in the form
    const nameInput = screen.getByPlaceholderText(/Full Name/i);
    const emailInput = screen.getByPlaceholderText(/Email Address/i);

    await userEvent.type(nameInput, "John Doe");
    await userEvent.type(emailInput, "john@example.com");

    // Submit the form
    const submitButton = screen.getByText(/Save/i);
    fireEvent.click(submitButton);

    // Verify team member was added
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("validates email format", async () => {
    renderWithProvider(<TeamMembers />);

    // Add a team member with invalid email
    fireEvent.click(screen.getByText(/Add Team Member/i));

    const nameInput = screen.getByPlaceholderText(/Full Name/i);
    const emailInput = screen.getByPlaceholderText(/Email Address/i);

    await userEvent.type(nameInput, "John Doe");
    await userEvent.type(emailInput, "invalid-email");

    fireEvent.click(screen.getByText(/Save/i));

    // Check for error message
    expect(
      screen.getByText(/Please enter a valid email address/i)
    ).toBeInTheDocument();
  });

  it("prevents duplicate email addresses", async () => {
    renderWithProvider(<TeamMembers />);

    // Add first team member
    fireEvent.click(screen.getByText(/Add Team Member/i));
    await userEvent.type(screen.getByPlaceholderText(/Full Name/i), "John Doe");
    await userEvent.type(
      screen.getByPlaceholderText(/Email Address/i),
      "john@example.com"
    );
    fireEvent.click(screen.getByText(/Save/i));

    // Try to add second team member with same email
    fireEvent.click(screen.getByText(/Add Team Member/i));
    await userEvent.type(screen.getByPlaceholderText(/Full Name/i), "Jane Doe");
    await userEvent.type(
      screen.getByPlaceholderText(/Email Address/i),
      "john@example.com"
    );
    fireEvent.click(screen.getByText(/Save/i));

    expect(
      screen.getByText(/Email address already exists/i)
    ).toBeInTheDocument();
  });

  it("allows removing team members", async () => {
    renderWithProvider(<TeamMembers />);

    // Add a team member
    fireEvent.click(screen.getByText(/Add Team Member/i));
    await userEvent.type(screen.getByPlaceholderText(/Full Name/i), "John Doe");
    await userEvent.type(
      screen.getByPlaceholderText(/Email Address/i),
      "john@example.com"
    );
    fireEvent.click(screen.getByText(/Save/i));

    // Remove the team member
    const removeButton = screen.getByLabelText(/Remove team member/i);
    fireEvent.click(removeButton);

    // Verify team member was removed
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
  });

  it("requires at least one team member before proceeding", async () => {
    renderWithProvider(<TeamMembers />);

    // Try to proceed without adding team members
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Check for error message
    expect(
      screen.getByText(/Please add at least one team member/i)
    ).toBeInTheDocument();
  });

  it("allows proceeding after adding team members", async () => {
    renderWithProvider(<TeamMembers />);

    // Add a team member
    fireEvent.click(screen.getByText(/Add Team Member/i));
    await userEvent.type(screen.getByPlaceholderText(/Full Name/i), "John Doe");
    await userEvent.type(
      screen.getByPlaceholderText(/Email Address/i),
      "john@example.com"
    );
    fireEvent.click(screen.getByText(/Save/i));

    // Click next
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    // Verify we've moved to the next step (Account Creation)
    await waitFor(() => {
      expect(screen.queryByText(/Who's on the team/i)).not.toBeInTheDocument();
    });
  });

  it("validates required fields", async () => {
    renderWithProvider(<TeamMembers />);

    // Click add without filling in fields
    fireEvent.click(screen.getByText(/Add Team Member/i));
    fireEvent.click(screen.getByText(/Save/i));

    // Check for error messages
    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
  });

  it("handles maximum team size limit", async () => {
    renderWithProvider(<TeamMembers />);

    // Add maximum number of team members
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText(/Add Team Member/i));
      await userEvent.type(
        screen.getByPlaceholderText(/Full Name/i),
        `Member ${i}`
      );
      await userEvent.type(
        screen.getByPlaceholderText(/Email Address/i),
        `member${i}@example.com`
      );
      fireEvent.click(screen.getByText(/Save/i));
    }

    // Try to add one more
    fireEvent.click(screen.getByText(/Add Team Member/i));

    // Check for error message
    expect(screen.getByText(/Maximum team size reached/i)).toBeInTheDocument();
  });
});
