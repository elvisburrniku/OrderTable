
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function Products() {
  const { user, restaurant } = useAuth();

  if (!user || !restaurant) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <p className="text-sm text-gray-600">
                Manage your restaurant products and offerings. Create and organize items that guests can order or purchase.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                + Add product
              </Button>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <div className="text-sm font-medium text-gray-700">Category</div>
                  <div className="text-sm font-medium text-gray-700">Price</div>
                  <div className="text-sm font-medium text-gray-700">Status</div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  No products created yet
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
