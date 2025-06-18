import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { X, Check } from "lucide-react";
import { ReadyTableLogo } from "@/components/ui/ready-table-logo";
import { AuthLoadingOverlay } from "@/components/ui/auth-loading-overlay";

// Define subscription plan type
type SubscriptionPlan = {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    name: "",
    restaurantName: "",
    selectedPlanId: null as number | null,
  });
  const [loadingState, setLoadingState] = useState<{
    isLoading: boolean;
    type: "register" | null;
  }>({
    isLoading: false,
    type: null
  });

  // Check if user is already authenticated
  const { data: session, isLoading: sessionLoading } = useQuery<any>({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
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

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: data.companyName,
          email: data.email,
          password: data.password,
          name: data.name,
          restaurantName: data.restaurantName,
          planId: data.selectedPlanId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLoadingState({ isLoading: false, type: null });
      if (data.requiresPayment && data.checkoutUrl) {
        toast({
          title: "Account created!",
          description: "Redirecting to payment...",
        });
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Company created successfully!",
          description: `Welcome to your 14-day trial. Trial ends: ${new Date(data.trialEndsAt).toLocaleDateString()}`,
        });
        setLocation('/setup');
      }
    },
    onError: (error: any) => {
      setLoadingState({ isLoading: false, type: null });
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Redirect authenticated users
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.selectedPlanId) {
      toast({
        title: "Plan Required",
        description: "Please select a subscription plan to continue",
        variant: "destructive",
      });
      return;
    }

    setLoadingState({ isLoading: true, type: "register" });
    registerMutation.mutate(formData);
  };

  // Show loading while checking authentication
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <AuthLoadingOverlay 
        isLoading={loadingState.isLoading}
        type={loadingState.type}
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
                        START YOUR
                      </span>
                      <span className="block bg-gradient-to-r from-emerald-300 via-white to-emerald-300 bg-clip-text text-transparent">
                        RESTAURANT JOURNEY
                      </span>
                    </h2>
                    <p className="text-lg text-white/80 animate-fade-in-delay">
                      Join thousands of restaurants streamlining their operations with ReadyTable
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Glassy registration form */}
              <div className="p-8 md:p-12 backdrop-blur-md bg-white/5 relative">
                {/* Decorative glass elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-2xl"></div>
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                    Join ReadyTable
                  </h3>
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm">
                      <X className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Plan Selection */}
                  <div>
                    <Label className="text-sm font-medium text-white/90 mb-3 block">
                      Choose Your Plan
                    </Label>
                    {plansLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {plans?.map((plan) => (
                          <div
                            key={plan.id}
                            onClick={() => setFormData(prev => ({ ...prev, selectedPlanId: plan.id }))}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              formData.selectedPlanId === plan.id
                                ? 'border-emerald-400 bg-emerald-400/10 backdrop-blur-md'
                                : 'border-white/20 bg-white/5 backdrop-blur-md hover:border-white/40'
                            }`}
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
                            <div className="space-y-1">
                              {(() => {
                                try {
                                  const features = typeof plan.features === 'string' 
                                    ? JSON.parse(plan.features) 
                                    : plan.features || [];
                                  return features.slice(0, 2).map((feature: string, index: number) => (
                                    <div key={index} className="flex items-center text-xs text-white/80">
                                      <Check className="h-3 w-3 text-emerald-400 mr-2 flex-shrink-0" />
                                      {feature}
                                    </div>
                                  ));
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

                  <div>
                    <Label htmlFor="companyName" className="text-sm font-medium text-white/90">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      placeholder="Your Company Ltd"
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
                      onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      placeholder="The Good Place"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-white/90">
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-white/90">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      placeholder="john@company.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-white/90">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-emerald-400 focus:ring-emerald-400/20 backdrop-blur-sm transition-all duration-300"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingState.isLoading || !formData.selectedPlanId}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm border border-emerald-400/20 shadow-lg shadow-emerald-500/25"
                  >
                    {loadingState.isLoading ? "Creating Company..." : "Create Company"}
                  </Button>

                  <div className="text-center">
                    <span className="text-white/70">
                      Already have an account?{" "}
                    </span>
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                      Sign in
                    </Link>
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