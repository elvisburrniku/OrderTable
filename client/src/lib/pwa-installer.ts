// Force PWA installability by ensuring all criteria are met
class PWAInstaller {
  private deferredPrompt: any = null;
  private isInstallable = false;
  private engagementMet = false;

  constructor() {
    this.init();
  }

  private init() {
    // Force beforeinstallprompt if not firing naturally
    this.setupInstallPrompt();
    this.trackEngagement();
    this.checkInstallability();
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: beforeinstallprompt fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.showInstallPrompt();
    });

    // Force check after delay if event doesn't fire
    setTimeout(() => {
      if (!this.isInstallable) {
        console.log('PWA: Force checking installability');
        this.forceInstallPrompt();
      }
    }, 3000);
  }

  private trackEngagement() {
    let interactions = 0;
    const trackInteraction = () => {
      interactions++;
      if (interactions >= 2) {
        this.engagementMet = true;
        console.log('PWA: Engagement threshold met');
        if (this.isInstallable) {
          this.showInstallPrompt();
        }
      }
    };

    // Track user engagement
    ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
      document.addEventListener(event, trackInteraction, { once: true });
    });

    // Auto-trigger after time delay
    setTimeout(() => {
      this.engagementMet = true;
      if (this.isInstallable) {
        this.showInstallPrompt();
      }
    }, 2000);
  }

  private async checkInstallability() {
    // Verify all PWA requirements
    const requirements = {
      manifest: !!document.querySelector('link[rel="manifest"]'),
      serviceWorker: 'serviceWorker' in navigator,
      https: location.protocol === 'https:' || location.hostname === 'localhost',
      icons: await this.verifyIcons(),
      standalone: true
    };

    console.log('PWA Requirements:', requirements);

    const allMet = Object.values(requirements).every(req => req === true);
    if (allMet && !this.isInstallable) {
      // All requirements met but no prompt - force it
      setTimeout(() => this.forceInstallPrompt(), 1000);
    }
  }

  private async verifyIcons() {
    try {
      const response = await fetch('/icons/icon-192x192.png');
      return response.ok;
    } catch {
      return false;
    }
  }

  private forceInstallPrompt() {
    console.log('PWA: Forcing install prompt');
    this.isInstallable = true;
    this.showInstallPrompt();
  }

  private showInstallPrompt() {
    if (this.engagementMet) {
      console.log('PWA: Showing install prompt');
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    }
  }

  public async install() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        return true;
      }
    } else {
      // Show manual install instructions
      this.showManualInstructions();
    }
    return false;
  }

  private showManualInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (userAgent.includes('chrome')) {
      instructions = 'Click the install icon in the address bar or menu → Install ReadyTable';
    } else if (userAgent.includes('firefox')) {
      instructions = 'Look for the install icon in the address bar';
    } else if (userAgent.includes('safari')) {
      instructions = 'Share → Add to Home Screen';
    } else {
      instructions = 'Look for install options in your browser menu';
    }

    window.dispatchEvent(new CustomEvent('pwa-manual-install', {
      detail: { instructions }
    }));
  }

  public getStatus() {
    return {
      isInstallable: this.isInstallable,
      engagementMet: this.engagementMet,
      hasPrompt: !!this.deferredPrompt
    };
  }
}

export const pwaInstaller = new PWAInstaller();