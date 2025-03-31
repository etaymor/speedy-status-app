import React, { createContext, useContext, useState, ReactNode } from "react";

interface TeamMember {
  fullName: string;
  email: string;
}

interface OnboardingState {
  selectedDay: number | null;
  selectedTime: string | null;
  teamName: string;
  teamMembers: TeamMember[];
  currentStep: number;
  accountEmail: string;
  accountPassword: string;
}

interface OnboardingContextType {
  state: OnboardingState;
  setSelectedDay: (day: number) => void;
  setSelectedTime: (time: string) => void;
  setTeamName: (name: string) => void;
  addTeamMember: (member: TeamMember) => void;
  removeTeamMember: (index: number) => void;
  updateTeamMember: (index: number, member: TeamMember) => void;
  setAccountEmail: (email: string) => void;
  setAccountPassword: (password: string) => void;
  nextStep: () => void;
  previousStep: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<OnboardingState>({
    selectedDay: null,
    selectedTime: null,
    teamName: "",
    teamMembers: [],
    currentStep: 1,
    accountEmail: "",
    accountPassword: "",
  });

  const setSelectedDay = (day: number) => {
    setState((prev) => ({ ...prev, selectedDay: day }));
  };

  const setSelectedTime = (time: string) => {
    setState((prev) => ({ ...prev, selectedTime: time }));
  };

  const setTeamName = (name: string) => {
    setState((prev) => ({ ...prev, teamName: name }));
  };

  const setAccountEmail = (email: string) => {
    setState((prev) => ({ ...prev, accountEmail: email }));
  };

  const setAccountPassword = (password: string) => {
    setState((prev) => ({ ...prev, accountPassword: password }));
  };

  const addTeamMember = (member: TeamMember) => {
    setState((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, member],
    }));
  };

  const removeTeamMember = (index: number) => {
    setState((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const updateTeamMember = (index: number, member: TeamMember) => {
    setState((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m, i) => (i === index ? member : m)),
    }));
  };

  const nextStep = () => {
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const previousStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
    }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setSelectedDay,
        setSelectedTime,
        setTeamName,
        addTeamMember,
        removeTeamMember,
        updateTeamMember,
        setAccountEmail,
        setAccountPassword,
        nextStep,
        previousStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
