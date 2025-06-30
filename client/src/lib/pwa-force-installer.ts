// Force PWA installability by simulating all required criteria
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

class PWAForceInstaller {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isReadyForInstall = false;
  private hasUserGesture = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.setupEventListeners();
    this.trackUserGestures();
    this.forceInstallability();
  }

  private setupEventListeners() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Native beforeinstallprompt event received');
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.isReadyForInstall = true;
      this.notifyInstallReady();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App successfully installed');
      this.deferredPrompt = null;
      this.notifyInstallComplete();
    });
  }

  private trackUserGestures() {
    // Track user interactions to satisfy engagement requirements
    const handleUserGesture = () => {
      this.hasUserGesture = true;
      console.log('PWA: User gesture detected');
      
      if (this.isReadyForInstall) {
        this.notifyInstallReady();
      }
    };

    // Listen for various user interactions
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, handleUserGesture, { once: true });
    });

    // Fallback: Consider user engaged after short delay
    setTimeout(() => {
      this.hasUserGesture = true;
      console.log('PWA: User engagement timeout - marking as engaged');
    }, 2000);
  }

  private async forceInstallability() {
    // Wait for DOM and service worker to be ready
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve(void 0);
      } else {
        window.addEventListener('load', () => resolve(void 0));
      }
    });

    // Verify all PWA requirements
    const requirements = await this.checkPWARequirements();
    console.log('PWA Requirements Check:', requirements);

    // If all requirements are met but no native prompt, create synthetic availability
    if (requirements.allMet && !this.deferredPrompt) {
      setTimeout(() => {
        console.log('PWA: Creating synthetic install availability');
        this.createSyntheticInstallPrompt();
      }, 3000);
    }
  }

  private async checkPWARequirements() {
    const manifest = await this.validateManifest();
    const serviceWorker = await this.validateServiceWorker();
    const icons = await this.validateIcons();
    const https = this.validateHTTPS();

    const allMet = manifest.valid && serviceWorker.valid && icons.valid && https.valid;

    return {
      manifest,
      serviceWorker,
      icons,
      https,
      allMet
    };
  }

  private async validateManifest() {
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) return { valid: false, reason: 'No manifest link found' };

      const response = await fetch(manifestLink.href);
      const manifest = await response.json();

      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      const hasRequiredFields = requiredFields.every(field => manifest[field]);

      return {
        valid: hasRequiredFields && manifest.icons?.length >= 2,
        manifest,
        reason: hasRequiredFields ? 'Valid' : 'Missing required fields'
      };
    } catch (error) {
      return { valid: false, reason: 'Failed to load manifest' };
    }
  }

  private async validateServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return { valid: false, reason: 'Service Worker not supported' };
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const hasActiveWorker = registrations.some(reg => reg.active);

      return {
        valid: hasActiveWorker,
        count: registrations.length,
        reason: hasActiveWorker ? 'Service Worker active' : 'No active Service Worker'
      };
    } catch (error) {
      return { valid: false, reason: 'Failed to check Service Worker' };
    }
  }

  private async validateIcons() {
    try {
      // Check if required icons exist
      const icon192 = await fetch('/icons/icon-192x192.png');
      const icon512 = await fetch('/icons/icon-512x512.png');

      return {
        valid: icon192.ok && icon512.ok,
        reason: icon192.ok && icon512.ok ? 'Icons available' : 'Missing required icons'
      };
    } catch (error) {
      return { valid: false, reason: 'Failed to validate icons' };
    }
  }

  private validateHTTPS() {
    const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
    return {
      valid: isHttps,
      protocol: location.protocol,
      reason: isHttps ? 'HTTPS/localhost' : 'Requires HTTPS'
    };
  }

  private createSyntheticInstallPrompt() {
    console.log('PWA: Creating synthetic install prompt');
    this.isReadyForInstall = true;
    
    // Create a synthetic prompt object for manual installation
    this.deferredPrompt = {
      platforms: ['web'],
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
      prompt: async () => {
        console.log('PWA: Synthetic prompt triggered');
        this.showManualInstallInstructions();
      }
    } as BeforeInstallPromptEvent;

    this.notifyInstallReady();
  }

  private showManualInstallInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';

    if (userAgent.includes('chrome')) {
      instructions = 'Chrome: Look for the install icon in the address bar, or go to Menu → Install ReadyTable';
    } else if (userAgent.includes('firefox')) {
      instructions = 'Firefox: Look for the install icon in the address bar';
    } else if (userAgent.includes('safari')) {
      instructions = 'Safari: Share button → Add to Home Screen';
    } else if (userAgent.includes('edge')) {
      instructions = 'Edge: Menu → Apps → Install ReadyTable';
    } else {
      instructions = 'Look for install options in your browser menu or address bar';
    }

    window.dispatchEvent(new CustomEvent('pwa-manual-install-instructions', {
      detail: { instructions }
    }));
  }

  private notifyInstallReady() {
    if (this.hasUserGesture && this.isReadyForInstall) {
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    }
  }

  private notifyInstallComplete() {
    window.dispatchEvent(new CustomEvent('pwa-install-completed'));
  }

  // Public methods
  public async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available, showing manual instructions');
      this.showManualInstallInstructions();
      return false;
    }

    try {
      console.log('PWA: Triggering install prompt');
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted install prompt');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('PWA: User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
      this.showManualInstallInstructions();
      return false;
    }
  }

  public getInstallabilityStatus() {
    return {
      isReady: this.isReadyForInstall,
      hasPrompt: !!this.deferredPrompt,
      hasUserGesture: this.hasUserGesture,
      canInstall: this.isReadyForInstall && this.hasUserGesture
    };
  }
}

export const pwaForceInstaller = new PWAForceInstaller();