import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from '@/pages/PendingApproval';
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Maintenance from "./pages/Maintenance";
import Fuel from "./pages/Fuel";
import Missions from "./pages/Missions";
import MissionHistory from "./pages/MissionHistory";
import Planning from "./pages/Planning";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Compliance from "./pages/Compliance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/pending-approval",
    element: <PendingApproval />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "vehicles",
        element: <Vehicles />,
      },
      {
        path: "drivers",
        element: <Drivers />,
      },
      {
        path: "maintenance",
        element: <Maintenance />,
      },
      {
        path: "fuel",
        element: <Fuel />,
      },
      {
        path: "missions",
        element: <Missions />,
      },
      {
        path: "missions/history",
        element: <MissionHistory />,
      },
      {
        path: "planning",
        element: <Planning />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "compliance",
        element: <Compliance />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  } as any,
});


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomThemeProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider
              router={router}
              future={{
                v7_startTransition: true,
              }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </CustomThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
