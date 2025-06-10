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
import { AuthLoadingOverlay } from "@/components/ui/auth-loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Define subscription plan type
type SubscriptionPlan = {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
};

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
  const [loadingState, setLoadingState] = useState<{
    isLoading: boolean;
    type: "login" | "register" | "google" | "apple" | "logout" | null;
  }>({
    isLoading: false,
    type: null
  });

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
  const { data: session, isLoading: sessionLoading } = useQuery<any>({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  // Fetch subscription plans for registration
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: !isLogin, // Only fetch when in registration mode
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (session && !sessionLoading && session.valid) {
      if (session.user && session.restaurant) {
        if (session.restaurant.setupCompleted) {
          const tenantId = session.tenant?.id || session.restaurant.id;
          setLocation(`/${tenantId}/dashboard`);
        } else {
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
    setLoadingState({
      isLoading: true,
      type: isLogin ? "login" : "register"
    });

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
            const tenantId = result.tenant?.id || result.restaurant.id;
            setLocation(`/${tenantId}/dashboard`);
          }
        } else {
          toast({
            title: "Error",
            description: "Invalid credentials",
            variant: "destructive",
          });
        }
      } else {
        if (!formData.selectedPlanId) {
          toast({
            title: "Error",
            description: "Please select a subscription plan",
            variant: "destructive",
          });
          return;
        }

        const result = await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          restaurantName: formData.restaurantName,
          subscriptionPlanId: formData.selectedPlanId,
        });

        if (result && result.restaurant) {
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
      setLoadingState({
        isLoading: false,
        type: null
      });
    }
  };

  return (
    <>
      <AuthLoadingOverlay 
        isVisible={loadingState.isLoading} 
        type={loadingState.type || "login"} 
      />
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
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Full Name
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
                      <Label htmlFor="restaurantName" className="text-sm font-medium text-gray-700">
                        Restaurant Name
                      </Label>
                      <Input
                        id="restaurantName"
                        type="text"
                        value={formData.restaurantName}
                        onChange={(e) =>
                          setFormData({ ...formData, restaurantName: e.target.value })
                        }
                        className="mt-1"
                        required
                      />
                    </div>

                    {/* Subscription Plan Selection */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">
                        Choose Your Plan
                      </Label>
                      {plansLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
                          <span className="ml-2 text-sm text-gray-600">Loading plans...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {plans?.map((plan: any) => (
                            <div
                              key={plan.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                formData.selectedPlanId === plan.id
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  selectedPlanId: plan.id,
                                })
                              }
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                                <div className="flex items-center">
                                  <span className="text-lg font-bold text-green-600">
                                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                                  </span>
                                  {plan.price > 0 && (
                                    <span className="text-sm text-gray-500 ml-1">/month</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                              <div className="space-y-1">
                                {(() => {
                                  try {
                                    const features = typeof plan.features === 'string' 
                                      ? JSON.parse(plan.features) 
                                      : plan.features || [];
                                    return features.slice(0, 3).map((feature: string, index: number) => (
                                      <div key={index} className="flex items-center text-xs text-gray-600">
                                        <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                        {feature}
                                      </div>
                                    ));
                                  } catch (error) {
                                    return null;
                                  }
                                })()}
                                {(() => {
                                  try {
                                    const features = typeof plan.features === 'string' 
                                      ? JSON.parse(plan.features) 
                                      : plan.features || [];
                                    return features.length > 3 && (
                                      <div className="text-xs text-gray-500">
                                        +{features.length - 3} more features
                                      </div>
                                    );
                                  } catch (error) {
                                    return null;
                                  }
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!formData.selectedPlanId && (
                        <p className="text-xs text-red-600 mt-2">Please select a subscription plan to continue</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
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
                  disabled={isLoading || loadingState.isLoading}
                >
                  {loadingState.isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      {loadingState.type === "login" ? "Signing in..." : "Creating account..."}
                    </div>
                  ) : (
                    isLogin ? "Log in" : "Create Account"
                  )}
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
                        onClick={() => {
                          setLoadingState({ isLoading: true, type: "google" });
                          window.location.href = '/api/auth/google';
                        }}
                        className="w-full"
                        disabled={loadingState.isLoading}
                      >
                        {loadingState.isLoading && loadingState.type === "google" ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
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
                        )}
                        Google
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setLoadingState({ isLoading: true, type: "apple" });
                          window.location.href = '/api/auth/apple';
                        }}
                        className="w-full"
                        disabled={loadingState.isLoading}
                      >
                        {loadingState.isLoading && loadingState.type === "apple" ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                        )}
                        Apple
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
    </>
  );
}