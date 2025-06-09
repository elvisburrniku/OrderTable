import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MetaIntegration() {
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActivated, setIsActivated] = useState(false);
  const [installLink, setInstallLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [facebookAppId, setFacebookAppId] = useState('');
  const [facebookAppSecret, setFacebookAppSecret] = useState('');

  // Check if Meta integration is enabled
  const { data: integrationConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/meta`],
    enabled: !!(tenant?.id && restaurant?.id),
  });

  // Load current integration state
  useEffect(() => {
    if (integrationConfig && typeof integrationConfig === 'object' && 'isEnabled' in integrationConfig) {
      setIsActivated(integrationConfig.isEnabled === true);
      
      // Load Facebook credentials if they exist
      const config = (integrationConfig as any)?.configuration;
      if (config && typeof config === 'object') {
        setFacebookAppId(config.facebookAppId || '');
        setFacebookAppSecret(config.facebookAppSecret || '');
      }
    }
  }, [integrationConfig]);

  // Mutation to generate Meta install link
  const generateInstallLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/meta-install-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate install link');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setInstallLink(data.installUrl);
      toast({
        title: "Install link generated",
        description: "You can now share this link or use it to connect Facebook."
      });
    },
    onError: () => {
      toast({
        title: "Error generating install link",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  // Mutation to save integration settings
  const saveIntegrationMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const response = await fetch(`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/meta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          isEnabled,
          configuration: {
            restaurantName: restaurant?.name,
            restaurantAddress: restaurant?.address,
            restaurantPhone: restaurant?.phone,
            restaurantEmail: restaurant?.email,
            facebookAppId: facebookAppId,
            facebookAppSecret: facebookAppSecret,
            installLink: isEnabled ? installLink : null,
            connectedAt: isEnabled ? new Date().toISOString() : null
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
        queryKey: [`/api/tenants/${tenant?.id}/restaurants/${restaurant?.id}/integrations/meta`]
      });
      toast({
        title: "Integration updated",
        description: "Meta (Facebook & Instagram) integration settings have been saved successfully.",
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

  const handleCopyLink = () => {
    if (installLink) {
      navigator.clipboard.writeText(installLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Installation link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleActivationToggle = (checked: boolean) => {
    if (checked && (!facebookAppId || !facebookAppSecret)) {
      toast({
        title: "Missing credentials",
        description: "Please enter both Facebook App ID and App Secret before activating the integration.",
        variant: "destructive"
      });
      return;
    }
    
    setIsActivated(checked);
    
    if (checked) {
      // Generate install link when enabling
      generateInstallLinkMutation.mutate();
    } else {
      setInstallLink('');
    }
  };

  if (!user || !tenant || !restaurant) {
    return <div>Loading...</div>;
  }

  if (configLoading) {
    return <div>Loading integration settings...</div>;
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Settings</h2>
        <nav className="space-y-2">
          <a 
            href={`/${tenant.id}/integrations`}
            className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md"
          >
            All Integrations
          </a>
          <div className="flex items-center text-blue-600 px-3 py-2 rounded-md bg-blue-50">
            Meta (Facebook & Instagram)
          </div>
        </nav>
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
            <h1 className="text-3xl font-bold text-gray-900">Meta</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-gray-700 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
                Important:
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-gray-50">
              <p className="text-gray-700">
                META integration includes MozRest for both Facebook and Instagram. Once you've sent an activation 
                request here in our integration, you will receive an installation link that you must use to complete the 
                integration of Facebook and/or Instagram. Click the link and follow the installation process.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="facebook-app-id" className="text-gray-700 font-medium">
                    Facebook App ID
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Your Facebook App ID from developers.facebook.com
                  </p>
                  <Input
                    id="facebook-app-id"
                    type="text"
                    value={facebookAppId}
                    onChange={(e) => setFacebookAppId(e.target.value)}
                    placeholder="Enter your Facebook App ID"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="facebook-app-secret" className="text-gray-700 font-medium">
                    Facebook App Secret
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Your Facebook App Secret from developers.facebook.com
                  </p>
                  <Input
                    id="facebook-app-secret"
                    type="password"
                    value={facebookAppSecret}
                    onChange={(e) => setFacebookAppSecret(e.target.value)}
                    placeholder="Enter your Facebook App Secret"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="activate-meta" className="text-gray-700 font-medium">
                    Activate integration
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Enable Meta integration for {restaurant.name}
                  </p>
                  {(!facebookAppId || !facebookAppSecret) && (
                    <p className="text-sm text-red-600 mt-1">
                      Facebook App ID and App Secret are required to activate integration
                    </p>
                  )}
                </div>
                <Switch
                  id="activate-meta"
                  checked={isActivated}
                  onCheckedChange={handleActivationToggle}
                  disabled={saveIntegrationMutation.isPending || !facebookAppId || !facebookAppSecret}
                />
              </div>

              {isActivated && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  {installLink ? (
                    <div>
                      <Label htmlFor="install-link" className="text-gray-700 font-medium">
                        fb_installlink
                      </Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          id="install-link"
                          value={installLink}
                          readOnly
                          className="flex-1 bg-white"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCopyLink}
                          className="shrink-0"
                        >
                          {copied ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? '' : 'Copy!'}
                        </Button>
                      </div>
                      
                      <Alert className="border-blue-200 bg-blue-50 mt-4">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          Use this installation link to complete the Meta integration process. 
                          This link includes your restaurant profile information: <strong>{restaurant.name}</strong>
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">Generate a new installation link to connect Facebook and Instagram.</p>
                      <Button 
                        onClick={() => generateInstallLinkMutation.mutate()}
                        disabled={generateInstallLinkMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {generateInstallLinkMutation.isPending ? 'Generating...' : 'Generate Install Link'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!isActivated && (
                <Alert className="border-gray-200 bg-gray-50">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <AlertDescription className="text-gray-700">
                    Enable the integration above to generate your Meta installation link.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
                disabled={saveIntegrationMutation.isPending}
              >
                {saveIntegrationMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}