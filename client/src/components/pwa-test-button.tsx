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
      // Check basic PWA requirements
      const hasManifest = !!document.querySelector('link[rel="manifest"]');
      const hasServiceWorker = 'serviceWorker' in navigator;
      const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
      const hasValidIcons = await checkIconsExist();
      
      // Get service worker registration status
      let swRegistered = false;
      if (hasServiceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        swRegistered = registrations.length > 0;
      }
      
      const pwaStatus = await pwaManager.getInstallationStatus();
      const detailedStatus = {
        ...pwaStatus,
        hasManifest,
        hasServiceWorker,
        isHttps,
        hasValidIcons,
        swRegistered,
        protocol: location.protocol,
        hostname: location.hostname
      };
      
      setStatus(detailedStatus);
      console.log('Detailed PWA Status:', detailedStatus);
      
      toast({
        title: "PWA Status Check",
        description: `Installable: ${pwaStatus.isInstallable ? 'Yes' : 'No'}, SW: ${swRegistered ? 'Yes' : 'No'}`,
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

  const checkIconsExist = async () => {
    try {
      const response = await fetch('/icons/icon-192x192.png');
      return response.ok;
    } catch {
      return false;
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

  const forceRegisterSW = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Unregister all existing service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        
        // Register new service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        
        console.log('Force SW Registration Success:', registration);
        toast({
          title: "Service Worker Registered",
          description: "Service worker has been force registered",
        });
        
        // Trigger PWA check after registration
        setTimeout(checkPWAStatus, 1000);
      } catch (error) {
        console.error('Force SW Registration Error:', error);
        toast({
          title: "Registration Failed",
          description: "Failed to register service worker",
          variant: "destructive",
        });
      }
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
        
        <Button onClick={forceRegisterSW} size="sm" variant="destructive" className="w-full">
          <AlertCircle className="h-4 w-4 mr-2" />
          Force Register SW
        </Button>
      </div>
      
      {status && (
        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 max-h-32 overflow-y-auto">
          <div>Installable: {status.isInstallable ? '✅' : '❌'}</div>
          <div>Installed: {status.isInstalled ? '✅' : '❌'}</div>
          <div>Manifest: {status.hasManifest ? '✅' : '❌'}</div>
          <div>Service Worker: {status.hasServiceWorker ? '✅' : '❌'}</div>
          <div>SW Registered: {status.swRegistered ? '✅' : '❌'}</div>
          <div>HTTPS: {status.isHttps ? '✅' : '❌'}</div>
          <div>Icons: {status.hasValidIcons ? '✅' : '❌'}</div>
          <div>Protocol: {status.protocol}</div>
          <div>Host: {status.hostname}</div>
          <div>Notifications: {status.notificationPermission}</div>
        </div>
      )}
    </div>
  );
}