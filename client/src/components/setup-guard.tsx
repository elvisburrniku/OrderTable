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
      const user = (session as any)?.user;
      const restaurant = (session as any)?.restaurant;
      
      // Check if user has completed onboarding first
      if (user && !user.onboardingCompleted) {
        setLocation('/onboarding');
        return;
      }
      
      // If onboarding is completed but setup is not, redirect to setup wizard
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

  const user = (session as any)?.user;
  const restaurant = (session as any)?.restaurant;
  
  // If onboarding is not completed, don't render children (redirect will happen)
  if (user && !user.onboardingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
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