import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function KlaviyoIntegration() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [isActivated, setIsActivated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [lastSynchronized, setLastSynchronized] = useState('Not synchronized yet');

  const handleSave = () => {
    console.log('Saving Klaviyo settings:', { isActivated, apiKey, selectedList });
  };

  const handleGetLists = () => {
    console.log('Getting Klaviyo lists...');
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
            <h1 className="text-3xl font-bold text-gray-900">Klaviyo</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-gray-700">Important:</CardTitle>
            </CardHeader>
            <CardContent className="bg-gray-50">
              <p className="text-gray-700 mb-4">Our integration currently supports sending the following customer information to Klaviyo:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
                <li>Email</li>
                <li>Name</li>
                <li>Phone number</li>
                <li>Number of bookings</li>
                <li>Latest booking</li>
              </ul>
              <p className="text-gray-700 mb-4">To activate the integration with Klaviyo, you must:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                <li>Create an account with Klaviyo via their website: <a href="#" className="text-blue-600 underline">klaviyo.com</a></li>
                <li>Once logged into your account, go to the <strong>API Key section</strong> in the Settings area by clicking on your user in the bottom left corner and navigating to <strong>Settings</strong>.</li>
                <li>When on the Settings page, click on <strong>API Keys</strong>.</li>
                <li>In "Default opt-in settings" choose <strong>Single opt-in and click Save</strong> in the top right corner of that box. If this setting is left on Double opt-in, every email will be asked by Klaviyo to confirm their subscription.</li>
                <li>Now in the "Private API Keys" click on <strong>Create Private API key</strong>. You must at least give the key Read/Write Access on Lists, Profiles, and Subscriptions before creating it.</li>
              </ol>
              <p className="text-gray-700 mb-4">
                Finally you need to <strong>activate SMS subscribers on your Klaviyo account</strong>.
              </p>
              <p className="text-gray-700">
                We recommend following <a href="#" className="text-blue-600 underline">Klaviyo own guide</a> on how to activate and set up SMS.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Klaviyo settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="activate-klaviyo">Activate Klaviyo</Label>
                <Switch
                  id="activate-klaviyo"
                  checked={isActivated}
                  onCheckedChange={setIsActivated}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="bg-blue-50"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleGetLists}
                  variant="outline"
                  className="bg-blue-50"
                >
                  Get lists
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="klaviyo-list">Klaviyo list:</Label>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list1">Choose list</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-4">
                <Label className="text-gray-600">Last synchronized</Label>
                <span className="text-gray-500">{lastSynchronized}</span>
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