import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

interface SubmissionFormProps {
  onSubmitSuccess: () => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  onSubmitSuccess,
}) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const teamId = searchParams.get("team_id");
  const userId = searchParams.get("user_id");
  const userName = searchParams.get("name");

  const [name, setName] = useState(userName || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const exchangeToken = async () => {
      if (!token) return;

      try {
        console.log("Exchanging token with params:", { token, teamId, userId });
        const response = await fetch(`/api/v1/magic-links/${token}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Invalid or expired magic link");
        }

        const data = await response.json();
        console.log("Token exchange response:", data);

        // Decode the access token to verify team_id
        const tokenPayload = JSON.parse(atob(data.access_token.split(".")[1]));
        console.log("Access token payload:", tokenPayload);

        if (!tokenPayload.team_id) {
          throw new Error("Missing team ID in access token");
        }

        if (tokenPayload.team_id !== teamId) {
          console.warn(
            "Team ID mismatch between URL and token. Using token team_id for security."
          );
        }

        setAccessToken(data.access_token);
      } catch (err) {
        console.error("Token exchange error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to validate magic link"
        );
      }
    };

    exchangeToken();
  }, [token, teamId, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!accessToken) {
        throw new Error("Invalid submission link. Please request a new one.");
      }

      // Decode token to get team_id
      const tokenPayload = JSON.parse(atob(accessToken.split(".")[1]));
      if (!tokenPayload.team_id) {
        throw new Error("Missing team ID in access token");
      }

      const submissionData = {
        content: status,
        team_id: tokenPayload.team_id, // Use team_id from token instead of URL
        user_id: userId,
      };

      console.log("Submitting status with:", {
        ...submissionData,
        accessToken: accessToken.substring(0, 10) + "...",
      });

      const response = await fetch("/api/v1/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(submissionData),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = null;
      }

      if (!response.ok) {
        console.error("Submission error response:", responseData);
        throw new Error(
          (responseData && responseData.detail) ||
            "Failed to submit status update. Please try again."
        );
      }

      console.log("Submission successful:", responseData);
      onSubmitSuccess();
    } catch (err) {
      console.error("Submission error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || !teamId || !userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div
          className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <p className="font-bold">Invalid Link</p>
          <p className="text-sm">
            This submission link is invalid or has expired. Please request a new
            one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Submit Your Status Update
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!userName && (
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
              placeholder="Enter your name"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700"
          >
            Status Update
          </label>
          <div className="mt-1">
            <textarea
              id="status"
              rows={4}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
              placeholder="What have you been working on?"
            />
          </div>
        </div>

        {error && (
          <div
            className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting || !accessToken}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isSubmitting || !accessToken
                ? "opacity-75 cursor-not-allowed"
                : ""
            }`}
          >
            {isSubmitting
              ? "Submitting..."
              : !accessToken
              ? "Validating link..."
              : "Submit Status Update"}
          </button>
        </div>
      </form>
    </div>
  );
};
