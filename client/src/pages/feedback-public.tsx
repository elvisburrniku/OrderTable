import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, Star, MessageCircle, Calendar, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

export default function FeedbackPublic() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);

  // Get tenant and restaurant info from localStorage
  useEffect(() => {
    const validateAndGetIds = async () => {
      try {
        // First try to get from stored user/restaurant data
        const storedUser = localStorage.getItem('user');
        const storedRestaurant = localStorage.getItem('restaurant');
        
        if (storedUser && storedRestaurant) {
          try {
            const user = JSON.parse(storedUser);
            const restaurant = JSON.parse(storedRestaurant);
            
            if (restaurant.tenantId && restaurant.id) {
              setTenantId(restaurant.tenantId);
              setRestaurantId(restaurant.id);
              return;
            }
          } catch (error) {
            console.error('Error parsing stored data:', error);
          }
        }
        
        // Fallback: try to validate session and get current data
        const response = await fetch('/api/auth/validate', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.user && data.restaurant) {
            setTenantId(data.restaurant.tenantId);
            setRestaurantId(data.restaurant.id);
          }
        }
      } catch (error) {
        console.error('Error getting tenant/restaurant info:', error);
      }
    };
    
    validateAndGetIds();
  }, []);

  const { data: feedback, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback`],
    enabled: !!tenantId && !!restaurantId,
  });

  if (!tenantId || !restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load feedback</h3>
          <p className="text-gray-600">Please login to access feedback data.</p>
          <Button 
            className="mt-4" 
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const filteredFeedback = (feedback as FeedbackItem[])?.filter((item: FeedbackItem) => {
    return statusFilter === "all" || item.visited === (statusFilter === "visited");
  }) || [];

  const handleViewDetails = (feedbackItem: FeedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailModal(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
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
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Feedback Responses
              </CardTitle>
              <div className="flex items-center gap-4">
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
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              View and manage all guest feedback from your restaurant. Monitor ratings, NPS scores, and comments to improve your service.
            </p>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-4">
                {filteredFeedback.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{item.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {new Date(item.visitDate || item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {item.tableNumber && (
                            <Badge variant="outline">Table {item.tableNumber}</Badge>
                          )}
                          {!item.visited && (
                            <Badge variant="destructive">New</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Rating:</span>
                            <div className="flex">{renderStars(item.rating)}</div>
                            <span className="text-sm font-medium">{item.rating}/5</span>
                          </div>
                          
                          {item.npsScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">NPS:</span>
                              <span className={`text-sm font-medium ${getNpsColor(item.npsScore)}`}>
                                {item.npsScore}/10
                              </span>
                            </div>
                          )}
                        </div>

                        {item.comments && (
                          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                            "{item.comments}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{item.customerEmail}</span>
                          {item.customerPhone && <span>{item.customerPhone}</span>}
                          {item.questionName && <span>Question: {item.questionName}</span>}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Feedback Details</DialogTitle>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Customer</label>
                    <p className="text-sm text-gray-900">{selectedFeedback.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Visit Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedFeedback.visitDate || selectedFeedback.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedFeedback.customerEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900">{selectedFeedback.customerPhone || 'N/A'}</p>
                  </div>
                  {selectedFeedback.tableNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Table</label>
                      <p className="text-sm text-gray-900">{selectedFeedback.tableNumber}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rating</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">{renderStars(selectedFeedback.rating)}</div>
                      <span className="text-sm font-medium">{selectedFeedback.rating}/5</span>
                    </div>
                  </div>

                  {selectedFeedback.npsScore !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">NPS Score</label>
                      <p className={`text-lg font-bold ${getNpsColor(selectedFeedback.npsScore)}`}>
                        {selectedFeedback.npsScore}/10
                      </p>
                    </div>
                  )}

                  {selectedFeedback.comments && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Comments</label>
                      <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                        "{selectedFeedback.comments}"
                      </p>
                    </div>
                  )}

                  {selectedFeedback.questionName && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Question Category</label>
                      <p className="text-sm text-gray-900">{selectedFeedback.questionName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}