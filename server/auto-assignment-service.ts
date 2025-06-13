import type { IStorage } from './storage';
import type { Booking, Table } from '@shared/schema';

export class AutoAssignmentService {
  private storage: IStorage;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  private readonly ASSIGNMENT_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  start() {
    if (this.intervalId) {
      console.log('Auto-assignment service is already running');
      return;
    }

    console.log('Starting auto-assignment service...');
    this.intervalId = setInterval(() => {
      this.processUnassignedBookings().catch(error => {
        console.error('Error in auto-assignment service:', error);
      });
    }, this.CHECK_INTERVAL);

    // Run immediately on start
    this.processUnassignedBookings().catch(error => {
      console.error('Error in initial auto-assignment run:', error);
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Auto-assignment service stopped');
    }
  }

  private async processUnassignedBookings() {
    try {
      console.log('Checking for unassigned bookings...');
      
      // Get all confirmed bookings without table assignments
      const unassignedBookings = await this.storage.getUnassignedBookings();
      
      if (unassignedBookings.length === 0) {
        console.log('No unassigned bookings found');
        return;
      }

      console.log(`Found ${unassignedBookings.length} unassigned bookings`);

      for (const booking of unassignedBookings) {
        await this.processBookingAssignment(booking);
      }
    } catch (error) {
      console.error('Error processing unassigned bookings:', error);
    }
  }

  private async processBookingAssignment(booking: any) {
    try {
      const now = new Date();
      const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const timeUntilBooking = bookingDateTime.getTime() - now.getTime();

      // Check if booking is within 2 hours
      if (timeUntilBooking <= this.ASSIGNMENT_THRESHOLD && timeUntilBooking > 0) {
        console.log(`Auto-assigning table for booking ${booking.id} (${booking.customerName}) - ${Math.round(timeUntilBooking / (60 * 1000))} minutes until booking`);
        
        const assignedTable = await this.findBestAvailableTable(booking);
        
        if (assignedTable) {
          await this.storage.updateBooking(booking.id, {
            tableId: assignedTable.id,
            assignedAt: new Date(),
            assignmentType: 'auto'
          });

          console.log(`Successfully auto-assigned Table ${assignedTable.table_number} (capacity: ${assignedTable.capacity}) to booking ${booking.id}`);
          
          // Log the assignment for tracking
          await this.logTableAssignment(booking, assignedTable, 'auto');
        } else {
          console.log(`No suitable table found for booking ${booking.id} - will attempt conflict resolution`);
          await this.handleConflictResolution(booking);
        }
      }
    } catch (error) {
      console.error(`Error processing booking ${booking.id}:`, error);
    }
  }

  private async findBestAvailableTable(booking: any): Promise<any | null> {
    try {
      // Get all tables for the restaurant
      const tables = await this.storage.getTablesByRestaurant(booking.restaurantId);
      
      // Filter tables that can accommodate the guest count
      const suitableTables = tables.filter(table => table.capacity >= booking.guestCount);
      
      if (suitableTables.length === 0) {
        console.log(`No tables with sufficient capacity (${booking.guestCount} guests) for booking ${booking.id}`);
        return null;
      }

      // Get existing bookings for the same date and restaurant
      const bookingDate = new Date(booking.bookingDate).toISOString().split('T')[0];
      const existingBookings = await this.storage.getBookingsByDateAndRestaurant(
        bookingDate,
        booking.restaurantId
      );

      // Find available tables (no conflicts)
      const availableTables = suitableTables.filter(table => {
        return !this.hasTimeConflict(booking, table, existingBookings);
      });

      if (availableTables.length === 0) {
        console.log(`No available tables without conflicts for booking ${booking.id}`);
        return null;
      }

      // Sort by capacity (smallest suitable table first for efficiency)
      availableTables.sort((a, b) => a.capacity - b.capacity);
      
      return availableTables[0];
    } catch (error) {
      console.error('Error finding available table:', error);
      return null;
    }
  }

  private hasTimeConflict(booking: any, table: any, existingBookings: any[]): boolean {
    const bookingStart = this.timeToMinutes(booking.startTime);
    const bookingEnd = bookingStart + 120; // Default 2-hour duration
    const buffer = 30; // 30-minute buffer

    return existingBookings.some(existingBooking => {
      if (existingBooking.tableId !== table.id || 
          existingBooking.status === 'cancelled' ||
          existingBooking.id === booking.id) {
        return false;
      }

      const existingStart = this.timeToMinutes(existingBooking.startTime);
      const existingEnd = existingBooking.endTime 
        ? this.timeToMinutes(existingBooking.endTime)
        : existingStart + 120;

      // Check for overlap with buffer
      return (bookingStart - buffer < existingEnd) && (existingStart < bookingEnd + buffer);
    });
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async handleConflictResolution(booking: any) {
    try {
      console.log(`Attempting conflict resolution for booking ${booking.id}`);
      
      // Get all tables and bookings for analysis
      const tables = await this.storage.getTablesByRestaurant(booking.restaurantId);
      const bookingDate = new Date(booking.bookingDate).toISOString().split('T')[0];
      const existingBookings = await this.storage.getBookingsByDateAndRestaurant(
        bookingDate,
        booking.restaurantId
      );

      // Find tables with capacity but conflicts
      const conflictedTables = tables.filter(table => {
        if (table.capacity < booking.guestCount) return false;
        return this.hasTimeConflict(booking, table, existingBookings);
      });

      if (conflictedTables.length === 0) {
        console.log(`No resolution possible for booking ${booking.id} - insufficient table capacity`);
        return;
      }

      // Try to find the best conflict resolution
      for (const table of conflictedTables) {
        const conflictingBookings = existingBookings.filter(eb => 
          eb.tableId === table.id && 
          eb.status === 'confirmed' &&
          this.hasTimeConflict(booking, table, [eb])
        );

        // Try to reassign conflicting bookings to other tables
        for (const conflictingBooking of conflictingBookings) {
          const alternativeTable = await this.findBestAvailableTable(conflictingBooking);
          
          if (alternativeTable) {
            // Reassign the conflicting booking
            await this.storage.updateBooking(conflictingBooking.id, {
              tableId: alternativeTable.id,
              assignedAt: new Date(),
              assignmentType: 'auto_reassign'
            });

            // Assign the original table to our booking
            await this.storage.updateBooking(booking.id, {
              tableId: table.id,
              assignedAt: new Date(),
              assignmentType: 'auto_conflict_resolved'
            });

            console.log(`Conflict resolved: Moved booking ${conflictingBooking.id} to Table ${alternativeTable.table_number}, assigned Table ${table.table_number} to booking ${booking.id}`);
            
            await this.logTableAssignment(booking, table, 'auto_conflict_resolved');
            await this.logTableAssignment(conflictingBooking, alternativeTable, 'auto_reassign');
            
            return;
          }
        }
      }

      console.log(`Unable to resolve conflicts for booking ${booking.id}`);
    } catch (error) {
      console.error('Error in conflict resolution:', error);
    }
  }

  private async logTableAssignment(booking: any, table: any, assignmentType: string) {
    try {
      // This would typically log to a dedicated assignment log table
      console.log(`ASSIGNMENT LOG: Booking ${booking.id} (${booking.customerName}) assigned to Table ${table.table_number} (${assignmentType}) at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error logging table assignment:', error);
    }
  }
}