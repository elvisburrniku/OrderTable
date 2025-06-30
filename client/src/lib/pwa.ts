// PWA Installation and Management
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup install prompt listeners
    this.setupInstallPrompt();
    
    // Check if already installed
    this.checkIfInstalled();
    
    // Setup app update listener
    this.setupUpdateListener();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // First, unregister any existing service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        
        // Register new service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        this.serviceWorkerRegistration = registration;
        console.log('PWA: Service Worker registered successfully', registration);
        
        // Force activation
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.notifyUpdate();
              }
            });
          }
        });
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('PWA: Service Worker is ready');
        
        return registration;
      } catch (error) {
        console.error('PWA: Service Worker registration failed:', error);
        throw error;
      }
    }
  }

  private setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA: appinstalled event fired');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallButton();
    });
    
    // Fallback: Check periodically if PWA criteria are met
    setTimeout(() => {
      if (!this.deferredPrompt && !this.isInstalled) {
        console.log('PWA: No beforeinstallprompt event detected, checking manually');
        this.checkManualInstallability();
      }
    }, 2000);
  }

  private checkIfInstalled() {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
    
    // Check if running as PWA on iOS
    if ((navigator as any).standalone === true) {
      this.isInstalled = true;
    }
  }

  private setupUpdateListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker has taken control
        window.location.reload();
      });
    }
  }

  private async checkManualInstallability() {
    // Check if all PWA criteria are met manually
    const hasManifest = document.querySelector('link[rel="manifest"]');
    const hasServiceWorker = 'serviceWorker' in navigator;
    const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
    
    console.log('PWA Manual Check:', {
      hasManifest: !!hasManifest,
      hasServiceWorker,
      isHttps,
      isInstalled: this.isInstalled
    });
    
    if (hasManifest && hasServiceWorker && isHttps && !this.isInstalled) {
      console.log('PWA: Manual installability check passed, showing install button');
      this.showInstallButton();
    }
  }

  private showInstallButton() {
    // Dispatch custom event to show install button
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }

  private hideInstallButton() {
    // Dispatch custom event to hide install button
    window.dispatchEvent(new CustomEvent('pwa-install-completed'));
  }

  private notifyUpdate() {
    // Dispatch custom event for app update
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  // Public methods
  public async installApp(): Promise<boolean> {
    console.log('PWA: Install app requested');
    
    if (this.deferredPrompt) {
      try {
        console.log('PWA: Using native install prompt');
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          this.deferredPrompt = null;
          console.log('PWA: User accepted install prompt');
          return true;
        }
        
        console.log('PWA: User dismissed install prompt');
        return false;
      } catch (error) {
        console.error('PWA: Install prompt failed:', error);
        return false;
      }
    } else {
      // Fallback: Show manual install instructions
      console.log('PWA: No native install prompt, showing manual instructions');
      this.showManualInstallInstructions();
      return false;
    }
  }

  private showManualInstallInstructions() {
    const userAgent = navigator.userAgent;
    let instructions = '';
    
    if (userAgent.includes('Chrome')) {
      instructions = 'Click the menu (⋮) in Chrome and select "Install ReadyTable"';
    } else if (userAgent.includes('Firefox')) {
      instructions = 'Look for the install icon in the address bar';
    } else if (userAgent.includes('Safari')) {
      instructions = 'Tap the share button and select "Add to Home Screen"';
    } else {
      instructions = 'Look for install options in your browser menu';
    }
    
    // Dispatch event with instructions
    window.dispatchEvent(new CustomEvent('pwa-manual-install', { 
      detail: { instructions } 
    }));
  }

  public async updateApp(): Promise<void> {
    if (this.serviceWorkerRegistration?.waiting) {
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  public isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  public async getInstallationStatus(): Promise<{
    isInstallable: boolean;
    isInstalled: boolean;
    hasServiceWorker: boolean;
    notificationPermission: NotificationPermission;
  }> {
    return {
      isInstallable: this.isInstallable(),
      isInstalled: this.isAppInstalled(),
      hasServiceWorker: 'serviceWorker' in navigator,
      notificationPermission: 'Notification' in window ? Notification.permission : 'default'
    };
  }
}

// Global PWA manager instance
export const pwaManager = new PWAManager();