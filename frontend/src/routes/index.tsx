import { RouteObject, Navigate, Link } from "react-router-dom";
import { OnboardingFlow } from "../components/onboarding/OnboardingFlow";
import { ThankYou } from "../components/onboarding/ThankYou";
import { OnboardingProvider } from "../context/OnboardingContext";

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
const HomePage = () => (
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
        <div className="mt-4">
          <Link
            to="/onboarding"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#201D1F] hover:bg-[#2c2a2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#201D1F]"
          >
            Create Team
          </Link>
        </div>
      </div>
    </div>
  </div>
);

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
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <Navigate to="/" />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
];
