import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PaymentMethodForm } from "@/components/payment-method-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

export function WalletManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved payment methods
  const { data: paymentMethodsData, isLoading } = useQuery({
    queryKey: ["/api/billing/payment-methods"],
    retry: false,
  });

  const paymentMethods: PaymentMethod[] = paymentMethodsData?.paymentMethods || [];

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest("DELETE", `/api/billing/payment-methods/${paymentMethodId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method removed",
        description: "Your payment method has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove payment method",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest("PUT", `/api/billing/payment-methods/${paymentMethodId}/default`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update default payment method",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const getCardIcon = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
      case 'american_express':
        return '💳';
      case 'discover':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatCardBrand = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'amex':
        return 'American Express';
      case 'diners':
        return 'Diners Club';
      default:
        return brand?.charAt(0).toUpperCase() + brand?.slice(1) || 'Card';
    }
  };

  if (showAddForm) {
    return (
      <PaymentMethodForm
        onSuccess={() => {
          setShowAddForm(false);
          queryClient.invalidateQueries({ queryKey: ["/api/billing/payment-methods"] });
        }}
        onBack={() => setShowAddForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your saved payment methods</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Payment Method</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No payment methods</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add a payment method to enable seamless subscription management and payments.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Your First Payment Method</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentMethods.map((method) => (
            <Card key={method.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getCardIcon(method.brand)}</div>
                    <div>
                      <CardTitle className="text-lg">{formatCardBrand(method.brand)}</CardTitle>
                      <CardDescription>•••• •••• •••• {method.last4}</CardDescription>
                    </div>
                  </div>
                  {method.isDefault && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Default</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                  </p>
                  
                  <div className="flex space-x-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(method.id)}
                        disabled={setDefaultMutation.isPending}
                        className="flex-1"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Set Default
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${method.isDefault ? 'flex-1' : ''} text-red-600 hover:text-red-700 hover:bg-red-50`}
                          disabled={deletePaymentMethodMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this payment method? This action cannot be undone.
                            {method.isDefault && (
                              <span className="block mt-2 text-amber-600 font-medium">
                                This is your default payment method. You may want to set another as default first.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePaymentMethodMutation.mutate(method.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 dark:text-blue-400 text-lg">🔒</div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Your payment information is secure</p>
              <p className="text-blue-700 dark:text-blue-300">
                All payment methods are securely stored and encrypted by Stripe. We never store your actual card details on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}