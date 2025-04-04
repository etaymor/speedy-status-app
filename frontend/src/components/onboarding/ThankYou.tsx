import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../context/OnboardingContext";

export const ThankYou: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useOnboarding();

  const getDayName = (day: number | null): string => {
    if (day === null) return "";
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[day];
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-8 py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 bg-[#22644b] rounded-full flex items-center justify-center mb-8"
      >
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-4xl md:text-5xl font-['Urbanist'] font-extrabold text-[#201D1F] mb-4 text-center"
      >
        Welcome to{" "}
        <span className="border-b-4 border-[#fda303]">Speedy Status</span>!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="text-gray-600 mb-12 text-center max-w-xl"
      >
        Your account has been created successfully. Here's a summary of your
        team setup:
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="w-full max-w-2xl bg-white rounded-lg p-8 shadow-sm"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              TEAM NAME
            </h3>
            <p className="text-lg text-[#201D1F]">{state.teamName}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              STATUS UPDATE SCHEDULE
            </h3>
            <p className="text-lg text-[#201D1F]">
              Every {getDayName(state.selectedDay)} at {state.selectedTime}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              TEAM MEMBERS
            </h3>
            <div className="space-y-3">
              {state.teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-[#201D1F]">{member.fullName}</span>
                  <span className="text-gray-500">{member.email}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              ACCOUNT EMAIL
            </h3>
            <p className="text-lg text-[#201D1F]">{state.accountEmail}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-8 text-center"
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="px-8 py-4 bg-[#201D1F] text-white rounded-lg font-bold hover:bg-[#2c2a2c] transition-colors"
        >
          Go to Dashboard
        </button>
      </motion.div>
    </motion.div>
  );
};
