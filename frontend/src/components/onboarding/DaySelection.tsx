import React from "react";
import { motion } from "framer-motion";

interface DaySelectionProps {
  onDaySelected: (day: number) => void;
  selectedDay: number | null;
}

export const DaySelection: React.FC<DaySelectionProps> = ({
  onDaySelected,
  selectedDay,
}) => {
  const days = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-8 py-12"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-sm text-gray-500 mb-2"
      >
        1 of 5
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-4xl md:text-5xl font-['Urbanist'] font-extrabold text-[#201D1F] mb-12 text-center"
      >
        What day of the week do you want to ask your team?
      </motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="w-full grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {days.map((day, index) => (
          <motion.button
            key={day.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
            onClick={() => onDaySelected(day.value)}
            className={`w-full py-4 px-8 text-left rounded-lg transition-colors text-lg ${
              selectedDay === day.value
                ? "bg-[#201D1F] text-[#f3f3f3]"
                : "bg-white text-[#201D1F] hover:bg-gray-50"
            }`}
          >
            {day.label}
          </motion.button>
        ))}
      </motion.div>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.3 }}
        onClick={() => selectedDay !== null && onDaySelected(selectedDay)}
        className={`mt-12 w-full max-w-md py-4 px-8 rounded-lg font-['Urbanist'] font-bold uppercase text-center text-lg ${
          selectedDay === null
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#201D1F] text-[#f3f3f3] hover:bg-[#2c2a2c]"
        }`}
      >
        Pick Time
      </motion.button>
    </motion.div>
  );
};
