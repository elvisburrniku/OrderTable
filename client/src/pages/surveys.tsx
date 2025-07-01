import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Send, TrendingUp, Users, MessageSquare, Calendar } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface SurveyResponse {
  id: number;
  bookingId: number;
  customerName: string;
  customerPhone: string;
  rating: number;
  feedback: string;
  responseMethod: string;
  respondedAt: string;
  createdAt: string;
}

interface SurveyStats {
  totalResponses: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export default function Surveys() {
  const { toast } = useToast();
  const tenantId = sessionStorage.getItem("tenantId");
  const restaurantId = sessionStorage.getItem("restaurantId");

  // Fetch survey responses
  const { data: responses = [], isLoading: responsesLoading } = useQuery<SurveyResponse[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/survey-responses`],
    enabled: !!(tenantId && restaurantId),
  });

  // Fetch survey statistics
  const { data: stats, isLoading: statsLoading } = useQuery<SurveyStats>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/survey-stats`],
    enabled: !!(tenantId && restaurantId),
  });

  // Send survey mutation
  const sendSurveyMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurantId}/send-survey/${bookingId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send survey");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Survey Sent",
        description: `Survey link sent successfully. Survey URL: ${data.surveyUrl}`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/survey-responses`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendSurvey = (bookingId: number) => {
    sendSurveyMutation.mutate(bookingId);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (responsesLoading || statsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Satisfaction Surveys</h1>
          <p className="text-muted-foreground">
            Monitor customer feedback and satisfaction ratings
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.totalResponses}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getRatingColor(stats.averageRating)}`}>
                {stats.averageRating}/5
              </div>
              <div className="flex mt-1">
                {renderStars(Math.round(stats.averageRating))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5 Star Reviews</CardTitle>
              <Star className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {stats.ratingDistribution[5] || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalResponses > 0
                  ? `${Math.round(((stats.ratingDistribution[5] || 0) / stats.totalResponses) * 100)}%`
                  : "0%"} of total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {responses.filter(r => r.feedback && r.feedback.trim()).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {responses.length > 0
                  ? `${Math.round((responses.filter(r => r.feedback && r.feedback.trim()).length / responses.length) * 100)}%`
                  : "0%"} included comments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.totalResponses > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>
              Breakdown of customer ratings from 1 to 5 stars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage = stats.totalResponses > 0 ? (count / stats.totalResponses) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </div>
                    <div className="text-sm text-muted-foreground w-12 text-right">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Survey Responses</CardTitle>
          <CardDescription>
            Latest customer feedback and ratings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No survey responses</h3>
              <p className="mt-1 text-sm text-gray-500">
                Survey responses will appear here once customers start submitting feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.slice(0, 10).map((response) => (
                <div
                  key={response.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {response.customerName || "Anonymous"}
                        </h4>
                        <div className="flex items-center space-x-1">
                          {renderStars(response.rating)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {response.rating}/5
                        </Badge>
                      </div>
                      
                      {response.feedback && (
                        <p className="text-gray-600 mb-2 italic">
                          "{response.feedback}"
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {response.respondedAt
                              ? format(new Date(response.respondedAt), "MMM d, yyyy 'at' h:mm a")
                              : "No response yet"}
                          </span>
                        </span>
                        <span>Booking #{response.bookingId}</span>
                        <Badge variant="secondary" className="text-xs">
                          {response.responseMethod}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {responses.length > 10 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Showing 10 of {responses.length} responses
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Survey Section */}
      <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="text-indigo-700 dark:text-indigo-300">
            Test Survey System
          </CardTitle>
          <CardDescription>
            Send a test survey to any booking to verify the system is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              placeholder="Enter Booking ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              id="testBookingId"
            />
            <Button
              onClick={() => {
                const input = document.getElementById("testBookingId") as HTMLInputElement;
                const bookingId = parseInt(input.value);
                if (bookingId && !isNaN(bookingId)) {
                  handleSendSurvey(bookingId);
                  input.value = "";
                } else {
                  toast({
                    title: "Invalid Booking ID",
                    description: "Please enter a valid booking ID",
                    variant: "destructive",
                  });
                }
              }}
              disabled={sendSurveyMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendSurveyMutation.isPending ? "Sending..." : "Send Test Survey"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}