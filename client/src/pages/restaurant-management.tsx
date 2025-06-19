import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Plus, CreditCard, Crown, Users, Calendar, DollarSign, Eye } from "lucide-react";
import { SneakPeekModal } from "@/components/sneak-peek-modal";
import { UpgradeFlowHandler } from "@/components/upgrade-flow-handler";
import { Link } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface RestaurantManagementInfo {
  limits: {
    baseLimit: number;
    currentCount: number;
    additionalCount: number;
    canCreateMore: boolean;
    costPerAdditional: number;
    totalAllowed: number;
  };
  tenant: {
    id: number;
    name: string;
    subscriptionPlan: string;
    isEnterprise: boolean;
  };
  restaurants: Array<{
    id: number;
    name: string;
    createdAt: string;
    isActive: boolean;
  }>;
  pricing: {
    additionalRestaurantCost: number;
    currency: string;
    billingInterval: string;
  };
}

function PurchaseAdditionalRestaurantFormInner({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const response = await apiRequest("POST", `/api/tenants/${user?.tenantId}/confirm-additional-restaurant`, {
        paymentIntentId
      });
      return response.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // First create the payment intent
      const purchaseResult = await purchaseMutation.mutateAsync();
      
      if (!purchaseResult.success) {
        throw new Error(purchaseResult.message);
      }

      // Confirm the payment
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/restaurant-management',
        },
        redirect: 'if_required'
      });

      if (error) {
        throw new Error(error.message);
      }

      // Confirm the purchase on our backend
      await confirmMutation.mutateAsync(purchaseResult.paymentIntentId);

      toast({
        title: "Success",
        description: "Additional restaurant purchased successfully!",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Purchase Additional Restaurant</h3>
        <p className="text-sm text-gray-600">
          Add another restaurant to your Enterprise plan for $50/month
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement />
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="w-full"
        >
          {isProcessing ? "Processing..." : "Purchase for $50/month"}
        </Button>
      </form>
    </div>
  );
}

function PurchaseAdditionalRestaurantForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Create payment intent when component mounts
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tenants/${user?.tenantId}/purchase-additional-restaurant`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to setup payment",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Purchase Additional Restaurant</h3>
        <p className="text-sm text-gray-600">
          Add another restaurant to your Enterprise plan for $50/month
        </p>
      </div>

      {!clientSecret && (
        <Button 
          onClick={() => purchaseMutation.mutate()}
          disabled={purchaseMutation.isPending}
          className="w-full"
        >
          {purchaseMutation.isPending ? "Setting up payment..." : "Continue to Payment"}
        </Button>
      )}

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PurchaseAdditionalRestaurantFormInner onSuccess={onSuccess} />
        </Elements>
      )}
    </div>
  );
}

export default function RestaurantManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const params = useParams();
  const tenantId = params.tenantId;

  const { data: managementInfo, isLoading } = useQuery<RestaurantManagementInfo>({
    queryKey: [`/api/tenants/${tenantId}/restaurant-management`],
    enabled: !!tenantId,
  });

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurant-management`] });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!managementInfo) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Unable to load restaurant management information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Restaurant Management
          </h1>
          <p className="text-gray-600">
            Manage your restaurants and subscription limits
          </p>
        </div>
        
        {managementInfo.tenant.isEnterprise && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Enterprise Plan
          </Badge>
        )}
      </div>

      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscription Overview
          </CardTitle>
          <CardDescription>
            Current plan limits and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {managementInfo.limits.currentCount}
              </div>
              <div className="text-sm text-gray-600">Current Restaurants</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {managementInfo.limits.baseLimit}
              </div>
              <div className="text-sm text-gray-600">Plan Included</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {managementInfo.limits.additionalCount}
              </div>
              <div className="text-sm text-gray-600">Additional Purchased</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {managementInfo.limits.totalAllowed}
              </div>
              <div className="text-sm text-gray-600">Total Allowed</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Restaurant Limit Status</h4>
              <p className="text-sm text-gray-600">
                {managementInfo.limits.canCreateMore 
                  ? `You can create ${managementInfo.limits.totalAllowed - managementInfo.limits.currentCount} more restaurant(s)`
                  : "You've reached your restaurant limit"
                }
              </p>
            </div>
            
            {managementInfo.limits.canCreateMore ? (
              <Link href={`/${tenantId}/create-restaurant`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Restaurant
                </Button>
              </Link>
            ) : managementInfo.tenant.isEnterprise ? (
              <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Purchase Additional
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Restaurant</DialogTitle>
                    <DialogDescription>
                      Purchase an additional restaurant slot for your Enterprise plan
                    </DialogDescription>
                  </DialogHeader>
                  <PurchaseAdditionalRestaurantForm onSuccess={handlePurchaseSuccess} />
                </DialogContent>
              </Dialog>
            ) : (
              <div className="text-right space-y-2">
                <p className="text-sm text-gray-600">
                  Upgrade to Enterprise to add more restaurants
                </p>
                <div className="flex gap-2">
                  <SneakPeekModal currentPlan="basic">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Features
                    </Button>
                  </SneakPeekModal>
                  <UpgradeFlowHandler targetPlan="Enterprise">
                    <Button size="sm">
                      Upgrade Plan
                    </Button>
                  </UpgradeFlowHandler>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Information */}
      {managementInfo.tenant.isEnterprise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Additional Restaurant Pricing
            </CardTitle>
            <CardDescription>
              Enterprise plan members can purchase additional restaurants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold">Additional Restaurant</div>
                <div className="text-sm text-gray-600">
                  Add another restaurant to your account
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  ${managementInfo.pricing.additionalRestaurantCost}
                </div>
                <div className="text-sm text-gray-600">
                  per {managementInfo.pricing.billingInterval}
                </div>
              </div>
            </div>
            
            {managementInfo.limits.additionalCount > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Current Additional Cost:</strong> ${managementInfo.limits.additionalCount * managementInfo.pricing.additionalRestaurantCost}/month
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Restaurant List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Your Restaurants
              </CardTitle>
              <CardDescription>
                All restaurants under your account
              </CardDescription>
            </div>
            {managementInfo.limits.canCreateMore && (
              <Link href={`/${tenantId}/create-restaurant`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Restaurant
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {managementInfo.restaurants.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Restaurants</h3>
              <p className="text-gray-500 mb-4">
                Create your first restaurant to get started
              </p>
              <Link href={`/${tenantId}/create-restaurant`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Restaurant
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {managementInfo.restaurants.map((restaurant) => (
                <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{restaurant.name}</div>
                      <div className="text-sm text-gray-500">
                        Created {new Date(restaurant.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                      {restaurant.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Link href={`/${tenantId}/dashboard`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}