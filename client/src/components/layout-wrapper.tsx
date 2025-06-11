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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}