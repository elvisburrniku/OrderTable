import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Check, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FeedbackQuestion {
  id: number;
  name: string;
  questionType: string;
  hasNps: boolean;
  hasComments: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function GuestFeedbackForm() {
  const [match, params] = useRoute("/feedback/:tenantId/:restaurantId");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [npsScore, setNpsScore] = useState(0);
  const [comments, setComments] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = params?.tenantId;
  const restaurantId = params?.restaurantId;
  const urlParams = new URLSearchParams(window.location.search);
  const tableNumber = urlParams.get("table");

  // Fetch restaurant info (public endpoint for guest access)
  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError } = useQuery({
    queryKey: [`/api/public/tenants/${tenantId}/restaurants/${restaurantId}`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Fetch feedback questions (public endpoint for guest access)
  const { data: questions = [], isLoading: questionsLoading, error: questionsError } = useQuery({
    queryKey: [`/api/public/tenants/${tenantId}/restaurants/${restaurantId}/feedback-questions`],
    enabled: !!tenantId && !!restaurantId,
  });

  const activeQuestions = Array.isArray(questions) 
    ? questions.filter((q: FeedbackQuestion) => q.isActive)
        .sort((a: FeedbackQuestion, b: FeedbackQuestion) => a.sortOrder - b.sortOrder)
    : [];

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      return apiRequest("POST", `/api/public/tenants/${tenantId}/restaurants/${restaurantId}/feedback`, feedbackData);
    },
    onSuccess: () => {
      setFeedbackSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a star rating.",
        variant: "destructive",
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    const feedbackData = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      rating,
      npsScore,
      comments: comments.trim(),
      tableNumber: tableNumber || "",
      visitDate: new Date().toISOString().split('T')[0],
    };

    submitFeedbackMutation.mutate(feedbackData);
  };

  if (!match || !tenantId || !restaurantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">This feedback link is not valid. Please contact the restaurant for assistance.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (restaurantLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing your feedback form</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (restaurantError || questionsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Form</h2>
            <p className="text-gray-600">Unable to load the feedback form. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (feedbackSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Your feedback has been submitted successfully. We appreciate your time and input.
            </p>
            <p className="text-sm text-gray-500">
              We hope to see you again at {restaurant?.name}!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Leave Your Feedback
            </CardTitle>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <span>{restaurant?.name}</span>
              {tableNumber && (
                <>
                  <span>•</span>
                  <span>Table {tableNumber}</span>
                </>
              )}
            </div>
            <p className="text-gray-600 mt-2">
              We'd love to hear about your dining experience!
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Your Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email (Optional)</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone (Optional)</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <Label className="text-base font-medium">Overall Rating *</Label>
                <p className="text-sm text-gray-600 mb-3">How would you rate your overall experience?</p>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="focus:outline-none"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* NPS Score */}
              {activeQuestions.some((q: FeedbackQuestion) => q.hasNps) && (
                <div>
                  <Label className="text-base font-medium">Recommendation Score</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    How likely are you to recommend us to a friend or colleague? (0-10)
                  </p>
                  <div className="flex items-center space-x-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setNpsScore(score)}
                        className={`w-8 h-8 text-sm font-medium rounded border focus:outline-none transition-colors ${
                          npsScore === score
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>
              )}

              {/* Comments */}
              {activeQuestions.some((q: FeedbackQuestion) => q.hasComments) && (
                <div>
                  <Label htmlFor="comments" className="text-base font-medium">
                    Additional Comments
                  </Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Tell us more about your experience (optional)
                  </p>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Share your thoughts about the food, service, atmosphere..."
                    rows={4}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}