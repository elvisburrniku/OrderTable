import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  "role-permissions": "access_users",
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
    if (isLoading || !userPermissions) return;

    const hasPermission = userPermissions.permissions.includes(requiredPermission);
    setHasAccess(hasPermission);

    if (!hasPermission) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });

      // Redirect to user's default page or fallback
      const redirectTo = fallbackPath || `/${userPermissions.redirect}` || "/dashboard";
      setTimeout(() => {
        setLocation(redirectTo);
      }, 1000);
    }
  }, [userPermissions, isLoading, requiredPermission, fallbackPath, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
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
  const { data: userPermissions } = useQuery<UserPermissions>({
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
    isLoading: !userPermissions
  };
}

// Auto permission guard based on current route
export function AutoPermissionGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { getUserRole } = usePermissions();
  
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

  // If user is owner, allow access to all pages (subscription limits will be checked on the backend)
  if (userRole === 'owner') {
    return <>{children}</>;
  }

  // If no specific permission is required for this page, allow access
  if (!requiredPermission) {
    return <>{children}</>;
  }

  return (
    <PermissionGuard requiredPermission={requiredPermission}>
      {children}
    </PermissionGuard>
  );
}