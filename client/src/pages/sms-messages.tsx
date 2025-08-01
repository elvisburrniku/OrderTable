import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Calendar, 
  User, 
  Phone,
  Filter,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Trash2,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useSettings } from "@/hooks/use-settings";
import { formatDate, formatDateTime } from "@/lib/time-formatter";

interface SmsMessage {
  id: number;
  restaurantId: number;
  tenantId: number;
  bookingId?: number;
  phoneNumber: string;
  message: string;
  type: string;
  status: string;
  cost?: string;
  providerId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SmsMessages() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SmsMessage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  // Form data for creating new messages
  const [formData, setFormData] = useState({
    name: "",
    messageType: "information",
    content: "",
    receivers: "",
    bookingDateFrom: "",
    bookingDateTo: "",
    language: "english"
  });

  // Extract tenant and restaurant IDs
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const getRestaurantInfo = async () => {
      // Try getting from current restaurant context first
      if (restaurant?.tenantId && restaurant?.id) {
        setTenantId(restaurant.tenantId.toString());
        setRestaurantId(restaurant.id.toString());
        return;
      }

      // Try getting from localStorage
      try {
        const stored = localStorage.getItem('restaurant');
        if (stored) {
          const restaurantData = JSON.parse(stored);
          if (restaurantData?.tenantId && restaurantData?.id) {
            setTenantId(restaurantData.tenantId.toString());
            setRestaurantId(restaurantData.id.toString());
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing stored restaurant:', error);
      }

      // Try session validation as fallback
      try {
        const response = await fetch('/api/auth/validate', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.restaurant) {
            setTenantId(data.restaurant.tenantId);
            setRestaurantId(data.restaurant.id);
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    getRestaurantInfo();
  }, [restaurant]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/sms-messages`],
    enabled: !!tenantId && !!restaurantId,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/sms-messages`, messageData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/sms-messages`],
      });
      setFormData({
        name: "",
        messageType: "information",
        content: "",
        receivers: "",
        bookingDateFrom: "",
        bookingDateTo: "",
        language: "english"
      });
      setShowCreateModal(false);
      
      if (data.status === "sent") {
        toast({
          title: "SMS Sent Successfully",
          description: `Message delivered via Twilio. ID: ${data.smsResult?.messageId || 'N/A'}`,
        });
      } else if (data.status === "failed") {
        toast({
          title: "SMS Saved but Failed to Send",
          description: `Error: ${data.error || 'Unknown error'}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "SMS Message Saved",
          description: "Message saved to database",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create SMS message",
        variant: "destructive",
      });
    },
  });

  // Test SMS mutation
  const testSmsMutation = useMutation({
    mutationFn: async (testData: { phoneNumber: string; message?: string }) => {
      return apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/sms-messages/test`, {
        phoneNumber: testData.phoneNumber,
        message: testData.message || "Test SMS from your restaurant booking system. Twilio integration is working correctly!",
        type: "test"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Test SMS Sent Successfully",
        description: `Message ID: ${data.messageId}. Check your phone for the test message.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test SMS Failed",
        description: error.message || "Failed to send test SMS. Please check your phone number and try again.",
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/tenants/${tenantId}/restaurants/${restaurantId}/sms-messages/${messageId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SMS message deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/sms-messages`],
      });
      setShowDetailModal(false);
      setSelectedMessage(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete SMS message",
        variant: "destructive",
      });
    },
  });

  // Show loading state if we don't have restaurant info yet
  if (!tenantId || !restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
          <span className="text-gray-500 font-medium">Loading SMS messages...</span>
        </div>
      </div>
    );
  }

  const filteredMessages = (messages as SmsMessage[])?.filter((message: SmsMessage) => {
    const matchesFilter = statusFilter === "all" || message.status === statusFilter;
    const matchesType = typeFilter === "all" || message.type === typeFilter;
    const matchesSearch = searchTerm === "" || 
      message.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesType && matchesSearch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  const handleViewDetails = (message: SmsMessage) => {
    setSelectedMessage(message);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !restaurantId) return;

    createMessageMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✓ Sent</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ Queued</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">✗ Failed</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">✓ Delivered</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      case 'confirmation':
        return <CheckCircle className="w-4 h-4" />;
      case 'promotion':
        return <Send className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <MessageSquare className="h-6 w-6 text-green-600" />
                SMS Messages
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center gap-3"
              >
                <Button 
                  variant="outline" 
                  onClick={() => setShowTestModal(true)}
                  className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-500 transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                  Test SMS
                </Button>
                <Button variant="outline" className="flex items-center gap-2 hover:bg-green-50 hover:border-green-500 transition-all duration-200">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4" />
                  New Message
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Message Management</h2>

            {/* Modern Filters Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-6 mb-8"
            >
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
                        {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[
                              statusFilter !== 'all' ? 1 : 0,
                              typeFilter !== 'all' ? 1 : 0,
                              searchTerm ? 1 : 0
                            ].reduce((a, b) => a + b, 0)}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by name or content..."
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
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Statuses</SelectItem>
                                <SelectItem value="sent" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Sent</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="queued" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span>Queued</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="failed" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Failed</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="draft" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                    <span>Draft</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Type Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Types</SelectItem>
                                <SelectItem value="reminder" className="rounded-md">Reminder</SelectItem>
                                <SelectItem value="confirmation" className="rounded-md">Confirmation</SelectItem>
                                <SelectItem value="promotion" className="rounded-md">Promotion</SelectItem>
                                <SelectItem value="information" className="rounded-md">Information</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Actions */}
                          <div className="flex items-end">
                            <Button variant="outline" className="h-11 flex items-center space-x-2 hover:bg-green-50 hover:border-green-500 transition-all duration-200">
                              <Download className="w-4 h-4" />
                              <span>Export</span>
                            </Button>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
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
                              {typeFilter !== 'all' && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Type: {typeFilter}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setTypeFilter("all");
                              }}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              Clear all
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </motion.div>

            {/* Enhanced Table */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm mt-6"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">MESSAGE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">TYPE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">PHONE / COST</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">STATUS</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">SENT AT</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading messages...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedMessages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No messages found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or create a new message</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedMessages.map((message: SmsMessage, index: number) => (
                        <motion.tr 
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {getTypeIcon(message.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">{message.phoneNumber}</div>
                                <div className="text-sm text-gray-500 truncate max-w-md">{message.message}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="text-gray-900 font-medium">
                                {message.phoneNumber}
                              </div>
                              {message.cost && (
                                <div className="text-gray-500">
                                  Cost: €{message.cost}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(message.status)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {message.sentAt ? (
                                <>
                                  <div className="text-gray-900 font-medium">
                                    {new Date(message.sentAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-gray-500 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(message.sentAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </>
                              ) : (
                                <div className="text-gray-500 italic">
                                  Not sent yet
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(message)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteMessageMutation.mutate(message.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
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
                    {startIndex + 1}-{Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length}
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
                            className={currentPage === pageNum ? "w-8 h-8 p-0 bg-green-600 hover:bg-green-700 text-white" : "w-8 h-8 p-0 hover:bg-green-50"}
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
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create Message Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Create New SMS Message
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Message Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter message name"
                required
              />
            </div>

            <div>
              <Label htmlFor="messageType">Message Type</Label>
              <Select value={formData.messageType} onValueChange={(value) => setFormData({ ...formData, messageType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select message type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="information">Information</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="confirmation">Confirmation</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your message content"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="receivers">Recipients (comma-separated phone numbers)</Label>
              <Textarea
                id="receivers"
                value={formData.receivers}
                onChange={(e) => setFormData({ ...formData, receivers: e.target.value })}
                placeholder="Enter phone numbers separated by commas"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createMessageMutation.isPending} className="flex-1">
                {createMessageMutation.isPending ? "Creating..." : "Create Message"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test SMS Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Test SMS Message
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (testPhoneNumber) {
              testSmsMutation.mutate({ phoneNumber: testPhoneNumber });
              setTestPhoneNumber("");
              setShowTestModal(false);
            }
          }} className="space-y-4">
            <div>
              <Label htmlFor="testPhone">Phone Number</Label>
              <Input
                id="testPhone"
                type="tel"
                placeholder="+38345370650"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the phone number in international format (e.g., +38345370650)
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Test Message Preview:</h4>
              <p className="text-sm text-blue-800">
                "Test SMS from your restaurant booking system. Twilio integration is working correctly!"
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={testSmsMutation.isPending || !testPhoneNumber}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {testSmsMutation.isPending ? "Sending..." : "Send Test SMS"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowTestModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Message Details - #{selectedMessage?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-6">
              {/* Message Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5" />
                    Message Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-lg">{selectedMessage.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-lg capitalize">{selectedMessage.messageType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Language</label>
                      <p className="text-lg capitalize">{selectedMessage.language}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Recipients</label>
                      <p className="text-lg">{selectedMessage.totalReceivers || 0}</p>
                    </div>
                    {selectedMessage.deliveredCount !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Delivered</label>
                        <p className="text-lg">{selectedMessage.deliveredCount}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <p className="text-lg">
                        {new Date(selectedMessage.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedMessage.sentAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Sent</label>
                        <p className="text-lg">
                          {new Date(selectedMessage.sentAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Content</label>
                    <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                      {selectedMessage.content}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => deleteMessageMutation.mutate(selectedMessage.id)}
                  disabled={deleteMessageMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Message
                </Button>
                <Button onClick={handleCloseModal} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}