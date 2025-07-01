
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Plus, AlertCircle, Wallet, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodSelector } from "@/components/payment-method-selector";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export function SmsBalanceManager() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [useSavedMethod, setUseSavedMethod] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch SMS balance
  const { data: smsBalance, isLoading: balanceLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/sms-balance`],
    enabled: !!restaurant?.tenantId,
  });

  // Fetch payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/payment-methods`],
    enabled: !!restaurant?.tenantId,
  });

  // Fetch billing info
  const { data: billingInfo } = useQuery({
    queryKey: ["/api/billing/info"],
    enabled: !!restaurant?.tenantId,
  });

  const paymentMethods = paymentMethodsData?.paymentMethods || [];
  const hasBillingSetup = billingInfo?.customer?.id;
  const hasPaymentMethods = paymentMethods.length > 0;
  const currentBalance = parseFloat(smsBalance?.balance || "0");

  // Add balance mutation
  const addBalanceMutation = useMutation({
    mutationFn: async ({ amount, paymentMethodId }: { amount: number; paymentMethodId?: string }) => {
      if (!restaurant?.tenantId) {
        throw new Error("Tenant information not available");
      }

      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/sms-balance/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount, paymentMethodId }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to add SMS balance");
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful",
        description: `SMS balance topped up with €${selectedAmount}`,
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/sms-balance`],
      });
      setShowPaymentSelector(false);
      setSelectedAmount(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const handleQuickAdd = (amount: number) => {
    if (!hasBillingSetup) {
      toast({
        title: "Billing Setup Required",
        description: "Please set up billing first to add SMS balance.",
        variant: "destructive",
      });
      return;
    }

    if (!hasPaymentMethods) {
      toast({
        title: "Payment Method Required",
        description: "Please add a payment method to your billing account first.",
        variant: "destructive",
      });
      return;
    }

    setSelectedAmount(amount);
    setShowPaymentSelector(true);
  };

  const handlePaymentConfirm = () => {
    if (!selectedAmount) return;

    let paymentMethodId = undefined;
    if (useSavedMethod && selectedMethodId) {
      paymentMethodId = selectedMethodId;
    }

    addBalanceMutation.mutate({ amount: selectedAmount, paymentMethodId });
  };

  const handlePaymentSelectionChange = (useSaved: boolean, methodId?: string) => {
    setUseSavedMethod(useSaved);
    setSelectedMethodId(methodId || "");
  };

  if (balanceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            SMS Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            SMS Balance
          </CardTitle>
          <CardDescription>
            Your current SMS credit balance for notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                €{currentBalance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Current balance</p>
            </div>
            <Badge variant={currentBalance > 5 ? 'default' : 'destructive'}>
              {currentBalance > 5 ? 'Sufficient' : 'Low Balance'}
            </Badge>
          </div>
          
          {currentBalance <= 5 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your SMS balance is low. Add credits to continue sending SMS notifications.
              </AlertDescription>
            </Alert>
          )}

          {/* Billing Setup Check */}
          {!hasBillingSetup && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Billing setup required to add SMS balance. Please configure your billing details first.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Methods Check */}
          {hasBillingSetup && !hasPaymentMethods && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                No payment methods found. Please add a payment method to your billing account.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Add Buttons */}
          {hasBillingSetup && hasPaymentMethods && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Quick add balance:</p>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 25, 50].map((amount) => (
                  <Button 
                    key={amount}
                    variant="outline" 
                    size="sm"
                    onClick={() => handleQuickAdd(amount)}
                    disabled={addBalanceMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    €{amount}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selection Modal */}
      {showPaymentSelector && selectedAmount && (
        <Card>
          <CardHeader>
            <CardTitle>Add €{selectedAmount} to SMS Balance</CardTitle>
            <CardDescription>
              Choose your payment method to complete the transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentMethodSelector 
              onSelectionChange={handlePaymentSelectionChange}
              selectedMethod={selectedMethodId}
            />
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePaymentConfirm}
                disabled={addBalanceMutation.isPending || (useSavedMethod && !selectedMethodId)}
                className="flex-1"
              >
                {addBalanceMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Pay €{selectedAmount}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentSelector(false);
                  setSelectedAmount(null);
                }}
                disabled={addBalanceMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
