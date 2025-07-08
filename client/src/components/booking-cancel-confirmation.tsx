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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-red-100 rounded-full">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            Cancel Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Details Card */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Booking Details
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  #{booking.id}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{formatDate(booking.bookingDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{formatTime(booking.startTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Party Size</p>
                    <p className="font-medium">{booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}</p>
                  </div>
                </div>
                {booking.tableId && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Table</p>
                      <p className="font-medium">Table {booking.tableId}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{booking.customerName}</p>
                    <p className="text-sm text-gray-500">{booking.customerEmail}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-medium">This action cannot be undone</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• The booking will be permanently cancelled</li>
                  <li>• The customer will be notified via email</li>
                  <li>• The table will become available for other bookings</li>
                  {hoursUntilBooking <= 24 && (
                    <li className="text-red-600 font-medium">• This is a last-minute cancellation ({hoursUntilBooking} hours before booking)</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label htmlFor="cancel-reason" className="text-base font-medium">
              Cancellation Reason (Optional)
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please provide a reason for the cancellation. This will help us improve our service and may be shared with the customer if appropriate."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-gray-500">
              This information is optional but helps us understand cancellation patterns and improve our service.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelling...
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Cancellation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}