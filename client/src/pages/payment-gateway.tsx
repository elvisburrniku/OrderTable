import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentGateway() {
  const { user, restaurant } = useAuth();
  const [paymentGateway, setPaymentGateway] = useState("Stripe");

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Payment Gateway</h1>
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

      {/* Main Content */}
      <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway</CardTitle>
              <p className="text-sm text-gray-600">
                Below, you can pick a payment gateway, which is required to use our payment setups.
                Credit card payments is handled via the chosen gateway.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Payment Gateway</label>
                <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stripe">Stripe</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="Square">Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stripe Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    A fully secure flow to authorize all payments, connecting this for Stripe!
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p className="text-sm text-blue-800">
                      In order to receive credit card payments from your guests when/After needs to be connected to a Stripe account.
                    </p>
                    <p className="text-sm text-blue-800 mt-2">
                      To start your one-time receiving payments with Stripe – without any setup, switching to Replit first. Read more at 
                      <a href="#" className="underline">help@replit.com</a>.
                    </p>
                  </div>

                  <p className="text-sm text-gray-600">
                    Connect your existing Stripe account or create a new by clicking "Connect with Stripe" below.
                  </p>

                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Connect with Stripe
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}