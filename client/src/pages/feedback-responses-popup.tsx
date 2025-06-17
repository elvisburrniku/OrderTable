import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Eye,
  Star,
  MessageSquare,
  User,
  Calendar,
  Hash,
} from "lucide-react";

interface FeedbackItem {
  id: number;
  customerName: string;
  customerEmail: string;
  restaurantId: number;
  tenantId: number;
  bookingId?: number;
  tableId?: number;
  rating: number;
  nps?: number;
  comments: string;
  visited: boolean;
  createdAt: string;
}

interface FeedbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FeedbackItem | null;
  restaurantName?: string;
}

function FeedbackDetailModal({
  isOpen,
  onClose,
  feedback,
  restaurantName,
}: FeedbackDetailModalProps) {
  if (!feedback) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback Details - #{feedback.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Restaurant Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">
                  {restaurantName || "Restaurant"}
                </h3>
                <p className="text-sm text-blue-700 mt-2">
                  Feedback submitted on{" "}
                  {new Date(feedback.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

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
                  <label className="text-sm font-medium text-gray-600">
                    Name
                  </label>
                  <p className="text-lg">{feedback.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <p className="text-lg text-blue-600">
                    {feedback.customerEmail}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Booking ID
                  </label>
                  <p className="text-lg">{feedback.bookingId || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Table ID
                  </label>
                  <p className="text-lg">{feedback.tableId || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Visit Status
                  </label>
                  <Badge
                    className={
                      feedback.visited
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {feedback.visited ? "Visited" : "Not Visited"}
                  </Badge>
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Overall Rating
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= feedback.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">
                      {feedback.rating}/5
                    </span>
                  </div>
                </div>
                {feedback.nps && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      NPS Score
                    </label>
                    <p className="text-2xl font-bold text-blue-600">
                      {feedback.nps}
                    </p>
                  </div>
                )}
              </div>

              {feedback.comments && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Comments
                  </label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {feedback.comments}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hash className="w-5 h-5" />
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-600">
                    Feedback ID
                  </label>
                  <p>{feedback.id}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">
                    Restaurant ID
                  </label>
                  <p>{feedback.restaurantId}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-600">Tenant ID</label>
                  <p>{feedback.tenantId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FeedbackResponsesPopup() {
  const { user, restaurant } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: feedback, isLoading } = useQuery({
    queryKey: ["/api/restaurants", restaurant?.id, "feedback"],
    enabled: !!restaurant,
  });

  if (!user || !restaurant) {
    return null;
  }

  const filteredFeedback =
    (feedback as FeedbackItem[])?.filter((item: FeedbackItem) => {
      return (
        statusFilter === "all" || item.visited === (statusFilter === "visited")
      );
    }) || [];

  const handleViewDetails = (feedbackItem: FeedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedFeedback(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <div className="space-y-2">
              <a
                href="/customers"
                className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded"
              >
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Customers</span>
              </a>
              <a
                href="/sms-messages"
                className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded"
              >
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>SMS messages</span>
              </a>
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">Feedback responses</span>
              </div>
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded"
              >
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Newsletter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">
                Customer Feedback Responses
              </h2>

              {/* Filters */}
              <div className="flex items-center space-x-4 mb-4">
                <Button variant="outline" size="sm">
                  Show filters
                </Button>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="visited">Visited</SelectItem>
                    <SelectItem value="not-visited">Not Visited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cards View */}
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading feedback responses...</p>
                </div>
              ) : filteredFeedback.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No feedback responses found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFeedback.map((item: FeedbackItem) => (
                    <Card
                      key={item.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {item.customerName}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              {item.customerEmail}
                            </p>
                          </div>
                          <Badge
                            className={
                              item.visited
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {item.visited ? "Visited" : "Not Visited"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Rating */}
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= item.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {item.rating}/5
                          </span>
                          {item.nps && (
                            <Badge variant="outline" className="ml-auto">
                              NPS: {item.nps}
                            </Badge>
                          )}
                        </div>

                        {/* Comments Preview */}
                        {item.comments && (
                          <div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {item.comments}
                            </p>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Feedback ID:</span>
                            <span>#{item.id}</span>
                          </div>
                          {item.bookingId && (
                            <div className="flex justify-between">
                              <span>Booking ID:</span>
                              <span>#{item.bookingId}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button
                          className="w-full mt-4"
                          variant="outline"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredFeedback.length} feedback responses
              </div>

              <div className="flex items-center space-x-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download as CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Detail Modal */}
      <FeedbackDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        feedback={selectedFeedback}
        restaurantName={restaurant?.name}
      />
    </div>
  );
}
