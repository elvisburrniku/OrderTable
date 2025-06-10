import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SetupGuardProps {
  children: React.ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const [, setLocation] = useLocation();

  // Get user session to check setup status
  const { data: session, isLoading } = useQuery({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && session) {
      const restaurant = (session as any)?.restaurant;
      
      // If user is authenticated but setup is not completed, redirect to setup wizard
      if (restaurant && !restaurant.setupCompleted) {
        setLocation('/setup');
      }
    }
  }, [session, isLoading, setLocation]);

  // Show loading while checking setup status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If not authenticated, let the auth system handle it
  if (!session) {
    return <>{children}</>;
  }

  const restaurant = (session as any)?.restaurant;
  
  // If setup is not completed, don't render children (redirect will happen)
  if (restaurant && !restaurant.setupCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}