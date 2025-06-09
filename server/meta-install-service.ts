import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';

interface MetaInstallRequest {
  restaurantId: number;
  tenantId: number;
  restaurantName: string;
  callbackUrl: string;
}

interface MetaInstallLink {
  id: string;
  restaurantId: number;
  tenantId: number;
  restaurantName: string;
  callbackUrl: string;
  facebookAuthUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

class MetaInstallService {
  private installLinks: Map<string, MetaInstallLink> = new Map();

  /**
   * Generate a new Meta install link
   */
  async generateInstallLink(request: MetaInstallRequest): Promise<MetaInstallLink> {
    const linkId = uuidv4();
    const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';

    // Get Facebook credentials from database
    const metaConfig = await storage.getIntegrationConfiguration(request.restaurantId, 'meta');
    let facebookAppId = process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID';
    
    if (metaConfig && metaConfig.configuration) {
      const config = typeof metaConfig.configuration === 'string' 
        ? JSON.parse(metaConfig.configuration) 
        : metaConfig.configuration;
      
      if (config.facebookAppId) {
        facebookAppId = config.facebookAppId;
      }
    }

    // Facebook OAuth URL with proper scopes for restaurant management
    const facebookAuthUrl = this.buildFacebookAuthUrl(linkId, request.callbackUrl, facebookAppId);

    const installLink: MetaInstallLink = {
      id: linkId,
      restaurantId: request.restaurantId,
      tenantId: request.tenantId,
      restaurantName: request.restaurantName,
      callbackUrl: request.callbackUrl,
      facebookAuthUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    };

    // Store the install link temporarily
    this.installLinks.set(linkId, installLink);

    // Clean up expired links
    this.cleanupExpiredLinks();

    return installLink;
  }

  /**
   * Get install link by ID
   */
  getInstallLink(linkId: string): MetaInstallLink | null {
    const link = this.installLinks.get(linkId);
    
    if (!link) {
      return null;
    }

    // Check if link has expired
    if (link.expiresAt < new Date()) {
      this.installLinks.delete(linkId);
      return null;
    }

    return link;
  }

  /**
   * Build Facebook OAuth URL
   */
  private buildFacebookAuthUrl(linkId: string, callbackUrl: string, facebookAppId: string): string {
    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: callbackUrl,
      state: linkId,
      response_type: 'code',
      scope: [
        'pages_manage_posts',
        'pages_read_engagement', 
        'pages_show_list',
        'instagram_basic',
        'instagram_content_publish',
        'business_management'
      ].join(',')
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Handle Facebook OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const installLink = this.getInstallLink(state);
      
      if (!installLink) {
        return {
          success: false,
          error: 'Invalid or expired install link'
        };
      }

      // Get Facebook credentials from database for this restaurant
      const metaConfig = await storage.getIntegrationConfiguration(installLink.restaurantId, 'meta');
      let facebookAppId = process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID';
      let facebookAppSecret = process.env.FACEBOOK_APP_SECRET || '';
      
      if (metaConfig && metaConfig.configuration) {
        const config = typeof metaConfig.configuration === 'string' 
          ? JSON.parse(metaConfig.configuration) 
          : metaConfig.configuration;
        
        if (config.facebookAppId) {
          facebookAppId = config.facebookAppId;
        }
        if (config.facebookAppSecret) {
          facebookAppSecret = config.facebookAppSecret;
        }
      }

      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code, installLink.callbackUrl, facebookAppId, facebookAppSecret);
      
      if (!tokenResponse.success) {
        return {
          success: false,
          error: tokenResponse.error
        };
      }

      // Get user's pages
      const pagesResponse = await this.getUserPages(tokenResponse.data.access_token);
      
      if (!pagesResponse.success) {
        return {
          success: false,
          error: pagesResponse.error
        };
      }

      // Save integration configuration
      await storage.createOrUpdateIntegrationConfiguration(
        installLink.restaurantId,
        installLink.tenantId,
        'meta',
        true,
        {
          accessToken: tokenResponse.data.access_token,
          pages: pagesResponse.data.pages,
          userId: tokenResponse.data.user_id,
          connectedAt: new Date().toISOString()
        }
      );

      // Clean up used install link
      this.installLinks.delete(state);

      return {
        success: true,
        data: {
          restaurantId: installLink.restaurantId,
          tenantId: installLink.tenantId,
          pages: pagesResponse.data.pages
        }
      };

    } catch (error) {
      console.error('Error handling Meta callback:', error);
      return {
        success: false,
        error: 'Failed to process Meta integration'
      };
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string, redirectUri: string, facebookAppId: string, facebookAppSecret: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({
        client_id: facebookAppId,
        client_secret: facebookAppSecret,
        redirect_uri: redirectUri,
        code: code
      });

      const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to exchange code for token'
        };
      }

      return {
        success: true,
        data: {
          access_token: data.access_token,
          user_id: data.user_id || null
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Network error during token exchange'
      };
    }
  }

  /**
   * Get user's Facebook pages
   */
  private async getUserPages(accessToken: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
      );
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to fetch pages'
        };
      }

      return {
        success: true,
        data: {
          pages: data.data || []
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Network error during pages fetch'
      };
    }
  }

  /**
   * Clean up expired install links
   */
  private cleanupExpiredLinks(): void {
    const now = new Date();
    const entries = Array.from(this.installLinks.entries());
    for (const [linkId, link] of entries) {
      if (link.expiresAt < now) {
        this.installLinks.delete(linkId);
      }
    }
  }

  /**
   * Get install link URL that can be shared
   */
  getInstallLinkUrl(linkId: string): string {
    const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    return `${baseUrl}/api/meta-install-link/${linkId}`;
  }
}

export const metaInstallService = new MetaInstallService();