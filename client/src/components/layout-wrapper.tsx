import { useLocation } from "wouter";
import { DashboardSidebar } from "./dashboard-sidebar";
import { useAuth } from "@/lib/auth";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
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
  
  // Extract tenant ID from the URL for authenticated routes
  const tenantMatch = location.match(/^\/(\d+)/);
  const tenantId = tenantMatch ? parseInt(tenantMatch[1]) : 0;
  
  // Render with sidebar for authenticated routes
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar tenantId={tenantId} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}