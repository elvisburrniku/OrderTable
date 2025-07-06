import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Download, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface InvoiceViewerProps {
  bookingId: number;
  tenantId: number;
  restaurantId: number;
}

export function InvoiceViewer({ bookingId, tenantId, restaurantId }: InvoiceViewerProps) {
  const [open, setOpen] = useState(false);

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/${bookingId}/invoice`],
    enabled: open,
  });

  if (!invoiceData && !open) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Invoice
          </Button>
        </DialogTrigger>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Invoice</DialogTitle>
          <DialogDescription>
            Invoice details for booking #{bookingId}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : invoiceData?.invoice ? (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{invoiceData.restaurant.name}</h3>
                  <p className="text-sm text-muted-foreground">{invoiceData.restaurant.address}</p>
                  {invoiceData.restaurant.phone && (
                    <p className="text-sm text-muted-foreground">{invoiceData.restaurant.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">Invoice #{invoiceData.invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Paid on {new Date(invoiceData.invoice.paidAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h4 className="font-semibold mb-2">Bill To:</h4>
              <p>{invoiceData.invoice.customerName}</p>
              <p className="text-sm text-muted-foreground">{invoiceData.invoice.customerEmail}</p>
            </div>

            {/* Booking Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Booking Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Date:</span>
                  <span>{new Date(invoiceData.booking.bookingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{invoiceData.booking.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Party Size:</span>
                  <span>{invoiceData.booking.guestCount} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tables:</span>
                  <span>{invoiceData.booking.tableNumbers || 'Not assigned'}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold">Total Paid:</span>
                <span className="text-lg font-bold">
                  {invoiceData.invoice.amount} {invoiceData.invoice.currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Payment Status:</span>
                <Badge variant="success">Paid</Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {invoiceData.invoice.stripeReceiptUrl && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={invoiceData.invoice.stripeReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Receipt
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No invoice found for this booking</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}