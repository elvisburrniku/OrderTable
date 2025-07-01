import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle, Store, Calendar, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SurveyData {
  survey: {
    id: number;
    customerName: string;
    customerEmail: string;
    scheduledFor: string;
    deliveryMethod: string;
    status: string;
  };
  restaurant: {
    id: number;
    name: string;
    address?: string;
    phone?: string;
  };
  booking: {
    id: number;
    date: string;
    startTime: string;
    guestCount: number;
  };
}

export default function SurveyResponse() {
  const { token } = useParams<{ token: string }>();
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSurveyData = async () => {
      if (!token) {
        setError('Invalid survey link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/survey/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Survey not found');
        }

        const data = await response.json();
        setSurveyData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [token]);

  const submitSurvey = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/survey/${token}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit survey');
      }

      setSubmitted(true);
      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully",
      });
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : 'Failed to submit survey',
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading survey...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Survey Not Available</h2>
            <p className="text-gray-600">{error || 'This survey could not be found or has expired.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Your feedback has been submitted successfully. We appreciate your time and will use your input to improve our service.
            </p>
            <p className="text-sm text-gray-500">
              We look forward to welcoming you back to {surveyData.restaurant.name} soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Store className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">How was your experience?</h1>
          <p className="text-gray-600">Your feedback helps us provide better service</p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {surveyData.restaurant.name}
            </CardTitle>
            <CardDescription>
              Thank you for dining with us, {surveyData.survey.customerName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{formatDate(surveyData.booking.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{formatTime(surveyData.booking.startTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span>{surveyData.booking.guestCount} guests</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate Your Experience</CardTitle>
            <CardDescription>
              Please rate your overall experience from 1 to 5 stars
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    star <= rating
                      ? 'text-yellow-400 bg-yellow-50 border-2 border-yellow-200'
                      : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-50'
                  }`}
                >
                  <Star
                    className="w-8 h-8"
                    fill={star <= rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {rating === 1 && "We're sorry your experience wasn't great. Please let us know how we can improve."}
                  {rating === 2 && "We appreciate your feedback. How can we do better next time?"}
                  {rating === 3 && "Thank you for your feedback. What could we have done better?"}
                  {rating === 4 && "Great! We're glad you enjoyed your visit. Any suggestions for improvement?"}
                  {rating === 5 && "Excellent! We're thrilled you had a wonderful experience. Please share what made it special!"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="feedback" className="text-sm font-medium text-gray-700">
                Additional Comments (Optional)
              </label>
              <Textarea
                id="feedback"
                placeholder="Tell us about your experience... What did you enjoy? What could we improve?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <Button
              onClick={submitSurvey}
              disabled={rating === 0 || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Your feedback is anonymous and helps us improve our service for all guests.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}