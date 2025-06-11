import { useState } from "react";
import { useRoute } from "wouter";

export default function GuestBookingSimple() {
  const [match, params] = useRoute("/guest-booking/:tenantId/:restaurantId");
  const restaurantId = params?.restaurantId;
  const tenantId = params?.tenantId;

  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: ""
  });

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: [`/api/restaurants/${restaurantId}/public`],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/public`);
      if (!response.ok) throw new Error("Restaurant not found");
      return response.json();
    },
    enabled: !!restaurantId
  });

  if (!match || !restaurantId || !tenantId) {
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

  if (!restaurant) {
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Online Booking Unavailable</h1>
          <p className="text-gray-600 mb-6">
            Online bookings are currently disabled for {restaurant.name}.
          </p>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                placeholder="Enter your email address"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={customerData.phone}
                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                placeholder="Enter your phone number"
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

            <Button className="w-full" disabled>
              Continue to Date & Time Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}