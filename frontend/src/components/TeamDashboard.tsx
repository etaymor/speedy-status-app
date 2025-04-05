import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";

// Types
type User = {
  id: string;
  name: string;
  email: string;
};

type Submission = {
  id: string;
  content: string;
  submittedAt: string;
  isLate: boolean;
};

type MemberSubmission = {
  user: User;
  hasSubmitted: boolean;
  submission: Submission | null;
};

type Summary = {
  id: string;
  summaryText: string;
  generatedAt: string;
  triggerType: string;
};

type CurrentWeek = {
  startDate: string;
  memberSubmissions: MemberSubmission[];
  submissionCount: number;
  totalMembers: number;
  summary: Summary | null;
};

type HistoricalDataEntry = {
  weekStartDate: string;
  submissionCount: number;
  totalMembers: number;
  submissionRate: number;
  hasSummary: boolean;
};

type TeamDashboardData = {
  team: {
    id: string;
    name: string;
    promptDay: number;
    promptTime: string;
    timezone: string;
  };
  isManager: boolean;
  currentWeek: CurrentWeek;
  historicalData: HistoricalDataEntry[];
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

export const TeamDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [dashboardData, setDashboardData] = useState<TeamDashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingPrompts, setResendingPrompts] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDashboardData(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load team data. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [teamId]);

  const handleResendPrompts = async () => {
    try {
      setResendingPrompts(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Authentication required");
        setResendingPrompts(false);
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/resend-prompt`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResendMessage(response.data.message);
      setResendingPrompts(false);

      // Refresh dashboard data after resending prompts
      fetchDashboardData();
    } catch (err) {
      console.error("Error resending prompts:", err);
      setError("Failed to resend prompts. Please try again later.");
      setResendingPrompts(false);
    }
  };

  const handleRegenerateSummary = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/summaries/${teamId}/generate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh dashboard data after regenerating summary
      fetchDashboardData();
    } catch (err) {
      console.error("Error regenerating summary:", err);
      setError("Failed to regenerate summary. Please try again later.");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (err) {
      return dateString;
    }
  };

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

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Team not found</h3>
        <p className="text-gray-500 mt-2">
          Could not load the team dashboard data.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#201D1F] bg-[#f3f4f6] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { team, isManager, currentWeek, historicalData } = dashboardData;
  const submissionRate = currentWeek.submissionCount / currentWeek.totalMembers;

  return (
    <div className="py-6">
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Updates on {dayNames[team.promptDay]} at {team.promptTime} (
              {team.timezone})
            </p>
          </div>
          {isManager && (
            <Link
              to={`/team/${team.id}/settings`}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Weekly Update - {formatDate(currentWeek.startDate)}
          </h3>

          {/* Submission status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-700">
                Status: {currentWeek.submissionCount} of{" "}
                {currentWeek.totalMembers} members have submitted
              </h4>

              {isManager && (
                <button
                  onClick={handleResendPrompts}
                  disabled={resendingPrompts || submissionRate === 1}
                  className={`inline-flex items-center px-3 py-1 border border-transparent text-sm rounded-md ${
                    submissionRate === 1
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  }`}
                >
                  {resendingPrompts ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    "Resend Prompt"
                  )}
                </button>
              )}
            </div>

            {resendMessage && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{resendMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${submissionRate * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                ></div>
              </div>
              <div className="text-right mt-1">
                <span className="text-xs font-semibold inline-block text-green-600">
                  {Math.round(submissionRate * 100)}% Complete
                </span>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-medium text-gray-700">AI Summary</h4>
              {isManager && (
                <button
                  onClick={handleRegenerateSummary}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Regenerate
                </button>
              )}
            </div>

            {currentWeek.summary ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="whitespace-pre-wrap text-gray-800">
                  {currentWeek.summary.summaryText}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Generated {formatDate(currentWeek.summary.generatedAt)}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-500">
                  No summary has been generated yet.
                </p>
              </div>
            )}
          </div>

          {/* Team Members */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">
              Team Members
            </h4>
            <div className="overflow-hidden border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Member
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Last Update
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentWeek.memberSubmissions.map((member) => (
                    <tr key={member.user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.hasSubmitted ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Submitted
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.hasSubmitted ? (
                          <div>
                            <div>
                              {formatDate(member.submission?.submittedAt || "")}
                            </div>
                            {member.submission?.isLate && (
                              <span className="text-xs text-amber-600">
                                Late
                              </span>
                            )}
                          </div>
                        ) : (
                          "No submission"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data */}
      {historicalData.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">
              Historical Data
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Week
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Submission Rate
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalData.map((week, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(week.weekStartDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-2 text-sm text-gray-900">
                          {week.submissionCount} / {week.totalMembers}
                        </div>
                        <div className="relative flex-grow h-2 w-24 bg-gray-200 rounded-full">
                          <div
                            className="absolute h-2 rounded-full bg-green-500"
                            style={{ width: `${week.submissionRate * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {week.hasSummary ? (
                        <span className="text-green-600">Available</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
