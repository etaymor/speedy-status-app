import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "../../context/OnboardingContext";

export const TeamCreation: React.FC = () => {
  const { state, setTeamName, nextStep } = useOnboarding();

  const handleSubmit = () => {
    if (state.teamName.trim()) {
      nextStep();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-8 py-12"
    >
      <div className="text-sm text-gray-500 mb-2">3 of 5</div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-4xl md:text-5xl font-['Urbanist'] font-extrabold text-[#201D1F] mb-4 text-center"
      >
        What <span className="border-b-4 border-[#fda303]">team</span> should we
        ask?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-gray-600 mb-12 text-center max-w-xl"
      >
        Create a new team to get updates from on a consistent basis?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="w-full max-w-xl"
      >
        <input
          type="text"
          placeholder="Team name"
          value={state.teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="w-full py-4 px-6 bg-white rounded-lg text-lg border-0 focus:ring-2 focus:ring-[#201D1F] mb-8"
        />

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          onClick={() => nextStep()}
          className="mt-8 w-full py-4 px-8 rounded-lg font-['Urbanist'] font-bold uppercase text-center text-lg bg-[#201D1F] text-[#f3f3f3] hover:bg-[#2c2a2c]"
        >
          Next
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="w-full max-w-xl mt-12"
      >
        <img
          src="/team-illustration.svg"
          alt="Team illustration"
          className="w-full h-auto"
        />
      </motion.div>
    </motion.div>
  );
};
