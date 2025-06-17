import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PaymentMethodFormProps {
  onSuccess: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function PaymentMethodForm({ onSuccess, onBack, isLoading }: PaymentMethodFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    cardholderName: "",
    billingAddress: {
      line1: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
    },
  });

  const savePaymentMethodMutation = useMutation({
    mutationFn: async (paymentData: typeof formData) => {
      const response = await apiRequest("POST", "/api/billing/setup-payment-method", paymentData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.subscription) {
        toast({
          title: "Payment method saved and subscription activated!",
          description: "Your subscription is now active and payment method saved to your wallet.",
        });
      } else {
        toast({
          title: "Payment method saved!",
          description: "Your credit card has been securely saved to your wallet.",
        });
      }
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save payment method",
        description: error.message || "Please check your card details and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || !formData.cvc || !formData.cardholderName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required card details.",
        variant: "destructive",
      });
      return;
    }

    savePaymentMethodMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('billingAddress.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle>Add Payment Method</CardTitle>
          <CardDescription>
            Securely save your payment information to your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Card Information</h3>
              
              <div>
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  type="text"
                  value={formData.cardholderName}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value);
                    if (formatted.replace(/\s/g, '').length <= 16) {
                      handleInputChange('cardNumber', formatted);
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiryMonth">Month</Label>
                  <Input
                    id="expiryMonth"
                    type="text"
                    value={formData.expiryMonth}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 2 && parseInt(value) <= 12) {
                        handleInputChange('expiryMonth', value);
                      }
                    }}
                    placeholder="MM"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryYear">Year</Label>
                  <Input
                    id="expiryYear"
                    type="text"
                    value={formData.expiryYear}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 4) {
                        handleInputChange('expiryYear', value);
                      }
                    }}
                    placeholder="YYYY"
                    maxLength={4}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    type="text"
                    value={formData.cvc}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 4) {
                        handleInputChange('cvc', value);
                      }
                    }}
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Billing Address</h3>
              
              <div>
                <Label htmlFor="line1">Address Line 1</Label>
                <Input
                  id="line1"
                  type="text"
                  value={formData.billingAddress.line1}
                  onChange={(e) => handleInputChange('billingAddress.line1', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.billingAddress.city}
                    onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                    placeholder="New York"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    type="text"
                    value={formData.billingAddress.state}
                    onChange={(e) => handleInputChange('billingAddress.state', e.target.value)}
                    placeholder="NY"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">ZIP Code</Label>
                  <Input
                    id="postal_code"
                    type="text"
                    value={formData.billingAddress.postal_code}
                    onChange={(e) => handleInputChange('billingAddress.postal_code', e.target.value)}
                    placeholder="10001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    value={formData.billingAddress.country}
                    onChange={(e) => handleInputChange('billingAddress.country', e.target.value)}
                    placeholder="US"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 p-4 rounded-lg flex items-start space-x-3">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">Your payment information is secure</p>
                <p>We use industry-standard encryption to protect your card details. Your information is never stored in plain text.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
                disabled={savePaymentMethodMutation.isPending}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={savePaymentMethodMutation.isPending}
              >
                {savePaymentMethodMutation.isPending ? "Saving..." : "Save Payment Method"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}