import { DatabaseStorage } from './db-storage';

interface RestaurantSettings {
  generalSettings?: any;
  bookingSettings?: any;
  notificationSettings?: any;
  emailSettings?: any;
}

export class SettingsIntegration {
  private storage: DatabaseStorage;

  constructor() {
    this.storage = new DatabaseStorage();
  }

  async getRestaurantSettings(restaurantId: number, tenantId: number): Promise<RestaurantSettings> {
    const restaurant = await this.storage.getRestaurantById(restaurantId, tenantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    return {
      generalSettings: restaurant.generalSettings,
      bookingSettings: restaurant.bookingSettings,
      notificationSettings: restaurant.notificationSettings,
      emailSettings: restaurant.emailSettings,
    };
  }

  // Booking validation based on settings
  async validateBookingRequest(restaurantId: number, tenantId: number, bookingData: any): Promise<{ valid: boolean; message?: string }> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    const bookingSettings = settings.bookingSettings;

    if (!bookingSettings) {
      return { valid: true };
    }

    // Check minimum notice requirement
    if (bookingSettings.minBookingNotice && bookingSettings.minBookingNotice > 0) {
      const bookingTime = new Date(bookingData.date + ' ' + bookingData.time);
      const now = new Date();
      const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilBooking < bookingSettings.minBookingNotice) {
        return { 
          valid: false, 
          message: `Booking requires at least ${bookingSettings.minBookingNotice} hours notice` 
        };
      }
    }

    // Check same-day booking restriction
    if (!bookingSettings.allowSameDayBookings) {
      const bookingDate = new Date(bookingData.date);
      const today = new Date();
      if (bookingDate.toDateString() === today.toDateString()) {
        return { 
          valid: false, 
          message: 'Same-day bookings are not allowed' 
        };
      }
    }

    // Check guest limits for online bookings
    if (bookingData.source === 'online' && bookingSettings.onlineBooking) {
      const guestCount = parseInt(bookingData.guests) || 1;
      
      if (guestCount < bookingSettings.onlineBooking.minGuests) {
        return { 
          valid: false, 
          message: `Minimum ${bookingSettings.onlineBooking.minGuests} guests required` 
        };
      }
      
      if (guestCount > bookingSettings.onlineBooking.maxGuests) {
        return { 
          valid: false, 
          message: `Maximum ${bookingSettings.onlineBooking.maxGuests} guests allowed` 
        };
      }
    }

    // Check maximum advance booking days
    if (settings.generalSettings?.maxAdvanceBookingDays) {
      const bookingDate = new Date(bookingData.date);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + settings.generalSettings.maxAdvanceBookingDays);
      
      if (bookingDate > maxDate) {
        return { 
          valid: false, 
          message: `Bookings can only be made up to ${settings.generalSettings.maxAdvanceBookingDays} days in advance` 
        };
      }
    }

    return { valid: true };
  }

  // Get booking duration based on settings
  async getBookingDuration(restaurantId: number, tenantId: number): Promise<number> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.defaultDuration || settings.generalSettings?.defaultBookingDuration || 120;
  }

  // Check if walk-ins are enabled
  async areWalkInsEnabled(restaurantId: number, tenantId: number): Promise<boolean> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.enableWalkIns !== false;
  }

  // Check if waiting list is enabled
  async isWaitingListEnabled(restaurantId: number, tenantId: number): Promise<boolean> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.enableWaitingList !== false;
  }

  // Check if auto-confirmation is enabled
  async shouldAutoConfirmBookings(restaurantId: number, tenantId: number): Promise<boolean> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.autoConfirmBookings === true;
  }

  // Check if deposit is required
  async isDepositRequired(restaurantId: number, tenantId: number, guestCount?: number): Promise<{ required: boolean; amount?: number }> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    
    if (settings.bookingSettings?.requireDeposit) {
      return {
        required: true,
        amount: settings.bookingSettings.depositAmount || 0
      };
    }

    // Check if deposit required for large groups
    if (settings.generalSettings?.paymentSettings?.requireDepositForLargeGroups && guestCount) {
      const threshold = settings.generalSettings.paymentSettings.largeGroupThreshold || 8;
      if (guestCount >= threshold) {
        return {
          required: true,
          amount: settings.bookingSettings?.depositAmount || 25 // Default deposit amount
        };
      }
    }

    return { required: false };
  }

  // Get cancellation policy
  async getCancellationPolicy(restaurantId: number, tenantId: number): Promise<string> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.cancellationNotice || 'none';
  }

  // Check if modifications are allowed
  async areModificationsAllowed(restaurantId: number, tenantId: number): Promise<boolean> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.allowCancellationAndChanges !== false;
  }

  // Get available time slots based on settings
  async getAvailableTimeSlots(restaurantId: number, tenantId: number, date: string): Promise<string[]> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    const interval = settings.bookingSettings?.onlineBooking?.interval || 15;
    
    // Generate time slots based on interval
    const slots: string[] = [];
    const startHour = 9; // Default start time
    const endHour = 22; // Default end time
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    
    return slots;
  }

  // Get contact method preference
  async getContactMethod(restaurantId: number, tenantId: number): Promise<string> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.bookingSettings?.contactMethod || 'phone';
  }

  // Check field visibility settings
  async getFieldVisibility(restaurantId: number, tenantId: number, bookingType: 'manual' | 'online'): Promise<any> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    const bookingSettings = settings.bookingSettings;
    
    if (!bookingSettings) {
      return {
        showCompanyName: false,
        showRoomNumber: false,
        showAgreedPrice: false,
        showPromoCode: false,
      };
    }
    
    return {
      showCompanyName: bookingSettings.showCompanyNameField?.[bookingType] || false,
      showRoomNumber: bookingSettings.showRoomNumberField?.[bookingType] || false,
      showAgreedPrice: bookingSettings.showAgreedPriceField || false,
      showPromoCode: bookingSettings.showPromoCodeField?.[bookingType] || false,
    };
  }

  // Get no-show grace period
  async getNoShowGracePeriod(restaurantId: number, tenantId: number): Promise<number> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.generalSettings?.operationalSettings?.noShowGracePeriod || 15;
  }

  // Get automatic table release time
  async getAutoTableReleaseTime(restaurantId: number, tenantId: number): Promise<number> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    return settings.generalSettings?.operationalSettings?.automaticTableRelease || 30;
  }

  // Check service options
  async getServiceOptions(restaurantId: number, tenantId: number): Promise<any> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    const serviceSettings = settings.generalSettings?.serviceSettings;
    
    return {
      tableService: serviceSettings?.enableTableService !== false,
      takeout: serviceSettings?.enableTakeout !== false,
      delivery: serviceSettings?.enableDelivery === true,
      deliveryRadius: serviceSettings?.deliveryRadius || 5,
      specialRequests: serviceSettings?.enableSpecialRequests !== false,
      maxSpecialRequestLength: serviceSettings?.maxSpecialRequestLength || 500,
    };
  }

  // Get payment settings
  async getPaymentSettings(restaurantId: number, tenantId: number): Promise<any> {
    const settings = await this.getRestaurantSettings(restaurantId, tenantId);
    const paymentSettings = settings.generalSettings?.paymentSettings;
    
    return {
      acceptCreditCards: paymentSettings?.acceptCreditCards !== false,
      acceptCash: paymentSettings?.acceptCash !== false,
      acceptDigitalPayments: paymentSettings?.acceptDigitalPayments !== false,
      refundPolicy: paymentSettings?.refundPolicy || 'full',
      cancellationPolicy: paymentSettings?.cancellationPolicy || '24h',
    };
  }
}

export const settingsIntegration = new SettingsIntegration();