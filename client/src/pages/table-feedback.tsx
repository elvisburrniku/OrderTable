import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Check, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: number;
  tenantId: number;
  tableId?: number;
  restaurantName?: string;
  tableNumber?: string;
}

export function FeedbackModal({ 
  isOpen, 
  onClose, 
  restaurantId, 
  tenantId, 
  tableId, 
  restaurantName,
  tableNumber 
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current bookings for this table to check if customer can leave feedback
  const { data: currentBookings } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings/current`, tableId],
    queryFn: async () => {
      if (!tableId) return [];
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings?date=${today}&table=${tableId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isOpen && !!tenantId && !!restaurantId && !!tableId
  });

  // Check if feedback is allowed based on booking times
  const canLeaveFeedback = () => {
    if (!currentBookings || currentBookings.length === 0) {
      return { 
        allowed: true, // Allow feedback even without booking for general experience
        reason: 'Share your dining experience'
      };
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
          reason: currentTime >= endTimeMinutes ? 'Thank you for dining with us!' : 'How is your experience so far?'
        };
      }
    }

    return { 
      allowed: true, // Still allow feedback for general experience
      reason: 'Share your experience with us'
    };
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
          tableId: tableId
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
      
      // Reset form after 3 seconds and close modal
      setTimeout(() => {
        setFeedbackSubmitted(false);
        setRating(0);
        setComments('');
        setCustomerName('');
        setCustomerEmail('');
        onClose();
      }, 3000);
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

  const resetForm = () => {
    setFeedbackSubmitted(false);
    setRating(0);
    setHoverRating(0);
    setComments('');
    setCustomerName('');
    setCustomerEmail('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (feedbackSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Thank You!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Feedback Submitted</h3>
            <p className="text-gray-600">
              Your feedback has been submitted successfully. We appreciate your time and comments.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Leave Your Feedback
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Restaurant Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">{restaurantName || 'Restaurant'}</h3>
                {tableNumber && (
                  <p className="text-sm text-gray-600">Table {tableNumber}</p>
                )}
                <p className="text-sm text-blue-700 mt-2">{feedbackStatus.reason}</p>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded hover:scale-110 transition-transform"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-200'
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
                className="resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitFeedbackMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Standalone feedback page component for direct QR code access
export default function TableFeedback() {
  const [match, params] = useRoute('/feedback/:tenantId/:restaurantId');
  const [showModal, setShowModal] = useState(false);
  
  const tenantId = params?.tenantId ? parseInt(params.tenantId) : undefined;
  const restaurantId = params?.restaurantId ? parseInt(params.restaurantId) : undefined;
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get('table') ? parseInt(urlParams.get('table')!) : undefined;

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

  // Auto-open modal when page loads
  useEffect(() => {
    if (match && restaurant) {
      setShowModal(true);
    }
  }, [match, restaurant]);

  if (!match) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Customer Feedback</h1>
        <p className="text-gray-600 mb-6">
          Welcome to {restaurant?.name || 'our restaurant'}! We'd love to hear about your experience.
        </p>
        <Button onClick={() => setShowModal(true)} size="lg">
          Leave Feedback
        </Button>
      </div>

      {tenantId && restaurantId && (
        <FeedbackModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          restaurantId={restaurantId}
          tenantId={tenantId}
          tableId={tableId}
          restaurantName={restaurant?.name}
          tableNumber={table?.tableNumber}
        />
      )}
    </div>
  );
}