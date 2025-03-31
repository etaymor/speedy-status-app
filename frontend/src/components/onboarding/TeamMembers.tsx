import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "../../context/OnboardingContext";
import { PencilIcon } from "@heroicons/react/24/outline";

interface TeamMember {
  fullName: string;
  email: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
}

export const TeamMembers: React.FC = () => {
  const { state, addTeamMember, removeTeamMember, updateTeamMember, nextStep } =
    useOnboarding();
  const [newMember, setNewMember] = useState<TeamMember>({
    fullName: "",
    email: "",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateInput = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!newMember.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (newMember.fullName.length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (!newMember.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(newMember.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (
      state.teamMembers.some(
        (member, idx) =>
          member.email === newMember.email && idx !== editingIndex
      )
    ) {
      newErrors.email = "This email is already added to the team";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMember = () => {
    if (validateInput()) {
      addTeamMember(newMember);
      setNewMember({ fullName: "", email: "" });
      setErrors({});
    }
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setNewMember(state.teamMembers[index]);
    setErrors({});
  };

  const handleUpdateMember = () => {
    if (validateInput()) {
      updateTeamMember(editingIndex!, newMember);
      setEditingIndex(null);
      setNewMember({ fullName: "", email: "" });
      setErrors({});
    }
  };

  const handleInputChange = (field: keyof TeamMember, value: string) => {
    setNewMember((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const getDayAndTime = () => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = state.selectedDay !== null ? days[state.selectedDay] : "";
    return `${day} on ${state.selectedTime}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-8 py-12"
    >
      <div className="text-sm text-gray-500 mb-2">4 of 5</div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-4xl md:text-5xl font-['Urbanist'] font-extrabold text-[#201D1F] mb-4 text-center"
      >
        Now, let's add your{" "}
        <span className="border-b-4 border-[#fda303]">team</span>!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-gray-600 mb-8 text-center"
      >
        Each week at {getDayAndTime()} we'll send them a note
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Full Name"
                value={newMember.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className={`w-full py-3 px-4 bg-white rounded-lg text-lg border-2 focus:ring-2 focus:ring-[#201D1F] ${
                  errors.fullName ? "border-red-500" : "border-transparent"
                }`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>
            <div className="flex-1">
              <input
                type="email"
                placeholder="Email Address"
                value={newMember.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full py-3 px-4 bg-white rounded-lg text-lg border-2 focus:ring-2 focus:ring-[#201D1F] ${
                  errors.email ? "border-red-500" : "border-transparent"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            <button
              onClick={
                editingIndex !== null ? handleUpdateMember : handleAddMember
              }
              disabled={!newMember.fullName.trim() || !newMember.email.trim()}
              className="px-6 py-3 bg-[#201D1F] text-white rounded-lg font-bold hover:bg-[#2c2a2c] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed h-[52px]"
            >
              {editingIndex !== null ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {state.teamMembers.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <div className="grid grid-cols-[1fr,1fr,auto] gap-4 mb-4">
              <div className="text-sm font-bold text-gray-500">NAME</div>
              <div className="text-sm font-bold text-gray-500">
                EMAIL ADDRESS
              </div>
              <div></div>
            </div>
            {state.teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="grid grid-cols-[1fr,1fr,auto] gap-4 py-3 border-t border-gray-100"
              >
                <div>{member.fullName}</div>
                <div>{member.email}</div>
                <button
                  onClick={() => handleEditClick(index)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <PencilIcon className="w-4 h-4 text-gray-500" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          onClick={() => nextStep()}
          disabled={state.teamMembers.length === 0}
          className={`mt-8 w-full py-4 px-8 rounded-lg font-['Urbanist'] font-bold uppercase text-center text-lg ${
            state.teamMembers.length === 0
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-[#201D1F] text-[#f3f3f3] hover:bg-[#2c2a2c]"
          }`}
        >
          Create Account
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="w-full max-w-xl mt-12"
      >
        <img
          src="/team-members-illustration.svg"
          alt="Team members illustration"
          className="w-full h-auto"
        />
      </motion.div>
    </motion.div>
  );
};
