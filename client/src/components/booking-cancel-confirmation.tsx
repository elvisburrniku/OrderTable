import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  MessageCircle,
  CheckCircle2,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime } from "@/lib/date-utils";

interface BookingCancelConfirmationProps {
  booking: {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingDate: string;
    startTime: string;
    guestCount: number;
    tableId?: number;
    status: string;
  };
  onConfirm: (reason?: string) => void;
  isLoading: boolean;
  children: React.ReactNode;
}

export function BookingCancelConfirmation({ 
  booking, 
  onConfirm, 
  isLoading, 
  children 
}: BookingCancelConfirmationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const handleConfirm = () => {
    onConfirm(reason);
    setIsOpen(false);
    setReason('');
  };

  const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
  const now = new Date();
  const timeUntilBooking = bookingDateTime.getTime() - now.getTime();
  const hoursUntilBooking = Math.max(0, Math.round(timeUntilBooking / (1000 * 60 * 60)));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Cancel Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Compact Booking Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-sm">{booking.customerName}</p>
            <p className="text-sm text-gray-600">
              {formatDate(booking.bookingDate)} at {formatTime(booking.startTime)}
            </p>
            <p className="text-sm text-gray-600">
              {booking.guestCount} guests{booking.tableId ? ` • Table ${booking.tableId}` : ''}
            </p>
          </div>

          {/* Simple Warning */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              This will permanently cancel the booking and notify the customer.
              {hoursUntilBooking <= 24 && (
                <span className="block font-medium mt-1">
                  Last-minute cancellation ({hoursUntilBooking} hours before booking)
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Optional Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm">Reason (Optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Cancellation reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelling...
                </div>
              ) : (
                "Cancel Booking"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}