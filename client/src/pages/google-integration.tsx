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
import { AlertCircle, CheckCircle, ExternalLink, Copy, Globe, MapPin, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

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

  const copyBookingUrl = () => {
    const bookingUrl = googleProfile?.bookingUrl;
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

  const validation = googleProfile?.validation || { isComplete: false, missingFields: [], warnings: [] };
  const isGoogleActive = googleProfile?.googleIntegrationStatus === 'active';

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
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                )}
                Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={isGoogleActive ? "default" : "secondary"} className="mb-2">
                    {isGoogleActive ? "Active" : "Inactive"}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    {isGoogleActive 
                      ? "Your restaurant can accept bookings from Google Search and Maps"
                      : "Complete your profile to activate Google booking"
                    }
                  </p>
                </div>
                {!isGoogleActive && validation?.isComplete && (
                  <Button 
                    onClick={() => activateGoogleMutation.mutate()}
                    disabled={activateGoogleMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {activateGoogleMutation.isPending ? "Activating..." : "Activate Reserve with Google"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Validation */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Data Validation</CardTitle>
              <p className="text-sm text-gray-600">
                Ensure your profile data is complete and matches your Google My Business account for proper matching.
              </p>
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
                          {validation.warnings.map((warning, index) => (
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking URL */}
          {googleProfile?.bookingUrl && (
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
                    value={googleProfile.bookingUrl} 
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
                    onClick={() => window.open(googleProfile.bookingUrl, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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