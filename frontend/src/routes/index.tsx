import { RouteObject, Navigate, Link, useSearchParams } from "react-router-dom";
import { OnboardingFlow } from "../components/onboarding/OnboardingFlow";
import { ThankYou } from "../components/onboarding/ThankYou";
import { OnboardingProvider } from "../context/OnboardingContext";
import { SubmissionForm } from "../components/SubmissionForm";
import { SubmissionList } from "../components/SubmissionList";
import { Dashboard } from "../components/Dashboard";
import { TeamDashboard } from "../components/TeamDashboard";
import { Login } from "../components/Login";
import { CreateTeam } from "../components/CreateTeam";
import { useState } from "react";

// Layout components
const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Speedy Status</h1>
          </div>
        </div>
      </div>
    </nav>
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

// Home page component
const HomePage = () => {
  const isLoggedIn = localStorage.getItem("accessToken") !== null;

  if (isLoggedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">
            Welcome to your team status management system
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first team or checking your existing
            teams' status updates.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              to="/onboarding"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#201D1F] hover:bg-[#2c2a2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#201D1F]"
            >
              Create Team
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Success page after submission
const SubmissionSuccess = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const content = searchParams.get("content");
  const submissionId = searchParams.get("id");
  const [isEditing, setIsEditing] = useState(false);

  // Extract token payload
  const getTokenPayload = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        team_id: payload.team_id as string,
        sub: payload.sub as string,
      };
    } catch (e) {
      console.error("Failed to parse token payload:", e);
      return null;
    }
  };

  const tokenPayload = getTokenPayload();

  if (!token || !tokenPayload || !content || !submissionId) {
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

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setIsEditing(false)}
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
          Back
        </button>
        <SubmissionForm
          onSubmitSuccess={(content, id) => {
            const params = new URLSearchParams();
            params.set("token", token);
            params.set("content", content);
            params.set("id", id);
            window.location.href = `/submit/success?${params.toString()}`;
          }}
          initialContent={content}
          submissionId={submissionId}
          isEditMode={true}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#201D1F] mb-4">Thank you!</h1>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Your status update has been submitted successfully.
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Edit Submission
        </button>
      </div>
    </div>
  );
};

// Routes configuration
export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <MainLayout>
        <HomePage />
      </MainLayout>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    ),
  },
  {
    path: "/thank-you",
    element: (
      <OnboardingProvider>
        <ThankYou />
      </OnboardingProvider>
    ),
  },
  {
    path: "/submit",
    element: (
      <MainLayout>
        <SubmissionForm
          onSubmitSuccess={(content, id) => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");
            if (token) {
              const newParams = new URLSearchParams();
              newParams.set("token", token);
              newParams.set("content", content);
              newParams.set("id", id);
              window.location.href = `/submit/success?${newParams.toString()}`;
            }
          }}
        />
      </MainLayout>
    ),
  },
  {
    path: "/submit/success",
    element: (
      <MainLayout>
        <SubmissionSuccess />
      </MainLayout>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard/:teamId",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <TeamDashboard />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <MainLayout>
        <Login />
      </MainLayout>
    ),
  },
  {
    path: "/create-team",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <CreateTeam />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];
