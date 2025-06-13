import { google } from 'googleapis';
import type { IStorage } from './storage';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface OpeningHoursEvent {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  restaurantId: number;
  tenantId: number;
}

export class GoogleCalendarService {
  private storage: IStorage;
  private calendar: any;
  private auth: any;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      // Initialize Google OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials if refresh token is available
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          access_token: process.env.GOOGLE_ACCESS_TOKEN
        });
      }

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      console.log('Google Calendar service initialized');
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
    }
  }

  async syncOpeningHours(restaurantId: number, tenantId: number): Promise<void> {
    try {
      if (!this.isConfigured()) {
        console.log('Google Calendar not configured - skipping sync');
        return;
      }

      console.log(`Syncing opening hours for restaurant ${restaurantId}`);

      // Get opening hours from database
      const openingHours = await this.storage.getOpeningHoursByRestaurant(restaurantId);
      
      // Get restaurant details
      const restaurant = await this.storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        console.error(`Restaurant ${restaurantId} not found`);
        return;
      }

      // Create calendar events for each day's opening hours
      for (const hours of openingHours) {
        if (hours.isOpen) {
          await this.createOrUpdateOpeningHoursEvent(restaurant, hours);
        } else {
          await this.createClosedDayEvent(restaurant, hours);
        }
      }

      console.log(`Opening hours sync completed for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error syncing opening hours:', error);
    }
  }

  async syncSpecialPeriods(restaurantId: number): Promise<void> {
    try {
      if (!this.isConfigured()) {
        console.log('Google Calendar not configured - skipping special periods sync');
        return;
      }

      console.log(`Syncing special periods for restaurant ${restaurantId}`);

      // Get special periods from database
      const specialPeriods = await this.storage.getSpecialPeriodsByRestaurant(restaurantId);
      
      // Get restaurant details
      const restaurant = await this.storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        console.error(`Restaurant ${restaurantId} not found`);
        return;
      }

      // Create calendar events for each special period
      for (const period of specialPeriods) {
        await this.createSpecialPeriodEvent(restaurant, period);
      }

      console.log(`Special periods sync completed for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error syncing special periods:', error);
    }
  }

  async syncCutOffTimes(restaurantId: number): Promise<void> {
    try {
      if (!this.isConfigured()) {
        console.log('Google Calendar not configured - skipping cut-off times sync');
        return;
      }

      console.log(`Syncing cut-off times for restaurant ${restaurantId}`);

      // Get cut-off times from database
      const cutOffTimes = await this.storage.getCutOffTimesByRestaurant(restaurantId);
      
      // Get restaurant details
      const restaurant = await this.storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        console.error(`Restaurant ${restaurantId} not found`);
        return;
      }

      // Create calendar reminders for cut-off times
      for (const cutOff of cutOffTimes) {
        await this.createCutOffTimeReminder(restaurant, cutOff);
      }

      console.log(`Cut-off times sync completed for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error syncing cut-off times:', error);
    }
  }

  private async createOrUpdateOpeningHoursEvent(restaurant: any, hours: any): Promise<void> {
    try {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[hours.dayOfWeek];

      const event: CalendarEvent = {
        summary: `${restaurant.name} - Open`,
        description: `Restaurant opening hours: ${hours.openTime} - ${hours.closeTime}`,
        start: {
          dateTime: this.createRecurringDateTime(hours.dayOfWeek, hours.openTime),
          timeZone: 'UTC'
        },
        end: {
          dateTime: this.createRecurringDateTime(hours.dayOfWeek, hours.closeTime),
          timeZone: 'UTC'
        },
        recurrence: [
          `RRULE:FREQ=WEEKLY;BYDAY=${this.getDayCode(hours.dayOfWeek)}`
        ],
        status: 'confirmed'
      };

      // Check if event already exists
      const existingEventId = await this.findExistingOpeningHoursEvent(restaurant.id, hours.dayOfWeek);
      
      if (existingEventId) {
        // Update existing event
        await this.calendar.events.update({
          calendarId: 'primary',
          eventId: existingEventId,
          requestBody: event
        });
        console.log(`Updated opening hours event for ${dayName}`);
      } else {
        // Create new event
        const response = await this.calendar.events.insert({
          calendarId: 'primary',
          requestBody: event
        });
        console.log(`Created opening hours event for ${dayName}:`, response.data.id);
      }
    } catch (error) {
      console.error('Error creating/updating opening hours event:', error);
    }
  }

  private async createClosedDayEvent(restaurant: any, hours: any): Promise<void> {
    try {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[hours.dayOfWeek];

      const event: CalendarEvent = {
        summary: `${restaurant.name} - CLOSED`,
        description: `Restaurant is closed on ${dayName}s`,
        start: {
          date: this.getNextOccurrence(hours.dayOfWeek)
        },
        end: {
          date: this.getNextOccurrence(hours.dayOfWeek)
        },
        recurrence: [
          `RRULE:FREQ=WEEKLY;BYDAY=${this.getDayCode(hours.dayOfWeek)}`
        ],
        status: 'confirmed'
      };

      // Check if event already exists
      const existingEventId = await this.findExistingClosedDayEvent(restaurant.id, hours.dayOfWeek);
      
      if (existingEventId) {
        // Update existing event
        await this.calendar.events.update({
          calendarId: 'primary',
          eventId: existingEventId,
          requestBody: event
        });
        console.log(`Updated closed day event for ${dayName}`);
      } else {
        // Create new event
        const response = await this.calendar.events.insert({
          calendarId: 'primary',
          requestBody: event
        });
        console.log(`Created closed day event for ${dayName}:`, response.data.id);
      }
    } catch (error) {
      console.error('Error creating closed day event:', error);
    }
  }

  private async createSpecialPeriodEvent(restaurant: any, period: any): Promise<void> {
    try {
      let summary = `${restaurant.name} - Special Period`;
      let description = `Special period: ${period.startDate} to ${period.endDate}`;

      if (!period.isOpen) {
        summary = `${restaurant.name} - CLOSED (Special Period)`;
        description += ' - Restaurant is closed during this period';
      } else if (period.openTime && period.closeTime) {
        summary = `${restaurant.name} - Special Hours`;
        description += ` - Special hours: ${period.openTime} - ${period.closeTime}`;
      }

      const event: CalendarEvent = {
        summary,
        description,
        start: {
          date: period.startDate
        },
        end: {
          date: this.addDaysToDate(period.endDate, 1) // End date is exclusive in Google Calendar
        },
        status: 'confirmed'
      };

      // Create new event (special periods are typically unique)
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });
      console.log(`Created special period event:`, response.data.id);
    } catch (error) {
      console.error('Error creating special period event:', error);
    }
  }

  private async createCutOffTimeReminder(restaurant: any, cutOff: any): Promise<void> {
    try {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[cutOff.dayOfWeek];

      // Calculate cut-off time (e.g., X hours before opening)
      const cutOffDateTime = this.calculateCutOffDateTime(cutOff.dayOfWeek, cutOff.cutOffHours);

      const event: CalendarEvent = {
        summary: `${restaurant.name} - Booking Cut-off`,
        description: `Booking cut-off time for ${dayName}. No more bookings accepted after this time for ${dayName} service.`,
        start: {
          dateTime: cutOffDateTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: this.addMinutesToDateTime(cutOffDateTime, 15), // 15-minute reminder
          timeZone: 'UTC'
        },
        recurrence: [
          `RRULE:FREQ=WEEKLY;BYDAY=${this.getDayCode(cutOff.dayOfWeek)}`
        ],
        status: 'confirmed'
      };

      // Create new event
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });
      console.log(`Created cut-off time reminder for ${dayName}:`, response.data.id);
    } catch (error) {
      console.error('Error creating cut-off time reminder:', error);
    }
  }

  // Helper methods
  private isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && 
              process.env.GOOGLE_CLIENT_SECRET && 
              process.env.GOOGLE_REFRESH_TOKEN);
  }

  private createRecurringDateTime(dayOfWeek: number, time: string): string {
    // Create a datetime for the next occurrence of this day
    const now = new Date();
    const targetDate = new Date();
    
    // Calculate days until next occurrence
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    targetDate.setDate(now.getDate() + daysUntilTarget);
    
    // Set the time
    const [hours, minutes] = time.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
    
    return targetDate.toISOString();
  }

  private getDayCode(dayOfWeek: number): string {
    const dayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return dayCodes[dayOfWeek];
  }

  private getNextOccurrence(dayOfWeek: number): string {
    const now = new Date();
    const targetDate = new Date();
    
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    targetDate.setDate(now.getDate() + daysUntilTarget);
    
    return targetDate.toISOString().split('T')[0];
  }

  private addDaysToDate(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private calculateCutOffDateTime(dayOfWeek: number, cutOffHours: number): string {
    // Get the opening time for this day and subtract cut-off hours
    const targetDate = new Date();
    const daysUntilTarget = (dayOfWeek - targetDate.getDay() + 7) % 7;
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    
    // Assume 9 AM opening time if not specified (this should be fetched from opening hours)
    targetDate.setHours(9 - cutOffHours, 0, 0, 0);
    
    return targetDate.toISOString();
  }

  private addMinutesToDateTime(dateTimeStr: string, minutes: number): string {
    const date = new Date(dateTimeStr);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  }

  private async findExistingOpeningHoursEvent(restaurantId: number, dayOfWeek: number): Promise<string | null> {
    try {
      // Search for existing opening hours events
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const restaurant = await this.storage.getRestaurantById(restaurantId);
      
      const searchQuery = `${restaurant?.name} - Open`;
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        q: searchQuery,
        maxResults: 50
      });

      // Find event for specific day
      const events = response.data.items || [];
      for (const event of events) {
        if (event.recurrence && 
            event.recurrence.some((rule: string) => rule.includes(this.getDayCode(dayOfWeek)))) {
          return event.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing opening hours event:', error);
      return null;
    }
  }

  private async findExistingClosedDayEvent(restaurantId: number, dayOfWeek: number): Promise<string | null> {
    try {
      const restaurant = await this.storage.getRestaurantById(restaurantId);
      const searchQuery = `${restaurant?.name} - CLOSED`;
      
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        q: searchQuery,
        maxResults: 50
      });

      const events = response.data.items || [];
      for (const event of events) {
        if (event.recurrence && 
            event.recurrence.some((rule: string) => rule.includes(this.getDayCode(dayOfWeek)))) {
          return event.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing closed day event:', error);
      return null;
    }
  }

  // Public methods for manual sync triggers
  async fullSync(restaurantId: number, tenantId: number): Promise<void> {
    console.log(`Starting full Google Calendar sync for restaurant ${restaurantId}`);
    
    await this.syncOpeningHours(restaurantId, tenantId);
    await this.syncSpecialPeriods(restaurantId);
    await this.syncCutOffTimes(restaurantId);
    
    console.log(`Full Google Calendar sync completed for restaurant ${restaurantId}`);
  }

  async getAuthUrl(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleAuthCallback(code: string): Promise<any> {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      
      console.log('Google Calendar authentication successful');
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      };
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw error;
    }
  }
}