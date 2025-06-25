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
import { X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthLoadingOverlay } from "@/components/ui/auth-loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ReadyTableLogo } from "@/components/ui/ready-table-logo";

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

  // Initialize form with remembered data and handle URL error parameters
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

    // Handle URL error parameters for SSO failures
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (error === 'account_suspended') {
      toast({
        title: "Account Suspended",
        description: message || "Your account has been suspended. Please contact support for assistance.",
        variant: "destructive",
      });
    } else if (error === 'account_paused') {
      toast({
        title: "Account Paused", 
        description: message || "Your account is temporarily paused. Please contact support for assistance.",
        variant: "destructive",
      });
    } else if (error === 'sso_failed') {
      toast({
        title: "Authentication Failed",
        description: "SSO authentication failed. Please try again or use email/password login.",
        variant: "destructive",
      });
    }
    
    // Clear URL parameters after showing toast
    if (error) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);

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

  // Auto-select free plan when plans are loaded and no plan is selected
  useEffect(() => {
    if (plans && plans.length > 0 && !formData.selectedPlanId) {
      const freePlan = plans.find(plan => plan.price === 0);
      if (freePlan) {
        setFormData(prev => ({
          ...prev,
          selectedPlanId: freePlan.id
        }));
      }
    }
  }, [plans, formData.selectedPlanId]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* Glassy card container */}
        <div className="w-full max-w-6xl relative">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 min-h-[700px]">
              {/* Left side - Restaurant image with glass effect */}
              <div className="relative h-96 md:h-auto overflow-hidden">
                {/* Multiple restaurant images with parallax effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-red-500 to-pink-600"></div>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-110"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800')`,
                    mixBlendMode: 'overlay'
                  }}
                />
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-1000 hover:opacity-80"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800')`,
                  }}
                />
                
                {/* Animated glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                <div className="absolute inset-0 backdrop-blur-[1px] bg-white/5"></div>
                
                {/* Floating elements */}
                <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full backdrop-blur-md animate-float"></div>
                <div className="absolute bottom-20 right-10 w-16 h-16 bg-white/5 rounded-full backdrop-blur-md animate-float-delay"></div>
                
                {/* Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <div className="flex items-center justify-center mb-6 animate-fade-in">
                      <ReadyTableLogo 
                        size={40} 
                        textClassName="text-4xl font-bold bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent"
                        className="p-3 bg-white/20 rounded-full backdrop-blur-md"
                      />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4 animate-slide-up">
                      <span className="block bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent">
                        BETTER BOOKING.
                      </span>
                      <span className="block bg-gradient-to-r from-emerald-300 via-white to-emerald-300 bg-clip-text text-transparent">
                        BETTER BUSINESS.
                      </span>
                    </h2>
                    <p className="text-lg text-white/80 animate-fade-in-delay">
                      Streamline your restaurant operations with our comprehensive booking platform
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Glassy login form */}
              <div className="p-8 md:p-12 backdrop-blur-md bg-white/5 relative">
                {/* Decorative glass elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                    {isLogin ? "Welcome Back" : "Join easyTable"}
                  </h3>
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm">
                      <X className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              
                {showRememberNotice && (
                  <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4 mb-6 flex items-center gap-3 backdrop-blur-sm animate-fade-in">
                    <div className="h-3 w-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-emerald-200">Welcome back! Your login details have been remembered.</span>
                  </div>
                )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <>
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-white/90">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="restaurantName" className="text-sm font-medium text-white/90">
                        Restaurant Name
                      </Label>
                      <Input
                        id="restaurantName"
                        type="text"
                        value={formData.restaurantName}
                        onChange={(e) =>
                          setFormData({ ...formData, restaurantName: e.target.value })
                        }
                        className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                        required
                      />
                    </div>

                    {/* Subscription Plan Selection */}
                    <div>
                      <Label className="text-sm font-medium text-white/90 mb-4 block">
                        Choose Your Plan
                      </Label>
                      {plansLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
                          <span className="ml-2 text-sm text-white/70">Loading plans...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {plans?.map((plan: any) => (
                            <div
                              key={plan.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all backdrop-blur-sm ${
                                formData.selectedPlanId === plan.id
                                  ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/25'
                                  : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                              }`}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  selectedPlanId: plan.id,
                                })
                              }
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-white">{plan.name}</h4>
                                <div className="flex items-center">
                                  <span className="text-lg font-bold text-emerald-400">
                                    {plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(0)}`}
                                  </span>
                                  {plan.price > 0 && (
                                    <span className="text-sm text-white/60 ml-1">/month</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-white/70 mb-3">{plan.description}</p>
                              <div className="space-y-1">
                                {(() => {
                                  try {
                                    const features = typeof plan.features === 'string' 
                                      ? JSON.parse(plan.features) 
                                      : plan.features || [];
                                    return features.slice(0, 3).map((feature: string, index: number) => (
                                      <div key={index} className="flex items-center text-xs text-white/80">
                                        <Check className="h-3 w-3 text-emerald-400 mr-2 flex-shrink-0" />
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
                                      <div className="text-xs text-white/60">
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
                        <p className="text-xs text-emerald-400 mt-2">Please select a subscription plan to continue</p>
                      )}
                    </div>
                  </>
                )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-white/90">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-white/90">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      required
                    />
                  </div>

                  {isLogin && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="rememberMe"
                          checked={formData.rememberMe}
                          onCheckedChange={(checked) => {
                            if (checked !== formData.rememberMe) {
                              setFormData(prev => ({
                                ...prev,
                                rememberMe: Boolean(checked),
                              }));
                            }
                          }}
                          className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <Label
                          htmlFor="rememberMe"
                          className="text-sm text-white/80"
                        >
                          Remember me
                        </Label>
                      </div>
                      <Button
                        variant="link"
                        className="text-sm text-emerald-300 hover:text-emerald-200 p-0"
                      >
                        Forgot password?
                      </Button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg backdrop-blur-sm border border-emerald-400/20 transition-all duration-300 transform hover:scale-[1.02]"
                    disabled={isLoading || loadingState.isLoading}
                  >
                    {loadingState.isLoading ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {loadingState.type === "login" ? "Signing in..." : "Creating account..."}
                      </div>
                    ) : (
                      isLogin ? "Sign In" : "Create Account"
                    )}
                  </Button>

                {isLogin && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white/10 backdrop-blur-sm px-2 text-white/70">
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
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
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
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
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
                  <span className="text-[#09a171]">
                    {isLogin ? "New user? " : "Already have an account? "}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    className="text-emerald-300 hover:text-emerald-200 p-0"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? "Sign up" : "Log in"}
                  </Button>
                </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}