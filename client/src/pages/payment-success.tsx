import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Calendar,
  Users,
  Clock,
  MapPin,
  AlertCircle,
} from "lucide-react";

export default function PaymentSuccess() {
  const [location] = useLocation();

  // Parse search parameters manually
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("booking");
  const tenantId = urlParams.get("tenant");
  const restaurantId = urlParams.get("restaurant");
  const hash = urlParams.get("hash");

  // Fetch booking details using secure hash-based endpoint
  const { data: booking, isLoading } = useQuery({
    queryKey: ["secure-booking-payment-success", bookingId, tenantId, restaurantId, hash],
    queryFn: async () => {
      if (!bookingId || !tenantId || !restaurantId || !hash) {
        throw new Error("Missing required parameters for secure access");
      }

      const response = await fetch(
        `/api/secure/prepayment/${bookingId}?tenant=${tenantId}&restaurant=${restaurantId}&hash=${hash}`
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Invalid or expired payment link");
        }
        if (response.status === 404) {
          throw new Error("Booking not found");
        }
        throw new Error("Failed to fetch booking details");
      }
      return response.json();
    },
    enabled: !!(bookingId && tenantId && restaurantId && hash),
  });

  if (!bookingId || !tenantId || !restaurantId || !hash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Invalid Payment Confirmation Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This payment confirmation link is invalid or missing required security information.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
        <div className="container mx-auto max-w-md">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="container mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-6 w-6" />
              Payment Successful!
            </CardTitle>
            <CardDescription>
              Your booking has been confirmed and payment processed
              successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Icon */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-green-800">
                Booking Confirmed!
              </h2>
              <p className="text-green-600 mt-1">
                Thank you for your payment. Your table is reserved.
              </p>
            </div>

            {/* Booking Details */}
            {booking && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800">Booking Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <Users className="h-4 w-4" />
                    <span>
                      {booking.customerName} - {booking.guestCount}{" "}
                      {booking.guestCount === 1 ? "guest" : "guests"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <Clock className="h-4 w-4" />
                    <span>{booking.startTime}</span>
                  </div>
                  {booking.restaurantName && (
                    <div className="flex items-center gap-2 text-green-700">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.restaurantName}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-green-300">
                  <span className="font-medium text-green-800">Status:</span>
                  <Badge className="bg-green-600 text-white">Confirmed</Badge>
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800">What's Next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• You'll receive a confirmation email shortly</li>
                <li>• Please arrive 10-15 minutes before your reservation</li>
                <li>• Bring a valid ID for verification</li>
                <li>• Contact the restaurant if you need to make changes</li>
              </ul>
            </div>

            {/* Contact Information */}
            {booking?.customerEmail && (
              <div className="text-center text-sm text-gray-600">
                A confirmation email has been sent to{" "}
                <span className="font-medium">{booking.customerEmail}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
