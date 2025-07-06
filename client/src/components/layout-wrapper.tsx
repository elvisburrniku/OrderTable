import { useLocation } from "wouter";
import DashboardSidebar from "./dashboard-sidebar";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import CookieSettingsButton from "./cookie-settings-button";
import { NotificationIndicator } from "./notification-indicator";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [location] = useLocation();
  const { user, restaurant } = useAuth();
  
  // Extract tenant ID from the URL for authenticated routes
  const tenantMatch = location.match(/^\/(\d+)/);
  const tenantId = tenantMatch ? parseInt(tenantMatch[1]) : 0;
  
  // Define routes that should NOT show the sidebar
  const publicRoutes = [
    /^\/guest-booking\/\d+\/\d+$/,
    /^\/feedback\/\d+\/\d+$/,
    /^\/contact$/,
    /^\/feedback$/,
    /^\/feedback-responses$/,
    /^\/feedback-responses-popup$/,
    /^\/booking-manage\/.+$/,
    /^\/manage-booking\/.+$/,
    /^\/cancel-booking\/.+$/,
    /^\/login$/,
    /^\/register$/,
    /^\/setup$/,
    /^\/$/
  ];
  
  const isPublicRoute = publicRoutes.some(pattern => pattern.test(location));

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
    enabled: !!user && !!tenantId && !isPublicRoute,
  });
  
  // Check if subscription has ended, is canceled, or trial has expired
  const isSubscriptionEnded = subscriptionDetails?.tenant?.subscriptionStatus === 'ended' || 
                              subscriptionDetails?.tenant?.subscriptionStatus === 'canceled';
  const isTrialExpired = subscriptionDetails?.tenant?.subscriptionStatus === 'trialing' && 
                         subscriptionDetails?.tenant?.subscriptionEndDate && 
                         new Date(subscriptionDetails.tenant.subscriptionEndDate) < new Date();
  const isBlocked = isSubscriptionEnded || isTrialExpired;
  
  if (isPublicRoute) {
    // Render without sidebar for public routes
    return (
      <>
        {/* Header with notification indicator for public routes - only shows if authenticated */}
        {user && (
          <div className="flex justify-end items-center p-4 bg-white border-b border-gray-200">
            <NotificationIndicator />
          </div>
        )}
        {children}
        <CookieSettingsButton />
      </>
    );
  }
  
  // Hide sidebar for blocked access (ended subscriptions or expired trials)
  if (isBlocked) {
    return (
      <>
        {/* Header with notification indicator for blocked routes - only shows if authenticated */}
        {user && (
          <div className="flex justify-end items-center p-4 bg-white border-b border-gray-200">
            <NotificationIndicator />
          </div>
        )}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <CookieSettingsButton />
      </>
    );
  }
  
  // Render with sidebar for authenticated routes with active subscriptions
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar tenantId={tenantId} restaurantId={restaurant?.id} />
      <main className="flex-1 overflow-auto">
        {/* Header with notification indicator */}
        <div className="flex justify-end items-center p-4 bg-white border-b border-gray-200">
          <NotificationIndicator />
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
      <CookieSettingsButton />
    </div>
  );
}