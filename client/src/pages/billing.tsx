import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PaymentMethodGuard } from "@/components/payment-method-guard";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CreditCard,
  Download,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Check,
  Filter,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar as CalendarIcon,
  Shield,
  Activity,
  DollarSign,
  FileText,
  RefreshCw,
  ArrowUpRight,
  Globe,
  Lock,
  Receipt,
  Wallet,
  Building,
  Users,
  Timer,
  Crown,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface Invoice {
  id: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string;
  invoice_pdf: string;
  number: string;
  description: string;
}

interface BillingInfo {
  customer: any;
  paymentMethods: PaymentMethod[];
  upcomingInvoice: any;
  subscriptionStatus: string;
  stripeSubscriptionId: string;
}

const AddPaymentMethodForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const setupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/setup-intent");
      if (!response.ok) {
        throw new Error("Failed to create setup intent");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (!stripe || !elements) return;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      setIsLoading(true);

      const { error } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      setIsLoading(false);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment method added successfully",
        });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setupIntentMutation.mutate();
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className="p-6 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors duration-200">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#374151",
                  fontFamily: '"Inter", system-ui, sans-serif',
                  fontWeight: "400",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                },
              },
            }}
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={!stripe || isLoading || setupIntentMutation.isPending}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white transition-colors duration-200"
      >
        {isLoading || setupIntentMutation.isPending ? (
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </div>
        )}
      </Button>
    </motion.form>
  );
};

