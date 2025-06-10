import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";
import { Grid3x3, X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    restaurantName: "",
    rememberMe: false,
    selectedPlanId: null as number | null,
  });
  const [showRememberNotice, setShowRememberNotice] = useState(false);

  // Initialize form with remembered data
  useEffect(() => {
    const rememberMe = localStorage.getItem("rememberMe") === "true";
    const lastLoginEmail = localStorage.getItem("lastLoginEmail");
    
    if (rememberMe && lastLoginEmail) {
      setFormData(prev => ({
        ...prev,
        email: lastLoginEmail,
        rememberMe: true
      }));
      setShowRememberNotice(true);
      // Hide notice after 3 seconds
      setTimeout(() => setShowRememberNotice(false), 3000);
    }
  }, []);

  // Check if user is already authenticated
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/subscription-plans"],
    enabled: !isLogin,
  });

  // Redirect authenticated users
  useEffect(() => {
    if (!sessionLoading && session) {
      const restaurant = (session as any)?.restaurant;
      
      if (restaurant) {
        if (restaurant.setupCompleted) {
          // Redirect to dashboard if setup is complete
          const tenantId = (session as any)?.tenant?.id;
          setLocation(`/${tenantId}/dashboard`);
        } else {
          // Redirect to setup if setup is not complete
          setLocation('/setup');
        }
      }
    }
  }, [session, sessionLoading, setLocation]);

  // Show loading while checking authentication
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password, formData.rememberMe);
        if(result) {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          
          // Check if setup is completed
          if (!result.restaurant.setupCompleted) {
            setLocation('/setup');
          } else {
            // Use restaurant ID as tenant ID
            const tenantId = result.restaurant.id;
            setLocation(`/${tenantId}/dashboard`);
          }
        } else {
          toast({
            title: "Error",
            description: "Login failed",
            variant: "destructive",
          });
        }
      } else {
        const result = await register({
          username: formData.name,
          email: formData.email,
          password: formData.password,
          restaurantName: formData.restaurantName,
        });

        if(result) {
          // Create subscription if plan selected
          if (formData.selectedPlanId) {
            await fetch(`/api/users/${result.user.id}/subscription`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planId: formData.selectedPlanId,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: "active",
              }),
            });
          }

          toast({
            title: "Account created!",
            description: "Your restaurant account has been created successfully.",
          });
          // Use restaurant ID as tenant ID
          const tenantId = result.restaurant.id;
          setLocation(`/${tenantId}/dashboard`);
        } else {
          toast({
            title: "Error",
            description: "Registration failed",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left side - Restaurant image */}
          <div className="relative h-96 md:h-auto">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600')`,
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="flex items-center justify-center mb-4">
                  <Grid3x3 className="text-green-500 text-3xl mr-3" size={32} />
                  <span className="text-3xl font-bold">easyTable</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  BETTER BOOKING.
                  <br />
                  BETTER BUSINESS.
                </h2>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                {isLogin ? "Login" : "Sign Up"}
              </h3>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <X className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            
            {showRememberNotice && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700">Welcome back! Your login details have been remembered.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <>
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Full Name:
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="restaurantName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Restaurant Name:
                    </Label>
                    <Input
                      id="restaurantName"
                      type="text"
                      value={formData.restaurantName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restaurantName: e.target.value,
                        })
                      }
                      className="mt-1"
                      required
                    />
                  </div>
                </>
              )}

              {!isLogin && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Choose Your Plan:
                  </Label>
                  <div className="space-y-3">
                    {plans.map((plan: any) => (
                      <div
                        key={plan.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.selectedPlanId === plan.id
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, selectedPlanId: plan.id })
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {plan.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg font-bold text-green-600">
                                ${(plan.price / 100).toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500">
                                /{plan.interval}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                              <span>{plan.maxTables} tables</span>
                              <span>
                                {plan.maxBookingsPerMonth} bookings/month
                              </span>
                            </div>
                          </div>
                          {formData.selectedPlanId === plan.id && (
                            <Check className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.selectedPlanId === null
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, selectedPlanId: null })
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Free Trial
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            3 tables, 20 bookings/month
                          </p>
                        </div>
                        {formData.selectedPlanId === null && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  E-mail:
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="elvis.presley@gmail.com"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password:
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="mt-1"
                  required
                />
              </div>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          rememberMe: Boolean(checked),
                        })
                      }
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm text-gray-600"
                    >
                      Log in automatically from this computer
                    </Label>
                  </div>
                  <Button
                    variant="link"
                    className="text-sm text-green-600 hover:text-green-700 p-0"
                  >
                    Forgot password?
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading
                  ? "Loading..."
                  : isLogin
                    ? "Log in"
                    : "Create Account"}
              </Button>

              {isLogin && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.location.href = '/api/auth/google'}
                      className="w-full"
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.location.href = '/api/auth/github'}
                      className="w-full"
                    >
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      GitHub
                    </Button>
                  </div>
                </>
              )}

              <div className="text-center">
                <span className="text-gray-600">
                  {isLogin ? "New user? " : "Already have an account? "}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="text-green-600 hover:text-green-700 p-0"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign up" : "Log in"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
