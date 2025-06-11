import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export function SessionTimeoutHandler() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check session validity every 5 minutes
    const checkSession = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // Session expired or invalid
          await logout();
          setLocation("/login");
        }
      } catch (error) {
        console.error("Session check failed:", error);
        // Don't logout on network errors
      }
    };

    if (user) {
      const interval = setInterval(checkSession, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, logout, setLocation]);

  return null;
}