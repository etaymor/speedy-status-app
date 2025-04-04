import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SubmissionForm } from "./SubmissionForm";

interface Submission {
  id: string;
  content: string;
  submitted_at: string;
  is_late: boolean;
  week_start_date: string;
  user: {
    id: string;
    name: string;
  };
}

interface SubmissionListProps {
  teamId: string;
  accessToken: string;
  userId: string;
}

export const SubmissionList: React.FC<SubmissionListProps> = ({
  teamId,
  accessToken,
  userId,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(
    null
  );

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`/api/v1/teams/${teamId}/submissions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load submissions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [teamId, accessToken]);

  const handleEditSuccess = () => {
    setEditingSubmission(null);
    fetchSubmissions();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <p className="font-bold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (editingSubmission) {
    return (
      <div>
        <button
          onClick={() => setEditingSubmission(null)}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to submissions
        </button>
        <SubmissionForm
          onSubmitSuccess={handleEditSuccess}
          initialContent={editingSubmission.content}
          submissionId={editingSubmission.id}
          isEditMode={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="bg-white rounded-lg shadow p-6 space-y-4"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {submission.user.name}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(submission.submitted_at).toLocaleString()}
                {submission.is_late && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Late
                  </span>
                )}
              </p>
            </div>
            {submission.user.id === userId && (
              <button
                onClick={() => setEditingSubmission(submission)}
                className="text-sm text-indigo-600 hover:text-indigo-900"
              >
                Edit
              </button>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {submission.content}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};
