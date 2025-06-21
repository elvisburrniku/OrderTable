
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Users
} from "lucide-react";

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
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading feedback...</h3>
          <p className="text-gray-600">Please wait while we load your feedback data.</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Feedback Responses</h1>
              <p className="text-sm text-gray-600">Monitor your restaurant's performance and activity trends for {restaurant?.name}</p>
            </div>
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>View All Restaurants</span>
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Filters Bar */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by customer name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Feedback</SelectItem>
                  <SelectItem value="visited">Visited</SelectItem>
                  <SelectItem value="not-visited">Not Visited</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
                <p className="text-gray-600">Guest feedback will appear here once customers leave reviews.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">CUSTOMER</TableHead>
                    <TableHead className="w-[100px]">SOURCE</TableHead>
                    <TableHead className="w-[150px]">EVENT TYPE</TableHead>
                    <TableHead className="w-[200px]">USER</TableHead>
                    <TableHead className="flex-1">DETAILS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-gray-500">
                            {new Date(item.visitDate || item.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(item.visitDate || item.createdAt).toLocaleTimeString('en-US', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          feedback
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100 text-gray-700">
                          Feedback
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.customerName}</div>
                            <div className="text-sm text-gray-500">{item.customerEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-4 mb-2">
                              <div className="flex items-center space-x-1">
                                <span className="text-sm text-gray-600">Rating:</span>
                                <div className="flex">{renderStars(item.rating)}</div>
                                <span className="text-sm font-medium">{item.rating ? `${Math.min(Math.max(item.rating, 0), 5)}/5` : 'No rating'}</span>
                              </div>
                              {item.tableNumber && (
                                <Badge variant="outline">Table {item.tableNumber}</Badge>
                              )}
                              {!item.visited && new Date(item.createdAt).toDateString() === new Date().toDateString() && (
                                <Badge variant="destructive">New</Badge>
                              )}
                            </div>
                            
                            {item.comments && (
                              <p className="text-sm text-gray-700 truncate max-w-md">
                                "{item.comments}"
                              </p>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(item)}
                            className="ml-4"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
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
