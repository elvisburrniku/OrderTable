import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function GoogleIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isActivated, setIsActivated] = useState(true);
  const [businessType, setBusinessType] = useState('Restaurant');
  const [bookingUrl, setBookingUrl] = useState('https://book.easytable.com/book?ref=mb&id=c22da&lang=en');

  // Fetch existing configuration
  const { data: config, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/google`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Load saved configuration on mount
  useEffect(() => {
    if (config) {
      setIsActivated(config.isEnabled || false);
      setBusinessType(config.configuration?.businessType || 'Restaurant');
      setBookingUrl(config.configuration?.bookingUrl || 'https://book.easytable.com/book?ref=mb&id=c22da&lang=en');
    }
  }, [config]);

  // Mutation to save configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save Google integration configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/google`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations`]
      });
      toast({
        title: "Google integration updated",
        description: "Your Google integration settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Google integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate({
      isEnabled: isActivated,
      configuration: {
        businessType,
        bookingUrl,
      }
    });
  };

  if (!user || !tenant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r min-h-screen">
        <div className="p-6">
          <div className="space-y-2">
            <a href={`/${tenant.id}/bookings`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Bookings</span>
            </a>
            <a href={`/${tenant.id}/tables`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Tables</span>
            </a>
            <a href={`/${tenant.id}/customers`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Customers</span>
            </a>
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              <span className="font-medium">Integrations</span>
            </div>
            <a href={`/${tenant.id}/statistics`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Statistics</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <a 
              href={`/${tenant.id}/integrations`}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Google</h1>
          </div>

          <Card className="mb-6">
            <CardContent className="bg-gray-50 pt-6">
              <p className="text-gray-700 mb-4">Allow guests to book directly from Google Search and Maps.</p>
              <div className="mb-4">
                <p className="font-semibold text-gray-700 mb-2">Important:</p>
                <p className="text-gray-700 mb-2">
                  Your account will be matched with Google based on the information entered under{' '}
                  <span className="text-blue-600 underline cursor-pointer">The place</span>. It is therefore important that this information is filled in correctly and is consistent with your{' '}
                  <span className="text-blue-600 underline cursor-pointer">Google My Business account</span>.
                </p>
                <p className="text-gray-700 mb-4">
                  It can take a few days before the profiles are matched and the booking button appears on Google My Business.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">NB!</p>
                    <p className="text-yellow-700">
                      Bookings that require <strong>prepayment</strong> or <strong>deposit</strong> cannot be booked through Reserve with Google.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Reserve with Google</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Type:</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Restaurant">Restaurant</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Spa">Spa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="activate-google">Activate Reserve with Google:</Label>
                <Switch
                  id="activate-google"
                  checked={isActivated}
                  onCheckedChange={setIsActivated}
                />
              </div>

              {isActivated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">NB:</p>
                      <p className="text-yellow-700 mb-2">
                        The following must be completed under "The place" before your account can be synced with Google:
                      </p>
                      <ul className="list-disc list-inside text-yellow-700">
                        <li>Full address</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                Save
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Business booking link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="booking-url">My Business booking URL:</Label>
                <Input
                  id="booking-url"
                  type="text"
                  value={bookingUrl}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}