
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProductGroups() {
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
            <h1 className="text-xl font-semibold">Product Groups</h1>
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

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900 mb-3">E-mail notifications</div>
              <a href="/email-notifications" className="block text-sm text-gray-600 hover:text-gray-900 py-1">E-mail notifications</a>
              <a href="/sms-notifications" className="block text-sm text-gray-600 hover:text-gray-900 py-1">SMS notifications</a>
              <a href="/feedback-questions" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Feedback questions</a>
              <a href="/events" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Events</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Guest payments</div>
              <a href="/payment-setups" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Payment setups</a>
              <a href="/payment-gateway" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Payment Gateway</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Products</div>
              <a href="/products" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Products</a>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Groups</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Groups</CardTitle>
              <p className="text-sm text-gray-600">
                Organize your products into categories and groups for better management and display to guests.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                + Add group
              </Button>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Group Name</div>
                  <div className="text-sm font-medium text-gray-700">Products Count</div>
                  <div className="text-sm font-medium text-gray-700">Status</div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  No product groups created yet
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
