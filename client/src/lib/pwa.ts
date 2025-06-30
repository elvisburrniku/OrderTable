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
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        this.serviceWorkerRegistration = registration;
        console.log('PWA: Service Worker registered successfully');
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.notifyUpdate();
              }
            });
          }
        });
        
        return registration;
      } catch (error) {
        console.error('PWA: Service Worker registration failed:', error);
      }
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallButton();
      console.log('PWA: App installed successfully');
    });
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
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
      return false;
    }
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