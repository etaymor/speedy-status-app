import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

type Team = {
  id: string;
  name: string;
  promptDay: number;
  promptTime: string;
  timezone: string;
  managerId?: string;
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const Dashboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        console.log("Auth token present:", !!token);

        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        console.log(
          "Fetching teams from:",
          `${import.meta.env.VITE_API_URL}/api/v1/teams`
        );

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/teams`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("API Response:", response.data);
        if (Array.isArray(response.data)) {
          console.log(
            "Team data details:",
            response.data.map((team) => ({
              name: team.name,
              promptDay: team.promptDay,
              promptTime: team.promptTime,
              timezone: team.timezone,
            }))
          );
        }

        setTeams(Array.isArray(response.data) ? response.data : []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching teams:", err);
        if (axios.isAxiosError(err)) {
          console.log("API Error response:", err.response?.data);
          setError(
            err.response?.data?.detail ||
              "Failed to load teams. Please try again later."
          );
        } else {
          setError("Failed to load teams. Please try again later.");
        }
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
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
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No teams found
        </h3>
        <p className="text-gray-500 mb-6">
          You don't have any teams yet. Create your first team to get started.
        </p>
        <Link
          to="/create-team"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#201D1F] hover:bg-[#2c2a2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#201D1F]"
        >
          Create Team
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Teams</h2>
        <Link
          to="/create-team"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#201D1F] hover:bg-[#2c2a2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#201D1F]"
        >
          + New Team
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {team.name}
              </h3>
              <div className="mt-2 text-sm text-gray-500">
                <p>
                  Updates on {dayNames[team.promptDay]} at {team.promptTime}
                </p>
                <p>Timezone: {team.timezone}</p>
              </div>
              <div className="mt-4">
                <Link
                  to={`/dashboard/${team.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#201D1F] bg-[#f3f4f6] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  View Status
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
