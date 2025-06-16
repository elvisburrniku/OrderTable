import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { PrintOrderForm } from "@/components/print-order-form";
import { PrintOrderPayment } from "@/components/print-order-payment";
import { OrderTracking } from "@/components/order-tracking";
import MenuOrderingService from "@/components/menu-ordering-service";
import { 
  Printer, 
  Plus, 
  Eye, 
  Edit, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Package,
  Truck,
  DollarSign,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/lib/auth";

interface PrintOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  printType: string;
  printSize: string;
  printQuality: string;
  quantity: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  deliveryMethod: string;
  rushOrder: boolean;
  estimatedCompletion: string;
  createdAt: string;
  updatedAt: string;
}

export default function PrintOrders() {
  const [activeTab, setActiveTab] = useState("orders");
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [paymentData, setPaymentData] = useState<{ 
    clientSecret: string; 
    order: any; 
    savedPaymentMethods?: any[] 
  } | null>(null);
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const { data: printOrders = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
  });



  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "yellow", icon: Clock },
      processing: { color: "blue", icon: Package },
      completed: { color: "green", icon: CheckCircle },
      cancelled: { color: "red", icon: AlertCircle },
      shipped: { color: "purple", icon: Truck },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.color === "green" ? "default" : "secondary"} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    return status === "paid" ? (
      <Badge variant="default" className="bg-green-500">Paid</Badge>
    ) : (
      <Badge variant="secondary">Pending</Badge>
    );
  };

  const handleOrderCreated = (clientSecret: string, order: any, savedPaymentMethods?: any[]) => {
    setPaymentData({ clientSecret, order, savedPaymentMethods });
    setShowPayment(true);
  };

  const handlePaymentSuccess = (order: any) => {
    setShowPayment(false);
    setPaymentData(null);
    setActiveTab("orders");
    queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`] });
    toast({
      title: "Payment Successful",
      description: `Print order ${order.orderNumber || paymentData?.orderNumber} has been paid successfully!`,
    });
  };

  const handleViewTracking = (order: PrintOrder) => {
    setSelectedOrder(order);
    setShowTracking(true);
  };

  const handleCloseTracking = () => {
    setShowTracking(false);
    setSelectedOrder(null);
  };

  const handlePayNow = async (order: PrintOrder) => {
    try {
      // Create payment intent for existing order
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders/${order.id}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret, savedPaymentMethods } = await response.json();
      
      setPaymentData({
        clientSecret,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          printType: order.printType,
          printSize: order.printSize,
          printQuality: order.printQuality,
          quantity: order.quantity,
          deliveryMethod: order.deliveryMethod,
          totalAmount: order.totalAmount,
        },
        savedPaymentMethods
      });
      setShowPayment(true);
    } catch (error) {
      toast({
        title: "Payment Setup Failed",
        description: "Could not prepare payment. Please try again.",
        variant: "destructive",
      });
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (showPayment && paymentData) {
    return (
      <div className="container mx-auto p-6">
        <PrintOrderPayment
          clientSecret={paymentData.clientSecret}
          order={paymentData.order}
          savedPaymentMethods={paymentData.savedPaymentMethods}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowPayment(false);
            setPaymentData(null);
          }}
        />
      </div>
    );
  }

  if (showTracking && selectedOrder) {
    return (
      <div className="container mx-auto p-6">
        <OrderTracking
          order={selectedOrder}
          onClose={handleCloseTracking}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Print Orders</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage professional printing services for your restaurant
          </p>
        </div>
        <Button 
          onClick={() => setActiveTab("new-order")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Print Order
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="new-order">Create Order</TabsTrigger>
          <TabsTrigger value="menu-printing">Menu Printing</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {/* Order Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Printer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{printOrders.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {printOrders.filter(order => order.orderStatus === "pending").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {printOrders.filter(order => order.orderStatus === "completed").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    printOrders
                      .filter(order => order.paymentStatus === "paid")
                      .reduce((sum, order) => sum + order.totalAmount, 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Print Orders</CardTitle>
              <CardDescription>
                Manage and track all print orders for your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : printOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Printer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No print orders yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create your first print order to get started with professional printing services.
                  </p>
                  <Button onClick={() => setActiveTab("new-order")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Order
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {printOrders.map((order: PrintOrder) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-gray-500">{order.customerEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="capitalize">{order.printType}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{order.printSize} - {order.printQuality}</div>
                            <div className="text-gray-500">{order.quantity} copies</div>
                            {order.rushOrder && <Badge variant="secondary" className="mt-1">Rush</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                        <TableCell>
                          {getStatusBadge(order.orderStatus)}
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {order.paymentStatus === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handlePayNow(order)}
                                title="Pay Now"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewTracking(order)}
                              title="Track Order"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                              title="View Details"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-order">
          <PrintOrderForm
            restaurantId={restaurant?.id || 1}
            tenantId={restaurant?.tenantId}
            onPaymentRequired={handleOrderCreated}
          />
        </TabsContent>

        <TabsContent value="menu-printing">
          <MenuOrderingService
            restaurantId={restaurant?.id || 1}
            tenantId={restaurant?.tenantId || 1}
            selectedTheme="modern"
            menuLayout="single"
            onOrderCreated={handleOrderCreated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}