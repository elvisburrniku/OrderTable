import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Check, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerFeedback() {
  const [match, params] = useRoute('/feedback/:tenantId/:restaurantId');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantId = params?.tenantId;
  const restaurantId = params?.restaurantId;
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get('table');

  // Get restaurant information
  const { data: restaurant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}`);
      if (!response.ok) throw new Error('Restaurant not found');
      return response.json();
    },
    enabled: !!tenantId && !!restaurantId
  });

  // Get table information if tableId is provided
  const { data: table } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables/${tableId}`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables/${tableId}`);
      if (!response.ok) throw new Error('Table not found');
      return response.json();
    },
    enabled: !!tenantId && !!restaurantId && !!tableId
  });

  // Get current bookings for this table to check if customer can leave feedback
  const { data: currentBookings } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/current`],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings?date=${today}&table=${tableId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!tenantId && !!restaurantId && !!tableId
  });

  // Check if feedback is allowed based on booking times
  const canLeaveFeedback = () => {
    if (!currentBookings || currentBookings.length === 0) {
      return { allowed: false, reason: 'No booking found for this table today' };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const booking of currentBookings) {
      const [startHour, startMinute] = booking.startTime.split(':').map(Number);
      const [endHour, endMinute] = booking.endTime.split(':').map(Number);
      
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      // Allow feedback during booking time or after booking has ended
      if (currentTime >= startTimeMinutes) {
        return { 
          allowed: true, 
          booking: booking,
          reason: currentTime >= endTimeMinutes ? 'Booking has ended' : 'Booking is active'
        };
      }
    }

    return { allowed: false, reason: 'Booking has not started yet' };
  };

  const feedbackStatus = canLeaveFeedback();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: {
      customerName: string;
      customerEmail: string;
      rating: number;
      comments: string;
      bookingId?: number;
    }) => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...feedbackData,
          tableId: tableId ? parseInt(tableId) : undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit feedback');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setFeedbackSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We appreciate your time.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/feedback`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim() || !customerEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and email address.",
        variant: "destructive"
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Missing Rating",
        description: "Please select a star rating.",
        variant: "destructive"
      });
      return;
    }

    submitFeedbackMutation.mutate({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      rating,
      comments: comments.trim(),
      bookingId: feedbackStatus.booking?.id
    });
  };

  if (!match) return null;

  if (feedbackSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center pt-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-gray-600">
              Your feedback has been submitted successfully. We appreciate your time and comments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Restaurant Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{restaurant?.name || 'Restaurant'}</CardTitle>
            {table && (
              <p className="text-gray-600">Table {table.tableNumber}</p>
            )}
          </CardHeader>
        </Card>

        {/* Feedback Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {feedbackStatus.allowed ? (
                <>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Feedback Available</p>
                    <p className="text-sm text-green-600">{feedbackStatus.reason}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-orange-800">Feedback Not Available</p>
                    <p className="text-sm text-orange-600">{feedbackStatus.reason}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Form */}
        {feedbackStatus.allowed ? (
          <Card>
            <CardHeader>
              <CardTitle>Leave Your Feedback</CardTitle>
              <p className="text-gray-600">
                We'd love to hear about your dining experience!
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="customerEmail">Your Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Star Rating */}
                <div>
                  <Label>Overall Rating *</Label>
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoverRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-sm text-gray-600">
                        {rating} out of 5 stars
                      </span>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={4}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitFeedbackMutation.isPending}
                >
                  {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center pt-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Feedback Not Available</h3>
              <p className="text-gray-600 mb-4">
                {feedbackStatus.reason}
              </p>
              <p className="text-sm text-gray-500">
                You can leave feedback during your booking time or after your visit has ended.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}