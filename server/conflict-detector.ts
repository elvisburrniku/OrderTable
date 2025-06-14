import { Booking, Table } from "@shared/schema";

export class ConflictDetector {
  /**
   * Detect bookings that exceed table capacity
   */
  static detectCapacityExceeded(bookings: Booking[], tables: Table[]): any[] {
    const conflicts: any[] = [];
    
    // Create a map of table capacities for quick lookup
    const tableCapacityMap = new Map<number, number>();
    tables.forEach(table => {
      tableCapacityMap.set(table.id, table.capacity);
    });
    
    // Find maximum table capacity
    const maxTableCapacity = Math.max(...tables.map(t => t.capacity), 0);
    
    bookings.forEach(booking => {
      let hasConflict = false;
      let conflictDetails: any = {};
      
      if (booking.tableId) {
        // Booking is assigned to a specific table
        const tableCapacity = tableCapacityMap.get(booking.tableId);
        if (tableCapacity && booking.guestCount > tableCapacity) {
          hasConflict = true;
          conflictDetails = {
            conflictType: "assigned_table_too_small",
            guestCount: booking.guestCount,
            tableCapacity: tableCapacity,
            tableId: booking.tableId
          };
        }
      } else {
        // Booking is unassigned - check if any table can accommodate it
        if (booking.guestCount > maxTableCapacity) {
          hasConflict = true;
          conflictDetails = {
            conflictType: "no_suitable_table",
            guestCount: booking.guestCount,
            maxTableCapacity: maxTableCapacity,
            suitableTablesAvailable: 0,
            currentTableId: null
          };
        }
      }
      
      if (hasConflict) {
        const suggestedResolutions = [];
        
        // Suggest splitting the party if it's too large
        if (booking.guestCount > maxTableCapacity) {
          suggestedResolutions.push({
            id: `split-party-${booking.id}`,
            type: "split_party",
            description: "Split large party across adjacent tables",
            impact: "moderate",
            confidence: 70,
            estimatedCustomerSatisfaction: 75,
            details: {
              splitSuggested: true,
              tablesNeeded: Math.ceil(booking.guestCount / maxTableCapacity),
              compensationSuggested: true
            }
          });
        } else {
          // Suggest reassigning to a larger table
          const suitableTables = tables.filter(t => 
            t.capacity >= booking.guestCount && t.id !== booking.tableId
          );
          
          if (suitableTables.length > 0) {
            suggestedResolutions.push({
              id: `reassign-table-${booking.id}`,
              type: "reassign_table",
              description: `Move to table with capacity ${suitableTables[0].capacity}`,
              impact: "low",
              confidence: 90,
              estimatedCustomerSatisfaction: 95,
              details: {
                newTableId: suitableTables[0].id,
                newTableCapacity: suitableTables[0].capacity
              }
            });
          }
        }
        
        conflicts.push({
          id: `capacity-conflict-${booking.id}`,
          type: "capacity_exceeded",
          severity: "high",
          bookings: [booking],
          autoResolvable: suggestedResolutions.some(r => r.type === "reassign_table"),
          createdAt: new Date().toISOString(),
          details: conflictDetails,
          suggestedResolutions: suggestedResolutions
        });
      }
    });
    
    return conflicts;
  }
  
