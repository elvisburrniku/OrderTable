import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone } from "lucide-react";

export default function GuestBookingWorking() {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");
  const restaurantId = params?.restaurantId;
  const tenantId = params?.tenantId;
  const { toast } = useToast();

  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: ""
  });

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading, error } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/public`],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/public`);
      if (!response.ok) throw new Error("Restaurant not found");
      return response.json();
    },
    enabled: !!restaurantId
  });

  if (!restaurantId || !tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking URL</h1>
          <p className="text-gray-600">Please check the booking URL and try again.</p>
        </div>
      </div>
    );
  }

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (!restaurant.guestBookingEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Online Booking Unavailable</h1>
          <p className="text-gray-600 mb-6">
            Online bookings are currently disabled for {restaurant.name}. Please contact the restaurant directly.
          </p>
          {restaurant.phone && (
            <div className="bg-white p-4 rounded-lg border mb-4">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Phone className="h-4 w-4" />
                <span className="font-medium">{restaurant.phone}</span>
              </div>
            </div>
          )}
          {restaurant.address && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{restaurant.address}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Table</h1>
          <p className="text-gray-600">at {restaurant.name}</p>
          {restaurant.address && (
            <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mt-2">
              <MapPin className="h-4 w-4" />
              <span>{restaurant.address}</span>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                placeholder="Enter your email address"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={customerData.phone}
                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div>
              <Label htmlFor="comment">Special Requests (Optional)</Label>
              <Input
                id="comment"
                value={customerData.comment}
                onChange={(e) => setCustomerData({ ...customerData, comment: e.target.value })}
                placeholder="Any special requests or dietary requirements"
              />
            </div>

            <div className="pt-4">
              <Button 
                className="w-full" 
                disabled={!customerData.name || !customerData.email || !customerData.phone}
                onClick={() => {
                  toast({
                    title: "Guest Booking System Ready",
                    description: "Contact information captured. Next steps would include date/time selection and booking confirmation.",
                  });
                }}
              >
                Continue to Date & Time Selection
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Migration Complete: URL structure now uses /guest-booking/{tenantId}/{restaurantId}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}