import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, CreditCard, Calendar, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  interval: string;
  features: string;
  maxTables: number;
  maxBookingsPerMonth: number;
}

interface UserSubscription {
  id: number;
  planId: number;
  status: string;
  currentPeriodEnd: string;
}

export default function Subscription() {
  const { user, restaurant, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCancelMessage, setShowCancelMessage] = useState(false);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setShowSuccessMessage(true);
      // Refresh subscription data
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user.id, "subscription"],
      });
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
    if (urlParams.get('canceled') === 'true') {
      setShowCancelMessage(true);
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      // Hide message after 5 seconds
      setTimeout(() => setShowCancelMessage(false), 5000);
    }
  }, [queryClient, user]);

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: !!user,
  });

  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery<UserSubscription | null>({
    queryKey: ["/api/users", user?.id, "subscription"],
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, action }: { planId: number; action?: 'cancel' }) => {
      if (action === 'cancel') {
        // Cancel subscription
        const response = await fetch(`/api/subscriptions/${currentSubscription?.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to cancel subscription");
        return response.json();
      } else {
        // Create Stripe checkout session
        const response = await fetch(`/api/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            userId: user?.id,
            successUrl: `${window.location.origin}/subscription?success=true`,
            cancelUrl: `${window.location.origin}/subscription?canceled=true`,
          }),
        });

        if (!response.ok) throw new Error("Failed to create checkout session");

        const { sessionId } = await response.json();

        // Redirect to Stripe Checkout
        const stripe = await loadStripe(
          "pk_test_51RVa9XCi9JMBFIWGvumvIFH83ffJhblNsWgBrcbjzjqZkeKNnqs4vJVU0Y8Dqw5soSgwlecY0sHiHzwwJtACaqor00H22GKtKF",
        ); // Replace with your Stripe publishable key
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "subscription"],
      });
    },
  });

  // Add loading states after all hooks are defined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription information...</p>
        </div>
      </div>
    );
  }

  if (!user || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view your subscription.</p>
          <a 
            href="/login" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  const handleSubscribe = (planId: number) => {
    if (currentSubscription && currentSubscription.planId === planId) {
      // Cancel current subscription
      subscribeMutation.mutate({ planId, action: 'cancel' });
    } else {
      // Subscribe to new plan
      subscribeMutation.mutate({ planId });
    }
  };

  const getFeaturesList = (featuresJson: string) => {
    try {
      return JSON.parse(featuresJson);
    } catch {
      return [];
    }
  };

  const getCurrentPlanName = () => {
    if (!currentSubscription) return null;
    const plan = plans.find((p) => p.id === currentSubscription.planId);
    return plan?.name || "Unknown Plan";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Subscription</h1>
            <nav className="flex space-x-6">
              <a
                href={`/${restaurant.tenantId}/dashboard`}
                className="text-gray-600 hover:text-gray-900"
              >
                Booking
              </a>
              <a href={`/${restaurant.tenantId}/bookings`} className="text-green-600 font-medium">
                CRM
              </a>
              <a href={`/${restaurant.tenantId}/activity-log`} className="text-gray-600 hover:text-gray-900">
                Archive
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Subscription Updated Successfully!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your subscription has been activated and you now have access to all features.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cancel Message */}
        {showCancelMessage && (
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Subscription Update Cancelled</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Your subscription change was cancelled. No charges were made.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Subscription */}
        {currentSubscription && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{getCurrentPlanName()}</h3>
                      <Badge
                        variant={
                          currentSubscription.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {currentSubscription.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {currentSubscription.currentPeriodEnd &&
                        `Next billing: ${format(new Date(currentSubscription.currentPeriodEnd), "MMM dd, yyyy")}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <CardTitle className="text-center">{plan.name}</CardTitle>
                  <div className="text-center">
                    <span className="text-3xl font-bold">
                      ${(plan.price / 100).toFixed(2)}
                    </span>
                    <span className="text-gray-600">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Up to {plan.maxTables} tables
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {plan.maxBookingsPerMonth} bookings/month
                      </span>
                    </div>
                    {getFeaturesList(plan.features).map(
                      (feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ),
                    )}
                  </div>
                  <Button
                    className="w-full"
                    variant={
                      currentSubscription &&
                      currentSubscription.planId === plan.id
                        ? "destructive"
                        : "default"
                    }
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribeMutation.isPending}
                  >
                    {currentSubscription &&
                    currentSubscription.planId === plan.id ? (
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        Cancel Subscription
                      </div>
                    ) : subscribeMutation.isPending ? (
                      "Processing..."
                    ) : (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Subscribe with Stripe
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}