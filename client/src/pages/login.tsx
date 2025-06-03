import { useState } from "react";
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

  const { data: plans = [] } = useQuery({
    queryKey: ["/api/subscription-plans"],
    enabled: !isLogin,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if(result) {
          console.log(result);
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          // Use restaurant ID as tenant ID
          const tenantId = result.restaurant.id;
          setLocation(`/${tenantId}/dashboard`);
        } else {
          toast({
            title: "Error",
            description: "Login failed",
            variant: "destructive",
          });
        }
      } else {
        const result = await register({
          username: formData.email,
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
                          rememberMe: checked as boolean,
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
