import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StandardLoading } from "./standard-loading";

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallbackPath?: string;
}

interface UserPermissions {
  permissions: string[];
  role: string;
  redirect: string;
}

const PAGE_PERMISSION_MAP: { [key: string]: string } = {
  "dashboard": "access_dashboard",
  "bookings": "access_bookings", 
  "customers": "access_customers",
  "menu-management": "access_menu",
  "tables": "access_tables",
  "kitchen-dashboard": "access_kitchen",
  "users": "access_users",
  "guard-management": "access_users",
  "billing": "access_billing",
  "statistics": "access_reports",
  "activity-log": "access_reports",
  "global-activity-log": "access_reports",
  "email-notifications": "access_notifications",
  "sms-notifications": "access_notifications",
  "integrations": "access_integrations",
  "settings": "access_settings",
  "tenant-settings": "access_settings",
  "restaurant-settings": "access_settings"
};

export function PermissionGuard({ children, requiredPermission, fallbackPath }: PermissionGuardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const { data: userPermissions, isLoading, error } = useQuery<UserPermissions>({
    queryKey: ["/api/user/permissions"],
    retry: false,
  });

  useEffect(() => {
    console.log("PermissionGuard check:", { requiredPermission, userPermissions, isLoading });

    if (isLoading || !userPermissions) return;

    const hasPermission = userPermissions.permissions.includes(requiredPermission);
    console.log("PermissionGuard result:", { hasPermission, userRole: userPermissions.role });

    setHasAccess(hasPermission);

    if (!hasPermission) {
      console.log("PermissionGuard: Access denied, redirecting...");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });

      // Redirect to user's default page or fallback with tenant context
      const currentTenantId = window.location.pathname.split('/')[1];
      const redirectTo = fallbackPath || `/${currentTenantId}/${userPermissions.redirect}` || `/${currentTenantId}/dashboard`;
      setTimeout(() => {
        setLocation(redirectTo);
      }, 1000);
    }
  }, [userPermissions, isLoading, requiredPermission, fallbackPath, setLocation, toast]);

  if (isLoading) {
    return (
      <StandardLoading />
    );
  }

  if (error || hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (hasAccess === true) {
    return <>{children}</>;
  }

  return null;
}

// Hook to check permissions for specific actions
export function usePermissions() {
  const { data: userPermissions, isLoading: queryLoading, error } = useQuery<UserPermissions>({
    queryKey: ["/api/user/permissions"],
    retry: false,
  });

  const hasPermission = (permission: string): boolean => {
    return userPermissions?.permissions.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const getUserRole = (): string => {
    return userPermissions?.role || "";
  };

  const getDefaultRedirect = (): string => {
    return userPermissions?.redirect || "dashboard";
  };

  return {
    hasPermission,
    hasAnyPermission,
    getUserRole,
    getDefaultRedirect,
    permissions: userPermissions?.permissions || [],
    isLoading: queryLoading || !userPermissions,
    error
  };
}

// Auto permission guard based on current route
export function AutoPermissionGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { getUserRole, hasPermission, isLoading, permissions } = usePermissions();

  // Extract the page name from the current route
  const getPageFromRoute = (path: string): string => {
    const segments = path.split('/').filter(Boolean);
    // Skip tenant ID (first segment) and get the page
    if (segments.length > 1) {
      return segments[1];
    }
    return segments[0] || "dashboard";
  };

  const currentPage = getPageFromRoute(location);
  const requiredPermission = PAGE_PERMISSION_MAP[currentPage];
  const userRole = getUserRole();

  console.log("AutoPermissionGuard DEBUG:", { 
    currentPage, 
    requiredPermission, 
    userRole, 
    isLoading,
    hasRequiredPermission: requiredPermission ? hasPermission(requiredPermission) : true,
    allPermissions: permissions
  });

  // Wait for user data to load - CRITICAL: Don't redirect while loading
  if (isLoading || !userRole) {
    console.log("🔄 AutoPermissionGuard: Still loading permissions, showing loading state");
    return (
      <StandardLoading />
    );
  }

  // If user is owner, allow access to all pages
  if (userRole === 'owner') {
    console.log("Owner access granted for all pages");
    return <>{children}</>;
  }

  // If no specific permission is required for this page, allow access
  if (!requiredPermission) {
    console.log("No permission required, allowing access");
    return <>{children}</>;
  }

  // Check if user has the required permission
  if (hasPermission(requiredPermission)) {
    console.log("Permission granted:", requiredPermission);
    return <>{children}</>;
  }

  console.log("Permission denied, using PermissionGuard fallback");
  return (
    <PermissionGuard requiredPermission={requiredPermission}>
      {children}
    </PermissionGuard>
  );
}