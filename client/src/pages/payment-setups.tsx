import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSetups() {
  const { user, restaurant } = useAuth();

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Payment setups</h1>
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
              <CardTitle>Payment setups</CardTitle>
              <p className="text-sm text-gray-600">
                Do you want to require prepayments or deposits from your guests, you can create one or more payment 
                setups here.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                + Add payment setup
              </Button>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <div className="text-sm font-medium text-gray-700">Method</div>
                  <div className="text-sm font-medium text-gray-700">Type</div>
                  <div className="text-sm font-medium text-gray-700">Cancellation terms</div>
                  <div className="text-sm font-medium text-gray-700">Cancellation no guest</div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  No payment setups configured yet
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}