import type { IStorage } from "./storage";

export class MetaIntegrationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Send booking notifications to Facebook/Instagram when Meta integration is enabled
   */
  async notifyBookingCreated(restaurantId: number, bookingData: any) {
    try {
      // Check if Meta integration is enabled
      const metaConfig = await this.storage.getIntegrationConfiguration(restaurantId, 'meta');
      
      if (!metaConfig || !metaConfig.isEnabled) {
        console.log(`Meta integration is disabled for restaurant ${restaurantId}`);
        return;
      }

      // Get restaurant profile data for the integration
      const restaurant = await this.storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        console.log(`Restaurant ${restaurantId} not found`);
        return;
      }

      // Prepare Facebook/Instagram post data
      const postData = {
        message: this.generateBookingPost(bookingData, restaurant),
        restaurant_profile: {
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          email: restaurant.email
        },
        booking_info: {
          customer_name: bookingData.customerName,
          guest_count: bookingData.guestCount,
          booking_date: bookingData.bookingDate,
          booking_time: bookingData.startTime
        }
      };

      // Send to Facebook/Instagram API (when credentials are configured)
      if (metaConfig.configuration?.accessToken) {
        await this.postToFacebook(metaConfig.configuration.accessToken, postData);
      }

      console.log(`Meta integration notification sent for restaurant ${restaurantId}`);
      
    } catch (error) {
      console.error('Error in Meta integration service:', error);
    }
  }

  /**
   * Generate a social media post for new bookings
   */
  private generateBookingPost(bookingData: any, restaurant: any): string {
    const date = new Date(bookingData.bookingDate).toLocaleDateString();
    return `🎉 New reservation at ${restaurant.name}! 
📅 ${date} at ${bookingData.startTime}
👥 Party of ${bookingData.guestCount}
📍 ${restaurant.address}
📞 ${restaurant.phone}

#Reservation #${restaurant.name.replace(/\s+/g, '')} #Restaurant`;
  }

  /**
   * Post to Facebook API
   */
  private async postToFacebook(accessToken: string, postData: any) {
    try {
      const response = await fetch('https://graph.facebook.com/v18.0/me/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: postData.message,
          // Include restaurant profile data for enhanced posts
          place: {
            name: postData.restaurant_profile.name,
            location: {
              street: postData.restaurant_profile.address
            }
          }
        }),
      });

      if (!response.ok) {
        console.error(`Facebook API error: ${response.status} ${response.statusText}`);
      } else {
        console.log('Successfully posted to Facebook');
      }
    } catch (error) {
      console.error('Error posting to Facebook:', error);
    }
  }

  /**
   * Handle Meta integration callback after installation
   */
  async handleMetaCallback(restaurantId: number, tenantId: number, callbackData: any) {
    try {
      // Update integration configuration with received tokens
      await this.storage.createOrUpdateIntegrationConfiguration(
        restaurantId,
        tenantId,
        'meta',
        true,
        {
          accessToken: callbackData.access_token,
          pageId: callbackData.page_id,
          instagramId: callbackData.instagram_id,
          connectedAt: new Date().toISOString(),
          permissions: callbackData.permissions || []
        }
      );

      console.log(`Meta integration callback processed for restaurant ${restaurantId}`);
      return { success: true, message: 'Meta integration completed successfully' };
      
    } catch (error) {
      console.error('Error processing Meta callback:', error);
      return { success: false, message: 'Failed to complete Meta integration' };
    }
  }

  /**
   * Validate Meta integration status
   */
  async validateMetaIntegration(restaurantId: number): Promise<boolean> {
    try {
      const metaConfig = await this.storage.getIntegrationConfiguration(restaurantId, 'meta');
      
      if (!metaConfig || !metaConfig.isEnabled) {
        return false;
      }

      // Check if access token is still valid
      if (metaConfig.configuration?.accessToken) {
        const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${metaConfig.configuration.accessToken}`);
        return response.ok;
      }

      return false;
    } catch (error) {
      console.error('Error validating Meta integration:', error);
      return false;
    }
  }
}