import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { dynamicPWA, type PWAConfig } from '@/lib/dynamic-pwa';

interface UseDynamicPWAOptions {
  enableForRoute?: string;
  customConfig?: Partial<PWAConfig>;
  autoEnable?: boolean;
}

interface DynamicPWAState {
  isEnabled: boolean;
  canInstall: boolean;
  isInstalling: boolean;
  currentRoute: string | undefined;
  hasInstallPrompt: boolean;
}

export function useDynamicPWA(options: UseDynamicPWAOptions = {}) {
  const [location] = useLocation();
  const [state, setState] = useState<DynamicPWAState>({
    isEnabled: false,
    canInstall: false,
    isInstalling: false,
    currentRoute: undefined,
    hasInstallPrompt: false
  });

  const { enableForRoute, customConfig, autoEnable = true } = options;

  useEffect(() => {
    // Update PWA state
    const updateState = () => {
      const status = dynamicPWA.getCurrentPWAStatus();
      setState(prev => ({
        ...prev,
        isEnabled: status.isEnabled,
        currentRoute: status.currentRoute,
        hasInstallPrompt: status.hasInstallPrompt,
        canInstall: status.hasInstallPrompt && status.isEnabled
      }));
    };

    // Listen for PWA events
    const handleInstallAvailable = () => {
      setState(prev => ({ ...prev, canInstall: true, hasInstallPrompt: true }));
    };

    const handleInstallUnavailable = () => {
      setState(prev => ({ ...prev, canInstall: false, hasInstallPrompt: false }));
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-unavailable', handleInstallUnavailable);

    // Auto-enable PWA for specific routes
    if (autoEnable) {
      const routeConfigs = dynamicPWA.getRouteConfigs();
      const currentPath = location.replace(/\/$/, '') || '/';
      
      // Check if current route has a PWA config
      const matchingConfig = Object.entries(routeConfigs).find(([_, config]) => {
        const configPath = config.route.replace(/\/$/, '') || '/';
        return currentPath.includes(configPath) || configPath.includes(currentPath);
      });

      if (matchingConfig) {
        const [routeName, config] = matchingConfig;
        const finalConfig = customConfig ? { ...config, ...customConfig } : config;
        
        console.log(`Dynamic PWA: Auto-enabling for route ${routeName}`);
        dynamicPWA.enablePWAForRoute(finalConfig);
      } else {
        // Disable PWA if no matching route
        dynamicPWA.disablePWA();
      }
    } else if (enableForRoute && customConfig) {
      // Manual route configuration
      dynamicPWA.enablePWAForRoute({
        route: enableForRoute,
        name: customConfig.name || 'ReadyTable',
        shortName: customConfig.shortName || 'ReadyTable',
        ...customConfig
      } as PWAConfig);
    }

    updateState();

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-unavailable', handleInstallUnavailable);
    };
  }, [location, enableForRoute, customConfig, autoEnable]);

  const installPWA = async () => {
    setState(prev => ({ ...prev, isInstalling: true }));
    
    try {
      const success = await dynamicPWA.installCurrentPWA();
      if (success) {
        setState(prev => ({
          ...prev,
          canInstall: false,
          hasInstallPrompt: false,
          isInstalling: false
        }));
      } else {
        setState(prev => ({ ...prev, isInstalling: false }));
      }
      return success;
    } catch (error) {
      console.error('PWA installation failed:', error);
      setState(prev => ({ ...prev, isInstalling: false }));
      return false;
    }
  };

  const enablePWA = (config: PWAConfig) => {
    dynamicPWA.enablePWAForRoute(config);
    setState(prev => ({ ...prev, isEnabled: true, currentRoute: config.route }));
  };

  const disablePWA = () => {
    dynamicPWA.disablePWA();
    setState(prev => ({
      ...prev,
      isEnabled: false,
      canInstall: false,
      currentRoute: undefined,
      hasInstallPrompt: false
    }));
  };

  return {
    ...state,
    installPWA,
    enablePWA,
    disablePWA,
    routeConfigs: dynamicPWA.getRouteConfigs()
  };
}