import React, { useState } from 'react';
import { useBooking } from '@/contexts/booking-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface BookingCancellationProps {
  booking: {
    id: number;
    customerName: string;
    bookingDate: string;
    startTime: string;
    restaurantId: number;
    tenantId: number;
  };
  children: React.ReactNode;
}

export function BookingCancellation({ booking, children }: BookingCancellationProps) {
  const { allowCancellationAndChanges, validateCancellation } = useBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');

  // Check if cancellation is allowed
  const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
  const cancellationValidation = validateCancellation(bookingDateTime);

  const cancelBookingMutation = useMutation({
    mutationFn: async (data: { reason: string }) => {
      const response = await apiRequest(
        'POST',
        `/api/tenants/${booking.tenantId}/restaurants/${booking.restaurantId}/bookings/${booking.id}/cancel`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      setIsOpen(false);
      setReason('');
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${booking.tenantId}/restaurants/${booking.restaurantId}/bookings`]
      });
      toast({
        title: "Booking Cancelled",
        description: "The booking has been successfully cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel booking",
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    if (!cancellationValidation.allowed) {
      toast({
        title: "Cancellation Not Allowed",
        description: cancellationValidation.message,
        variant: "destructive",
      });
      return;
    }

    cancelBookingMutation.mutate({ reason });
  };

  if (!allowCancellationAndChanges) {
    return null; // Don't show cancellation option if not allowed
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Cancel booking for {booking.customerName} on {booking.bookingDate} at {booking.startTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cancellation Policy Notice */}
          {cancellationValidation.allowed ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This booking can be cancelled. The customer will be notified immediately.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {cancellationValidation.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Reason */}
          {cancellationValidation.allowed && (
            <div className="space-y-2">
              <Label htmlFor="reason">Cancellation Reason</Label>
              <Textarea
                id="reason"
                placeholder="Optional: Provide a reason for cancellation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Keep Booking
            </Button>
            {cancellationValidation.allowed && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelBookingMutation.isPending}
              >
                {cancelBookingMutation.isPending ? "Cancelling..." : "Cancel Booking"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}