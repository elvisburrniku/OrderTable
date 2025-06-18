import { storage } from "./storage-config";

export class GoogleBusinessService {
  private static instance: GoogleBusinessService;

  public static getInstance(): GoogleBusinessService {
    if (!GoogleBusinessService.instance) {
      GoogleBusinessService.instance = new GoogleBusinessService();
    }
    return GoogleBusinessService.instance;
  }

  // Generate Reserve with Google configuration
  async generateReserveWithGoogleConfig(restaurantId: number, tenantId: number) {
    try {
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Get restaurant profile data
      const businessInfo = {
        name: restaurant.name,
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        email: restaurant.email || '',
        description: restaurant.description || ''
      };

      // Generate booking URL for Google integration
      const bookingUrl = `${process.env.FRONTEND_URL || 'https://yourapp.replit.app'}/${tenantId}/book/${restaurantId}`;
      
      // Get operating hours
      const openingHours = await storage.getOpeningHours(restaurantId);
      const formattedHours = this.formatOpeningHoursForGoogle(openingHours);

      // Get available services/tables
      const tables = await storage.getTablesByRestaurant(restaurantId);
      const services = tables.map(table => ({
        serviceId: `table_${table.id}`,
        serviceName: `Table ${table.tableNumber} (${table.capacity} guests)`,
        capacity: table.capacity,
        duration: 120, // Default 2 hours
        price: {
          currencyCode: 'USD',
          units: 0 // Free booking
        }
      }));

      return {
        businessInfo,
        bookingUrl,
        operatingHours: formattedHours,
        services,
        policies: {
          cancellationPolicy: "Cancellations must be made at least 2 hours in advance",
          depositRequired: false,
          prepaymentRequired: false
        }
      };
    } catch (error) {
      console.error('Error generating Reserve with Google config:', error);
      throw error;
    }
  }

  // Format opening hours for Google Business API
  private formatOpeningHoursForGoogle(openingHours: any[]) {
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    return openingHours.map(hour => ({
      day: daysOfWeek[hour.dayOfWeek],
      isOpen: hour.isOpen,
      openTime: hour.isOpen ? hour.openTime : null,
      closeTime: hour.isOpen ? hour.closeTime : null
    }));
  }

  // Validate Google My Business profile data
  async validateBusinessProfile(restaurantId: number) {
    const restaurant = await storage.getRestaurantById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const validationResults = {
      isValid: true,
      missingFields: [] as string[],
      warnings: [] as string[]
    };

    // Required fields for Google My Business matching
    const requiredFields = {
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone
    };

    // Check for missing required fields
    Object.entries(requiredFields).forEach(([field, value]) => {
      if (!value || value.trim() === '') {
        validationResults.missingFields.push(field);
        validationResults.isValid = false;
      }
    });

    // Check for recommended fields
    const recommendedFields = {
      website: restaurant.website,
      email: restaurant.email,
      description: restaurant.description
    };

    Object.entries(recommendedFields).forEach(([field, value]) => {
      if (!value || value.trim() === '') {
        validationResults.warnings.push(`${field} is recommended for better profile matching`);
      }
    });

    return validationResults;
  }

  // Generate My Business booking link
  generateBookingLink(restaurantId: number, tenantId: number) {
    const baseUrl = process.env.FRONTEND_URL || 'https://yourapp.replit.app';
    return `${baseUrl}/${tenantId}/book/${restaurantId}?source=google`;
  }

  // Handle Google booking webhook
  async handleGoogleBooking(bookingData: any) {
    try {
      // Extract booking information from Google's webhook payload
      const {
        merchantId,
        serviceId,
        startTime,
        endTime,
        partySize,
        customer
      } = bookingData;

      // Parse service ID to get restaurant and table info
      const [, tableIdStr] = serviceId.split('_');
      const tableId = parseInt(tableIdStr);

      // Find restaurant by merchant ID (would need to be stored in restaurant profile)
      const restaurants = await storage.getAllRestaurants();
      const restaurant = restaurants.find(r => r.googleMerchantId === merchantId);
      
      if (!restaurant) {
        throw new Error('Restaurant not found for Google merchant ID');
      }

      // Create booking from Google data
      const booking = {
        restaurantId: restaurant.id,
        tenantId: restaurant.tenantId,
        tableId: tableId,
        customerName: customer.displayName,
        customerEmail: customer.email,
        customerPhone: customer.phoneNumber,
        guestCount: partySize,
        bookingDate: new Date(startTime).toISOString().split('T')[0],
        startTime: new Date(startTime).toTimeString().slice(0, 5),
        endTime: new Date(endTime).toTimeString().slice(0, 5),
        status: 'confirmed',
        source: 'google',
        notes: 'Booking made through Reserve with Google'
      };

      const createdBooking = await storage.createBooking(booking);
      
      // Send confirmation email
      const emailService = require('./brevo-service').emailService;
      if (emailService) {
        await emailService.sendBookingConfirmation(
          customer.email,
          customer.displayName,
          {
            ...createdBooking,
            restaurantName: restaurant.name,
            restaurantAddress: restaurant.address,
            restaurantPhone: restaurant.phone
          }
        );
      }

      return createdBooking;
    } catch (error) {
      console.error('Error handling Google booking:', error);
      throw error;
    }
  }

  // Update restaurant profile for Google matching
  async updateRestaurantForGoogle(restaurantId: number, profileData: any) {
    try {
      await storage.updateRestaurant(restaurantId, {
        name: profileData.name,
        address: profileData.address,
        phone: profileData.phone,
        website: profileData.website,
        email: profileData.email,
        description: profileData.description,
        googleMerchantId: profileData.googleMerchantId
      });

      return true;
    } catch (error) {
      console.error('Error updating restaurant profile:', error);
      throw error;
    }
  }
}

export const googleBusinessService = GoogleBusinessService.getInstance();