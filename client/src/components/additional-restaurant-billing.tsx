import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Building2, CreditCard, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AdditionalRestaurantBillingProps {
  currentRestaurantCount: number;
  includedRestaurants: number;
  additionalCost: number;
  onPurchaseSuccess?: () => void;
}

export function AdditionalRestaurantBilling({
  currentRestaurantCount,
  includedRestaurants = 3,
  additionalCost = 50,
  onPurchaseSuccess
}: AdditionalRestaurantBillingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  const additionalRestaurants = Math.max(0, currentRestaurantCount - includedRestaurants);
  const monthlyAdditionalCost = additionalRestaurants * additionalCost;

  const purchaseAdditionalSlotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing/purchase-additional-restaurant"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Additional restaurant slot purchased successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
      onPurchaseSuccess?.();
      setIsConfirming(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase additional restaurant slot",
        variant: "destructive"
      });
    }
  });

  const handlePurchase = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    purchaseAdditionalSlotMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Additional Restaurant Billing
        </CardTitle>
        <CardDescription>
          Manage additional restaurant slots for your Enterprise plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Usage */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3">Current Usage</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-900">{currentRestaurantCount}</div>
              <div className="text-sm text-blue-600">Total Restaurants</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{includedRestaurants}</div>
              <div className="text-sm text-green-600">Included in Plan</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{additionalRestaurants}</div>
              <div className="text-sm text-orange-600">Additional Slots</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">${monthlyAdditionalCost}</div>
              <div className="text-sm text-purple-600">Additional Monthly Cost</div>
            </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div>
          <h4 className="font-semibold mb-3">Pricing Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Enterprise Plan (includes {includedRestaurants} restaurants)</span>
              <Badge variant="secondary">Included</Badge>
            </div>
            {additionalRestaurants > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Additional restaurants ({additionalRestaurants} × ${additionalCost}/month)
                </span>
                <span className="font-semibold">${monthlyAdditionalCost}/month</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Monthly Cost</span>
              <span>${monthlyAdditionalCost}/month additional</span>
            </div>
          </div>
        </div>

        {/* Purchase Additional Slot */}
        {currentRestaurantCount >= includedRestaurants && (
          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Additional Restaurant Needed:</strong> You'll need to purchase an additional restaurant slot 
                to create more restaurants. This will add ${additionalCost}/month to your subscription.
              </AlertDescription>
            </Alert>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">What you get with each additional restaurant:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Full restaurant management dashboard</li>
                <li>• Unlimited bookings and tables</li>
                <li>• Integrated analytics and reporting</li>
                <li>• Staff management tools</li>
                <li>• All Enterprise features included</li>
              </ul>
            </div>

            {!isConfirming ? (
              <Button 
                onClick={handlePurchase} 
                className="w-full"
                size="lg"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Purchase Additional Restaurant Slot (${additionalCost}/month)
              </Button>
            ) : (
              <div className="space-y-3">
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Confirm Purchase:</strong> This will add ${additionalCost}/month to your subscription 
                    starting from your next billing cycle.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsConfirming(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePurchase}
                    disabled={purchaseAdditionalSlotMutation.isPending}
                    className="flex-1"
                  >
                    {purchaseAdditionalSlotMutation.isPending ? "Processing..." : "Confirm Purchase"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Billing Information</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Additional restaurant charges are prorated for the current billing period</p>
            <p>• You can cancel additional restaurants at any time</p>
            <p>• Changes take effect immediately upon confirmation</p>
            <p>• All charges appear on your next invoice</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}