const PaymentMethodCard = ({
  paymentMethod,
  isDefault,
  onSetDefault,
  onDelete,
}: {
  paymentMethod: PaymentMethod;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
}) => {
  const brandIcon = paymentMethod.card.brand.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className={`border transition-all duration-200 hover:shadow-md ${
        isDefault 
          ? 'border-gray-900 bg-gray-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isDefault 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {brandIcon} •••• {paymentMethod.card.last4}
                </div>
                <div className="text-sm text-gray-500">
                  Expires {paymentMethod.card.exp_month.toString().padStart(2, '0')}/
                  {paymentMethod.card.exp_year.toString().slice(-2)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isDefault ? (
                <Badge className="bg-gray-900 text-white border-0">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onSetDefault}
                  className="hover:bg-gray-50 transition-colors"
                >
                  Set Default
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const InvoiceRow = ({ invoice }: { invoice: Invoice }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "void":
        return <Badge variant="secondary">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <motion.div 
      className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group"
      whileHover={{ y: -1 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-1">
        <div className="font-semibold text-gray-900 mb-1">#{invoice.number}</div>
        <div className="text-sm text-gray-500 mb-1">
          {format(new Date(invoice.created * 1000), "MMM dd, yyyy")}
        </div>
        {invoice.period_start && invoice.period_end && (
          <div className="text-xs text-gray-400 flex items-center">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {format(new Date(invoice.period_start * 1000), "MMM dd")} - {format(new Date(invoice.period_end * 1000), "MMM dd, yyyy")}
          </div>
        )}
      </div>
      <div className="text-right space-y-2 mr-6">
        <div className="font-semibold text-lg text-gray-900">
          ${(invoice.amount_paid / 100).toFixed(2)}
        </div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          {invoice.currency}
        </div>
        {getStatusBadge(invoice.status)}
      </div>
      <div className="flex space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
        {invoice.hosted_invoice_url && (
          <Button variant="outline" size="sm" asChild className="hover:bg-gray-50">
            <a
              href={invoice.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="h-3 w-3" />
            </a>
          </Button>
        )}
        {invoice.invoice_pdf && (
          <Button variant="outline" size="sm" asChild className="hover:bg-gray-50">
            <a
              href={invoice.invoice_pdf}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default function BillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);

  useScrollToTop();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: billingInfo, isLoading: billingLoading } =
    useQuery<BillingInfo>({
      queryKey: ["/api/billing/info"],
    });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{
    invoices: Invoice[];
  }>({
    queryKey: ["/api/billing/invoices"],
  });

  const { data: subscriptionDetails } = useQuery({
    queryKey: ["/api/subscription/details"],
  });

  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  const filteredInvoices = (invoicesData?.invoices || []).filter((invoice: Invoice) => {
    const matchesSearch = searchTerm === "" || 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const invoiceDate = new Date(invoice.created * 1000);
      const now = new Date();
      switch (dateFilter) {
        case "last30":
          matchesDate = (now.getTime() - invoiceDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
          break;
        case "last90":
          matchesDate = (now.getTime() - invoiceDate.getTime()) <= (90 * 24 * 60 * 60 * 1000);
          break;
        case "thisYear":
          matchesDate = invoiceDate.getFullYear() === now.getFullYear();
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500 text-white font-semibold px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-500 text-white font-semibold px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case "void":
        return <Badge className="bg-gray-500 text-white font-semibold px-3 py-1">Void</Badge>;
      default:
        return <Badge variant="outline" className="font-semibold px-3 py-1">{status}</Badge>;
    }
  };

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest("DELETE", `/api/billing/payment-method/${paymentMethodId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment method removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    },
  });

  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiRequest("PUT", "/api/billing/default-payment-method", {
        paymentMethodId,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default payment method updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing/cancel-subscription"),
    onSuccess: (data) => {
      toast({
        title: "Subscription Cancelled",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/details"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/billing/reactivate-subscription"),
    onSuccess: (data) => {
      toast({
        title: "Subscription Reactivated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscription/details"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });

  const upgradeSubscriptionMutation = useMutation({
    mutationFn: (planId: number) =>
      apiRequest("POST", "/api/subscription/subscribe", { planId }),
    onSuccess: (data: any) => {
      if (data.requiresPaymentMethod) {
        toast({
          title: "Payment Method Required",
          description: data.message || "Please add a payment method first",
          variant: "destructive",
        });
        setAddPaymentDialogOpen(true);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Subscription Updated",
          description: data.message || "Your subscription has been updated successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/subscription/details"],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data || error;

      if (errorData.validationFailures) {
        const failures = errorData.validationFailures;
        const tableFailure = failures.find((f: any) => f.type === "table_limit");
        const bookingFailure = failures.find((f: any) => f.type === "booking_limit");

        let detailedMessage = errorData.message || error.message;

        if (tableFailure && bookingFailure) {
          detailedMessage += `\n\nActions required:\n• ${tableFailure.action}\n• ${bookingFailure.action}`;
        } else if (tableFailure) {
          detailedMessage += `\n\nAction required: ${tableFailure.action}`;
        } else if (bookingFailure) {
          detailedMessage += `\n\nAction required: ${bookingFailure.action}`;
        }

        toast({
          title: "Downgrade Blocked",
          description: detailedMessage,
          variant: "destructive",
        });
      } else {
        const message = errorData.message || error.message || "Failed to update subscription";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const handlePaymentMethodSuccess = () => {
    setAddPaymentDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
  };

  if (billingLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="grid gap-6">
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const defaultPaymentMethod =
    billingInfo?.customer?.invoice_settings?.default_payment_method;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing & Subscription
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your subscription plans, payment methods, and billing history
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure payments</span>
          </div>
        </motion.div>

        {/* Current Subscription */}
        {subscriptionDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <Crown className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Current Subscription</CardTitle>
                      <CardDescription>
                        Restaurant management platform
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      subscriptionDetails.tenant.subscriptionStatus === "active"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : subscriptionDetails.tenant.subscriptionStatus === "trial"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    {subscriptionDetails.tenant.subscriptionStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {subscriptionDetails.plan?.name || "Free Trial"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {subscriptionDetails.plan
                        ? `$${(subscriptionDetails.plan.price / 100).toFixed(2)}/${subscriptionDetails.plan.interval}`
                        : "No active subscription"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{subscriptionDetails.usage?.totalTables || 0}</div>
                      <div className="text-xs text-gray-500">Tables</div>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{subscriptionDetails.usage?.bookingsThisMonth || 0}</div>
                      <div className="text-xs text-gray-500">Bookings</div>
                    </div>
                  </div>
                </div>

                {/* Usage Progress */}
                {subscriptionDetails.plan && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Usage & Limits</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tables</span>
                          <span className="font-medium">
                            {subscriptionDetails.usage?.totalTables || 0} / {subscriptionDetails.plan.maxTables}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div 
                            className={`h-2 rounded-full ${
                              (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables 
                                ? 'bg-red-500' 
                                : (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables * 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-gray-900'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min(((subscriptionDetails.usage?.totalTables || 0) / subscriptionDetails.plan.maxTables) * 100, 100)}%` 
                            }}
                            transition={{ duration: 1, delay: 0.5 }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monthly Bookings</span>
                          <span className="font-medium">
                            {subscriptionDetails.usage?.bookingsThisMonth || 0} / {subscriptionDetails.plan.maxBookingsPerMonth}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div 
                            className={`h-2 rounded-full ${
                              (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth 
                                ? 'bg-red-500' 
                                : (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth * 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-gray-900'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min(((subscriptionDetails.usage?.bookingsThisMonth || 0) / subscriptionDetails.plan.maxBookingsPerMonth) * 100, 100)}%` 
                            }}
                            transition={{ duration: 1, delay: 0.7 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                  {subscriptionDetails.tenant.subscriptionStatus === "active" && (
                    <Button
                      variant="outline"
                      onClick={() => cancelSubscriptionMutation.mutate()}
                      disabled={cancelSubscriptionMutation.isPending}
                      className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    >
                      {cancelSubscriptionMutation.isPending ? (
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <AlertCircle className="w-3 h-3 mr-2" />
                      )}
                      Cancel Subscription
                    </Button>
                  )}

                  {subscriptionDetails.tenant.subscriptionStatus === "cancelled" && subscriptionDetails.tenant.subscriptionEndDate && (
                    <div className="space-y-3 w-full">
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          Your subscription will end on{" "}
                          {format(
                            new Date(subscriptionDetails.tenant.subscriptionEndDate),
                            "MMM dd, yyyy",
                          )}
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => reactivateSubscriptionMutation.mutate()}
                        disabled={reactivateSubscriptionMutation.isPending}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        {reactivateSubscriptionMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Reactivate Subscription
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Subscription Plans */}
        {subscriptionPlans.length > 0 && (
          <PaymentMethodGuard requiredFor="subscription upgrade">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5" />
                    <span>Subscription Plans</span>
                  </CardTitle>
                  <CardDescription>
                    Choose the perfect plan for your restaurant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {subscriptionPlans.map((plan: any, index: number) => {
                        const isCurrentPlan = subscriptionDetails?.plan?.id === plan.id;
                        const features = JSON.parse(plan.features || '[]');

                        return (
                          <motion.div 
                            key={plan.id}
                            className={`border rounded-lg p-6 transition-all duration-200 ${
                              isCurrentPlan 
                                ? 'border-gray-900 bg-gray-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{ y: -2 }}
                          >
                            {isCurrentPlan && (
                              <div className="flex justify-center mb-4">
                                <Badge className="bg-gray-900 text-white">
                                  Current Plan
                                </Badge>
                              </div>
                            )}

                            <div className="text-center mb-6">
                              <h3 className="font-semibold text-lg text-gray-900 mb-2">{plan.name}</h3>
                              <div className="flex items-baseline justify-center mb-2">
                                <span className="text-3xl font-bold text-gray-900">
                                  ${(plan.price / 100).toFixed(0)}
                                </span>
                                <span className="text-gray-500 ml-1">/{plan.interval}</span>
                              </div>
                            </div>

                            <div className="space-y-3 mb-6">
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-600">Tables</span>
                                <span className="font-medium">{plan.maxTables}</span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-600">Bookings/month</span>
                                <span className="font-medium">{plan.maxBookingsPerMonth}</span>
                              </div>
                            </div>

                            {features.length > 0 && (
                              <div className="mb-6">
                                <div className="text-sm font-medium text-gray-700 mb-3">Features:</div>
                                <ul className="space-y-2">
                                  {features.slice(0, 3).map((feature: string, featureIndex: number) => (
                                    <li key={featureIndex} className="text-sm text-gray-600 flex items-center">
                                      <Check className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                  {features.length > 3 && (
                                    <li className="text-xs text-gray-500 italic">
                                      +{features.length - 3} more features
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                            {!isCurrentPlan && (
                              <Button 
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                                onClick={() => upgradeSubscriptionMutation.mutate(plan.id)}
                                disabled={upgradeSubscriptionMutation.isPending}
                              >
                                {upgradeSubscriptionMutation.isPending ? (
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4 mr-2" />
                                )}
                                Upgrade to {plan.name}
                              </Button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </PaymentMethodGuard>
        )}

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-3">
                    <Wallet className="h-5 w-5" />
                    <span>Payment Methods</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your payment methods securely
                  </CardDescription>
                </div>
                <Dialog
                  open={addPaymentDialogOpen}
                  onOpenChange={setAddPaymentDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-gray-900 hover:bg-gray-800">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span>Add Payment Method</span>
                      </DialogTitle>
                      <DialogDescription>
                        Your payment information is encrypted and stored securely
                      </DialogDescription>
                    </DialogHeader>
                    <Elements stripe={stripePromise}>
                      <AddPaymentMethodForm
                        onSuccess={handlePaymentMethodSuccess}
                      />
                    </Elements>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {billingInfo?.paymentMethods?.length ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {billingInfo.paymentMethods.map((pm, index) => (
                      <motion.div
                        key={pm.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <PaymentMethodCard
                          paymentMethod={pm}
                          isDefault={pm.id === defaultPaymentMethod}
                          onSetDefault={() =>
                            setDefaultPaymentMethodMutation.mutate(pm.id)
                          }
                          onDelete={() => deletePaymentMethodMutation.mutate(pm.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods</h3>
                  <p className="text-gray-500 mb-6">
                    Add a payment method to manage your subscription
                  </p>
                  <Button
                    onClick={() => setAddPaymentDialogOpen(true)}
                    className="bg-gray-900 hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Invoice */}
        {billingInfo?.upcomingInvoice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <Timer className="h-5 w-5 text-orange-600" />
                  <span>Upcoming Invoice</span>
                </CardTitle>
                <CardDescription>Your next billing cycle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                  <div>
                    <div className="font-semibold text-xl text-gray-900">
                      ${(billingInfo.upcomingInvoice.amount_due / 100).toFixed(2)}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        {billingInfo.upcomingInvoice.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600 mt-1">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        Due: {format(new Date(billingInfo.upcomingInvoice.period_end * 1000), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Receipt className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Invoice History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <span>Invoice History</span>
              </CardTitle>
              <CardDescription>
                View and download your billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="space-y-4 mb-6"
              >
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center space-x-2"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filters</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <Input
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={dateFilter} onValueChange={setDateFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="last30">Last 30 Days</SelectItem>
                            <SelectItem value="last90">Last 90 Days</SelectItem>
                            <SelectItem value="thisYear">This Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Active filters:</span>
                            {searchTerm && (
                              <Badge variant="secondary">Search: "{searchTerm}"</Badge>
                            )}
                            {statusFilter !== 'all' && (
                              <Badge variant="secondary">Status: {statusFilter}</Badge>
                            )}
                            {dateFilter !== 'all' && (
                              <Badge variant="secondary">Date: {dateFilter}</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setDateFilter("all");
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Clear filters
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>

              {/* Invoice List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="space-y-4"
              >
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <span className="ml-2 text-gray-600">Loading invoices...</span>
                  </div>
                ) : paginatedInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
                    <p className="text-gray-500">
                      {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                        ? "Try adjusting your filters" 
                        : "Your invoices will appear here"}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {paginatedInvoices.map((invoice: Invoice, index: number) => (
                      <motion.div 
                        key={invoice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <InvoiceRow invoice={invoice} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200"
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
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">entries</span>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-sm text-gray-600">
                      {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length}
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
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
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum ? "bg-gray-900 hover:bg-gray-800" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
                {/* Enhanced Invoice Detail Modal */}
        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-xl">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-3">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <span>Invoice Details - #{selectedInvoice?.number}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-8">
                {/* Invoice Information */}
                <Card className="border-2 border-gray-100 rounded-2xl">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <Settings className="w-6 h-6 text-gray-600" />
                      Invoice Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Invoice Number</label>
                        <p className="text-2xl font-bold text-gray-900">#{selectedInvoice.number}</p>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Amount</label>
                        <p className="text-2xl font-bold text-gray-900">
                          ${(selectedInvoice.amount_paid / 100).toFixed(2)} {selectedInvoice.currency.toUpperCase()}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Status</label>
                        <div className="mt-2">{getInvoiceStatusBadge(selectedInvoice.status)}</div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Created</label>
                        <p className="text-2xl font-bold text-gray-900">
                          {format(new Date(selectedInvoice.created * 1000), "MMM dd, yyyy")}
                        </p>
                      </div>
                      {selectedInvoice.period_start && selectedInvoice.period_end && (
                        <div className="space-y-3 md:col-span-2">
                          <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Service Period</label>
                          <p className="text-lg text-gray-900 font-semibold">
                            {format(new Date(selectedInvoice.period_start * 1000), "MMM dd")} - {format(new Date(selectedInvoice.period_end * 1000), "MMM dd, yyyy")}
                          </p>
                        </div>
                      )}
                      {selectedInvoice.amount_due !== selectedInvoice.amount_paid && (
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-gray-600 uppercase tracking-wider">Amount Due</label>
                          <p className="text-2xl font-bold text-red-600">
                            ${(selectedInvoice.amount_due / 100).toFixed(2)} {selectedInvoice.currency.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  {selectedInvoice.hosted_invoice_url && (
                    <Button asChild className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl px-6 py-3">
                      <a
                        href={selectedInvoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Invoice
                      </a>
                    </Button>
                  )}
                  {selectedInvoice.invoice_pdf && (
                    <Button variant="outline" asChild className="flex items-center gap-3 hover:bg-green-50 hover:border-green-300 rounded-xl px-6 py-3">
                      <a
                        href={selectedInvoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    </Button>
                  )}
                  <Button onClick={handleCloseInvoiceModal} variant="outline" className="flex-1 rounded-xl">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}