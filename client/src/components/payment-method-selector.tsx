import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface PaymentMethodSelectorProps {
  onSelectionChange: (useSavedMethod: boolean, selectedMethodId?: string) => void;
  selectedMethod?: string;
}

export function PaymentMethodSelector({ onSelectionChange, selectedMethod }: PaymentMethodSelectorProps) {
  const [paymentOption, setPaymentOption] = useState<"saved" | "new">("new");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("");
  const { restaurant } = useAuth();

  const { data: paymentMethodsData, isLoading } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "payment-methods"],
    enabled: !!restaurant?.tenantId,
  });

  const savedPaymentMethods = paymentMethodsData?.paymentMethods || [];
  const hasSavedMethods = savedPaymentMethods.length > 0;

  useEffect(() => {
    if (!hasSavedMethods) {
      setPaymentOption("new");
      onSelectionChange(false);
    }
  }, [hasSavedMethods, onSelectionChange]);

  useEffect(() => {
    if (paymentOption === "saved" && selectedPaymentMethodId) {
      onSelectionChange(true, selectedPaymentMethodId);
    } else if (paymentOption === "new") {
      onSelectionChange(false);
    }
  }, [paymentOption, selectedPaymentMethodId, onSelectionChange]);

  const getCardBrandIcon = (brand: string) => {
    const brandColors = {
      visa: "text-blue-600",
      mastercard: "text-red-600",
      amex: "text-green-600",
      discover: "text-orange-600",
    };
    return brandColors[brand.toLowerCase()] || "text-gray-600";
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>
          Choose how you'd like to pay for this print order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={paymentOption} 
          onValueChange={(value: "saved" | "new") => setPaymentOption(value)}
          className="space-y-4"
        >
          {hasSavedMethods && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="saved" id="saved" />
                <Label htmlFor="saved" className="font-medium">
                  Use saved payment method
                </Label>
              </div>
              
              {paymentOption === "saved" && (
                <div className="ml-6 space-y-2">
                  <RadioGroup 
                    value={selectedPaymentMethodId} 
                    onValueChange={setSelectedPaymentMethodId}
                    className="space-y-2"
                  >
                    {savedPaymentMethods.map((method: PaymentMethod) => (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethodId === method.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <div className="flex items-center space-x-3 flex-1">
                          <CreditCard className={`h-5 w-5 ${getCardBrandIcon(method.brand)}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatCardBrand(method.brand)} ****{method.last4}
                              </span>
                              {selectedPaymentMethodId === method.id && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {!selectedPaymentMethodId && (
                    <p className="text-sm text-red-600 ml-3">
                      Please select a saved payment method
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="font-medium">
                {hasSavedMethods ? "Use a different payment method" : "Enter payment details"}
              </Label>
            </div>
            
            {paymentOption === "new" && (
              <div className="ml-6">
                <div className="flex items-center gap-2 p-3 border border-dashed border-gray-300 rounded-lg text-gray-600">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">
                    Payment details will be entered on the next step
                  </span>
                </div>
              </div>
            )}
          </div>
        </RadioGroup>

        {hasSavedMethods && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Billing convenience:</strong> Your saved payment methods are the same ones used for your subscription billing, making checkout faster and more convenient.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}