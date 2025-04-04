import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SubmissionFormProps {
  onSubmitSuccess: (content: string, id: string) => void;
  initialContent?: string;
  submissionId?: string;
  isEditMode?: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  onSubmitSuccess,
  initialContent = "",
  submissionId,
  isEditMode = false,
}) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [userData, setUserData] = useState<UserData | null>(null);
  const [status, setStatus] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenPayload, setTokenPayload] = useState<{
    sub: string;
    team_id: string;
  } | null>(null);

  useEffect(() => {
    const exchangeToken = async () => {
      if (!token) return;

      try {
        console.log("Starting token exchange process...");
        const response = await fetch(`/api/v1/magic-links/${token}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error("Token exchange failed:", {
            status: response.status,
            statusText: response.statusText,
          });
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Invalid or expired magic link");
        }

        const data = await response.json();
        console.log("Token exchange successful:", {
          token_type: data.token_type,
          access_token_preview: data.access_token.substring(0, 20) + "...",
        });

        // Decode the access token to get user and team info
        const payload = JSON.parse(atob(data.access_token.split(".")[1]));
        console.log("Access token payload decoded:", {
          sub: payload.sub,
          team_id: payload.team_id,
          type: payload.type,
          exp: new Date(payload.exp * 1000).toISOString(),
        });

        if (!payload.sub || !payload.team_id) {
          throw new Error("Invalid token payload");
        }

        setTokenPayload(payload);
        setAccessToken(data.access_token);

        // Fetch user data
        console.log("Fetching user data...");
        const userResponse = await fetch(`/api/v1/users/${payload.sub}`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });

        console.log("User data response status:", userResponse.status);

        if (!userResponse.ok) {
          const userErrorData = await userResponse.json().catch(() => ({}));
          console.error("Failed to fetch user data:", {
            status: userResponse.status,
            statusText: userResponse.statusText,
            error: userErrorData,
          });
          throw new Error("Failed to fetch user data");
        }

        const userData = await userResponse.json();
        console.log("User data fetched successfully:", {
          id: userData.id,
          name: userData.name,
          role: userData.role,
        });
        setUserData(userData);
      } catch (err) {
        console.error("Token exchange error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to validate magic link"
        );
      }
    };

    exchangeToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!accessToken || !tokenPayload) {
        throw new Error("Invalid submission link. Please request a new one.");
      }

      const endpoint = isEditMode
        ? `/api/v1/submissions/${submissionId}`
        : "/api/v1/submissions";

      const method = isEditMode ? "PUT" : "POST";

      const submissionData = isEditMode
        ? { content: status }
        : {
            content: status,
            team_id: tokenPayload.team_id,
            user_id: tokenPayload.sub,
          };

      console.log(
        `Starting ${isEditMode ? "update" : "submission"} with data:`,
        {
          ...submissionData,
          content_length: status.length,
          accessToken: accessToken.substring(0, 10) + "...",
        }
      );

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(submissionData),
      });

      console.log(
        `${isEditMode ? "Update" : "Submission"} response status:`,
        response.status
      );

      let responseData;
      try {
        responseData = await response.json();
        console.log(
          `${isEditMode ? "Update" : "Submission"} response data:`,
          responseData
        );
      } catch (e) {
        console.error("Failed to parse response JSON:", e);
        responseData = null;
      }

      if (!response.ok) {
        console.error(
          `${isEditMode ? "Update" : "Submission"} error response:`,
          {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
          }
        );
        throw new Error(
          (responseData && responseData.detail) ||
            `Failed to ${
              isEditMode ? "update" : "submit"
            } status update. Please try again.`
        );
      }

      console.log(
        `${isEditMode ? "Update" : "Submission"} successful:`,
        responseData
      );
      onSubmitSuccess(responseData.content, responseData.id);
    } catch (err) {
      console.error(`${isEditMode ? "Update" : "Submission"} error:`, err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
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
        {isEditMode ? "Edit Your Status Update" : "Submit Your Status Update"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {userData && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              {isEditMode ? "Editing" : "Submitting"} as:{" "}
              <span className="font-medium">{userData.name}</span>
            </p>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status Update
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>

          {!showPreview ? (
            <>
              <textarea
                id="status"
                rows={4}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
                placeholder="What have you been working on?"
              />
              <div className="mt-2 text-sm text-gray-500">
                <p>Markdown is supported:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>
                    **bold** for <strong>bold text</strong>
                  </li>
                  <li>
                    *italic* for <em>italic text</em>
                  </li>
                  <li># Heading 1, ## Heading 2, etc.</li>
                  <li>- or * for bullet points</li>
                  <li>
                    `code` for <code>inline code</code>
                  </li>
                  <li>```language for code blocks</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="prose prose-sm max-w-none bg-white p-4 rounded-md border border-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {status || "*No content to preview*"}
              </ReactMarkdown>
            </div>
          )}
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

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting
              ? isEditMode
                ? "Saving..."
                : "Submitting..."
              : isEditMode
              ? "Save Changes"
              : "Submit Update"}
          </button>
        </div>
      </form>
    </div>
  );
};
