import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

export default function ActiveCampaignIntegration() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [isActivated, setIsActivated] = useState(false);
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    console.log('Saving ActiveCampaign settings:', { isActivated, url, apiKey });
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
            <h1 className="text-3xl font-bold text-gray-900">ActiveCampaign</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-gray-700">Important:</CardTitle>
            </CardHeader>
            <CardContent className="bg-gray-50">
              <p className="text-gray-700 mb-4">Our integration currently supports sending the following customer informations to ActiveCampaign:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li>Email</li>
                <li>Name</li>
                <li>Phone</li>
                <li>ZipCode</li>
                <li>Restaurant name</li>
                <li>Number of bookings</li>
              </ul>
              <p className="text-gray-700 mb-4">
                If you would like to the fields <strong>ZipCode</strong>, <strong>Restaurant name</strong>, and/or <strong>Number of bookings</strong>, then it is required that the fields are created at ActiveCampaign before activating the integration.
              </p>
              <p className="text-gray-700 mb-4">
                Before the fields can be filled with data from easyTable, it is important that the fields are created with the following names in ActiveCampaign:
              </p>
              <div className="space-y-1 text-gray-700">
                <p>ZipCode: <strong>ZipCode</strong></p>
                <p>Restaurant name: <strong>Restaurant</strong></p>
                <p>Number of bookings: <strong>Bookings</strong></p>
              </div>
              <p className="text-gray-700 mt-4">
                To be able to enable the integration an account with ActiveCampaign is needed. Once logged in at ActiveCampaign the informations required to activate the integration can be found by opening Settings → Developer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ActiveCampaign settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="activate-integration">Activate integration</Label>
                <Switch
                  id="activate-integration"
                  checked={isActivated}
                  onCheckedChange={setIsActivated}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter ActiveCampaign URL"
                  className="bg-blue-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">Key</Label>
                <Input
                  id="api-key"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="bg-blue-50"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Label className="text-gray-600">Last synchronized</Label>
                <span className="text-gray-500">at</span>
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