import type { IStorage } from './storage';
import type { Booking, Table, ReschedulingSuggestion } from '@shared/schema';

export interface ReschedulingOptions {
  dateRange?: number; // Days to look ahead (default: 7)
  timeRange?: number; // Hours before/after original time (default: 3)
  includeWeekends?: boolean; // Include weekend suggestions (default: true)
  maxSuggestions?: number; // Maximum number of suggestions (default: 5)
  prioritizeCloserDates?: boolean; // Prioritize dates closer to original (default: true)
  prioritizeOriginalTime?: boolean; // Prioritize same time slots (default: true)
}

export interface ReschedulingSuggestionWithScore {
  suggestedDate: string;
  suggestedTime: string;
  tableId: number;
  tableNumber: string;
  tableCapacity: number;
  reason: string;
  priority: number;
  score: number;
  availability: boolean;
  daysDifference: number;
  timeDifference: number;
}

export class SmartReschedulingAssistant {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate smart rescheduling suggestions for a booking conflict
   */
  async generateReschedulingSuggestions(
    restaurantId: number,
    tenantId: number,
    originalDate: string,
    originalTime: string,
    guestCount: number,
    reason: string,
    options: ReschedulingOptions = {}
  ): Promise<ReschedulingSuggestionWithScore[]> {
    const {
      dateRange = 7,
      timeRange = 3,
      includeWeekends = true,
      maxSuggestions = 5,
      prioritizeCloserDates = true,
      prioritizeOriginalTime = true
    } = options;

    // Get restaurant data
    const tables = await this.storage.getTablesByRestaurant(restaurantId);
    const openingHours = await this.storage.getOpeningHoursByRestaurant(restaurantId);
    
    // Filter tables that can accommodate the guest count
    const suitableTables = tables.filter(table => table.capacity >= guestCount);
    
    if (suitableTables.length === 0) {
      return [];
    }

    const suggestions: ReschedulingSuggestionWithScore[] = [];
    const originalDateTime = new Date(`${originalDate}T${originalTime}`);

    // Generate date range to check
    const datesToCheck = this.generateDateRange(originalDate, dateRange, includeWeekends);

    for (const date of datesToCheck) {
      const dayOfWeek = new Date(date).getDay();
      const dayHours = openingHours.find(oh => oh.dayOfWeek === dayOfWeek);
      
      if (!dayHours || !dayHours.isOpen) {
        continue; // Skip closed days
      }

      // Generate time slots for this date
      const timeSlots = this.generateTimeSlots(
        dayHours.openTime,
        dayHours.closeTime,
        originalTime,
        timeRange
      );

      // Check availability for each time slot and table combination
      for (const time of timeSlots) {
        for (const table of suitableTables) {
          const isAvailable = await this.isTimeSlotAvailable(
            restaurantId,
            date,
            time,
            table.id
          );

          if (isAvailable) {
            const suggestion = await this.createSuggestionWithScore(
              restaurantId,
              tenantId,
              originalDate,
              originalTime,
              date,
              time,
              table,
              guestCount,
              reason,
              originalDateTime,
              prioritizeCloserDates,
              prioritizeOriginalTime
            );

            suggestions.push(suggestion);
          }
        }
      }
    }

    // Sort by score (highest first) and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }

  /**
   * Generate rescheduling suggestions for an existing booking
   */
  async generateSuggestionsForBooking(
    bookingId: number,
    reason: string,
    options: ReschedulingOptions = {}
  ): Promise<ReschedulingSuggestion[]> {
    const booking = await this.storage.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const originalDate = new Date(booking.bookingDate).toISOString().split('T')[0];
    const suggestions = await this.generateReschedulingSuggestions(
      booking.restaurantId,
      booking.tenantId,
      originalDate,
      booking.startTime,
      booking.guestCount,
      reason,
      options
    );

    // Save suggestions to database
    const savedSuggestions: ReschedulingSuggestion[] = [];
    for (const suggestion of suggestions) {
      const suggestionData = {
        restaurantId: booking.restaurantId,
        tenantId: booking.tenantId,
        originalBookingId: bookingId,
        originalDate,
        originalTime: booking.startTime,
        suggestedDate: suggestion.suggestedDate,
        suggestedTime: suggestion.suggestedTime,
        tableId: suggestion.tableId,
        guestCount: booking.guestCount,
        reason: suggestion.reason,
        priority: suggestion.priority,
        availability: suggestion.availability,
        customerName: '', // Will be filled by the calling function
        customerEmail: '', // Will be filled by the calling function
        status: 'pending' as const
      };

      const saved = await this.storage.createReschedulingSuggestion(suggestionData);
      savedSuggestions.push(saved);
    }

    return savedSuggestions;
  }

  /**
   * Find alternative time slots for the same day
   */
  async findAlternativeTimeSlotsForDay(
    restaurantId: number,
    date: string,
    guestCount: number,
    excludeTime?: string
  ): Promise<ReschedulingSuggestionWithScore[]> {
    const dayOfWeek = new Date(date).getDay();
    const openingHours = await this.storage.getOpeningHoursByRestaurant(restaurantId);
    const dayHours = openingHours.find(oh => oh.dayOfWeek === dayOfWeek);
    
    if (!dayHours || !dayHours.isOpen) {
      return [];
    }

    const tables = await this.storage.getTablesByRestaurant(restaurantId);
    const suitableTables = tables.filter(table => table.capacity >= guestCount);
    
    const timeSlots = this.generateAllTimeSlots(dayHours.openTime, dayHours.closeTime);
    const suggestions: ReschedulingSuggestionWithScore[] = [];

    for (const time of timeSlots) {
      if (excludeTime && time === excludeTime) {
        continue; // Skip the conflicting time
      }

      for (const table of suitableTables) {
        const isAvailable = await this.isTimeSlotAvailable(restaurantId, date, time, table.id);
        
        if (isAvailable) {
          const timeDiff = this.calculateTimeDifference(excludeTime || '12:00', time);
          const score = Math.max(1, 5 - Math.floor(timeDiff / 60)); // Score based on time proximity
          
          suggestions.push({
            suggestedDate: date,
            suggestedTime: time,
            tableId: table.id,
            tableNumber: table.tableNumber,
            tableCapacity: table.capacity,
            reason: 'alternative_time_same_day',
            priority: score,
            score,
            availability: true,
            daysDifference: 0,
            timeDifference: timeDiff
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  private generateDateRange(originalDate: string, range: number, includeWeekends: boolean): string[] {
    const dates: string[] = [];
    const start = new Date(originalDate);
    
    for (let i = 0; i <= range; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      const dayOfWeek = date.getDay();
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue; // Skip weekends if not included
      }
      
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  private generateTimeSlots(
    openTime: string,
    closeTime: string,
    originalTime: string,
    timeRange: number
  ): string[] {
    const slots: string[] = [];
    const originalMinutes = this.timeToMinutes(originalTime);
    const openMinutes = this.timeToMinutes(openTime);
    const closeMinutes = this.timeToMinutes(closeTime);
    
    // Generate slots within the time range of the original time
    const startRange = Math.max(openMinutes, originalMinutes - (timeRange * 60));
    const endRange = Math.min(closeMinutes - 120, originalMinutes + (timeRange * 60)); // 2 hours before close
    
    for (let minutes = startRange; minutes <= endRange; minutes += 30) {
      if (minutes >= openMinutes && minutes <= closeMinutes - 120) {
        slots.push(this.minutesToTime(minutes));
      }
    }
    
    return slots;
  }

  private generateAllTimeSlots(openTime: string, closeTime: string): string[] {
    const slots: string[] = [];
    const openMinutes = this.timeToMinutes(openTime);
    const closeMinutes = this.timeToMinutes(closeTime);
    
    for (let minutes = openMinutes; minutes <= closeMinutes - 120; minutes += 30) {
      slots.push(this.minutesToTime(minutes));
    }
    
    return slots;
  }

  private async isTimeSlotAvailable(
    restaurantId: number,
    date: string,
    time: string,
    tableId: number
  ): Promise<boolean> {
    const existingBookings = await this.storage.getBookingsByDate(restaurantId, date);
    
    const conflictingBookings = existingBookings.filter(booking => {
      if (booking.tableId !== tableId || booking.status === 'cancelled') {
        return false;
      }

      const requestedStartMinutes = this.timeToMinutes(time);
      const requestedEndMinutes = requestedStartMinutes + 120; // Assume 2-hour duration

      const existingStartMinutes = this.timeToMinutes(booking.startTime);
      const existingEndTime = booking.endTime || "23:59";
      const existingEndMinutes = this.timeToMinutes(existingEndTime);

      // 1-hour buffer for table turnover
      const bufferMinutes = 60;
      const requestedStart = requestedStartMinutes - bufferMinutes;
      const requestedEnd = requestedEndMinutes + bufferMinutes;
      const existingStart = existingStartMinutes - bufferMinutes;
      const existingEnd = existingEndMinutes + bufferMinutes;

      return requestedStart < existingEnd && existingStart < requestedEnd;
    });

    return conflictingBookings.length === 0;
  }

  private async createSuggestionWithScore(
    restaurantId: number,
    tenantId: number,
    originalDate: string,
    originalTime: string,
    suggestedDate: string,
    suggestedTime: string,
    table: Table,
    guestCount: number,
    reason: string,
    originalDateTime: Date,
    prioritizeCloserDates: boolean,
    prioritizeOriginalTime: boolean
  ): Promise<ReschedulingSuggestionWithScore> {
    const suggestedDateTime = new Date(`${suggestedDate}T${suggestedTime}`);
    const daysDifference = Math.abs(
      (suggestedDateTime.getTime() - originalDateTime.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeDifference = this.calculateTimeDifference(originalTime, suggestedTime);

    // Calculate score based on various factors
    let score = 5; // Base score

    // Date proximity bonus
    if (prioritizeCloserDates) {
      score += Math.max(0, 3 - daysDifference);
    }

    // Time proximity bonus
    if (prioritizeOriginalTime) {
      const timeBonus = Math.max(0, 2 - (timeDifference / 120)); // Up to 2 points for closer times
      score += timeBonus;
    }

    // Table capacity efficiency (prefer smaller suitable tables)
    const capacityEfficiency = guestCount / table.capacity;
    if (capacityEfficiency > 0.7) {
      score += 1; // Bonus for efficient table usage
    }

    // Same day bonus
    if (suggestedDate === originalDate) {
      score += 2;
    }

    // Weekend penalty (if original was weekday)
    const originalDayOfWeek = new Date(originalDate).getDay();
    const suggestedDayOfWeek = new Date(suggestedDate).getDay();
    if (originalDayOfWeek >= 1 && originalDayOfWeek <= 5 && 
        (suggestedDayOfWeek === 0 || suggestedDayOfWeek === 6)) {
      score -= 1;
    }

    const priority = Math.max(1, Math.min(5, Math.round(score)));

    return {
      suggestedDate,
      suggestedTime,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tableCapacity: table.capacity,
      reason,
      priority,
      score,
      availability: true,
      daysDifference,
      timeDifference
    };
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private calculateTimeDifference(time1: string, time2: string): number {
    const minutes1 = this.timeToMinutes(time1);
    const minutes2 = this.timeToMinutes(time2);
    return Math.abs(minutes2 - minutes1);
  }

  /**
   * Clean up expired suggestions
   */
  async cleanupExpiredSuggestions(): Promise<void> {
    await this.storage.deleteExpiredReschedulingSuggestions();
  }

  /**
   * Accept a rescheduling suggestion and update the original booking
   */
  async acceptReschedulingSuggestion(
    suggestionId: number,
    userEmail: string
  ): Promise<{ success: boolean; updatedBooking?: any; message: string }> {
    const suggestion = await this.storage.getReschedulingSuggestionById(suggestionId);
    
    if (!suggestion) {
      return { success: false, message: 'Suggestion not found' };
    }

    if (suggestion.status !== 'pending') {
      return { success: false, message: 'Suggestion is no longer available' };
    }

    if (suggestion.expiresAt && new Date() > new Date(suggestion.expiresAt)) {
      return { success: false, message: 'Suggestion has expired' };
    }

    // Verify the suggested time slot is still available
    const isStillAvailable = await this.isTimeSlotAvailable(
      suggestion.restaurantId,
      suggestion.suggestedDate,
      suggestion.suggestedTime,
      suggestion.tableId
    );

    if (!isStillAvailable) {
      // Mark suggestion as unavailable
      await this.storage.updateReschedulingSuggestion(suggestionId, {
        status: 'rejected',
        availability: false
      });
      return { success: false, message: 'Suggested time slot is no longer available' };
    }

    // Update the original booking if it exists
    if (suggestion.originalBookingId) {
      const updatedBooking = await this.storage.updateBooking(
        suggestion.originalBookingId,
        {
          bookingDate: new Date(suggestion.suggestedDate),
          startTime: suggestion.suggestedTime,
          tableId: suggestion.tableId
        }
      );

      // Mark suggestion as accepted
      await this.storage.updateReschedulingSuggestion(suggestionId, {
        status: 'accepted'
      });

      // Log the rescheduling activity
      await this.storage.createActivityLog({
        restaurantId: suggestion.restaurantId,
        tenantId: suggestion.tenantId,
        eventType: 'booking_rescheduled',
        description: `Booking rescheduled from ${suggestion.originalDate} ${suggestion.originalTime} to ${suggestion.suggestedDate} ${suggestion.suggestedTime}`,
        source: 'rescheduling_assistant',
        userEmail,
        details: JSON.stringify({
          originalBookingId: suggestion.originalBookingId,
          suggestionId,
          reason: suggestion.reason
        })
      });

      return {
        success: true,
        updatedBooking,
        message: 'Booking successfully rescheduled'
      };
    }

    return { success: false, message: 'No booking associated with this suggestion' };
  }
}