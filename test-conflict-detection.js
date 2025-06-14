import { ConflictDetector } from './server/conflict-detector.js';

// Mock data based on the actual database content
const mockBookings = [
  {
    id: 57,
    restaurantId: 25,
    tenantId: 58,
    tableId: null,
    customerId: null,
    customerName: "Elvis Burrniku",
    customerEmail: "elvis.burrniku99@gmail.com",
    customerPhone: "049854504",
    guestCount: 9,
    bookingDate: "2025-06-14T00:00:00.000Z",
    startTime: "13:30",
    endTime: null,
    status: "confirmed",
    source: "guest_booking",
    notes: null,
    managementHash: null,
    createdAt: "2025-06-14T11:00:53.752Z"
  },
  {
    id: 58,
    restaurantId: 25,
    tenantId: 58,
    tableId: null,
    customerId: null,
    customerName: "Test Large Party",
    customerEmail: "test@example.com",
    customerPhone: "1234567890",
    guestCount: 9,
    bookingDate: "2025-06-15T00:00:00.000Z",
    startTime: "19:00",
    endTime: null,
    status: "confirmed",
    source: "guest_booking",
    notes: null,
    managementHash: null,
    createdAt: "2025-06-14T11:03:20.747Z"
  }
];

const mockTables = [
  { id: 64, table_number: 1, capacity: 2, tenant_id: 58 },
  { id: 65, table_number: 2, capacity: 4, tenant_id: 58 },
  { id: 66, table_number: 3, capacity: 6, tenant_id: 58 }
];

console.log('Testing ConflictDetector with mock data...');
console.log('Bookings:', mockBookings.map(b => `${b.customerName}: ${b.guestCount} guests`));
console.log('Tables:', mockTables.map(t => `Table ${t.table_number}: ${t.capacity} capacity`));
console.log('Max table capacity:', Math.max(...mockTables.map(t => t.capacity)));

try {
  const conflicts = ConflictDetector.detectCapacityExceeded(mockBookings, mockTables);
  console.log('Conflicts detected:', conflicts.length);
  console.log('Conflict details:', JSON.stringify(conflicts, null, 2));
} catch (error) {
  console.error('Error testing conflict detection:', error);
}