import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { PrintOrderForm } from "@/components/print-order-form";

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
  Users,
  FileText,
  Receipt,
  Trash2,
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
  const [showTracking, setShowTracking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PrintOrder | null>(null);
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: printOrders = [], isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`,
    ],
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
  });

  const deletePrintOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to delete print order");
      }

      // Handle both JSON and empty responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`,
        ],
      });
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
      toast({
        title: "Print Order Deleted",
        description: "The print order has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete print order",
        variant: "destructive",
      });
    },
  });

  // Filter print orders
  const filteredPrintOrders = (printOrders || []).filter((order: any) => {
    const matchesSearch =
      !searchTerm ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.orderStatus === statusFilter;
    const matchesPayment =
      paymentFilter === "all" || order.paymentStatus === paymentFilter;

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
      <Badge
        variant={config.color === "green" ? "default" : "secondary"}
        className="flex items-center gap-1"
      >
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    return (
      <Badge
        variant={
          status === "paid"
            ? "default"
            : status === "pending"
              ? "secondary"
              : "destructive"
        }
        className={
          status === "paid"
            ? "bg-green-500 text-white"
            : status === "pending"
              ? "bg-yellow-500 text-white"
              : status === "failed"
                ? "bg-red-500 text-white"
                : "bg-gray-500 text-white"
        }
      >
        {status}
      </Badge>
    );
  };

  const handleOrderCreated = (order: any) => {
    setActiveTab("orders");
    queryClient.invalidateQueries({
      queryKey: [
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`,
      ],
    });
    toast({
      title: "Order Created Successfully",
      description: `Print order ${order.orderNumber} has been created and processed automatically!`,
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

  const handleViewDetails = (order: PrintOrder) => {
    setSelectedOrder(order);
    setShowTracking(true);
  };

  const handleViewInvoice = async (order: PrintOrder) => {
    if (!order.stripePaymentId) {
      toast({
        title: "Error",
        description: "No Stripe payment ID found for this order",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/stripe/invoice/${order.stripePaymentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to retrieve invoice");
      }

      const data = await response.json();

      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
      } else {
        toast({
          title: "Invoice Details",
          description: `Order #${order.orderNumber} - Amount: $${(order.totalAmount / 100).toFixed(2)} - Payment ID: ${order.stripePaymentId}`,
        });
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteOrder = () => {
    if (orderToDelete) {
      deletePrintOrderMutation.mutate(orderToDelete.id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (showTracking && selectedOrder) {
    return (
      <div className="container mx-auto p-6">
        <OrderTracking order={selectedOrder} onClose={handleCloseTracking} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          {/* Top Header */}
          {/* <div className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Printer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Order Management
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Track and manage print orders3
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </Button>
                <Button
                  onClick={() => setActiveTab("new-order")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Print Order</span>
                </Button>
              </div>
            </div>
          </div> */}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pt-4">
              <TabsList className="bg-slate-100 rounded-lg p-1">
                <TabsTrigger
                  value="orders"
                  className="rounded-md font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                >
                  Print Orders
                </TabsTrigger>
                <TabsTrigger
                  value="new-order"
                  className="rounded-md font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                >
                  Create Order
                </TabsTrigger>
                {/* <TabsTrigger 
                  value="menu-printing"
                  className="rounded-md font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                >
                  Menu Printing
                </TabsTrigger> */}
              </TabsList>
            </div>

            <TabsContent value="orders">
              {/* Statistics Cards Section */}
              <div className="p-6 border-b border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Total Orders */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {filteredPrintOrders.length}
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Orders
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pending Orders */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {
                            filteredPrintOrders.filter(
                              (order: any) => order.orderStatus === "pending",
                            ).length
                          }
                        </div>
                        <div className="text-sm text-slate-600">
                          Pending Orders
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Completed Orders */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {
                            filteredPrintOrders.filter(
                              (order: any) => order.orderStatus === "completed",
                            ).length
                          }
                        </div>
                        <div className="text-sm text-slate-600">
                          Completed Orders
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Revenue */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {formatCurrency(
                            filteredPrintOrders
                              .filter(
                                (order: any) => order.paymentStatus === "paid",
                              )
                              .reduce(
                                (sum: number, order: any) =>
                                  sum + (order.totalAmount || 0),
                                0,
                              ),
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          Total Revenue
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Management Header */}
              <div className="pl-6 pt-3">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Order Management
                    </h2>
                    <p className="text-sm text-slate-600">
                      Track and manage print orders
                    </p>
                  </div>
                </div>

                {/* Modern Filters Section - Bookings Style */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="space-y-6 mb-2"
                >
                  {/* Filter Controls Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Collapsible
                        open={showFilters}
                        onOpenChange={setShowFilters}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                          >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {(statusFilter !== "all" ||
                              paymentFilter !== "all" ||
                              searchTerm) && (
                              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                                {
                                  [
                                    statusFilter !== "all",
                                    paymentFilter !== "all",
                                    searchTerm,
                                  ].filter(Boolean).length
                                }
                              </span>
                            )}
                            <ChevronDown
                              className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                            />
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="mt-4">
                          <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Search Input */}
                              <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Search
                                </label>
                                <div className="relative">
                                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                  <Input
                                    placeholder="Search by order number or customer..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                      setSearchTerm(e.target.value)
                                    }
                                    className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                                  />
                                </div>
                              </div>

                              {/* Status Filter */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Status
                                </label>
                                <Select
                                  value={statusFilter}
                                  onValueChange={setStatusFilter}
                                >
                                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                    <SelectValue placeholder="All Status" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-2 border-gray-200">
                                    <SelectItem
                                      value="all"
                                      className="rounded-md"
                                    >
                                      All Status
                                    </SelectItem>
                                    <SelectItem
                                      value="pending"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span>Pending</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="processing"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span>Processing</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="completed"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Completed</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="cancelled"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span>Cancelled</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="shipped"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        <span>Shipped</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Payment Status Filter */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Payment
                                </label>
                                <Select
                                  value={paymentFilter}
                                  onValueChange={setPaymentFilter}
                                >
                                  <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                    <SelectValue placeholder="All Payments" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-2 border-gray-200">
                                    <SelectItem
                                      value="all"
                                      className="rounded-md"
                                    >
                                      All Payments
                                    </SelectItem>
                                    <SelectItem
                                      value="paid"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span>Paid</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="pending"
                                      className="rounded-md"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span>Pending</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="failed"
                                      className="rounded-md"
                                    >
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
                            {(statusFilter !== "all" ||
                              paymentFilter !== "all" ||
                              searchTerm) && (
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <span>Active filters:</span>
                                  {searchTerm && (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                      Search: "{searchTerm}"
                                    </span>
                                  )}
                                  {statusFilter !== "all" && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                      Status: {statusFilter}
                                    </span>
                                  )}
                                  {paymentFilter !== "all" && (
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
                </motion.div>
              </div>

              {/* Orders Table - Billing Style Design */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="bg-white overflow-hidden rounded-xl border-2 border-gray-100 m-6"
              >
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
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center space-y-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                              <span className="text-gray-500 font-medium">
                                Loading print orders...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedPrintOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center space-y-4">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <Printer className="w-8 h-8 text-gray-400" />
                              </div>
                              <div>
                                <h3 className="text-gray-900 font-medium">
                                  No print orders found
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">
                                  {searchTerm ||
                                  statusFilter !== "all" ||
                                  paymentFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "Your print orders will appear here"}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedPrintOrders.map(
                          (order: PrintOrder, index: number) => (
                            <motion.tr
                              key={order.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                              }}
                              className={`group hover:bg-blue-50 transition-all duration-200 cursor-pointer ${
                                index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                              }`}
                              onClick={() => handleViewTracking(order)}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    #PO-{order.orderNumber}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    {order.customerName
                                      ?.charAt(0)
                                      ?.toUpperCase() || "G"}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {order.customerName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {order.customerEmail}
                                    </div>
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
                                  {/* <div className="text-sm text-gray-500 flex items-center">
                                    <Package className="w-3 h-3 mr-1" />
                                    {order.quantity} copies
                                    {order.rushOrder && (
                                      <Badge
                                        variant="secondary"
                                        className="ml-2 text-xs"
                                      >
                                        Rush
                                      </Badge>
                                    )}
                                  </div> */}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-lg text-gray-900">
                                  {formatCurrency(order.totalAmount)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const getPaymentStatusBadge = (
                                    status: string,
                                  ) => {
                                    switch (status) {
                                      case "paid":
                                        return (
                                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Paid
                                          </span>
                                        );
                                      case "pending":
                                        return (
                                          <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Pending
                                          </span>
                                        );
                                      case "failed":
                                        return (
                                          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Failed
                                          </span>
                                        );
                                      default:
                                        return (
                                          <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            {status}
                                          </span>
                                        );
                                    }
                                  };
                                  return getPaymentStatusBadge(
                                    order.paymentStatus,
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const getOrderStatusBadge = (
                                    status: string,
                                  ) => {
                                    switch (status) {
                                      case "completed":
                                        return (
                                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Completed
                                          </span>
                                        );
                                      case "processing":
                                        return (
                                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Processing
                                          </span>
                                        );
                                      case "pending":
                                        return (
                                          <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Pending
                                          </span>
                                        );
                                      case "cancelled":
                                        return (
                                          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Cancelled
                                          </span>
                                        );
                                      case "shipped":
                                        return (
                                          <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            Shipped
                                          </span>
                                        );
                                      default:
                                        return (
                                          <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                            {status}
                                          </span>
                                        );
                                    }
                                  };
                                  return getOrderStatusBadge(order.orderStatus);
                                })()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-gray-900">
                                  {formatDate(order.createdAt)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(order);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-gray-50"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToDelete(order);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    disabled={
                                      deletePrintOrderMutation.isPending
                                    }
                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="flex items-center justify-between px-6 py-4 border-t bg-gray-50"
                >
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
                      {startIndex + 1}-
                      {Math.min(endIndex, filteredPrintOrders.length)} of{" "}
                      {filteredPrintOrders.length}
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
                        {Array.from(
                          { length: Math.min(3, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage <= 2) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 1) {
                              pageNum = totalPages - 2 + i;
                            } else {
                              pageNum = currentPage - 1 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
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
                          },
                        )}
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
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="new-order">
              <PrintOrderForm
                restaurantId={restaurant?.id || 1}
                tenantId={restaurant?.tenantId}
                onOrderCreated={handleOrderCreated}
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
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Print Order</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete order{" "}
              <strong>#{orderToDelete?.orderNumber}</strong> for{" "}
              <strong>{orderToDelete?.customerName}</strong>?
            </p>
            <p className="text-red-600 text-sm mt-2">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setOrderToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={deletePrintOrderMutation.isPending}
            >
              {deletePrintOrderMutation.isPending
                ? "Deleting..."
                : "Delete Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
