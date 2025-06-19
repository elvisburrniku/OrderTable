import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Crown, AlertCircle, DollarSign } from "lucide-react";
import { SneakPeekModal } from "@/components/sneak-peek-modal";
import { UpgradeFlowHandler } from "@/components/upgrade-flow-handler";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createRestaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  cuisine: z.string().min(1, "Cuisine type is required"),
});

type CreateRestaurantForm = z.infer<typeof createRestaurantSchema>;

export default function CreateRestaurant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const tenantId = params.tenantId;

  const form = useForm<CreateRestaurantForm>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      cuisine: "",
    },
  });

  // Check if user can create restaurants
  const { data: canCreate, isLoading: checkingLimits } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/can-create-restaurant`],
    enabled: !!tenantId,
  });

  // Get restaurant management info for context
  const { data: managementInfo } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurant-management`],
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRestaurantForm) => {
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/restaurants`, {
        ...data,
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      let description = "Restaurant created successfully!";
      
      if (data.billing && data.billing.message) {
        description = `Restaurant created successfully! ${data.billing.message}`;
      }
      
      toast({
        title: "Success",
        description,
        duration: 6000, // Show longer for billing message
      });
      setLocation(`/${tenantId}/restaurant-management`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create restaurant",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateRestaurantForm) => {
    createMutation.mutate(data);
  };

  if (checkingLimits) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Show upgrade message for non-enterprise users who hit limits
  if (canCreate && !canCreate.canCreate && !canCreate.canPurchaseMore) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Crown className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Upgrade to Enterprise</CardTitle>
            <CardDescription>
              Additional restaurants are only available with Enterprise plans
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You've reached your restaurant limit. Upgrade to Enterprise to create multiple restaurants
              and unlock advanced features.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Enterprise Features:</h4>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• Up to 3 restaurants included</li>
                <li>• Additional restaurants for $50/month each</li>
                <li>• Priority support</li>
                <li>• Advanced analytics</li>
                <li>• Custom integrations</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setLocation("/dashboard")}>
                Back to Dashboard
              </Button>
              <SneakPeekModal currentPlan="basic">
                <Button variant="outline">
                  See Enterprise Features
                </Button>
              </SneakPeekModal>
              <UpgradeFlowHandler targetPlan="Enterprise">
                <Button>
                  Upgrade to Enterprise
                </Button>
              </UpgradeFlowHandler>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show purchase option for enterprise users who hit limits
  if (canCreate && !canCreate.canCreate && canCreate.canPurchaseMore) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Restaurant Limit Reached</CardTitle>
            <CardDescription>
              Purchase an additional restaurant to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {canCreate.reason}
              </AlertDescription>
            </Alert>

            {managementInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Current Usage:</div>
                <div className="flex justify-between text-sm">
                  <span>Restaurants: {managementInfo.limits.currentCount}/{managementInfo.limits.totalAllowed}</span>
                  <span>Additional Cost: ${(managementInfo.limits.additionalCount * 50)}/month</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setLocation("/dashboard")}>
                Back to Dashboard
              </Button>
              <Button onClick={() => setLocation("/restaurant-management")}>
                Purchase Additional Restaurant
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show restaurant creation form
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Create New Restaurant
        </h1>
        <p className="text-gray-600 mt-2">
          Set up your restaurant profile and start taking bookings
        </p>
      </div>

      {managementInfo?.tenant.isEnterprise && (
        <Alert className="mb-6">
          <Crown className="h-4 w-4" />
          <AlertDescription>
            Enterprise Plan: You can create up to {managementInfo.limits.totalAllowed} restaurants.
            Currently using {managementInfo.limits.currentCount} of {managementInfo.limits.totalAllowed}.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
          <CardDescription>
            Enter your restaurant details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter restaurant name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of your restaurant"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuisine Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian, Mexican, American" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter full restaurant address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="restaurant@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/dashboard")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Restaurant"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}