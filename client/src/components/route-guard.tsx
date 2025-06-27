`
```typescript
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { StandardLoading } from "./standard-loading";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, restaurant, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      // Skip authentication checks for public routes like guest booking
      const publicRoutes = [
        /^\/$/,  // Home page should be public
        /^\/login$/,
        /^\/register$/,
        /^\/guest-booking\/\d+\/\d+$/,
        /^\/feedback\/\d+\/\d+$/,
        /^\/contact$/,
        /^\/feedback-responses$/,
        /^\/feedback-responses-popup$/,
        /^\/booking-manage$/
      ];

      const isPublicRoute = publicRoutes.some(pattern => pattern.test(location));
      if (isPublicRoute) {
        return; // Skip authentication for public routes
      }

      // Check if user is authenticated
      if (!user) {
        // Not authenticated, redirect to login
        setLocation("/login");
        return;
      }

      // Check if current route is a tenant route
      const tenantRouteMatch = location.match(/^\/(\d+)\//);
      if (tenantRouteMatch) {
        const routeTenantId = parseInt(tenantRouteMatch[1]);

        // If user has a restaurant but wrong tenant ID, redirect to correct dashboard
        if (restaurant && restaurant.tenantId !== routeTenantId) {
          setLocation(`/${restaurant.tenantId}/dashboard`);
          return;
        }

        // If user doesn't have a restaurant, redirect to login
        if (!restaurant) {
          setLocation("/login");
          return;
        }
      }

      // Check for 404 routes - if path doesn't match any known pattern
      const knownRoutes = [
        /^\/$/,
        /^\/login$/,
        /^\/register$/,
        /^\/setup$/,
        /^\/\d+\/dashboard$/,
        /^\/\d+\/bookings$/,
        /^\/\d+\/calendar$/,
        /^\/\d+\/heat-map$/,
        /^\/\d+\/conflicts$/,
        /^\/\d+\/bookings\/\d+$/,
        /^\/\d+\/tables$/,
        /^\/\d+\/customers$/,
        /^\/\d+\/menu$/,
        /^\/\d+\/menu-management$/,
        /^\/\d+\/kitchen-dashboard$/,
        /^\/\d+\/print-orders$/,
        /^\/\d+\/statistics$/,
        /^\/\d+\/activity-log$/,
        /^\/\d+\/waiting-list$/,
        /^\/\d+\/subscription$/,
        /^\/\d+\/sms-messages$/,
        /^\/\d+\/tenant-settings$/,
        /^\/\d+\/email-notifications$/,
        /^\/\d+\/sms-notifications$/,
        /^\/\d+\/feedback-questions$/,
        /^\/\d+\/events$/,
        /^\/\d+\/payment-setups$/,
        /^\/\d+\/payment-gateway$/,
        /^\/\d+\/products$/,
        /^\/\d+\/product-groups$/,
        /^\/\d+\/feedback-responses$/,
        /^\/\d+\/feedbacks$/,
        /^\/\d+\/opening-hours$/,
        /^\/\d+\/integrations/,
        /^\/\d+\/special-periods$/,
        /^\/\d+\/cut-off-time$/,
        /^\/\d+\/periodic-criteria$/,
        /^\/\d+\/custom-fields$/,
        /^\/\d+\/seating-configurations$/,
        /^\/\d+\/combined-tables$/,
        /^\/\d+\/rooms$/,
        /^\/\d+\/booking-agents$/,
        /^\/\d+\/users$/,
        /^\/\d+\/table-plan$/,
        /^\/\d+\/profile$/,
        /^\/\d+\/settings$/,
        /^\/\d+\/billing$/,
        /^\/\d+\/help$/,
        /^\/\d+\/restaurant-management$/,
        /^\/\d+\/create-restaurant$/,
        /^\/\d+\/test-tools$/,
        /^\/\d+\/customer-feedback$/,
        /^\/\d+\/table-feedback$/,
        /^\/\d+\/feedback-responses-popup$/,
        /^\/contact$/,
        /^\/guest-booking\/\d+\/\d+$/,
        /^\/feedback\/\d+\/\d+$/,
        /^\/booking-manage$/
      ];

      const isKnownRoute = knownRoutes.some(pattern => pattern.test(location));

      if (!isKnownRoute) {
        // Unknown route - redirect to dashboard if authenticated, login if not
        if (user && restaurant) {
          setLocation(`/${restaurant.tenantId}/dashboard`);
        } else {
          setLocation("/login");
        }
      }
    }
  }, [location, user, restaurant, isLoading, setLocation]);

  if (isLoading) {
    if (location === "/login") {
      return <>{children}</>;
    }
    return <StandardLoading />;
  }

  return <>{children}</>;
}