import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';
import { useToast } from '@/hooks/use-toast';

export function PWATestButton() {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkPWAStatus = async () => {
    setIsLoading(true);
    try {
      const pwaStatus = await pwaManager.getInstallationStatus();
      setStatus(pwaStatus);
      console.log('PWA Status Check:', pwaStatus);
      
      toast({
        title: "PWA Status Check",
        description: `Installable: ${pwaStatus.isInstallable ? 'Yes' : 'No'}, Installed: ${pwaStatus.isInstalled ? 'Yes' : 'No'}`,
      });
    } catch (error) {
      console.error('PWA Status Check Error:', error);
      toast({
        title: "PWA Status Error",
        description: "Failed to check PWA status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forceInstallPrompt = () => {
    console.log('Forcing PWA install prompt');
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
    toast({
      title: "Install Prompt Triggered",
      description: "PWA install prompt should now appear",
    });
  };

  const testServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('Service Worker Registrations:', registrations);
        
        toast({
          title: "Service Worker Check",
          description: `Found ${registrations.length} registration(s)`,
        });
      } catch (error) {
        console.error('Service Worker Check Error:', error);
        toast({
          title: "Service Worker Error",
          description: "Failed to check service worker",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Service Worker Not Supported",
        description: "Your browser doesn't support service workers",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-sm">PWA Testing</h3>
      </div>
      
      <div className="space-y-2 mb-3">
        <Button onClick={checkPWAStatus} disabled={isLoading} size="sm" className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Check PWA Status
        </Button>
        
        <Button onClick={forceInstallPrompt} size="sm" variant="outline" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Force Install Prompt
        </Button>
        
        <Button onClick={testServiceWorker} size="sm" variant="outline" className="w-full">
          <AlertCircle className="h-4 w-4 mr-2" />
          Test Service Worker
        </Button>
      </div>
      
      {status && (
        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div>Installable: {status.isInstallable ? '✅' : '❌'}</div>
          <div>Installed: {status.isInstalled ? '✅' : '❌'}</div>
          <div>Service Worker: {status.hasServiceWorker ? '✅' : '❌'}</div>
          <div>Notifications: {status.notificationPermission}</div>
        </div>
      )}
    </div>
  );
}