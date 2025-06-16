import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Calendar,
  Eye,
  Copy,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface OrderTrackingProps {
  order: {
    id: number;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
    deliveryMethod: string;
    deliveryAddress?: any;
    processingStartedAt?: string;
    printingStartedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    completedAt?: string;
    createdAt: string;
    printType: string;
    printSize: string;
    printQuality: string;
    quantity: number;
    totalAmount: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    specialInstructions?: string;
    deliveryNotes?: string;
  };
  onClose?: () => void;
}

export function OrderTracking({ order, onClose }: OrderTrackingProps) {
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "processing": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "printing": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "shipped": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "refunded": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const copyTrackingNumber = () => {
    if (order.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber);
      toast({
        title: "Copied",
        description: "Tracking number copied to clipboard",
      });
    }
  };

  const getOrderTimeline = () => {
    const timeline = [
      {
        status: "Order Placed",
        date: order.createdAt,
        icon: Package,
        completed: true,
        description: "Order has been received and is being processed"
      },
      {
        status: "Processing",
        date: order.processingStartedAt,
        icon: Clock,
        completed: !!order.processingStartedAt,
        description: "Order details are being reviewed and prepared"
      },
      {
        status: "Printing",
        date: order.printingStartedAt,
        icon: Package,
        completed: !!order.printingStartedAt,
        description: "Your order is currently being printed"
      }
    ];

    if (order.deliveryMethod !== "pickup") {
      timeline.push({
        status: "Shipped",
        date: order.shippedAt,
        icon: Truck,
        completed: !!order.shippedAt,
        description: "Order has been shipped and is on its way"
      });

      timeline.push({
        status: "Delivered",
        date: order.deliveredAt,
        icon: CheckCircle,
        completed: !!order.deliveredAt,
        description: "Order has been successfully delivered"
      });
    } else {
      timeline.push({
        status: "Ready for Pickup",
        date: order.completedAt,
        icon: CheckCircle,
        completed: !!order.completedAt,
        description: "Order is ready for pickup at our location"
      });
    }

    return timeline;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const timeline = getOrderTimeline();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Order Tracking</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your print order status and delivery information
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <Eye className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        )}
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                Order #{order.orderNumber}
                <Badge className={getStatusColor(order.orderStatus)}>
                  {order.orderStatus.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>
                Placed on {format(new Date(order.createdAt), 'MMMM d, yyyy')} at {format(new Date(order.createdAt), 'h:mm a')}
              </CardDescription>
            </div>
            <Badge className={getPaymentStatusColor(order.paymentStatus)}>
              Payment {order.paymentStatus.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium">Order Details</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Print Type:</span>
                  <span className="capitalize">{order.printType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size & Quality:</span>
                  <span>{order.printSize} - {order.printQuality}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{order.quantity} copies</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Method:</span>
                  <span className="capitalize">{order.deliveryMethod}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Customer Information</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span>{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{order.customerEmail}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracking Information */}
          {order.trackingNumber && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">Tracking Number</h3>
                  <p className="text-blue-700 dark:text-blue-300 font-mono text-lg">
                    {order.trackingNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyTrackingNumber}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Estimated Delivery */}
          {order.estimatedDeliveryDate && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-green-700 dark:text-green-300">
                Estimated delivery: {format(new Date(order.estimatedDeliveryDate), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
          )}

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </h3>
              <div className="text-sm p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {typeof order.deliveryAddress === 'string' 
                  ? order.deliveryAddress 
                  : (
                    <div className="space-y-1">
                      <div>{order.deliveryAddress.street}</div>
                      <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</div>
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="space-y-2">
              <h3 className="font-medium">Special Instructions</h3>
              <p className="text-sm p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {order.specialInstructions}
              </p>
            </div>
          )}

          {/* Delivery Notes */}
          {order.deliveryNotes && (
            <div className="space-y-2">
              <h3 className="font-medium">Delivery Notes</h3>
              <p className="text-sm p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-blue-700 dark:text-blue-300">
                {order.deliveryNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Progress</CardTitle>
          <CardDescription>
            Track your order through each stage of processing and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {timeline.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === timeline.length - 1;
              
              return (
                <div key={step.status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${step.completed 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                      }
                    `}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {!isLast && (
                      <div className={`
                        w-0.5 h-12 mt-2
                        ${step.completed 
                          ? 'bg-green-200 dark:bg-green-800' 
                          : 'bg-gray-200 dark:bg-gray-700'
                        }
                      `} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${
                        step.completed 
                          ? 'text-gray-900 dark:text-gray-100' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {step.status}
                      </h3>
                      {step.date && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(step.date), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}