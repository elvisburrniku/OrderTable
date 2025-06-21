import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  CreditCard,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: printOrders = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
  });

  // Filter print orders
  const filteredPrintOrders = (printOrders || []).filter((order: any) => {
    const matchesSearch = !searchTerm || 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.orderStatus === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPrintOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrintOrders = filteredPrintOrders.slice(startIndex, endIndex);

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
    const colors = {
      paid: "bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      pending: "bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      failed: "bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium"
    };
    return (
      <span className={colors[status as keyof typeof colors] || "bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium"}>
        {status}
      </span>
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Top Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Printer className="h-6 w-6 text-green-600" />
                Print Orders
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                onClick={() => setActiveTab("new-order")}
                 className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Print Order</span>
              </Button>
              </motion.div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="ml-6 mt-6">
              <TabsTrigger value="orders">Print Orders</TabsTrigger>
              <TabsTrigger value="new-order">Create Order</TabsTrigger>
              <TabsTrigger value="menu-printing">Menu Printing</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              {/* Statistics Cards Section */}
              <div className="p-6 border-b">
                {/* Enhanced Statistics Cards */}
                <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 rounded-xl p-8 mb-8 shadow-lg border-2 border-gray-100 overflow-hidden">
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-green-400/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

                  {/* Top Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500"></div>

                  <div className="relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Total Orders */}
                      <div className="group relative bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                              <Package className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-200 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                              {filteredPrintOrders.length}
                            </div>
                            <div className="text-sm font-medium text-gray-600">Total Orders</div>
                          </div>
                        </div>
                      </div>

                      {/* Pending Orders */}
                      <div className="group relative bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                              <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-200 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-amber-700 transition-colors duration-300">
                              {filteredPrintOrders.filter((order: any) => order.orderStatus === 'pending').length}
                            </div>
                            <div className="text-sm font-medium text-gray-600">Pending Orders</div>
                          </div>
                        </div>
                      </div>

                      {/* Completed Orders */}
                      <div className="group relative bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-200 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                              {filteredPrintOrders.filter((order: any) => order.orderStatus === 'completed').length}
                            </div>
                            <div className="text-sm font-medium text-gray-600">Completed Orders</div>
                          </div>
                        </div>
                      </div>

                      {/* Total Revenue */}
                      <div className="group relative bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                              <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-200 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300">
                              {formatCurrency(
                                filteredPrintOrders
                                  .filter((order: any) => order.paymentStatus === 'paid')
                                  .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Print Orders</h2>
                <div className="text-sm text-gray-500 mb-4">Manage professional printing services for your restaurant</div>

                {/* Modern Filters Section */}
                <div className="space-y-6 mb-8">
                  {/* Filter Controls Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                          >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {(statusFilter !== 'all' || paymentFilter !== 'all' || searchTerm) && (
                              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                                {[statusFilter !== 'all', paymentFilter !== 'all', searchTerm].filter(Boolean).length}
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="mt-4">
                          <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Search Input */}
                              <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                <div className="relative">
                                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                  <Input
                                    placeholder="Search by name, email or order..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                                  />
                                </div>
                              </div>

                              {/* Status Filter */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                    <SelectValue placeholder="All Status" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-2 border-gray-200">
                                    <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                                    <SelectItem value="pending" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span>Pending</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="processing" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span>Processing</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="completed" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Completed</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="cancelled" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span>Cancelled</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Payment Filter */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment</label>
                                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                    <SelectValue placeholder="All Payments" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-2 border-gray-200">
                                    <SelectItem value="all" className="rounded-md">All Payments</SelectItem>
                                    <SelectItem value="paid" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Paid</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="pending" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span>Pending</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="failed" className="rounded-md">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span>Failed</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Filter Actions */}
                            {(statusFilter !== 'all' || paymentFilter !== 'all' || searchTerm) && (
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <span>Active filters:</span>
                                  {searchTerm && (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                      Search: "{searchTerm}"
                                    </span>
                                  )}
                                  {statusFilter !== 'all' && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                      Status: {statusFilter}
                                    </span>
                                  )}
                                  {paymentFilter !== 'all' && (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                      Payment: {paymentFilter}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("all");
                                    setPaymentFilter("all");
                                  }}
                                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                >
                                  Clear all
                                </Button>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className="p-6">
                {/* Enhanced Table */}
                <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Print Details
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center">
                              <div className="flex flex-col items-center space-y-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                                <span className="text-gray-500 font-medium">Loading print orders...</span>
                              </div>
                            </td>
                          </tr>
                        ) : paginatedPrintOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center">
                              <div className="flex flex-col items-center space-y-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Printer className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                  <h3 className="text-gray-900 font-medium">No print orders found</h3>
                                  <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedPrintOrders.map((order: PrintOrder, index: number) => (
                            <tr 
                              key={order.id} 
                              className={`group hover:bg-blue-50 cursor-pointer transition-all duration-200 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                              onClick={() => handleViewTracking(order)}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <span className="text-blue-600 font-semibold text-sm bg-blue-50 px-2 py-1 rounded-md">
                                    #{order.orderNumber}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    {order.customerName?.charAt(0)?.toUpperCase() || 'G'}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{order.customerName}</div>
                                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-900 capitalize">
                                    {order.printType}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {order.printSize} - {order.printQuality}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Package className="w-3 h-3 mr-1" />
                                    {order.quantity} copies
                                    {order.rushOrder && <Badge variant="secondary" className="ml-2 text-xs">Rush</Badge>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {formatCurrency(order.totalAmount)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {getPaymentStatusBadge(order.paymentStatus)}
                              </td>
                              <td className="py-3 px-4">
                                {getStatusBadge(order.orderStatus)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-gray-600">
                                  {formatDate(order.createdAt)}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-16 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">entries</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        {startIndex + 1}-{Math.min(endIndex, filteredPrintOrders.length)} of {filteredPrintOrders.length}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 h-8 text-sm"
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="w-8 h-8 p-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage <= 2) {
                              ```text
pageNum = i + 1;
                            } else if (currentPage >= totalPages - 1) {
                              pageNum = totalPages - 2 + i;
                            } else {
                              pageNum = currentPage - 1 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 p-0 ${
                                  currentPage === pageNum 
                                    ? "bg-green-600 hover:bg-green-700 text-white" 
                                    : "hover:bg-green-50"
                                }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="w-8 h-8 p-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 h-8 text-sm"
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
      </div>
    </div>
  );
}