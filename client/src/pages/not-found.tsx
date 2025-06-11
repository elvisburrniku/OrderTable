import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { user, restaurant, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        if (user && restaurant) {
          // Redirect to correct dashboard if authenticated
          setLocation(`/${restaurant.tenantId}/dashboard`);
        } else {
          // Redirect to login if not authenticated
          setLocation("/login");
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, restaurant, isLoading, setLocation]);

  const handleRedirect = () => {
    if (user && restaurant) {
      setLocation(`/${restaurant.tenantId}/dashboard`);
    } else {
      setLocation("/login");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <div className="space-y-4">
          <Button onClick={handleRedirect} className="w-full">
            {user && restaurant ? "Go to Dashboard" : "Go to Login"}
          </Button>
          <p className="text-sm text-gray-500">
            Redirecting automatically in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}