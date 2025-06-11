import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function TripAdvisorIntegration() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [isActivated, setIsActivated] = useState(false);

  const handleSave = () => {
    console.log('Saving TripAdvisor integration settings:', { isActivated });
  };

  if (!user || !tenant) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <a 
              href={`/${tenant.id}/integrations`}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Tripadvisor</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-gray-700">Important:</CardTitle>
            </CardHeader>
            <CardContent className="bg-gray-50">
              <p className="text-gray-700 mb-4">
                If you have an account for your venue on TripAdvisor, you can use our integration to activate it and make it a bookable venue on TripAdvisor.
              </p>
              <p className="text-gray-700 mb-4">
                Activating the integration will send a request to MozRest who will independently evaluate your request. Once their evaluation is complete your venue will be bookable on TripAdvisor.
              </p>
              <p className="text-gray-700">
                <strong>Please note:</strong> By activating TripAdvisor integration, you acknowledge that there is a <span className="text-red-600">€1 fee per guest for bookings made via their website</span>.
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
                  <label htmlFor="activate-tripadvisor" className="text-gray-700">Activate integration</label>
                  <div className="text-sm text-red-600 mt-1">
                    The subscription must be activated to enable the integration.{' '}
                    <button className="text-green-600 underline">
                      Activate subscription here
                    </button>
                  </div>
                </div>
                <Switch
                  id="activate-tripadvisor"
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
    </DashboardLayout>
  );
}