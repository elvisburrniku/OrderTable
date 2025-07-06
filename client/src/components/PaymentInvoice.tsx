import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download, CreditCard, Calendar, Clock, Users, MapPin, Receipt } from "lucide-react";

interface PaymentInvoiceProps {
  booking: any;
  restaurant: any;
  onDownload?: () => void;
  tenantId?: number;
  restaurantId?: number;
}

export default function PaymentInvoice({ booking, restaurant, onDownload, tenantId, restaurantId }: PaymentInvoiceProps) {
  const formatCurrency = (amount: number | string, currency: string = 'EUR') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    }).format(numAmount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!booking.paymentPaidAt || booking.paymentStatus !== 'paid') {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Payment Invoice</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Invoice #{booking.id.toString().padStart(6, '0')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
              <CreditCard className="h-3 w-3 mr-1" />
              PAID
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDateTime(booking.paymentPaidAt)}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Restaurant Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-2">
              From
            </h3>
            <div className="space-y-1">
              <p className="font-semibold text-lg">{restaurant?.name || 'Restaurant'}</p>
              {restaurant?.address && (
                <p className="text-sm text-muted-foreground">{restaurant.address}</p>
              )}
              {restaurant?.phone && (
                <p className="text-sm text-muted-foreground">{restaurant.phone}</p>
              )}
              {restaurant?.email && (
                <p className="text-sm text-muted-foreground">{restaurant.email}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-2">
              To
            </h3>
            <div className="space-y-1">
              <p className="font-semibold text-lg">{booking.customerName}</p>
              <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
              {booking.customerPhone && (
                <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Booking Details */}
        <div>
          <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-4">
            Booking Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date</p>
                <p className="text-sm text-muted-foreground">{formatDate(booking.bookingDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Time</p>
                <p className="text-sm text-muted-foreground">{booking.startTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Party Size</p>
                <p className="text-sm text-muted-foreground">{booking.guestCount} guests</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Booking ID</p>
                <p className="text-sm text-muted-foreground">#{booking.id}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Summary */}
        <div>
          <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-4">
            Payment Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Booking Payment</span>
              <span className="text-sm font-medium">
                {formatCurrency(booking.paymentAmount || 0, 'EUR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Payment Processing</span>
              <span className="text-sm font-medium">€0.00</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Paid</span>
              <span className="font-semibold text-lg">
                {formatCurrency(booking.paymentAmount || 0, 'EUR')}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Information */}
        <div>
          <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-4">
            Payment Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="text-sm font-medium">Credit Card</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Transaction ID</span>
              <span className="text-sm font-medium font-mono">
                {booking.paymentIntentId || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment Date</span>
              <span className="text-sm font-medium">
                {formatDateTime(booking.paymentPaidAt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                Paid
              </Badge>
            </div>
          </div>
        </div>

        {/* Download Button */}
        {(onDownload || (tenantId && restaurantId)) && (
          <div className="pt-4">
            <Button 
              onClick={() => {
                if (onDownload) {
                  onDownload();
                } else if (tenantId && restaurantId) {
                  // Default download functionality
                  const invoiceUrl = `/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/${booking.id}/invoice`;
                  window.open(invoiceUrl, '_blank');
                }
              }}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}