  /**
   * Detect double bookings on the same table at overlapping times
   */
  static detectTableDoubleBookings(bookings: Booking[]): any[] {
    const conflicts: any[] = [];
    const tableBookings = new Map<number, Booking[]>();
    
    // Group bookings by table
    bookings.forEach(booking => {
      if (booking.tableId && booking.status === 'confirmed') {
        if (!tableBookings.has(booking.tableId)) {
          tableBookings.set(booking.tableId, []);
        }
        tableBookings.get(booking.tableId)!.push(booking);
      }
    });
    
    // Check for overlapping bookings on the same table
    tableBookings.forEach((tableBookingList, tableId) => {
      for (let i = 0; i < tableBookingList.length; i++) {
        for (let j = i + 1; j < tableBookingList.length; j++) {
          const booking1 = tableBookingList[i];
          const booking2 = tableBookingList[j];
          
          // Check if bookings are on the same date
          const date1 = new Date(booking1.bookingDate).toDateString();
          const date2 = new Date(booking2.bookingDate).toDateString();
          
          if (date1 === date2) {
            // Check for time overlap
            const start1 = this.timeToMinutes(booking1.startTime);
            const end1 = booking1.endTime ? this.timeToMinutes(booking1.endTime) : start1 + 120; // Default 2 hours
            const start2 = this.timeToMinutes(booking2.startTime);
            const end2 = booking2.endTime ? this.timeToMinutes(booking2.endTime) : start2 + 120;
            
            if (start1 < end2 && start2 < end1) {
              conflicts.push({
                id: `double-booking-${booking1.id}-${booking2.id}`,
                type: "double_booking",
                severity: "high",
                bookings: [booking1, booking2],
                autoResolvable: true,
                createdAt: new Date().toISOString(),
                details: {
                  conflictType: "table_double_booking",
                  tableId: tableId,
                  overlappingTimeSlot: {
                    start: Math.max(start1, start2),
                    end: Math.min(end1, end2)
                  }
                },
                suggestedResolutions: [
                  {
                    id: `reschedule-${booking2.id}`,
                    type: "reschedule",
                    description: "Reschedule one of the conflicting bookings",
                    impact: "moderate",
                    confidence: 80,
                    estimatedCustomerSatisfaction: 70
                  }
                ]
              });
            }
          }
        }
      }
    });
    
    return conflicts;
  }
  
  /**
   * Detect general time overlaps that might cause issues
   */
  static detectTimeOverlaps(bookings: Booking[]): any[] {
    const conflicts: any[] = [];
    
    // Group bookings by date
    const bookingsByDate = new Map<string, Booking[]>();
    
    bookings.forEach(booking => {
      if (booking.status === 'confirmed') {
        const dateKey = new Date(booking.bookingDate).toDateString();
        if (!bookingsByDate.has(dateKey)) {
          bookingsByDate.set(dateKey, []);
        }
        bookingsByDate.get(dateKey)!.push(booking);
      }
    });
    
    // Check for potential capacity issues during peak times
    bookingsByDate.forEach((dayBookings, date) => {
      const timeSlots = new Map<number, Booking[]>();
      
      dayBookings.forEach(booking => {
        const startTime = this.timeToMinutes(booking.startTime);
        const timeSlot = Math.floor(startTime / 30) * 30; // 30-minute slots
        
        if (!timeSlots.has(timeSlot)) {
          timeSlots.set(timeSlot, []);
        }
        timeSlots.get(timeSlot)!.push(booking);
      });
      
      // Check if any time slot has too many concurrent bookings
      timeSlots.forEach((slotBookings, timeSlot) => {
        const totalGuests = slotBookings.reduce((sum, booking) => sum + booking.guestCount, 0);
        
        if (slotBookings.length > 5 || totalGuests > 50) { // Configurable thresholds
          conflicts.push({
            id: `time-overlap-${date}-${timeSlot}`,
            type: "time_overlap",
            severity: "medium",
            bookings: slotBookings,
            autoResolvable: false,
            createdAt: new Date().toISOString(),
            details: {
              conflictType: "peak_time_congestion",
              timeSlot: this.minutesToTime(timeSlot),
              totalBookings: slotBookings.length,
              totalGuests: totalGuests
            },
            suggestedResolutions: [
              {
                id: `distribute-bookings-${timeSlot}`,
                type: "distribute_bookings",
                description: "Spread bookings across different time slots",
                impact: "low",
                confidence: 60,
                estimatedCustomerSatisfaction: 80
              }
            ]
          });
        }
      });
    });
    
    return conflicts;
  }
  
  /**
   * Convert time string to minutes
   */
  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Convert minutes to time string
   */
  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}