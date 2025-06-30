// Dynamic PWA implementation for specific routes/screens
interface PWAManifestData {
  short_name: string;
  name: string;
  description?: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  shortcuts?: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{
      src: string;
      sizes: string;
    }>;
  }>;
}

interface PWAConfig {
  route: string;
  name: string;
  shortName: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  shortcuts?: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{
      src: string;
      sizes: string;
    }>;
  }>;
}

class DynamicPWAManager {
  private currentManifest: PWAManifestData | null = null;
  private manifestLink: HTMLLinkElement | null = null;
  private serviceWorkerRegistered = false;
  private deferredPrompt: any = null;

  constructor() {
    this.init();
  }

  private init() {
    // Register service worker once globally
    this.registerServiceWorker();
    
    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('Dynamic PWA: Install prompt captured');
    });
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator && !this.serviceWorkerRegistered) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Dynamic PWA: Service Worker registered', registration);
        this.serviceWorkerRegistered = true;
      } catch (error) {
        console.error('Dynamic PWA: Service Worker registration failed', error);
      }
    }
  }

  // Enable PWA for specific route
  public enablePWAForRoute(config: PWAConfig) {
    console.log(`Dynamic PWA: Enabling PWA for route ${config.route}`);
    
    // Create manifest data
    const manifestData: PWAManifestData = {
      short_name: config.shortName,
      name: config.name,
      description: config.description || `${config.name} - Restaurant Management`,
      start_url: config.route,
      display: 'standalone',
      theme_color: config.themeColor || '#1f2937',
      background_color: config.backgroundColor || '#ffffff',
      icons: config.icons || this.getDefaultIcons(),
      shortcuts: config.shortcuts
    };

    this.updateManifest(manifestData);
    this.currentManifest = manifestData;
    
    // Dispatch event to show install prompt if available
    setTimeout(() => {
      if (this.deferredPrompt) {
        window.dispatchEvent(new CustomEvent('pwa-install-available'));
      }
    }, 1000);
  }

  // Disable PWA (remove manifest)
  public disablePWA() {
    console.log('Dynamic PWA: Disabling PWA');
    
    if (this.manifestLink) {
      this.manifestLink.remove();
      this.manifestLink = null;
    }
    this.currentManifest = null;
    
    // Hide install prompt
    window.dispatchEvent(new CustomEvent('pwa-install-unavailable'));
  }

  private updateManifest(manifestData: PWAManifestData) {
    // Remove existing manifest link
    if (this.manifestLink) {
      this.manifestLink.remove();
    }

    // Create new manifest blob
    const manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], {
      type: 'application/json'
    });
    const manifestURL = URL.createObjectURL(manifestBlob);

    // Create new manifest link
    this.manifestLink = document.createElement('link');
    this.manifestLink.rel = 'manifest';
    this.manifestLink.href = manifestURL;
    this.manifestLink.id = 'dynamic-manifest';
    
    // Add to head
    document.head.appendChild(this.manifestLink);
    
    console.log('Dynamic PWA: Manifest updated', manifestData);
  }

  private getDefaultIcons() {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    return [
      {
        src: `${baseUrl}/icons/icon-72x72.png`,
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-96x96.png`,
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-128x128.png`,
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-144x144.png`,
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-152x152.png`,
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-384x384.png`,
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${baseUrl}/icons/icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: `${baseUrl}/icons/icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ];
  }

  // Get predefined PWA configurations for different routes
  public getRouteConfigs(): Record<string, PWAConfig> {
    const tenantId = this.getCurrentTenantId();
    const baseUrl = tenantId ? `/${tenantId}` : '';

    return {
      dashboard: {
        route: `${baseUrl}/dashboard`,
        name: 'ReadyTable Dashboard',
        shortName: 'Dashboard',
        description: 'Restaurant dashboard for managing bookings and operations',
        themeColor: '#3b82f6',
        shortcuts: [
          {
            name: 'Bookings',
            short_name: 'Bookings',
            description: 'View restaurant bookings',
            url: `${baseUrl}/bookings`,
            icons: [{ src: '/icons/bookings-shortcut.png', sizes: '96x96' }]
          },
          {
            name: 'Tables',
            short_name: 'Tables',
            description: 'Manage restaurant tables',
            url: `${baseUrl}/tables`,
            icons: [{ src: '/icons/dashboard-shortcut.png', sizes: '96x96' }]
          }
        ]
      },
      bookings: {
        route: `${baseUrl}/bookings`,
        name: 'ReadyTable Bookings',
        shortName: 'Bookings',
        description: 'Manage restaurant reservations and bookings',
        themeColor: '#10b981',
        shortcuts: [
          {
            name: 'New Booking',
            short_name: 'New Booking',
            description: 'Create new booking',
            url: `${baseUrl}/bookings?action=new`,
            icons: [{ src: '/icons/bookings-shortcut.png', sizes: '96x96' }]
          },
          {
            name: 'Calendar',
            short_name: 'Calendar',
            description: 'View booking calendar',
            url: `${baseUrl}/bookings?view=calendar`,
            icons: [{ src: '/icons/dashboard-shortcut.png', sizes: '96x96' }]
          }
        ]
      },
      kitchen: {
        route: `${baseUrl}/kitchen`,
        name: 'ReadyTable Kitchen',
        shortName: 'Kitchen',
        description: 'Kitchen order management and tracking',
        themeColor: '#f59e0b',
        shortcuts: [
          {
            name: 'Orders',
            short_name: 'Orders',
            description: 'View active orders',
            url: `${baseUrl}/kitchen`,
            icons: [{ src: '/icons/kitchen-shortcut.png', sizes: '96x96' }]
          },
          {
            name: 'Kitchen Dashboard',
            short_name: 'Kitchen Dash',
            description: 'Kitchen dashboard',
            url: `${baseUrl}/kitchen-dashboard`,
            icons: [{ src: '/icons/kitchen-shortcut.png', sizes: '96x96' }]
          }
        ]
      },
      floorPlan: {
        route: `${baseUrl}/floor-plan`,
        name: 'ReadyTable Floor Plan',
        shortName: 'Floor Plan',
        description: 'Interactive restaurant floor plan designer',
        themeColor: '#8b5cf6'
      },
      menu: {
        route: `${baseUrl}/menu`,
        name: 'ReadyTable Menu',
        shortName: 'Menu',
        description: 'Restaurant menu management',
        themeColor: '#ef4444'
      }
    };
  }

  private getCurrentTenantId(): string | null {
    const path = window.location.pathname;
    const match = path.match(/^\/(\d+)/);
    return match ? match[1] : null;
  }

  // Install PWA for current route
  public async installCurrentPWA(): Promise<boolean> {
    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('Dynamic PWA: User accepted install prompt');
          this.deferredPrompt = null;
          return true;
        } else {
          console.log('Dynamic PWA: User dismissed install prompt');
          return false;
        }
      } catch (error) {
        console.error('Dynamic PWA: Install prompt failed', error);
        return false;
      }
    } else {
      console.log('Dynamic PWA: No install prompt available');
      this.showManualInstallInstructions();
      return false;
    }
  }

  private showManualInstallInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (userAgent.includes('chrome')) {
      instructions = 'Chrome: Look for the install icon in the address bar, or Menu → Install ReadyTable';
    } else if (userAgent.includes('firefox')) {
      instructions = 'Firefox: Look for the install icon in the address bar';
    } else if (userAgent.includes('safari')) {
      instructions = 'Safari: Share → Add to Home Screen';
    } else if (userAgent.includes('edge')) {
      instructions = 'Edge: Menu → Apps → Install ReadyTable';
    } else {
      instructions = 'Look for install options in your browser menu or address bar';
    }

    window.dispatchEvent(new CustomEvent('pwa-manual-install-instructions', {
      detail: { instructions }
    }));
  }

  // Get current PWA status
  public getCurrentPWAStatus() {
    return {
      isEnabled: !!this.currentManifest,
      currentRoute: this.currentManifest?.start_url,
      hasInstallPrompt: !!this.deferredPrompt,
      serviceWorkerRegistered: this.serviceWorkerRegistered
    };
  }
}

// Export singleton instance
export const dynamicPWA = new DynamicPWAManager();
export type { PWAConfig };