import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X, CheckCircle } from 'lucide-react';
import { useDynamicPWA } from '@/hooks/use-dynamic-pwa';
import { useToast } from '@/hooks/use-toast';

interface DynamicPWAInstallProps {
  showOnlyWhenAvailable?: boolean;
  variant?: 'floating' | 'inline' | 'badge';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function DynamicPWAInstall({ 
  showOnlyWhenAvailable = true, 
  variant = 'floating',
  position = 'bottom-right' 
}: DynamicPWAInstallProps) {
  const { isEnabled, canInstall, isInstalling, currentRoute, installPWA } = useDynamicPWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [instructions, setInstructions] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (canInstall && isEnabled) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [canInstall, isEnabled]);

  useEffect(() => {
    const handleManualInstructions = (event: CustomEvent) => {
      setInstructions(event.detail.instructions);
      toast({
        title: "Install ReadyTable",
        description: event.detail.instructions,
        duration: 8000,
      });
    };

    window.addEventListener('pwa-manual-install-instructions', handleManualInstructions as EventListener);
    
    return () => {
      window.removeEventListener('pwa-manual-install-instructions', handleManualInstructions as EventListener);
    };
  }, [toast]);

  const handleInstall = async () => {
    try {
      const success = await installPWA();
      if (success) {
        toast({
          title: "App Installed",
          description: "ReadyTable has been installed successfully",
        });
        setShowPrompt(false);
      }
    } catch (error) {
      toast({
        title: "Installation Available",
        description: "Check your browser's address bar or menu for install options",
        variant: "default",
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show if PWA is not enabled for current route
  if (showOnlyWhenAvailable && (!isEnabled || !showPrompt)) {
    return null;
  }

  if (variant === 'badge') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-sm">
        <Smartphone className="h-4 w-4 text-blue-600" />
        <span className="text-blue-700 dark:text-blue-300">PWA Available</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleInstall}
          disabled={isInstalling}
          className="h-6 px-2 text-blue-600 hover:text-blue-700"
        >
          {isInstalling ? 'Installing...' : 'Install'}
        </Button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex-shrink-0">
          <Smartphone className="h-8 w-8 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Install ReadyTable
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Get quick access and offline functionality
          </p>
        </div>
        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          size="sm"
          className="flex-shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          {isInstalling ? 'Installing...' : 'Install'}
        </Button>
      </div>
    );
  }

  // Floating variant (default)
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-4 duration-300`}>
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
        Install this page as an app for quick access and offline functionality.
      </p>
      
      {currentRoute && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          PWA enabled for: {currentRoute}
        </p>
      )}
      
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
          Later
        </Button>
      </div>
      
      {instructions && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
          <CheckCircle className="h-3 w-3 inline mr-1" />
          {instructions}
        </div>
      )}
    </div>
  );
}