
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
  Zap,
  Crown,
  Shield,
  Sparkles,
  TrendingUp,
  Activity,
  DollarSign,
  FileText,
  Settings,
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  Globe,
  Lock,
  Receipt,
  Wallet,
  Building,
  Users,
  Timer,
  Target,
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
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
        <div className="relative p-8 border-2 border-gray-200 rounded-2xl bg-white hover:border-blue-300 transition-all duration-300 hover:shadow-xl">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "18px",
                  color: "#1f2937",
                  fontFamily: '"Inter", system-ui, sans-serif',
                  fontWeight: "500",
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
        className="w-full h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02] text-lg"
      >
        {isLoading || setupIntentMutation.isPending ? (
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Securing Payment Method...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5" />
            <span>Add Secure Payment Method</span>
            <Lock className="w-4 h-4" />
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
      <Card className={`relative border-2 transition-all duration-500 rounded-2xl shadow-lg hover:shadow-2xl ${
        isDefault 
          ? 'border-gradient-to-r from-blue-500 to-purple-500 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
      }`}>
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                isDefault 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
              }`}>
                <CreditCard className="h-8 w-8" />
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900 mb-1">
                  {brandIcon} •••• {paymentMethod.card.last4}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Expires {paymentMethod.card.exp_month.toString().padStart(2, '0')}/
                  {paymentMethod.card.exp_year.toString().slice(-2)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isDefault ? (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2 text-sm font-semibold">
                  <Star className="h-4 w-4 mr-2" />
                  Default Payment
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onSetDefault}
                  className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 rounded-xl font-medium px-4 py-2"
                >
                  Set as Default
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-300 rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
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
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors px-3 py-1 font-semibold">
            <CheckCircle className="h-4 w-4 mr-2" />
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors px-3 py-1 font-semibold">
            <Clock className="h-4 w-4 mr-2" />
            Open
          </Badge>
        );
      case "void":
        return <Badge variant="secondary" className="px-3 py-1 font-semibold">Void</Badge>;
      default:
        return <Badge variant="outline" className="px-3 py-1 font-semibold">{status}</Badge>;
    }
  };

  return (
    <motion.div 
      className="flex items-center justify-between p-8 border-2 border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-500 group shadow-sm hover:shadow-lg"
      whileHover={{ scale: 1.01, y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1">
        <div className="font-bold text-xl text-gray-900 mb-2">#{invoice.number}</div>
        <div className="text-sm text-gray-500 mb-2 font-medium">
          {format(new Date(invoice.created * 1000), "MMM dd, yyyy 'at' h:mm a")}
        </div>
        {invoice.period_start && invoice.period_end && (
          <div className="text-xs text-gray-400 flex items-center font-medium">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Service period: {format(new Date(invoice.period_start * 1000), "MMM dd")} - {format(new Date(invoice.period_end * 1000), "MMM dd, yyyy")}
          </div>
        )}
      </div>
      <div className="text-right space-y-3 mr-8">
        <div className="font-bold text-2xl text-gray-900">
          ${(invoice.amount_paid / 100).toFixed(2)}
        </div>
        <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
          {invoice.currency}
        </div>
        {getStatusBadge(invoice.status)}
      </div>
      <div className="flex space-x-3 opacity-70 group-hover:opacity-100 transition-all duration-300">
        {invoice.hosted_invoice_url && (
          <Button variant="outline" size="sm" asChild className="hover:bg-blue-50 transition-colors rounded-xl">
            <a
              href={invoice.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="h-4 w-4" />
            </a>
          </Button>
        )}
        {invoice.invoice_pdf && (
          <Button variant="outline" size="sm" asChild className="hover:bg-green-50 transition-colors rounded-xl">
            <a
              href={invoice.invoice_pdf}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
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
  
  // Auto scroll to top when page loads
  useScrollToTop();
  
  // Invoice History filters and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
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

  // Filter and pagination logic for invoices
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

  // Pagination for invoices
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
          description: data.message || "Please add a payment method first to upgrade to a paid plan",
          variant: "destructive",
        });
        setAddPaymentDialogOpen(true);
      } else if (data.checkoutUrl) {
        // Redirect to Stripe checkout for new subscriptions
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
      console.log("Subscription error:", error);
      
      // Handle detailed downgrade validation errors
      // The error might be nested in the response
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
        // Show the server error message if available
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white via-purple-50 to-pink-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="container mx-auto py-12 relative z-10">
          <motion.div 
            className="space-y-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl animate-pulse"></div>
            <div className="grid gap-10">
              <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl animate-pulse"></div>
              <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl animate-pulse"></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const defaultPaymentMethod =
    billingInfo?.customer?.invoice_settings?.default_payment_method;

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gray-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gray-200/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto py-12 space-y-12 relative z-10">
        {/* Enhanced Header Section */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Billing & Subscription Center
            </h1>
            <p className="text-gray-600 text-base max-w-2xl">
              Manage your subscription plans, payment methods, and billing history
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-gray-600" />
                <span>SSL encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span>Global processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-gray-600" />
                <span>PCI compliant</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-xl p-3 shadow-md border">
              <DollarSign className="w-6 h-6 text-gray-700" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-md border">
              <BarChart3 className="w-6 h-6 text-gray-700" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-md border">
              <Wallet className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </motion.div>

        {/* Enhanced Subscription Status */}
        {subscriptionDetails && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Crown className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">Current Subscription</CardTitle>
                      <CardDescription className="text-gray-600 text-sm">
                        Restaurant management platform
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        subscriptionDetails.tenant.subscriptionStatus === "active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : subscriptionDetails.tenant.subscriptionStatus === "trial"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-red-100 text-red-800 border-red-200"
                      }`}
                    >
                      <Activity className="w-3 h-3 mr-1" />
                      {subscriptionDetails.tenant.subscriptionStatus.toUpperCase()}
                    </Badge>
                    {subscriptionDetails.tenant.subscriptionEndDate && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <CalendarIcon className="w-3 h-3" />
                        <span className="text-xs">
                          {subscriptionDetails.tenant.subscriptionStatus === "cancelled"
                            ? "Expires"
                            : "Next billing"}
                          :{" "}
                          {format(
                            new Date(subscriptionDetails.tenant.subscriptionEndDate),
                            "MMM dd, yyyy",
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 relative z-10">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="font-semibold text-lg text-gray-900">
                        {subscriptionDetails.plan?.name || "Free Trial"}
                      </div>
                    </div>
                    <div className="text-base text-gray-600">
                      {subscriptionDetails.plan
                        ? `$${(subscriptionDetails.plan.price / 100).toFixed(2)}/${subscriptionDetails.plan.interval}`
                        : "No active subscription"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{subscriptionDetails.usage?.totalTables || 0}</div>
                      <div className="text-xs text-gray-500">Tables</div>
                    </div>
                    <div className="w-px h-8 bg-gray-300"></div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{subscriptionDetails.usage?.bookingsThisMonth || 0}</div>
                      <div className="text-xs text-gray-500">Bookings</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  {subscriptionDetails.tenant.subscriptionStatus === "active" && (
                    <Button
                      variant="outline"
                      onClick={() => cancelSubscriptionMutation.mutate()}
                      disabled={cancelSubscriptionMutation.isPending}
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-sm px-4 py-2"
                    >
                      {cancelSubscriptionMutation.isPending ? (
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <AlertCircle className="w-3 h-3 mr-2" />
                      )}
                      {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                    </Button>
                  )}

                  {subscriptionDetails.tenant.subscriptionStatus === "cancelled" && subscriptionDetails.tenant.subscriptionEndDate && (
                    <div className="space-y-4 w-full">
                      <Alert className="border-orange-200 bg-orange-50 rounded-xl">
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
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl px-6 py-3"
                      >
                        {reactivateSubscriptionMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {reactivateSubscriptionMutation.isPending ? "Reactivating..." : "Reactivate Subscription"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Enhanced Usage Statistics */}
                {subscriptionDetails.plan && (
                  <div className="space-y-8 border-t pt-8">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      <h4 className="font-bold text-xl text-gray-900">Current Usage & Limits</h4>
                    </div>
                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Building className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-gray-700">Restaurant Tables</span>
                          </div>
                          <span className="font-bold text-gray-900 text-lg">
                            {subscriptionDetails.usage?.totalTables || 0} / {subscriptionDetails.plan.maxTables}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <motion.div 
                            className={`h-4 rounded-full transition-all duration-1000 ${
                              (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : (subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables * 0.8 
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-green-500 to-blue-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min(((subscriptionDetails.usage?.totalTables || 0) / subscriptionDetails.plan.maxTables) * 100, 100)}%` 
                            }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                          />
                        </div>
                      </div>
                      <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-100">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-700">Monthly Bookings</span>
                          </div>
                          <span className="font-bold text-gray-900 text-lg">
                            {subscriptionDetails.usage?.bookingsThisMonth || 0} / {subscriptionDetails.plan.maxBookingsPerMonth}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <motion.div 
                            className={`h-4 rounded-full transition-all duration-1000 ${
                              (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth 
                                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                : (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth * 0.8 
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-green-500 to-blue-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min(((subscriptionDetails.usage?.bookingsThisMonth || 0) / subscriptionDetails.plan.maxBookingsPerMonth) * 100, 100)}%` 
                            }}
                            transition={{ duration: 1.2, delay: 0.7 }}
                          />
                        </div>
                      </div>
                    </div>
                    {((subscriptionDetails.usage?.totalTables || 0) >= subscriptionDetails.plan.maxTables || 
                      (subscriptionDetails.usage?.bookingsThisMonth || 0) >= subscriptionDetails.plan.maxBookingsPerMonth) && (
                      <Alert className="border-orange-200 bg-orange-50 rounded-xl">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          You've reached your plan limits. Consider upgrading to continue using all features.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Enhanced Available Subscription Plans */}
        {subscriptionPlans.length > 0 && (
          <PaymentMethodGuard requiredFor="subscription upgrade">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
                  <div className="flex items-center space-x-4">
                    <Zap className="h-8 w-8" />
                    <div>
                      <CardTitle className="text-3xl font-bold">Subscription Plans</CardTitle>
                      <CardDescription className="text-blue-100 text-lg">
                        Choose the perfect plan for your restaurant's growth
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {subscriptionPlans.map((plan: any, index: number) => {
                        const isCurrentPlan = subscriptionDetails?.plan?.id === plan.id;
                        const features = JSON.parse(plan.features || '[]');
                        
                        return (
                          <motion.div 
                            key={plan.id}
                            className={`relative border-2 rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl transform hover:scale-105 ${
                              isCurrentPlan 
                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-2xl' 
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -8 }}
                          >
                            {isCurrentPlan && (
                              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 text-sm font-bold">
                                  <Crown className="w-4 h-4 mr-2" />
                                  Current Plan
                                </Badge>
                              </div>
                            )}
                            
                            <div className="text-center mb-8">
                              <h3 className="font-bold text-2xl text-gray-900 mb-4">{plan.name}</h3>
                              <div className="flex items-baseline justify-center mb-2">
                                <span className="text-5xl font-bold text-gray-900">
                                  ${(plan.price / 100).toFixed(0)}
                                </span>
                                <span className="text-gray-500 ml-2 text-lg">/{plan.interval}</span>
                              </div>
                              <p className="text-gray-600">per {plan.interval === 'month' ? 'month' : 'year'}</p>
                            </div>

                            <div className="space-y-6 mb-8">
                              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-4 h-4 text-blue-600" />
                                  <span className="text-gray-600 font-medium">Tables</span>
                                </div>
                                <span className="font-bold text-gray-900">{plan.maxTables}</span>
                              </div>
                              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-green-600" />
                                  <span className="text-gray-600 font-medium">Bookings/month</span>
                                </div>
                                <span className="font-bold text-gray-900">{plan.maxBookingsPerMonth}</span>
                              </div>
                            </div>

                            {features.length > 0 && (
                              <div className="mb-8">
                                <div className="text-sm font-bold text-gray-700 mb-4">Premium Features:</div>
                                <ul className="space-y-3">
                                  {features.slice(0, 4).map((feature: string, featureIndex: number) => (
                                    <li key={featureIndex} className="text-sm text-gray-600 flex items-center">
                                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                                      {feature}
                                    </li>
                                  ))}
                                  {features.length > 4 && (
                                    <li className="text-xs text-gray-500 italic flex items-center">
                                      <Target className="h-3 w-3 mr-2" />
                                      +{features.length - 4} more premium features
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                            {!isCurrentPlan && (
                              <Button 
                                className="w-full h-14 font-bold rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white text-lg"
                                onClick={() => upgradeSubscriptionMutation.mutate(plan.id)}
                                disabled={upgradeSubscriptionMutation.isPending}
                              >
                                {upgradeSubscriptionMutation.isPending ? (
                                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                  <ArrowUpRight className="w-5 h-5 mr-2" />
                                )}
                                {upgradeSubscriptionMutation.isPending ? "Updating..." : `Upgrade to ${plan.name}`}
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

        {/* Enhanced Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Wallet className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-3xl font-bold">Payment Methods</CardTitle>
                    <CardDescription className="text-green-100 text-lg">
                      Secure payment management with bank-level encryption
                    </CardDescription>
                  </div>
                </div>
                <Dialog
                  open={addPaymentDialogOpen}
                  onOpenChange={setAddPaymentDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-white text-green-600 hover:bg-gray-100 transition-colors rounded-xl px-6 py-3 font-semibold shadow-lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-3 text-xl">
                        <Shield className="w-6 h-6 text-blue-600" />
                        <span>Add Secure Payment Method</span>
                      </DialogTitle>
                      <DialogDescription className="text-base">
                        Your payment information is encrypted and stored securely using industry-standard protocols
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
            <CardContent className="p-10">
              {billingInfo?.paymentMethods?.length ? (
                <div className="space-y-6">
                  <AnimatePresence>
                    {billingInfo.paymentMethods.map((pm, index) => (
                      <motion.div
                        key={pm.id}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
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
                  className="text-center py-20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <CreditCard className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No payment methods yet</h3>
                  <p className="text-gray-500 mb-8 text-lg max-w-md mx-auto">
                    Add a secure payment method to manage your subscription and enable automatic billing
                  </p>
                  <Button
                    onClick={() => setAddPaymentDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Payment Method
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Upcoming Invoice */}
        {billingInfo?.upcomingInvoice && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-yellow-200">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-4 shadow-lg">
                    <Timer className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Upcoming Invoice</CardTitle>
                    <CardDescription className="text-gray-600 text-lg">Your next billing cycle summary</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/60 rounded-2xl border border-yellow-100">
                  <div className="space-y-3">
                    <div className="font-bold text-3xl text-gray-900">
                      ${(billingInfo.upcomingInvoice.amount_due / 100).toFixed(2)}{" "}
                      <span className="text-lg font-normal text-gray-500">
                        {billingInfo.upcomingInvoice.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        Due: {format(new Date(billingInfo.upcomingInvoice.period_end * 1000), "MMMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <Receipt className="w-12 h-12 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Enhanced Invoice History */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white">
              <div className="flex items-center space-x-4">
                <FileText className="h-8 w-8" />
                <div>
                  <CardTitle className="text-3xl font-bold">Invoice History</CardTitle>
                  <CardDescription className="text-purple-100 text-lg">
                    Complete billing history with advanced filtering and search
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              {/* Enhanced Filters Section */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="space-y-8 mb-10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-14 px-8 border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 flex items-center space-x-3 font-semibold rounded-2xl text-lg"
                        >
                          <Filter className="w-5 h-5" />
                          <span>Advanced Filters</span>
                          {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                            <span className="bg-purple-500 text-white text-sm px-3 py-1 rounded-full ml-2">
                              {[
                                statusFilter !== 'all' ? 1 : 0,
                                dateFilter !== 'all' ? 1 : 0,
                                searchTerm ? 1 : 0
                              ].reduce((a, b) => a + b, 0)}
                            </span>
                          )}
                          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-8">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4 }}
                          className="bg-gradient-to-br from-gray-50 via-white to-purple-50 rounded-3xl p-10 border-2 border-gray-100 shadow-xl"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Search Input */}
                            <div className="relative">
                              <label className="block text-sm font-bold text-gray-700 mb-4">Search Invoices</label>
                              <div className="relative">
                                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                <Input
                                  placeholder="Search by invoice number..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-14 h-14 border-2 border-gray-200 focus:border-purple-500 focus:ring-0 rounded-2xl transition-all duration-300 text-lg"
                                />
                              </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-4">Status</label>
                              <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-purple-500 rounded-2xl transition-all duration-300 text-lg">
                                  <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-2 border-gray-200">
                                  <SelectItem value="all" className="rounded-xl text-lg">All Statuses</SelectItem>
                                  <SelectItem value="paid" className="rounded-xl text-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                      <span>Paid</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="open" className="rounded-xl text-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                      <span>Open</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="void" className="rounded-xl text-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                                      <span>Void</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Date Filter */}
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-4">Date Range</label>
                              <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-purple-500 rounded-2xl transition-all duration-300 text-lg">
                                  <SelectValue placeholder="All Time" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-2 border-gray-200">
                                  <SelectItem value="all" className="rounded-xl text-lg">All Time</SelectItem>
                                  <SelectItem value="last30" className="rounded-xl text-lg">Last 30 Days</SelectItem>
                                  <SelectItem value="last90" className="rounded-xl text-lg">Last 90 Days</SelectItem>
                                  <SelectItem value="thisYear" className="rounded-xl text-lg">This Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex items-end">
                              <Button 
                                variant="outline" 
                                className="h-14 flex items-center space-x-3 hover:bg-purple-50 hover:border-purple-500 transition-all duration-300 rounded-2xl font-bold text-lg px-6"
                              >
                                <Download className="w-5 h-5" />
                                <span>Export All</span>
                              </Button>
                            </div>
                          </div>

                          {/* Filter Actions */}
                          {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
                            <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-200">
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="font-semibold">Active filters:</span>
                                {searchTerm && (
                                  <span className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold">
                                    Search: "{searchTerm}"
                                  </span>
                                )}
                                {statusFilter !== 'all' && (
                                  <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                                    Status: {statusFilter}
                                  </span>
                                )}
                                {dateFilter !== 'all' && (
                                  <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                                    Date: {dateFilter.replace('last', 'Last ').replace('thisYear', 'This Year')}
                                  </span>
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
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl font-semibold"
                              >
                                Clear all filters
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Invoice List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="space-y-6"
              >
                {invoicesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-6"></div>
                    <span className="text-gray-600 font-semibold text-lg">Loading invoice history...</span>
                  </div>
                ) : paginatedInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 via-purple-50 to-pink-50 rounded-full flex items-center justify-center mb-8 shadow-lg">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No invoices found</h3>
                    <p className="text-gray-500 text-center max-w-md text-lg">
                      {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                        ? "Try adjusting your filters to see more results" 
                        : "Your billing invoices will appear here once transactions begin"}
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
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <InvoiceRow invoice={invoice} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="flex items-center justify-between mt-10 pt-8 border-t border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 font-semibold">Show</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-24 h-12 border-2 border-gray-200 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600 font-semibold">entries</span>
                  </div>

                  <div className="flex items-center space-x-8">
                    <div className="text-sm text-gray-600 font-semibold">
                      {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-4 py-3 h-12 text-sm rounded-xl border-2 hover:border-purple-300 font-semibold"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-12 h-12 p-0 rounded-xl border-2 hover:border-purple-300"
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
                              className={`w-12 h-12 p-0 rounded-xl border-2 font-semibold ${
                                currentPage === pageNum 
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-purple-500" 
                                  : "hover:border-purple-300 hover:bg-purple-50"
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
                        className="w-12 h-12 p-0 rounded-xl border-2 hover:border-purple-300"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-3 h-12 text-sm rounded-xl border-2 hover:border-purple-300 font-semibold"
                      >
                        Last
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
