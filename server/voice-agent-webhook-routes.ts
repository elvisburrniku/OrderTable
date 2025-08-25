import { Router } from 'express';
import { z } from 'zod';
import { db } from './db';
import { bookings, restaurants, customers } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { subMinutes, addMinutes, parseISO, format } from 'date-fns';

const router = Router();

// Webhook payload validation schemas
const createBookingSchema = z.object({
  restaurantId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().email().optional(),
  date: z.string(), // ISO date string
  time: z.string(), // HH:mm format
  partySize: z.number().min(1).max(20),
  specialRequests: z.string().optional(),
  duration: z.number().min(30).max(480).default(120) // minutes
});

const modifyBookingSchema = z.object({
  bookingId: z.string(),
  date: z.string().optional(),
  time: z.string().optional(), 
  partySize: z.number().min(1).max(20).optional(),
  specialRequests: z.string().optional()
});

const deleteBookingSchema = z.object({
  bookingId: z.string()
});

// Create booking webhook endpoint
router.post('/api/voice-agent/webhooks/create-booking', async (req, res) => {
  try {
    const validatedData = createBookingSchema.parse(req.body);
    
    // Find restaurant to get tenant info
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, parseInt(validatedData.restaurantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    // Create date-time object
    const bookingDateTime = parseISO(`${validatedData.date}T${validatedData.time}`);
    const endDateTime = addMinutes(bookingDateTime, validatedData.duration);

    // Check for existing customer or create new one
    let customer;
    const existingCustomer = await db.select()
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, restaurant[0].tenantId),
          eq(customers.phone, validatedData.customerPhone)
        )
      )
      .limit(1);

    if (existingCustomer.length > 0) {
      customer = existingCustomer[0];
    } else {
      // Create new customer
      const newCustomer = await db.insert(customers).values({
        tenantId: restaurant[0].tenantId,
        restaurantId: parseInt(validatedData.restaurantId),
        name: validatedData.customerName,
        phone: validatedData.customerPhone,
        email: validatedData.customerEmail || null,
        createdAt: new Date()
      }).returning();
      customer = newCustomer[0];
    }

    // Create booking
    const newBooking = await db.insert(bookings).values({
      tenantId: restaurant[0].tenantId,
      restaurantId: parseInt(validatedData.restaurantId),
      customerId: customer.id,
      date: format(bookingDateTime, 'yyyy-MM-dd'),
      time: format(bookingDateTime, 'HH:mm'),
      partySize: validatedData.partySize,
      duration: validatedData.duration,
      status: 'confirmed',
      specialRequests: validatedData.specialRequests || null,
      source: 'voice_agent',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`Voice Agent: Created booking ${newBooking[0].id} for restaurant ${validatedData.restaurantId}`);

    res.json({ 
      success: true, 
      booking: newBooking[0],
      message: `Booking confirmed for ${validatedData.customerName} on ${format(bookingDateTime, 'MMMM d, yyyy')} at ${format(bookingDateTime, 'h:mm a')}`
    });

  } catch (error: any) {
    console.error('Voice Agent Webhook - Create booking error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to create booking'
    });
  }
});

// Modify booking webhook endpoint
router.put('/api/voice-agent/webhooks/modify-booking', async (req, res) => {
  try {
    const validatedData = modifyBookingSchema.parse(req.body);
    
    // Find existing booking
    const existingBooking = await db.select()
      .from(bookings)
      .where(eq(bookings.id, parseInt(validatedData.bookingId)))
      .limit(1);

    if (existingBooking.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (validatedData.date) updateData.date = validatedData.date;
    if (validatedData.time) updateData.time = validatedData.time;
    if (validatedData.partySize) updateData.partySize = validatedData.partySize;
    if (validatedData.specialRequests !== undefined) updateData.specialRequests = validatedData.specialRequests;

    // Update booking
    const updatedBooking = await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, parseInt(validatedData.bookingId)))
      .returning();

    console.log(`Voice Agent: Modified booking ${validatedData.bookingId}`);

    res.json({ 
      success: true, 
      booking: updatedBooking[0],
      message: `Booking updated successfully`
    });

  } catch (error: any) {
    console.error('Voice Agent Webhook - Modify booking error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to modify booking'
    });
  }
});

// Delete booking webhook endpoint
router.delete('/api/voice-agent/webhooks/delete-booking', async (req, res) => {
  try {
    const validatedData = deleteBookingSchema.parse(req.body);
    
    // Find existing booking
    const existingBooking = await db.select()
      .from(bookings)
      .where(eq(bookings.id, parseInt(validatedData.bookingId)))
      .limit(1);

    if (existingBooking.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Update booking status to cancelled instead of deleting
    const cancelledBooking = await db.update(bookings)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(bookings.id, parseInt(validatedData.bookingId)))
      .returning();

    console.log(`Voice Agent: Cancelled booking ${validatedData.bookingId}`);

    res.json({ 
      success: true, 
      booking: cancelledBooking[0],
      message: `Booking cancelled successfully`
    });

  } catch (error: any) {
    console.error('Voice Agent Webhook - Cancel booking error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to cancel booking'
    });
  }
});

// Get restaurant info for voice agent
router.get('/api/voice-agent/webhooks/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await db.select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      phone: restaurants.phone,
      email: restaurants.email,
      openingHours: restaurants.openingHours,
      closingHours: restaurants.closingHours
    })
      .from(restaurants)
      .where(eq(restaurants.id, parseInt(restaurantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    res.json({ 
      success: true, 
      restaurant: restaurant[0]
    });

  } catch (error: any) {
    console.error('Voice Agent Webhook - Get restaurant error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to get restaurant info'
    });
  }
});

// Get availability for a specific time slot
router.post('/api/voice-agent/webhooks/check-availability', async (req, res) => {
  try {
    const { restaurantId, date, time, partySize } = req.body;
    
    // Get existing bookings for this time slot
    const existingBookings = await db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.restaurantId, parseInt(restaurantId)),
          eq(bookings.date, date),
          eq(bookings.time, time),
          eq(bookings.status, 'confirmed')
        )
      );

    // Simple availability check - assume restaurant can handle up to 100 total guests per time slot
    const currentGuests = existingBookings.reduce((total, booking) => total + booking.partySize, 0);
    const available = (currentGuests + partySize) <= 100;

    res.json({ 
      success: true, 
      available,
      currentGuests,
      requestedGuests: partySize
    });

  } catch (error: any) {
    console.error('Voice Agent Webhook - Check availability error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to check availability'
    });
  }
});

export default router;