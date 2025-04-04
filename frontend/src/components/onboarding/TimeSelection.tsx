import React, { useState } from "react";
import { useOnboarding } from "../../context/OnboardingContext";
import { motion } from "framer-motion";

const HOURS = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0")
);
const PERIODS = ["AM", "PM"];

export const TimeSelection: React.FC = () => {
  const { state, setSelectedTime, nextStep } = useOnboarding();
  const [selectedHour, setSelectedHour] = useState("12");
  const [selectedPeriod, setSelectedPeriod] = useState("PM");

  const handleTimeSelected = () => {
    const formattedTime = `${selectedHour}:00 ${selectedPeriod}`;
    setSelectedTime(formattedTime);
    nextStep();
  };

  const getDayName = (day: number | null) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return day !== null ? days[day] : "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-8 py-12"
    >
      <div className="text-sm text-gray-500 mb-2">2 of 5</div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-4xl md:text-5xl font-['Urbanist'] font-extrabold text-[#201D1F] mb-4 text-center"
      >
        What time on{" "}
        <span className="border-b-4 border-[#fda303]">
          {getDayName(state.selectedDay)}
        </span>
        ?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-gray-600 mb-12 text-center"
      >
        We'll send them a message to share an update.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="flex gap-4 mb-12"
      >
        <div className="flex flex-col">
          <label className="text-sm text-gray-500 mb-2">Hour</label>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(e.target.value)}
            className="w-40 py-3 px-4 bg-white rounded-lg text-lg border-0 focus:ring-2 focus:ring-[#201D1F]"
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}:00
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-500 mb-2">AM/PM</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-40 py-3 px-4 bg-white rounded-lg text-lg border-0 focus:ring-2 focus:ring-[#201D1F]"
          >
            {PERIODS.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        onClick={handleTimeSelected}
        className="w-full max-w-md py-4 px-8 rounded-lg font-['Urbanist'] font-bold uppercase text-center text-lg bg-[#201D1F] text-[#f3f3f3] hover:bg-[#2c2a2c]"
      >
        Next
      </motion.button>
    </motion.div>
  );
};
