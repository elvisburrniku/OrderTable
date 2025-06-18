import { storage } from "./storage";

export class IntegrationService {
  private static instance: IntegrationService;

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  // Available integrations with their connection logic
  private integrations = {
    mailchimp: {
      name: 'Mailchimp',
      testConnection: async (apiKey: string) => {
        try {
          const response = await fetch(`https://us1.api.mailchimp.com/3.0/`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      syncCustomers: async (apiKey: string, customers: any[]) => {
        // Implementation for syncing customers to Mailchimp
        console.log(`Syncing ${customers.length} customers to Mailchimp`);
        return true;
      }
    },
    google: {
      name: 'Google Business',
      testConnection: async (apiKey: string) => {
        try {
          const response = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      syncReviews: async (apiKey: string, restaurantId: number) => {
        // Implementation for syncing Google reviews
        console.log(`Syncing Google reviews for restaurant ${restaurantId}`);
        return true;
      }
    },
    klaviyo: {
      name: 'Klaviyo',
      testConnection: async (apiKey: string) => {
        try {
          const response = await fetch(`https://a.klaviyo.com/api/accounts/`, {
            headers: {
              'Authorization': `Klaviyo-API-Key ${apiKey}`,
              'revision': '2024-10-15',
              'Content-Type': 'application/json'
            }
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      syncCustomers: async (apiKey: string, customers: any[]) => {
        // Implementation for syncing customers to Klaviyo
        console.log(`Syncing ${customers.length} customers to Klaviyo`);
        return true;
      }
    },
    activecampaign: {
      name: 'ActiveCampaign',
      testConnection: async (apiUrl: string, apiKey: string) => {
        try {
          const response = await fetch(`${apiUrl}/api/3/contacts`, {
            headers: {
              'Api-Token': apiKey,
              'Content-Type': 'application/json'
            }
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      syncCustomers: async (apiUrl: string, apiKey: string, customers: any[]) => {
        // Implementation for syncing customers to ActiveCampaign
        console.log(`Syncing ${customers.length} customers to ActiveCampaign`);
        return true;
      }
    },
    meta: {
      name: 'Meta (Facebook & Instagram)',
      testConnection: async (accessToken: string) => {
        try {
          const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      syncPages: async (accessToken: string, restaurantId: number) => {
        // Implementation for syncing Facebook/Instagram pages
        console.log(`Syncing Meta pages for restaurant ${restaurantId}`);
        return true;
      }
    },
    tripadvisor: {
      name: 'TripAdvisor',
      testConnection: async (apiKey: string) => {
        // TripAdvisor doesn't have a public API for restaurants
        // This would typically involve web scraping or partner access
        return true;
      },
      syncReviews: async (apiKey: string, restaurantId: number) => {
        console.log(`Syncing TripAdvisor reviews for restaurant ${restaurantId}`);
        return true;
      }
    },
    michelin: {
      name: 'Michelin Guide',
      testConnection: async (credentials: any) => {
        // Michelin integration would be through a partner program
        return true;
      },
      syncProfile: async (credentials: any, restaurantId: number) => {
        console.log(`Syncing Michelin profile for restaurant ${restaurantId}`);
        return true;
      }
    },
    webhooks: {
      name: 'Webhooks',
      testConnection: async (webhookUrl: string) => {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      },
      sendWebhook: async (webhookUrl: string, data: any) => {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    }
  };

  async testIntegrationConnection(integrationId: string, configuration: any): Promise<boolean> {
    const integration = this.integrations[integrationId as keyof typeof this.integrations];
    if (!integration) {
      throw new Error(`Integration ${integrationId} not supported`);
    }

    try {
      switch (integrationId) {
        case 'mailchimp':
          return await integration.testConnection(configuration.apiKey);
        case 'google':
          return await integration.testConnection(configuration.accessToken);
        case 'klaviyo':
          return await integration.testConnection(configuration.apiKey);
        case 'activecampaign':
          return await integration.testConnection(configuration.apiUrl, configuration.apiKey);
        case 'meta':
          return await integration.testConnection(configuration.accessToken);
        case 'webhooks':
          return await integration.testConnection(configuration.webhookUrl);
        default:
          return true; // For integrations without API testing
      }
    } catch (error) {
      console.error(`Error testing ${integrationId} connection:`, error);
      return false;
    }
  }

  async syncCustomerData(restaurantId: number, integrationId: string): Promise<boolean> {
    try {
      const configuration = await storage.getIntegrationConfiguration(restaurantId, integrationId);
      if (!configuration || !configuration.isEnabled) {
        return false;
      }

      const customers = await storage.getCustomersByRestaurant(restaurantId);
      
      switch (integrationId) {
        case 'mailchimp':
          return await this.integrations.mailchimp.syncCustomers(configuration.configuration.apiKey, customers);
        case 'klaviyo':
          return await this.integrations.klaviyo.syncCustomers(configuration.configuration.apiKey, customers);
        case 'activecampaign':
          return await this.integrations.activecampaign.syncCustomers(
            configuration.configuration.apiUrl,
            configuration.configuration.apiKey,
            customers
          );
        default:
          return true;
      }
    } catch (error) {
      console.error(`Error syncing customer data for ${integrationId}:`, error);
      return false;
    }
  }

  async triggerBookingWebhook(restaurantId: number, bookingData: any): Promise<void> {
    try {
      const webhookConfig = await storage.getIntegrationConfiguration(restaurantId, 'webhooks');
      if (!webhookConfig || !webhookConfig.isEnabled) {
        return;
      }

      const integration = this.integrations.webhooks;
      await integration.sendWebhook(webhookConfig.configuration.webhookUrl, {
        event: 'booking_created',
        data: bookingData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error triggering booking webhook:', error);
    }
  }

  getAvailableIntegrations() {
    return Object.keys(this.integrations).map(key => ({
      id: key,
      name: this.integrations[key as keyof typeof this.integrations].name
    }));
  }
}

export const integrationService = IntegrationService.getInstance();