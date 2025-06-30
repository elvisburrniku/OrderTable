import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Smartphone, Settings, Map } from 'lucide-react';
import { useDynamicPWA } from '@/hooks/use-dynamic-pwa';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export function DynamicPWADebug() {
  const [location] = useLocation();
  const { 
    isEnabled, 
    canInstall, 
    isInstalling, 
    currentRoute, 
    hasInstallPrompt,
    installPWA,
    enablePWA,
    disablePWA,
    routeConfigs 
  } = useDynamicPWA();
  
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const { toast } = useToast();

  const handleTestInstall = async () => {
    const success = await installPWA();
    toast({
      title: success ? "Install Successful" : "Install Failed",
      description: success ? "PWA installed successfully" : "PWA installation failed or was cancelled",
      variant: success ? "default" : "destructive"
    });
  };

  const handleEnableForRoute = () => {
    const config = Object.values(routeConfigs).find(c => c.route === selectedRoute);
    if (config) {
      enablePWA(config);
      toast({
        title: "PWA Enabled",
        description: `Enabled PWA for ${config.name}`,
      });
    }
  };

  const handleDisable = () => {
    disablePWA();
    toast({
      title: "PWA Disabled",
      description: "PWA has been disabled for current route",
    });
  };

  return (
    <Card className="fixed top-4 left-4 w-96 max-h-[80vh] overflow-y-auto z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          Dynamic PWA Debug
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              {isEnabled ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
              <span>PWA Enabled</span>
            </div>
            <div className="flex items-center gap-1">
              {canInstall ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
              <span>Can Install</span>
            </div>
            <div className="flex items-center gap-1">
              {hasInstallPrompt ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
              <span>Has Prompt</span>
            </div>
            <div className="flex items-center gap-1">
              <Map className="h-3 w-3 text-blue-500" />
              <span>Route: {location}</span>
            </div>
          </div>
          
          {currentRoute && (
            <Badge variant="secondary" className="text-xs">
              PWA Route: {currentRoute}
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleTestInstall}
              disabled={!canInstall || isInstalling}
              className="text-xs"
            >
              <Smartphone className="h-3 w-3 mr-1" />
              {isInstalling ? 'Installing...' : 'Test Install'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisable}
              disabled={!isEnabled}
              className="text-xs"
            >
              Disable PWA
            </Button>
          </div>
        </div>

        {/* Route Configurations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Routes</h4>
          <div className="space-y-1">
            {Object.entries(routeConfigs).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                <div>
                  <div className="font-medium">{config.shortName}</div>
                  <div className="text-gray-500">{config.route}</div>
                </div>
                <Button
                  size="sm"
                  variant={currentRoute === config.route ? "default" : "outline"}
                  onClick={() => {
                    setSelectedRoute(config.route);
                    enablePWA(config);
                  }}
                  className="text-xs px-2 py-1"
                >
                  {currentRoute === config.route ? 'Active' : 'Enable'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Route Enable */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Manual Override</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              placeholder="Enter route (e.g., /1/dashboard)"
              className="flex-1 px-2 py-1 text-xs border rounded"
            />
            <Button
              size="sm"
              onClick={handleEnableForRoute}
              disabled={!selectedRoute}
              className="text-xs"
            >
              Enable
            </Button>
          </div>
        </div>

        {/* Service Worker Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Service Worker</h4>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {navigator.serviceWorker ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Supported & Registered
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Not Supported
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}