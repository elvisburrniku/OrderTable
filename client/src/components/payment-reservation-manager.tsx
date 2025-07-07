import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";

interface PaymentReservationManagerProps {
  booking: {
    id: number;
    paymentIntentId?: string;
    paymentStatus?: string;
    paymentAmount?: number;
    currency?: string;
    tenantId: number;
    restaurantId: number;
  };
  onPaymentUpdated: () => void;
}

export function PaymentReservationManager({ booking, onPaymentUpdated }: PaymentReservationManagerProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [captureAmount, setCaptureAmount] = useState(booking.paymentAmount?.toString() || "");

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleCapturePayment = async () => {
    if (!booking.paymentIntentId) return;

    setIsCapturing(true);
    try {
      const response = await fetch(
        `/api/tenants/${booking.tenantId}/restaurants/${booking.restaurantId}/bookings/${booking.id}/capture-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            amountToCapture: captureAmount ? parseFloat(captureAmount) : undefined
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to capture payment');
      }

      const result = await response.json();
      
      toast({
        title: "Payment Captured",
        description: `Successfully captured ${formatCurrency(result.capturedAmount, result.currency)}`,
      });

      onPaymentUpdated();
    } catch (error: any) {
      console.error('Error capturing payment:', error);
      toast({
        title: "Capture Failed",
        description: error.message || "Failed to capture payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!booking.paymentIntentId) return;

    setIsCancelling(true);
    try {
      const response = await fetch(
        `/api/tenants/${booking.tenantId}/restaurants/${booking.restaurantId}/bookings/${booking.id}/cancel-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel reservation');
      }

      const result = await response.json();
      
      toast({
        title: "Reservation Cancelled",
        description: `Payment authorization of ${formatCurrency(result.cancelledAmount, result.currency)} has been released`,
      });

      onPaymentUpdated();
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel reservation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getPaymentStatusBadge = () => {
    switch (booking.paymentStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Reserved</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Captured</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!booking.paymentIntentId || booking.paymentStatus === 'paid' || booking.paymentStatus === 'cancelled') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Status:</span>
            {getPaymentStatusBadge()}
          </div>
          {booking.paymentAmount && (
            <div className="flex items-center justify-between mt-2">
              <span>Amount:</span>
              <span className="font-medium">
                {formatCurrency(booking.paymentAmount, booking.currency || 'EUR')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Reservation Management
        </CardTitle>
        <CardDescription>
          This booking has a reserved payment that can be captured or cancelled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          {getPaymentStatusBadge()}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Reserved Amount:</span>
          <span className="font-medium">
            {booking.paymentAmount && formatCurrency(booking.paymentAmount, booking.currency || 'EUR')}
          </span>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="captureAmount">Capture Amount (optional)</Label>
            <Input
              id="captureAmount"
              type="number"
              step="0.01"
              placeholder={`Full amount: ${booking.paymentAmount}`}
              value={captureAmount}
              onChange={(e) => setCaptureAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to capture the full reserved amount
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCapturePayment}
              disabled={isCapturing || isCancelling}
              className="flex-1"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {isCapturing ? "Capturing..." : "Capture Payment"}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancelReservation}
              disabled={isCapturing || isCancelling}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isCancelling ? "Cancelling..." : "Cancel Reservation"}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <strong>Note:</strong> Capturing the payment will charge the customer's card. 
          Cancelling will release the authorization without charging the customer.
        </div>
      </CardContent>
    </Card>
  );
}