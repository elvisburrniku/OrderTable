import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';
import { pwaInstaller } from '@/lib/pwa-installer';
import { pwaForceInstaller } from '@/lib/pwa-force-installer';
import { useToast } from '@/hooks/use-toast';

export function PWAInstallButton() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PWA events
    const handleInstallAvailable = () => {
      console.log('PWA install available event received');
      setShowInstallPrompt(true);
    };
    const handleInstallCompleted = () => {
      console.log('PWA install completed event received');
      setShowInstallPrompt(false);
    };
    const handleUpdateAvailable = () => {
      console.log('PWA update available event received');
      setShowUpdatePrompt(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    // Check initial state
    const checkInstallability = async () => {
      const status = await pwaManager.getInstallationStatus();
      console.log('PWA installation status:', status);
      if (status.isInstallable && !status.isInstalled) {
        console.log('PWA is installable, showing prompt');
        setShowInstallPrompt(true);
      } else {
        console.log('PWA not installable or already installed');
      }
    };
    
    checkInstallability();

    // For testing: Show install button after 3 seconds if not already shown
    const testTimer = setTimeout(() => {
      if (!showInstallPrompt) {
        console.log('Force showing PWA install prompt for testing');
        setShowInstallPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      clearTimeout(testTimer);
    };
  }, [showInstallPrompt]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaForceInstaller.installApp();
      if (success) {
        toast({
          title: "App Installed",
          description: "ReadyTable has been installed on your device",
        });
        setShowInstallPrompt(false);
      } else {
        toast({
          title: "Installation Available",
          description: "Check your browser's address bar or menu for install options",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Install error:', error);
      toast({
        title: "Installation Available",
        description: "Look for the install icon in your browser menu or address bar",
        variant: "default",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await pwaManager.updateApp();
      toast({
        title: "App Updated",
        description: "ReadyTable has been updated to the latest version",
      });
      setShowUpdatePrompt(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update the app. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  const handleDismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  if (showUpdatePrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm">App Update Available</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissUpdate}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          A new version of ReadyTable is available. Update now for the latest features and improvements.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleUpdate} size="sm" className="flex-1">
            Update Now
          </Button>
          <Button variant="outline" onClick={handleDismissUpdate} size="sm">
            Later
          </Button>
        </div>
      </div>
    );
  }

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-sm">Install ReadyTable</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Install ReadyTable on your device for quick access and offline functionality.
      </p>
      <div className="flex gap-2">
        <Button 
          onClick={handleInstall} 
          disabled={isInstalling}
          size="sm"
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          {isInstalling ? 'Installing...' : 'Install App'}
        </Button>
        <Button variant="outline" onClick={handleDismiss} size="sm">
          Not Now
        </Button>
      </div>
    </div>
  );
}