import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, Clock, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConsultationBookingFormProps {
  children: React.ReactNode;
}

export function ConsultationBookingForm({ children }: ConsultationBookingFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    restaurantName: '',
    currentChallenges: '',
    preferredTime: '',
    timeZone: ''
  });

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM', 
    '11:00 AM - 12:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  const timeZones = [
    'Eastern Time (ET)',
    'Central Time (CT)', 
    'Mountain Time (MT)',
    'Pacific Time (PT)',
    'UTC'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Consultation Scheduled!",
        description: "We'll send you a calendar invite and confirmation email shortly.",
      });
      
      setIsOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        restaurantName: '',
        currentChallenges: '',
        preferredTime: '',
        timeZone: ''
      });
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Your Free Consultation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What to Expect:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 30-minute personalized consultation</li>
              <li>• Restaurant operations assessment</li>
              <li>• Custom Enterprise features demo</li>
              <li>• Implementation roadmap</li>
              <li>• Special launch pricing discussion</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  value={formData.restaurantName}
                  onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                  placeholder="Your restaurant name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferredTime">Preferred Time Slot *</Label>
                <Select
                  value={formData.preferredTime}
                  onValueChange={(value) => handleInputChange('preferredTime', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="timeZone">Time Zone *</Label>
                <Select
                  value={formData.timeZone}
                  onValueChange={(value) => handleInputChange('timeZone', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="currentChallenges">Current Restaurant Challenges</Label>
              <Textarea
                id="currentChallenges"
                value={formData.currentChallenges}
                onChange={(e) => handleInputChange('currentChallenges', e.target.value)}
                placeholder="Tell us about your main operational challenges, goals, or questions..."
                rows={3}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Clock className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">Next Steps:</p>
                  <p>After booking, you'll receive a calendar invite and pre-consultation questionnaire to make the most of our time together.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule Consultation'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}