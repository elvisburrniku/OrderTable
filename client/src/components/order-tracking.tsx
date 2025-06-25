
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
  ExternalLink,
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  Star,
  AlertCircle,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
        icon: Printer,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.08, scale: 1.1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", delay: 2 }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-green-400 to-blue-500 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-between items-start"
          >
            <div>
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Order Tracking
              </motion.h1>
              <p className="text-gray-600 text-lg">
                Track your print order status and delivery information
              </p>
            </div>
            {onClose && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-gray-50 shadow-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Order Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                      >
                        <Package className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-2xl flex items-center gap-3">
                          Order #{order.orderNumber}
                          <Badge className={getStatusColor(order.orderStatus)}>
                            {order.orderStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-base">
                          Placed on {format(new Date(order.createdAt), 'MMMM d, yyyy')} at {format(new Date(order.createdAt), 'h:mm a')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge className={getPaymentStatusColor(order.paymentStatus) + " text-base px-4 py-2"}>
                      Payment {order.paymentStatus.toUpperCase()}
                    </Badge>
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Order Details */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">Order Details</h3>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 space-y-3 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Print Type:</span>
                        <span className="capitalize font-medium">{order.printType}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Size & Quality:</span>
                        <span className="font-medium">{order.printSize} - {order.printQuality}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">{order.quantity} copies</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Delivery Method:</span>
                        <span className="capitalize font-medium">{order.deliveryMethod}</span>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold text-gray-900">Total:</span>
                        <span className="font-bold text-green-600">{formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Customer Information */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold">Customer Information</h3>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 space-y-3 border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium">
                          {order.customerName?.charAt(0)?.toUpperCase() || 'G'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{order.customerName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {order.customerEmail}
                          </div>
                        </div>
                      </div>
                      {order.customerPhone && (
                        <div className="flex items-center gap-2 mt-3">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{order.customerPhone}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Tracking Information */}
                {order.trackingNumber && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                        >
                          <Truck className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-semibold text-blue-900">Tracking Number</h3>
                          <p className="text-blue-700 font-mono text-xl font-bold">
                            {order.trackingNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={copyTrackingNumber}
                            className="border-blue-300 text-blue-700 hover:bg-blue-100"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-blue-300 text-blue-700 hover:bg-blue-100"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Estimated Delivery */}
                {order.estimatedDeliveryDate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                  >
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      Estimated delivery: {format(new Date(order.estimatedDeliveryDate), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </motion.div>
                )}

                {/* Delivery Address */}
                {order.deliveryAddress && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="space-y-3"
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-600" />
                      Delivery Address
                    </h3>
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                      {typeof order.deliveryAddress === 'string' 
                        ? order.deliveryAddress 
                        : (
                          <div className="space-y-1 text-gray-700">
                            <div>{order.deliveryAddress.street}</div>
                            <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</div>
                          </div>
                        )
                      }
                    </div>
                  </motion.div>
                )}

                {/* Special Instructions */}
                {order.specialInstructions && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="space-y-3"
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Star className="h-5 w-5 text-purple-600" />
                      Special Instructions
                    </h3>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                      <p className="text-gray-700">{order.specialInstructions}</p>
                    </div>
                  </motion.div>
                )}

                {/* Delivery Notes */}
                {order.deliveryNotes && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                    className="space-y-3"
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      Delivery Notes
                    </h3>
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-blue-700">{order.deliveryNotes}</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center"
                  >
                    <Clock className="h-4 w-4 text-white" />
                  </motion.div>
                  Order Progress
                </CardTitle>
                <CardDescription className="text-base">
                  Track your order through each stage of processing and delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {timeline.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === timeline.length - 1;
                    
                    return (
                      <motion.div 
                        key={step.status} 
                        className="flex items-start gap-6"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 1.4 + index * 0.2 }}
                      >
                        <div className="flex flex-col items-center">
                          <motion.div 
                            className={`
                              w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg
                              ${step.completed 
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' 
                                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400'
                              }
                            `}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            animate={step.completed ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 2, repeat: step.completed ? Infinity : 0 }}
                          >
                            <Icon className="h-7 w-7" />
                          </motion.div>
                          {!isLast && (
                            <motion.div 
                              className={`
                                w-1 h-16 mt-4 rounded-full
                                ${step.completed 
                                  ? 'bg-gradient-to-b from-green-400 to-emerald-500' 
                                  : 'bg-gradient-to-b from-gray-200 to-gray-300'
                                }
                              `}
                              initial={{ height: 0 }}
                              animate={{ height: 64 }}
                              transition={{ duration: 0.8, delay: 1.6 + index * 0.2 }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-8">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-xl font-semibold ${
                              step.completed 
                                ? 'text-gray-900' 
                                : 'text-gray-500'
                            }`}>
                              {step.status}
                            </h3>
                            {step.date && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.8 + index * 0.2 }}
                                className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full"
                              >
                                {format(new Date(step.date), 'MMM d, h:mm a')}
                              </motion.div>
                            )}
                          </div>
                          <p className="text-gray-600 text-base leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
