
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
import { 
  Download, 
  Eye, 
  Star, 
  MessageCircle, 
  Calendar, 
  User, 
  HelpCircle, 
  Trash2,
  Filter,
  Search,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Mail,
  Phone
} from "lucide-react";
import { motion } from "framer-motion";

interface FeedbackItem {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  rating: number;
  npsScore: number;
  comments: string;
  tableNumber: string;
  bookingDate: string;
  visitDate: string;
  createdAt: string;
  visited: boolean;
  questionName?: string;
}

interface FeedbackResponse {
  id: number;
  feedbackId: number;
  questionId: number;
  rating: number | null;
  npsScore: number | null;
  textResponse: string | null;
  createdAt: string;
  questionName: string;
  questionType: string;
}

export default function FeedbackResponses() {
  const { user, restaurant } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get tenant and restaurant IDs from various sources
  useEffect(() => {
    const getRestaurantInfo = async () => {
      // First try auth context
      if (restaurant?.tenantId && restaurant?.id) {
        setTenantId(restaurant.tenantId);
        setRestaurantId(restaurant.id);
        return;
      }

      // Try localStorage
      try {
        const storedRestaurant = localStorage.getItem('restaurant');
        if (storedRestaurant) {
          const parsed = JSON.parse(storedRestaurant);
          if (parsed.tenantId && parsed.id) {
            setTenantId(parsed.tenantId);
            setRestaurantId(parsed.id);
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

  const { data: feedback, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Fetch detailed question responses for selected feedback
  const { data: feedbackResponses, isLoading: responsesLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback/${selectedFeedback?.id}/responses`],
    enabled: !!selectedFeedback && !!tenantId && !!restaurantId,
  });

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: number) => {
      return apiRequest("DELETE", `/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback/${feedbackId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback`],
      });
      setShowDetailModal(false);
      setSelectedFeedback(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete feedback",
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
          <span className="text-gray-500 font-medium">Loading feedback...</span>
        </div>
      </div>
    );
  }

  const filteredFeedback = (feedback as FeedbackItem[])?.filter((item: FeedbackItem) => {
    const matchesFilter = statusFilter === "all" || item.visited === (statusFilter === "visited");
    const matchesSearch = searchTerm === "" || 
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFeedback = filteredFeedback.slice(startIndex, endIndex);

  const handleViewDetails = (feedbackItem: FeedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedFeedback(null);
  };

  const renderStars = (rating: number | null) => {
    if (!rating) {
      return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="w-4 h-4 text-gray-300" />
      ));
    }
    
    // Ensure rating is within 1-5 range for star display
    const normalizedRating = Math.min(Math.max(rating, 0), 5);
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < normalizedRating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getNpsColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (visited: boolean) => {
    return visited ? (
      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
        feedback
      </span>
    ) : (
      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
        feedback
      </span>
    );
  };

  const getSourceBadge = () => {
    return (
      <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium">
        Feedback
      </span>
    );
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
                <MessageCircle className="h-6 w-6 text-green-600" />
                Feedback Responses
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button variant="outline" className="flex items-center gap-2 hover:bg-green-50 hover:border-green-500 transition-all duration-200">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Customer Feedback</h2>

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
                        {(statusFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[statusFilter !== 'all', searchTerm].filter(Boolean).length}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by name or email..."
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
                                <SelectValue placeholder="All Feedback" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Feedback</SelectItem>
                                <SelectItem value="visited" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Visited</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="not-visited" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Not Visited</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Export */}
                          <div className="flex items-end">
                            <Button variant="outline" className="h-11 flex items-center space-x-2 hover:bg-green-50 hover:border-green-500 transition-all duration-200">
                              <Download className="w-4 h-4" />
                              <span>Export</span>
                            </Button>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(statusFilter !== 'all' || searchTerm) && (
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
                                  Status: {statusFilter.replace('-', ' ')}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
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
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">CUSTOMER</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">RATING</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">NPS SCORE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">TABLE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">VISIT DATE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">STATUS</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading feedback...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedFeedback.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <MessageCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No feedback found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedFeedback.map((item: FeedbackItem, index: number) => (
                        <motion.tr 
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {item.customerName?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">{item.customerName}</div>
                                <div className="text-sm text-gray-500 truncate">{item.customerEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1">
                              <div className="flex">{renderStars(item.rating)}</div>
                              <span className="text-sm font-medium text-gray-600">
                                {item.rating ? `${Math.min(Math.max(item.rating, 0), 5)}/5` : 'No rating'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.npsScore !== null ? (
                              <span className={`font-medium ${getNpsColor(item.npsScore)}`}>
                                {item.npsScore}/10
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">No score</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.tableNumber ? (
                              <Badge variant="outline" className="text-xs">Table {item.tableNumber}</Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="text-gray-900 font-medium">
                                {new Date(item.visitDate || item.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(item.visitDate || item.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(item.visited)}
                              {!item.visited && new Date(item.createdAt).toDateString() === new Date().toDateString() && (
                                <Badge variant="destructive" className="text-xs">New</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteFeedbackMutation.mutate(item.id)}
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
                    {startIndex + 1}-{Math.min(endIndex, filteredFeedback.length)} of {filteredFeedback.length}
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

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Feedback Details - #{selectedFeedback?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-lg">{selectedFeedback.customerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-lg text-blue-600">{selectedFeedback.customerEmail}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-lg">{selectedFeedback.customerPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Visit Date</label>
                      <p className="text-lg">
                        {new Date(selectedFeedback.visitDate || selectedFeedback.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedFeedback.tableNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Table</label>
                        <p className="text-lg">{selectedFeedback.tableNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rating Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="w-5 h-5" />
                    Rating & Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Overall Rating</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">{renderStars(selectedFeedback.rating)}</div>
                      <span className="text-lg font-semibold">{selectedFeedback.rating}/5</span>
                    </div>
                  </div>

                  {selectedFeedback.comments && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Comments</label>
                      <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                        "{selectedFeedback.comments}"
                      </p>
                    </div>
                  )}

                  {/* Individual Question Responses */}
                  {feedbackResponses && feedbackResponses.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-3 block">
                        Individual Question Responses
                      </label>
                      <div className="space-y-3">
                        {(feedbackResponses as FeedbackResponse[]).map((response) => (
                          <div key={response.id} className="p-3 bg-gray-50 rounded-md border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <HelpCircle className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {response.questionName}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {response.questionType}
                                  </Badge>
                                </div>
                                
                                {/* Rating Display */}
                                {response.rating && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-600">Rating:</span>
                                    <div className="flex items-center gap-1">
                                      {renderStars(response.rating)}
                                      <span className="text-sm font-medium text-gray-900">
                                        {response.rating}/5
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* NPS Score Display */}
                                {response.npsScore !== null && response.npsScore !== undefined && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-600">NPS Score:</span>
                                    <span className={`text-sm font-medium ${getNpsColor(response.npsScore)}`}>
                                      {response.npsScore}/10
                                    </span>
                                  </div>
                                )}

                                {/* Text Response Display */}
                                {response.textResponse && (
                                  <div className="mt-2">
                                    <span className="text-xs text-gray-600">Response:</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                      "{response.textResponse}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {responsesLoading && (
                        <div className="text-center py-4">
                          <div className="text-sm text-gray-500">Loading question details...</div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFeedback.questionName && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Question Category</label>
                      <p className="text-sm text-gray-900">{selectedFeedback.questionName}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => deleteFeedbackMutation.mutate(selectedFeedback.id)}
                  disabled={deleteFeedbackMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Feedback
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
