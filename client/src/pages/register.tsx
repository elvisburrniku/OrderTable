import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const registrationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  planId: z.number().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is already authenticated
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      companyName: "",
      email: "",
      password: "",
      name: "",
      restaurantName: "",
      planId: undefined,
    },
  });

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
    queryFn: () => fetch('/api/subscription-plans').then(res => res.json()),
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

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const response = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresPayment && data.checkoutUrl) {
        toast({
          title: "Account created!",
          description: "Redirecting to payment...",
        });
        // Redirect to Stripe checkout for paid plans
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Company created successfully!",
          description: `Welcome to your 14-day trial. Trial ends: ${new Date(data.trialEndsAt).toLocaleDateString()}`,
        });
        // Redirect to setup wizard for free plans
        setLocation('/setup');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    registerMutation.mutate(data);
  };

  const trialPlan = plans?.find((plan: any) => plan.name === "Free Trial");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your company
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Start with a 14-day free trial
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Registration</CardTitle>
            <CardDescription>
              Create your multi-restaurant booking system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  {...form.register("companyName")}
                  placeholder="Your Company Ltd"
                />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="John Doe"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="john@company.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  placeholder="••••••••"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="restaurantName">First Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  {...form.register("restaurantName")}
                  placeholder="My Restaurant"
                />
                {form.formState.errors.restaurantName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.restaurantName.message}
                  </p>
                )}
              </div>

              {!plansLoading && plans && (
                <div>
                  <Label htmlFor="planId">Subscription Plan</Label>
                  <Select
                    onValueChange={(value) => form.setValue("planId", parseInt(value))}
                    defaultValue={trialPlan?.id?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan: any) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name} - ${(plan.price / 100).toFixed(2)}/month
                          {plan.name === "Free Trial" && " (14-day trial)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Company..." : "Create Company"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {trialPlan && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">Free Trial Includes:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {JSON.parse(trialPlan.features).map((feature: string, index: number) => (
                  <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}