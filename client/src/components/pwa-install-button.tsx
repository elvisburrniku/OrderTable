import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';
import { useToast } from '@/hooks/use-toast';

export function PWAInstallButton() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PWA events
    const handleInstallAvailable = () => setShowInstallPrompt(true);
    const handleInstallCompleted = () => setShowInstallPrompt(false);
    const handleUpdateAvailable = () => setShowUpdatePrompt(true);

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    // Check initial state
    const checkInstallability = async () => {
      const status = await pwaManager.getInstallationStatus();
      if (status.isInstallable && !status.isInstalled) {
        setShowInstallPrompt(true);
      }
    };
    
    checkInstallability();

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaManager.installApp();
      if (success) {
        toast({
          title: "App Installed",
          description: "ReadyTable has been installed on your device",
        });
        setShowInstallPrompt(false);
      } else {
        toast({
          title: "Installation Cancelled",
          description: "App installation was cancelled",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: "Failed to install the app. Please try again.",
        variant: "destructive",
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