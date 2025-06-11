import { useLocation } from "wouter";
import DashboardSidebar from "./dashboard-sidebar";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [location] = useLocation();
  
  // Define routes that should NOT show the sidebar
  const publicRoutes = [
    /^\/guest-booking\/\d+\/\d+$/,
    /^\/contact$/,
    /^\/feedback-responses$/,
    /^\/feedback-responses-popup$/,
    /^\/booking-manage$/,
    /^\/login$/,
    /^\/register$/,
    /^\/setup$/,
    /^\/$/
  ];
  
  const isPublicRoute = publicRoutes.some(pattern => pattern.test(location));
  
  if (isPublicRoute) {
    // Render without sidebar for public routes
    return <>{children}</>;
  }
  
  // Render with sidebar for authenticated routes
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <div className="text-sm text-gray-600">Dashboard Navigation</div>
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}