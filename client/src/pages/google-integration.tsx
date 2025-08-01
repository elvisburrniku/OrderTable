import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, ExternalLink, Copy, Globe, MapPin, Phone, Mail, AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Generate booking URL automatically
  const generateBookingUrl = () => {
    if (!tenant?.id || !restaurant?.id) return '';
    const currentDomain = window.location.origin;
    return `${currentDomain}/guest-booking/${tenant.id}/${restaurant.id}`;
  };

  const bookingUrl = generateBookingUrl();

  // Fetch Google profile data
  const { data: googleProfile, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/profile`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Activate Google integration mutation
  const activateGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to activate Google integration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/profile`]
      });
      toast({
        title: "Reserve with Google Activated",
        description: "Your restaurant can now accept bookings directly from Google Search and Maps.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate Google integration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-fill profile mutation
  const autoFillProfileMutation = useMutation({
    mutationFn: async () => {
      // Get current restaurant data to use as base
      const currentRestaurant = restaurant;
      if (!currentRestaurant) {
        throw new Error('Restaurant information not available');
      }

      // Build profile data from existing information or use enhanced defaults
      const profileData = {
        name: currentRestaurant.name || tenant?.name || "Restaurant Name",
        phone: currentRestaurant.phone || "+1-555-123-4567",
        email: currentRestaurant.email || user?.email || "info@restaurant.com",
        address: currentRestaurant.address || "123 Main Street, City, State 12345",
        description: currentRestaurant.description || "A wonderful restaurant offering delicious cuisine and exceptional service to our valued customers."
      };

      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update restaurant profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/google/profile`]
      });
      toast({
        title: "Profile Auto-Filled",
        description: "Restaurant profile has been updated with complete information for Google integration.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Fill Failed",
        description: error.message || "Failed to auto-fill profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyBookingUrl = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Booking URL copied to clipboard",
      });
    }
  };

  if (!user || !tenant || !restaurant) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Loading Google integration...</div>;
  }

  const validation = (googleProfile as any)?.validation || { isComplete: false, missingFields: [], warnings: [] };
  const integrationStatus = (googleProfile as any)?.googleIntegrationStatus || 'inactive';
  const isGoogleActive = integrationStatus === 'active';
  const isReadyToActivate = integrationStatus === 'ready_to_activate';
  const isPendingProfile = integrationStatus === 'pending_profile';
  const isIntegrationEnabled = (googleProfile as any)?.isIntegrationEnabled || false;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Globe className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Reserve with Google</h1>
          </div>
          <p className="text-gray-600">
            Allow guests to book directly from Google Search and Maps. Your account will be matched with Google based on your restaurant profile data.
          </p>
        </div>

        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {isGoogleActive ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : isReadyToActivate ? (
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                )}
                Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Badge 
                    variant={
                      isGoogleActive ? "default" : 
                      isReadyToActivate ? "outline" : 
                      "secondary"
                    } 
                    className={`mb-2 ${
                      isGoogleActive ? "bg-green-600" :
                      isReadyToActivate ? "border-blue-600 text-blue-600" :
                      ""
                    }`}
                  >
                    {isGoogleActive ? "Active" : 
                     isReadyToActivate ? "Ready to Activate" : 
                     isPendingProfile ? "Pending Profile" : 
                     "Inactive"}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    {isGoogleActive 
                      ? "Your restaurant can accept bookings from Google Search and Maps"
                      : isReadyToActivate
                      ? "Profile is complete - you can now activate Google booking"
                      : "Complete your profile to activate Google booking"
                    }
                  </p>
                </div>
                
                <Button 
                  onClick={() => activateGoogleMutation.mutate()}
                  disabled={
                    activateGoogleMutation.isPending || 
                    !validation?.isComplete || 
                    isGoogleActive
                  }
                  className={`${
                    isGoogleActive 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : isReadyToActivate
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400'
                  } ${(!validation?.isComplete || isGoogleActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {activateGoogleMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Activating...
                    </div>
                  ) : isGoogleActive ? (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Activated
                    </div>
                  ) : (
                    'Activate Reserve with Google'
                  )}
                </Button>
              </div>

              {!validation?.isComplete && validation?.missingFields?.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Complete your profile data to activate Google integration. Missing: {validation.missingFields.join(', ')}
                  </p>
                </div>
              )}

              {(isGoogleActive || isIntegrationEnabled) && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Reserve with Google is active. Customers can now book directly from Google Search and Maps.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Validation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Data Validation</CardTitle>
                  <p className="text-sm text-gray-600">
                    Ensure your profile data is complete and matches your Google My Business account for proper matching.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => autoFillProfileMutation.mutate()}
                  disabled={autoFillProfileMutation.isPending}
                  className="ml-4"
                >
                  {autoFillProfileMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Auto-Filling...
                    </div>
                  ) : (
                    'Auto-Fill Profile'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Restaurant Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Restaurant Name
                    </Label>
                    <Input 
                      value={(googleProfile as any)?.restaurant?.name || ''} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      Phone Number
                    </Label>
                    <Input 
                      value={(googleProfile as any)?.restaurant?.phone || ''} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Address
                    </Label>
                    <Input 
                      value={(googleProfile as any)?.restaurant?.address || ''} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Label>
                    <Input 
                      value={(googleProfile as any)?.restaurant?.email || ''} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Website
                    </Label>
                    <Input 
                      value={(googleProfile as any)?.restaurant?.website || ''} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={(googleProfile as any)?.restaurant?.description || ''} 
                      disabled 
                      className="bg-gray-50"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Validation Results */}
                <div className="mt-6">
                  {validation?.missingFields?.length > 0 && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Missing Required Fields:</strong> {validation.missingFields.join(', ')}
                        <br />
                        <span className="text-sm">Update your restaurant profile to complete these fields.</span>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation?.warnings?.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Recommendations:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                          {validation.warnings.map((warning: string, index: number) => (
                            <li key={index} className="text-sm">{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation?.isComplete && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Profile Complete:</strong> Your restaurant profile has all required information for Google matching.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!validation?.isComplete && validation?.missingFields?.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Complete Your Profile</h5>
                      <p className="text-sm text-blue-800 mb-3">
                        To enable Google "Reserve with Google" integration, your restaurant profile needs complete information. 
                        Use the "Auto-Fill Profile" button above to populate with sample data, or go to your restaurant settings to update manually.
                      </p>
                      <div className="text-xs text-blue-700">
                        <strong>Required:</strong> Restaurant Name, Address, Phone Number<br/>
                        <strong>Recommended:</strong> Email, Website, Description for better Google matching
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking URL - Always display automatically generated URL */}
          <Card>
            <CardHeader>
              <CardTitle>My Business Booking Link</CardTitle>
              <p className="text-sm text-gray-600">
                Share this link with your customers or use it in your marketing materials. Customers can book directly through this without needing to go through Google.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Input 
                  value={bookingUrl} 
                  disabled 
                  className="flex-1 text-sm"
                />
                <Button 
                  onClick={copyBookingUrl}
                  variant="outline"
                  size="sm"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button 
                  onClick={() => window.open(bookingUrl, '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  <p>
                    <strong>Profile Matching:</strong> Your account will be matched with Google based on the information in your restaurant profile. Ensure this information is accurate and consistent with your Google My Business account.
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  <p>
                    <strong>Activation Time:</strong> It can take a few days before the profiles are matched and the booking button appears on Google My Business.
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-600" />
                  <p>
                    <strong>Booking Limitations:</strong> Bookings that require prepayment or deposit cannot be booked through Reserve with Google.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}