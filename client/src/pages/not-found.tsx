import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, getCurrentTenant } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function NotFound() {
  const { user, restaurant } = useAuth();
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (user && restaurant) {
      setIsRedirecting(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            const tenant = getCurrentTenant();
            if (tenant) {
              setLocation(`/${tenant.id}/dashboard`);
            } else {
              setLocation("/login");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user, restaurant, setLocation]);

  const handleGoToDashboard = () => {
    const tenant = getCurrentTenant();
    if (tenant) {
      setLocation(`/${tenant.id}/dashboard`);
    } else {
      setLocation("/login");
    }
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 mb-6">
            The page you're looking for doesn't exist.
          </p>

          {user && restaurant && isRedirecting ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Redirecting to dashboard in {countdown} seconds...
              </p>
              <Button 
                onClick={handleGoToDashboard}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {user && restaurant && (
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              )}
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
