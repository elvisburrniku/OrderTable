import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const { user, restaurant, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isLoading && countdown > 0) {
      // Countdown timer
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (!isLoading && countdown === 0) {
      // Auto-redirect when countdown reaches 0
      if (user && restaurant) {
        setLocation(`/${restaurant.tenantId}/dashboard`);
      } else {
        setLocation("/login");
      }
    }
  }, [countdown, user, restaurant, isLoading, setLocation]);

  const handleRedirect = () => {
    if (user && restaurant) {
      setLocation(`/${restaurant.tenantId}/dashboard`);
    } else {
      setLocation("/login");
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <AlertTriangle className="h-24 w-24 mx-auto text-orange-500 mb-4" />
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
            URL: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">{location}</code>
          </p>
        </div>
        
        <div className="space-y-3">
          <Button onClick={handleRedirect} className="w-full" size="lg">
            <Home className="h-4 w-4 mr-2" />
            {user && restaurant ? "Go to Dashboard" : "Go to Login"}
          </Button>
          
          <Button onClick={handleGoBack} variant="outline" className="w-full" size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {countdown > 0 ? (
                <>Redirecting automatically in <span className="font-mono font-bold text-orange-600">{countdown}</span> seconds...</>
              ) : (
                "Redirecting now..."
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}