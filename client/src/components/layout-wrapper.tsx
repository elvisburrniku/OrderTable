import { useLocation } from "wouter";
import DashboardSidebar from "./dashboard-sidebar";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Extract tenant ID from the URL for authenticated routes
  const tenantMatch = location.match(/^\/(\d+)/);
  const tenantId = tenantMatch ? parseInt(tenantMatch[1]) : 0;
  
  // Fetch subscription details to check if subscription has ended
  const { data: subscriptionDetails } = useQuery<{
    tenant: {
      id: number;
      name: string;
      subscriptionStatus: string;
      subscriptionEndDate: string;
    };
    plan: any;
  }>({
    queryKey: ["/api/subscription/details"],
    enabled: !!user && !!tenantId,
  });
  
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
  
  // Check if subscription has ended, is canceled, or trial has expired
  const isSubscriptionEnded = subscriptionDetails?.tenant?.subscriptionStatus === 'ended' || 
                              subscriptionDetails?.tenant?.subscriptionStatus === 'canceled';
  const isTrialExpired = subscriptionDetails?.tenant?.subscriptionStatus === 'trialing' && 
                         subscriptionDetails?.tenant?.subscriptionEndDate && 
                         new Date(subscriptionDetails.tenant.subscriptionEndDate) < new Date();
  const isBlocked = isSubscriptionEnded || isTrialExpired;
  
  if (isPublicRoute) {
    // Render without sidebar for public routes
    return <>{children}</>;
  }
  
  // Hide sidebar for ended subscriptions
  if (isSubscriptionEnded) {
    return (
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    );
  }
  
  // Render with sidebar for authenticated routes with active subscriptions
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar tenantId={tenantId} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}