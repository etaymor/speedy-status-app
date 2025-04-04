import React from "react";
import { DaySelection } from "./DaySelection";
import { TimeSelection } from "./TimeSelection";
import { TeamCreation } from "./TeamCreation";
import { TeamMembers } from "./TeamMembers";
import { AccountCreation } from "./AccountCreation";
import { ThankYou } from "./ThankYou";
import { useOnboarding } from "../../context/OnboardingContext";
import { AnimatePresence } from "framer-motion";

export const OnboardingFlow: React.FC = () => {
  const { state, setSelectedDay, nextStep } = useOnboarding();

  const handleDaySelected = (day: number) => {
    setSelectedDay(day);
    nextStep();
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <DaySelection
            key="day-selection"
            onDaySelected={handleDaySelected}
            selectedDay={state.selectedDay}
          />
        );
      case 2:
        return <TimeSelection key="time-selection" />;
      case 3:
        return <TeamCreation key="team-creation" />;
      case 4:
        return <TeamMembers key="team-members" />;
      case 5:
        return <AccountCreation key="account-creation" />;
      case 6:
        return <ThankYou key="thank-you" />;
      default:
        return (
          <DaySelection
            key="day-selection"
            onDaySelected={handleDaySelected}
            selectedDay={state.selectedDay}
          />
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#22644b] flex items-center overflow-hidden">
      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
    </div>
  );
};
