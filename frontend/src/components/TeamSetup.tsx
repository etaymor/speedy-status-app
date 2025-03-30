import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

interface TeamSetupFormData {
  name: string;
  promptDay: number;
  promptTime: string;
  memberEmails: string;
  timezone: string;
}

interface TeamSetupProps {
  onTeamCreated?: (teamId: string) => void;
}

interface ApiError {
  detail: string;
}

export const TeamSetup: React.FC<TeamSetupProps> = ({ onTeamCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timezones, setTimezones] = useState<string[]>([]);
  const [userTimezone, setUserTimezone] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TeamSetupFormData>();

  useEffect(() => {
    // Get user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
    setValue("timezone", timezone);

    // Fetch available timezones
    const fetchTimezones = async () => {
      try {
        const response = await fetch("/api/v1/team/timezones");
        if (!response.ok) {
          throw new Error("Failed to fetch timezones");
        }
        const data = await response.json();
        setTimezones(data.timezones);
      } catch (err) {
        console.error("Error fetching timezones:", err);
        setTimezones([]); // Fallback to empty list
      }
    };

    fetchTimezones();
  }, [setValue]);

  const onSubmit = async (data: TeamSetupFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create team
      const teamResponse = await fetch("/api/v1/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          prompt_day: parseInt(data.promptDay.toString()),
          prompt_time: data.promptTime,
          timezone: data.timezone,
        }),
      });

      if (!teamResponse.ok) {
        const errorData = (await teamResponse.json()) as ApiError;
        throw new Error(errorData.detail || "Failed to create team");
      }

      const team = await teamResponse.json();

      // Add team members
      const memberEmails = data.memberEmails
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      if (memberEmails.length > 0) {
        const membersResponse = await fetch(
          `/api/v1/team/members?team_id=${team.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              emails: memberEmails,
            }),
          }
        );

        if (!membersResponse.ok) {
          const errorData = (await membersResponse.json()) as ApiError;
          throw new Error(errorData.detail || "Failed to add team members");
        }
      }

      onTeamCreated?.(team.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Team</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Team Name
          </label>
          <input
            type="text"
            {...register("name", { required: "Team name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status Update Day
          </label>
          <select
            {...register("promptDay", { required: "Day is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
            <option value="0">Sunday</option>
          </select>
          {errors.promptDay && (
            <p className="mt-1 text-sm text-red-600">
              {errors.promptDay.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status Update Time
          </label>
          <input
            type="time"
            {...register("promptTime", { required: "Time is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.promptTime && (
            <p className="mt-1 text-sm text-red-600">
              {errors.promptTime.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            {...register("timezone", { required: "Timezone is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz} selected={tz === userTimezone}>
                {tz}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <p className="mt-1 text-sm text-red-600">
              {errors.timezone.message}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Your local timezone is {userTimezone}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Team Member Emails (comma-separated)
          </label>
          <textarea
            {...register("memberEmails")}
            placeholder="john@example.com, jane@example.com"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter email addresses separated by commas
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? "Creating Team..." : "Create Team"}
        </button>
      </form>
    </div>
  );
};
