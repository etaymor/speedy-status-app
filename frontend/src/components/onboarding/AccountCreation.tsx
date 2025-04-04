import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "../../context/OnboardingContext";

interface ValidationErrors {
  email?: string;
  password?: string;
}

export const AccountCreation: React.FC = () => {
  const navigate = useNavigate();
  const { state, setAccountEmail, setAccountPassword } = useOnboarding();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateField = (field: "email" | "password", value: string) => {
    const newErrors: ValidationErrors = {};

    if (field === "email") {
      if (!value.trim()) {
        newErrors.email = "Email is required";
      } else if (!validateEmail(value)) {
        newErrors.email = "Please enter a valid email address";
      }
    } else if (field === "password") {
      if (!value.trim()) {
        newErrors.password = "Password is required";
      } else if (!validatePassword(value)) {
        newErrors.password =
          "Password must be at least 8 characters and contain uppercase, lowercase, and numbers";
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateInput = (): boolean => {
    const emailValid = validateField("email", state.accountEmail);
    const passwordValid = validateField("password", state.accountPassword);
    return emailValid && passwordValid;
  };

  const handleInputChange = (field: "email" | "password", value: string) => {
    if (field === "email") {
      setAccountEmail(value);
    } else {
      setAccountPassword(value);
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError(null);
  };

  const handleBlur = (field: "email" | "password", value: string) => {
    validateField(field, value);
  };

  const handleSubmit = async () => {
    if (!validateInput()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: state.accountEmail,
          password: state.accountPassword,
          team: {
            name: state.teamName,
            promptDay: state.selectedDay,
            promptTime: state.selectedTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            members: state.teamMembers.map((member) => ({
              email: member.email,
              fullName: member.fullName,
            })),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create account");
      }

      const data = await response.json();

      // Store the tokens
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);

      // Navigate to thank you page
      navigate("/thank-you");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
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
      <div className="text-sm text-gray-500 mb-2">5 of 5</div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-4xl md:text-5xl font-['Urbanist'] font-extrabold text-[#201D1F] mb-4 text-center"
      >
        Let's create your{" "}
        <span className="border-b-4 border-[#fda303]">account</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-gray-600 mb-8 text-center max-w-xl"
      >
        You'll get an email summary every week and get access to a dashboard
        with all the detailed responses.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="w-full max-w-xl"
      >
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {apiError}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="Email Address"
              value={state.accountEmail}
              onChange={(e) => handleInputChange("email", e.target.value)}
              onBlur={(e) => handleBlur("email", e.target.value)}
              className={`w-full py-4 px-6 bg-white rounded-lg text-lg border-2 focus:ring-2 focus:ring-[#201D1F] ${
                errors.email ? "border-red-500" : "border-transparent"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={state.accountPassword}
              onChange={(e) => handleInputChange("password", e.target.value)}
              onBlur={(e) => handleBlur("password", e.target.value)}
              className={`w-full py-4 px-6 bg-white rounded-lg text-lg border-2 focus:ring-2 focus:ring-[#201D1F] ${
                errors.password ? "border-red-500" : "border-transparent"
              }`}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          onClick={handleSubmit}
          disabled={isLoading}
          className={`mt-8 w-full py-4 px-8 rounded-lg font-['Urbanist'] font-bold uppercase text-center text-lg bg-[#201D1F] text-[#f3f3f3] hover:bg-[#2c2a2c] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed relative`}
        >
          {isLoading ? (
            <>
              <span className="opacity-0">Create Account</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  data-testid="loading-spinner"
                  className="w-6 h-6 border-2 border-[#f3f3f3] border-t-transparent rounded-full animate-spin"
                ></div>
              </div>
            </>
          ) : (
            "Create Account"
          )}
        </motion.button>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-gray-600 hover:text-[#201D1F] text-sm"
          >
            Already have an account? Sign in
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
