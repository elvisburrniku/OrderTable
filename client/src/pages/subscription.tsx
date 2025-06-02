
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, CreditCard, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Subscription() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
    enabled: !!user
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ['/api/users', user?.id, 'subscription'],
    enabled: !!user
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId }: { planId: number }) => {
      const response = await fetch(`/api/users/${user?.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'active'
        })
      });
      if (!response.ok) throw new Error('Failed to subscribe');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'subscription'] });
    }
  });

  if (!user || !restaurant) {
    return null;
  }

  const handleSubscribe = (planId: number) => {
    subscribeMutation.mutate({ planId });
  };

  const getFeaturesList = (featuresJson: string) => {
    try {
      return JSON.parse(featuresJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Subscription</h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="p-6">
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
                      <Badge variant={currentSubscription.status === 'active' ? 'default' : 'secondary'}>
                        {currentSubscription.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {currentSubscription.currentPeriodEnd && 
                        `Next billing: ${format(new Date(currentSubscription.currentPeriodEnd), 'MMM dd, yyyy')}`
                      }
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
            {plans.map((plan: any) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <CardTitle className="text-center">{plan.name}</CardTitle>
                  <div className="text-center">
                    <span className="text-3xl font-bold">${(plan.price / 100).toFixed(2)}</span>
                    <span className="text-gray-600">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Up to {plan.maxTables} tables</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{plan.maxBookingsPerMonth} bookings/month</span>
                    </div>
                    {getFeaturesList(plan.features).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribeMutation.isPending || 
                      (currentSubscription && currentSubscription.planId === plan.id)}
                  >
                    {currentSubscription && currentSubscription.planId === plan.id 
                      ? 'Current Plan' 
                      : subscribeMutation.isPending 
                        ? 'Processing...' 
                        : 'Subscribe'
                    }
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
