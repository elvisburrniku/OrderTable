import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Check, Clock, AlertCircle, ArrowRight, ArrowLeft, User, MessageSquare, Award } from "lucide-react";
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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [questionResponses, setQuestionResponses] = useState<{[key: number]: any}>({});
  const [hoverRatings, setHoverRatings] = useState<{[key: number]: number}>({});
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract IDs from URL path directly as fallback
  const pathParts = window.location.pathname.split('/');
  const tenantId = params?.tenantId || (pathParts[2] === '1' ? '1' : null);
  const restaurantId = params?.restaurantId || (pathParts[3] === '1' ? '1' : null);
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

  // Calculate total steps: Personal Info + Questions + Summary
  const totalSteps = 1 + activeQuestions.length + 1;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStepTitle = () => {
    if (currentStep === 0) return "Your Details";
    if (currentStep === totalSteps - 1) return "Review & Submit";
    return `Question ${currentStep}`;
  };

  const getStepIcon = () => {
    if (currentStep === 0) return <User className="w-6 h-6" />;
    if (currentStep === totalSteps - 1) return <Check className="w-6 h-6" />;
    return <MessageSquare className="w-6 h-6" />;
  };

  const canProceedFromCurrentStep = () => {
    if (currentStep === 0) {
      return customerName.trim().length > 0;
    }
    if (currentStep > 0 && currentStep < totalSteps - 1) {
      const questionIndex = currentStep - 1;
      const question = activeQuestions[questionIndex];
      if (!question) return true;
      
      const response = questionResponses[question.id];
      if (question.questionType === 'text') {
        return response?.text?.trim().length > 0;
      }
      if (question.questionType === 'star') {
        return response?.rating !== undefined && response?.rating !== null;
      }
      return true;
    }
    return true;
  };

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

    if (!customerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    // Extract rating and NPS score from questionResponses
    let overallRating = null;
    let overallNpsScore = null;
    let overallComments = '';

    activeQuestions.forEach((question: FeedbackQuestion) => {
      const response = questionResponses[question.id];
      if (response) {
        if (question.questionType === 'star' && response.rating) {
          overallRating = response.rating;
        }
        if (response.npsScore !== undefined && response.npsScore !== null) {
          overallNpsScore = response.npsScore;
        }
        if (response.text) {
          overallComments += (overallComments ? '\n' : '') + response.text;
        }
      }
    });

    // Format question responses for API
    const formattedResponses = activeQuestions.map(question => {
      const response = questionResponses[question.id];
      if (!response) return null;

      return {
        questionId: question.id,
        rating: response.rating || null,
        npsScore: response.npsScore || null,
        textResponse: response.text || null,
      };
    }).filter(Boolean);

    const feedbackData = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      tableNumber: tableNumber || '',
      questionResponses: formattedResponses,
    };



    submitFeedbackMutation.mutate(feedbackData);
  };

  if (!tenantId || !restaurantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">This feedback link is not valid. Please contact the restaurant for assistance.</p>
            <p className="text-sm text-gray-500 mt-2">Current path: {window.location.pathname}</p>
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

  const renderStepContent = () => {
    // Step 0: Personal Information
    if (currentStep === 0) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600">Let's start with your basic information</p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="customerName" className="text-lg font-semibold text-gray-700">Your Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-2 h-12 text-lg border-2 focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail" className="text-lg font-semibold text-gray-700">Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="mt-2 h-12 text-lg border-2 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone" className="text-lg font-semibold text-gray-700">Phone (Optional)</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Your phone number"
                className="mt-2 h-12 text-lg border-2 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      );
    }

    // Last step: Review & Submit
    if (currentStep === totalSteps - 1) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost Done!</h2>
            <p className="text-gray-600">Review your feedback before submitting</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Your Information</h3>
              <p className="text-gray-700">{customerName}</p>
              {customerEmail && <p className="text-gray-600">{customerEmail}</p>}
              {customerPhone && <p className="text-gray-600">{customerPhone}</p>}
            </div>
            
            {activeQuestions.map((question: FeedbackQuestion) => {
              const response = questionResponses[question.id];
              if (!response) return null;
              
              return (
                <div key={question.id}>
                  <h3 className="font-semibold text-gray-900">{question.name}</h3>
                  {response.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 10 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < response.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{response.rating}/10</span>
                    </div>
                  )}
                  {response.text && <p className="text-gray-700">{response.text}</p>}
                  {response.nps !== undefined && (
                    <p className="text-gray-700">NPS Score: {response.nps}/10</p>
                  )}
                  {response.comments && <p className="text-gray-700">Comments: {response.comments}</p>}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Question steps
    const questionIndex = currentStep - 1;
    const question = activeQuestions[questionIndex];
    if (!question) return null;

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{question.name}</h2>
          <p className="text-gray-600">Question {currentStep} of {activeQuestions.length}</p>
        </div>

        <div className="space-y-6">
          {/* Text Only Questions */}
          {question.questionType === 'text' && (
            <div>
              <Textarea
                id={`text-${question.id}`}
                value={questionResponses[question.id]?.text || ''}
                onChange={(e) => {
                  setQuestionResponses(prev => ({
                    ...prev,
                    [question.id]: { text: e.target.value }
                  }));
                }}
                placeholder="Please share your thoughts..."
                rows={6}
                className="text-lg border-2 focus:border-purple-500 transition-colors"
              />
            </div>
          )}

          {/* Star Rating Questions with 1-5 scale */}
          {question.questionType === 'star' && (
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-6">Rate your experience (1-5 stars)</p>
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="group focus:outline-none"
                    onMouseEnter={() => setHoverRatings(prev => ({ ...prev, [question.id]: star }))}
                    onMouseLeave={() => setHoverRatings(prev => ({ ...prev, [question.id]: -1 }))}
                    onClick={() => {
                      setQuestionResponses(prev => ({
                        ...prev,
                        [question.id]: { ...prev[question.id], rating: star }
                      }));
                    }}
                  >
                    <Star
                      className={`w-12 h-12 transition-all duration-200 ${
                        star <= (hoverRatings[question.id] >= 0 ? hoverRatings[question.id] : (questionResponses[question.id]?.rating ?? 0))
                          ? "fill-yellow-400 text-yellow-400 scale-110"
                          : "text-gray-300 hover:text-yellow-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2 px-4">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
              
              {questionResponses[question.id]?.rating > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-yellow-800 font-semibold">
                    You rated: {questionResponses[question.id]?.rating}/5 stars
                  </p>
                  <div className="flex justify-center mt-2">
                    {Array.from({ length: questionResponses[question.id]?.rating }, (_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NPS Questions (0-10 scale) */}
          {question.questionType === 'nps' && (
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-4">
                How likely are you to recommend us? (0-10)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => {
                      setQuestionResponses(prev => ({
                        ...prev,
                        [question.id]: { ...prev[question.id], npsScore: score }
                      }));
                    }}
                    className={`w-12 h-12 text-lg font-bold rounded-full border-2 focus:outline-none transition-all duration-200 ${
                      questionResponses[question.id]?.npsScore === score
                        ? "bg-blue-600 text-white border-blue-600 scale-110"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:scale-105"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2 px-4">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
              
              {questionResponses[question.id]?.npsScore !== undefined && questionResponses[question.id]?.npsScore !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-blue-800 font-semibold">
                    You rated: {questionResponses[question.id]?.npsScore}/10
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rating Questions (0-10 scale) */}
          {question.questionType === 'rating' && (
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-4">
                Rate your experience (0-10)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => {
                      setQuestionResponses(prev => ({
                        ...prev,
                        [question.id]: { ...prev[question.id], rating: score }
                      }));
                    }}
                    className={`w-12 h-12 text-lg font-bold rounded-full border-2 focus:outline-none transition-all duration-200 ${
                      questionResponses[question.id]?.rating === score
                        ? "bg-green-600 text-white border-green-600 scale-110"
                        : "bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:scale-105"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2 px-4">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
              
              {questionResponses[question.id]?.rating !== undefined && questionResponses[question.id]?.rating !== null && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-green-800 font-semibold">
                    You rated: {questionResponses[question.id]?.rating}/10
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comments - only show if hasComments is true and not text-only */}
          {question.hasComments && question.questionType !== 'text' && (
            <div className="mt-8">
              <Label htmlFor={`comments-${question.id}`} className="text-lg font-semibold text-gray-700">
                Additional Comments (Optional)
              </Label>
              <Textarea
                id={`comments-${question.id}`}
                value={questionResponses[question.id]?.text || ''}
                onChange={(e) => {
                  setQuestionResponses(prev => ({
                    ...prev,
                    [question.id]: { ...prev[question.id], text: e.target.value }
                  }));
                }}
                placeholder="Share your thoughts about the food, service, atmosphere..."
                rows={4}
                className="mt-2 text-lg border-2 focus:border-purple-500 transition-colors"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0 overflow-hidden">
        {/* Header with Progress */}
        <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStepIcon()}
                <div>
                  <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
                  <div className="flex items-center space-x-2 text-indigo-100">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {restaurant?.name || 'Restaurant'}
                    </Badge>
                    {tableNumber && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">
                          Table {tableNumber}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{currentStep + 1}</div>
                <div className="text-sm text-indigo-200">of {totalSteps}</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-indigo-100">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-white/20" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-6 py-3"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              {currentStep === totalSteps - 1 ? (
                <Button
                  type="submit"
                  disabled={submitFeedbackMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-lg font-semibold"
                >
                  {submitFeedbackMutation.isPending ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedFromCurrentStep()}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center space-x-2 px-6 py-3"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}