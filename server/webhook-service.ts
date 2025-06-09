import type { IStorage } from "./storage";

export class WebhookService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Send webhook notifications for booking events
   */
  async sendWebhookNotification(
    restaurantId: number,
    eventType: 'booking.created' | 'booking.updated' | 'booking.deleted',
    bookingData: any
  ) {
    try {
      // First, check if webhook integration is enabled for this restaurant
      const webhookConfig = await this.storage.getIntegrationConfiguration(restaurantId, 'webhooks');
      
      if (!webhookConfig || !webhookConfig.isEnabled) {
        console.log(`Webhook integration is disabled for restaurant ${restaurantId}`);
        return;
      }

      // Get configured webhooks for this restaurant
      const webhooks = await this.storage.getWebhooksByRestaurant(restaurantId);
      
      if (!webhooks || webhooks.length === 0) {
        console.log(`No webhooks configured for restaurant ${restaurantId}`);
        return;
      }

      // Filter webhooks that match the event type
      const matchingWebhooks = webhooks.filter((webhook: any) => webhook.event === eventType);
      
      if (matchingWebhooks.length === 0) {
        console.log(`No webhooks configured for event ${eventType} in restaurant ${restaurantId}`);
        return;
      }

      // Prepare webhook payload
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: bookingData,
        restaurant_id: restaurantId
      };

      // Send webhook to each configured URL
      const webhookPromises = matchingWebhooks.map(async (webhook: any) => {
        try {
          console.log(`Sending webhook ${eventType} to ${webhook.url} for restaurant ${restaurantId}`);
          
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'EasyTable-Webhook/1.0'
            },
            body: JSON.stringify(payload),
            // Set a reasonable timeout
            signal: AbortSignal.timeout(10000) // 10 seconds
          });

          if (!response.ok) {
            console.error(`Webhook failed for ${webhook.url}: ${response.status} ${response.statusText}`);
          } else {
            console.log(`Webhook sent successfully to ${webhook.url}`);
          }
        } catch (error) {
          console.error(`Error sending webhook to ${webhook.url}:`, error);
        }
      });

      // Execute all webhook calls concurrently
      await Promise.allSettled(webhookPromises);
      
    } catch (error) {
      console.error('Error in webhook service:', error);
    }
  }

  /**
   * Send booking created webhook
   */
  async notifyBookingCreated(restaurantId: number, booking: any) {
    await this.sendWebhookNotification(restaurantId, 'booking.created', booking);
  }

  /**
   * Send booking updated webhook
   */
  async notifyBookingUpdated(restaurantId: number, booking: any) {
    await this.sendWebhookNotification(restaurantId, 'booking.updated', booking);
  }

  /**
   * Send booking deleted webhook
   */
  async notifyBookingDeleted(restaurantId: number, booking: any) {
    await this.sendWebhookNotification(restaurantId, 'booking.deleted', booking);
  }
}