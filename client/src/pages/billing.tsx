
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Calendar, DollarSign, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

export default function Billing() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    name: "",
  });

  // Fetch current subscription
  const { data: subscription } = useQuery({
    queryKey: ["/api/users", user?.id, "subscription"],
    enabled: !!user,
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "payment-methods"],
    enabled: !!user,
  });

  // Fetch billing history
  const { data: billingHistory = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "billing-history"],
    enabled: !!user,
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async (cardData: any) => {
      const response = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData),
      });
      if (!response.ok) throw new Error("Failed to add payment method");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "payment-methods"] });
      setIsAddCardOpen(false);
      setCardForm({
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        name: "",
      });
      toast({ title: "Payment method added successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removePaymentMethodMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const response = await fetch(`/api/payment-methods/${methodId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove payment method");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "payment-methods"] });
      toast({ title: "Payment method removed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    addPaymentMethodMutation.mutate(cardForm);
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/create-billing-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/billing`,
        }),
      });

      if (!response.ok) throw new Error("Failed to create billing portal session");

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Billing</h1>
            <nav className="flex space-x-6">
              <a href={`/${restaurant?.tenantId}/dashboard`} className="text-gray-600 hover:text-gray-900">
                Booking
              </a>
              <a href={`/${restaurant?.tenantId}/bookings`} className="text-gray-600 hover:text-gray-900">
                CRM
              </a>
              <a href={`/${restaurant?.tenantId}/activity-log`} className="text-gray-600 hover:text-gray-900">
                Archive
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant?.name}</span>
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Current Subscription</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {subscription.planName || "Premium Plan"}
                    </h3>
                    <p className="text-gray-600">
                      ${(subscription.amount / 100).toFixed(2)}/{subscription.interval}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                      {subscription.status}
                    </Badge>
                    {subscription.currentPeriodEnd && (
                      <p className="text-sm text-gray-600 mt-1">
                        Next billing: {format(new Date(subscription.currentPeriodEnd), "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
                <Button onClick={handleManageSubscription} variant="outline">
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No active subscription</p>
                <Button onClick={() => window.location.href = "/subscription"}>
                  View Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Methods</span>
              </div>
              <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Payment Method</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddCard} className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={cardForm.cardNumber}
                        onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="expiryMonth">Month</Label>
                        <Input
                          id="expiryMonth"
                          value={cardForm.expiryMonth}
                          onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })}
                          placeholder="MM"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiryYear">Year</Label>
                        <Input
                          id="expiryYear"
                          value={cardForm.expiryYear}
                          onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })}
                          placeholder="YY"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={cardForm.cvv}
                          onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="name">Cardholder Name</Label>
                      <Input
                        id="name"
                        value={cardForm.name}
                        onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={addPaymentMethodMutation.isPending}>
                      {addPaymentMethodMutation.isPending ? "Adding..." : "Add Payment Method"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method: any) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          **** **** **** {method.last4}
                        </p>
                        <p className="text-sm text-gray-600">
                          {method.brand.toUpperCase()} • Expires {method.expMonth}/{method.expYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePaymentMethodMutation.mutate(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No payment methods added</p>
                <p className="text-sm text-gray-500">Add a credit card to manage your subscription</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Billing History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <div className="space-y-3">
                {billingHistory.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {invoice.status === "paid" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          ${(invoice.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(invoice.date), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={invoice.status === "paid" ? "default" : "destructive"}>
                        {invoice.status}
                      </Badge>
                      {invoice.invoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                        >
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No billing history available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
