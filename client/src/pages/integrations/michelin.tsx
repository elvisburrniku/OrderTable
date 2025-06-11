import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function MichelinIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActivated, setIsActivated] = useState(false);

  // Check if Michelin integration is enabled
  const { data: integrationConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/michelin`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Check user subscription status
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: [`/api/user-subscription`],
    enabled: !!user,
  });

  // Load current integration state
  useEffect(() => {
    if (integrationConfig && typeof integrationConfig === 'object' && 'isEnabled' in integrationConfig) {
      setIsActivated(integrationConfig.isEnabled === true);
    }
  }, [integrationConfig]);

  // Mutation to save integration settings
  const saveIntegrationMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/michelin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          isEnabled,
          configuration: {
            feePerGuest: 2.00,
            currency: 'EUR'
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save integration settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/michelin`]
      });
      toast({
        title: "Integration updated",
        description: "Michelin Guide integration settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveIntegrationMutation.mutate(isActivated);
  };

  const hasActiveSubscription = userSubscription && typeof userSubscription === 'object' && 'status' in userSubscription && userSubscription.status === 'active';
  const isEnterprisePlan = hasActiveSubscription && userSubscription && typeof userSubscription === 'object' && 'subscriptionPlan' in userSubscription && userSubscription.subscriptionPlan && typeof userSubscription.subscriptionPlan === 'object' && 'name' in userSubscription.subscriptionPlan && userSubscription.subscriptionPlan.name === 'Enterprise';

  if (!user || !tenant || !restaurant) {
    return <div>Loading...</div>;
  }

  if (configLoading || subscriptionLoading) {
    return <div>Loading integration settings...</div>;
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
            <h1 className="text-3xl font-bold text-gray-900">Michelin Guide</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-gray-700">Important:</CardTitle>
            </CardHeader>
            <CardContent className="bg-gray-50">
              <p className="text-gray-700 mb-4">
                If your restaurant is in the Michelin Guide, you can activate the integration so that guests can book via the Michelin Guide website.
              </p>
              <p className="text-gray-700 mb-4">
                After successful integration, your restaurant will appear on the Michelin Guide website within a week.
              </p>
              <p className="text-gray-700">
                <strong>Please note:</strong> By activating Michelin Guide integration, you acknowledge that there is a <span className="text-red-600">€2 fee per guest for bookings made via their website</span>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="activate-michelin" className="text-gray-700">Activate integration</label>
                  <div className="text-sm text-red-600 mt-1">
                    The subscription must be activated to enable the integration.{' '}
                    <button className="text-green-600 underline">
                      Activate subscription here
                    </button>
                  </div>
                </div>
                <Switch
                  id="activate-michelin"
                  checked={isActivated}
                  onCheckedChange={setIsActivated}
                  disabled={true}
                />
              </div>

              <Button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                Save
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}