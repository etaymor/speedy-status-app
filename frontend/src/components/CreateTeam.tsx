import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type TeamMember = {
  email: string;
  name: string;
};

export const CreateTeam = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [promptDay, setPromptDay] = useState(1); // Tuesday default
  const [promptTime, setPromptTime] = useState("09:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [members, setMembers] = useState<TeamMember[]>([
    { email: "", name: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = () => {
    setMembers([...members, { email: "", name: "" }]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (
    index: number,
    field: keyof TeamMember,
    value: string
  ) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Create team
      const teamResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/teams`,
        {
          name: teamName,
          prompt_day: promptDay,
          prompt_time: promptTime,
          timezone: timezone,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Add members
      const validMembers = members.filter((m) => m.email.trim() !== "");
      if (validMembers.length > 0) {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/v1/teams/${
            teamResponse.data.id
          }/members`,
          {
            members: validMembers.map((m) => ({
              email: m.email.trim(),
              name: m.name.trim() || m.email.split("@")[0],
            })),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Error creating team:", err);
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail ||
            "Failed to create team. Please try again."
        );
      } else {
        setError("Failed to create team. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Team</h1>

      <div className="space-y-8">
        {/* Team Name */}
        <div>
          <label
            htmlFor="teamName"
            className="block text-sm font-medium text-gray-700"
          >
            Team Name
          </label>
          <input
            type="text"
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#201D1F] focus:border-[#201D1F] sm:text-sm"
            placeholder="Enter team name"
          />
        </div>

        {/* Update Schedule */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="promptDay"
              className="block text-sm font-medium text-gray-700"
            >
              Update Day
            </label>
            <select
              id="promptDay"
              value={promptDay}
              onChange={(e) => setPromptDay(Number(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#201D1F] focus:border-[#201D1F] sm:text-sm"
            >
              {dayNames.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="promptTime"
              className="block text-sm font-medium text-gray-700"
            >
              Update Time
            </label>
            <input
              type="time"
              id="promptTime"
              value={promptTime}
              onChange={(e) => setPromptTime(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#201D1F] focus:border-[#201D1F] sm:text-sm"
            />
          </div>
        </div>

        {/* Team Members */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
            <button
              type="button"
              onClick={handleAddMember}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-[#201D1F] bg-gray-100 hover:bg-gray-200"
            >
              + Add Member
            </button>
          </div>

          <div className="space-y-4">
            {members.map((member, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) =>
                      handleMemberChange(index, "email", e.target.value)
                    }
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#201D1F] focus:border-[#201D1F] sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      handleMemberChange(index, "name", e.target.value)
                    }
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#201D1F] focus:border-[#201D1F] sm:text-sm"
                    placeholder="Name (optional)"
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(index)}
                    className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#201D1F]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !teamName.trim()}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#201D1F] hover:bg-[#2c2a2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#201D1F] ${
              loading || !teamName.trim() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              "Create Team"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
