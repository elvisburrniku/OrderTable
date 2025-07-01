# SMS Notification Setup Guide

## Overview
Your restaurant booking system now includes comprehensive Twilio SMS integration for automated booking notifications. This guide walks you through setting up and configuring SMS notifications.

## Prerequisites
✅ Twilio Account SID, Auth Token, and Phone Number have been configured
✅ PostgreSQL database with SMS tables created
✅ Application running on port 5000

## SMS Features Available

### 1. Booking Confirmation SMS
- Automatically sent when a new booking is created
- Contains booking details, date, time, and restaurant information
- Customizable message templates

### 2. Booking Reminder SMS
- Sent 24 hours before booking (configurable)
- Includes booking details and restaurant contact info
- Automated reminder service running

### 3. SMS Balance Tracking
- Real-time balance monitoring
- Cost tracking per message
- Low balance alerts

### 4. Message Status Tracking
- Delivery confirmation
- Error handling and retry logic
- Message history and analytics

## Setup Steps

### Step 1: Access SMS Settings
1. Navigate to your restaurant dashboard
2. Go to Settings → SMS Settings
3. Or visit: `http://localhost:5000/1/sms-settings`

### Step 2: Configure SMS Notifications
1. **Enable Booking Confirmations**
   - Toggle "Send confirmation SMS" 
   - Customize confirmation message template
   - Set sender name/number

2. **Enable Booking Reminders**
   - Toggle "Send reminder SMS"
   - Set reminder timing (default: 24 hours before)
   - Customize reminder message template

3. **Configure Message Templates**
   ```
   Confirmation Template:
   "Hi {customerName}! Your booking at {restaurantName} for {date} at {time} for {guestCount} guests is confirmed. Table: {tableNumber}. See you soon!"
   
   Reminder Template:
   "Reminder: Your booking at {restaurantName} tomorrow at {time} for {guestCount} guests. Table: {tableNumber}. Looking forward to seeing you!"
   ```

### Step 3: Test SMS Functionality
1. **Test SMS Sending**
   - Use the "Send Test SMS" button
   - Enter a test phone number
   - Verify SMS delivery

2. **Test Booking Flow**
   - Create a new booking
   - Check SMS confirmation is sent
   - Verify message appears in SMS history

### Step 4: Configure Twilio Settings
1. **Access Twilio Settings**
   - Go to Settings → Twilio Settings
   - Or visit: `http://localhost:5000/1/twilio-settings`

2. **View Account Information**
   - Account balance
   - Phone number status
   - API usage statistics

3. **Configure Webhooks**
   - Set up delivery status webhooks
   - Configure error handling

## API Endpoints

### SMS Configuration
- `GET /api/tenants/{tenantId}/restaurants/{restaurantId}/sms-settings`
- `POST /api/tenants/{tenantId}/restaurants/{restaurantId}/sms-settings`

### SMS Balance
- `GET /api/tenants/{tenantId}/sms-balance`
- `POST /api/tenants/{tenantId}/sms-balance/add`

### SMS Messages
- `GET /api/tenants/{tenantId}/restaurants/{restaurantId}/sms-messages`
- `POST /api/tenants/{tenantId}/restaurants/{restaurantId}/sms-messages/test`

### Booking SMS
- `POST /api/tenants/{tenantId}/restaurants/{restaurantId}/sms/booking-confirmation`
- `POST /api/tenants/{tenantId}/restaurants/{restaurantId}/sms/booking-reminder`

## Message Templates Variables

Available variables for customizing SMS templates:
- `{customerName}` - Customer's name
- `{restaurantName}` - Restaurant name
- `{date}` - Booking date
- `{time}` - Booking time
- `{guestCount}` - Number of guests
- `{tableNumber}` - Table number/name
- `{restaurantPhone}` - Restaurant contact number
- `{bookingId}` - Unique booking identifier

## Cost Management

### SMS Pricing
- Typical cost: $0.0075 per SMS (varies by destination)
- Balance tracking in EUR/USD
- Real-time cost calculation

### Balance Management
1. **Check Balance**
   - View current balance in SMS settings
   - Set up low balance alerts

2. **Add Balance**
   - Use "Add Balance" feature
   - Integrate with billing system

## Troubleshooting

### Common Issues
1. **SMS Not Sending**
   - Check Twilio credentials
   - Verify phone number format (+1234567890)
   - Check account balance

2. **Invalid Phone Numbers**
   - Ensure international format
   - Remove special characters
   - Validate country codes

3. **Delivery Failures**
   - Check recipient carrier restrictions
   - Verify message content compliance
   - Review error logs

### Error Codes
- `21211` - Invalid phone number
- `21408` - Permission denied
- `21614` - Invalid sender number
- `30001` - Queue overflow

## Best Practices

1. **Message Content**
   - Keep messages under 160 characters
   - Include restaurant name and contact info
   - Use clear, professional language

2. **Timing**
   - Send confirmations immediately
   - Send reminders 24 hours before
   - Avoid late night/early morning sends

3. **Compliance**
   - Obtain customer consent
   - Provide opt-out instructions
   - Follow local SMS regulations

## Monitoring & Analytics

### SMS Dashboard
- Message delivery rates
- Cost per message
- Popular sending times
- Error rate tracking

### Reporting
- Daily/weekly SMS reports
- Customer engagement metrics
- Cost analysis and optimization

## Integration with Booking System

### Automatic Triggers
1. **New Booking Created** → Confirmation SMS
2. **Booking Modified** → Update SMS
3. **24 Hours Before Booking** → Reminder SMS
4. **Booking Cancelled** → Cancellation SMS

### Manual Triggers
- Send custom SMS to customers
- Bulk SMS for promotions
- Emergency notifications

## Support

For technical support or questions:
1. Check error logs in the application
2. Review Twilio console for delivery status
3. Contact your development team for custom modifications

---

**Note**: This SMS system is fully integrated with your restaurant booking platform and ready for production use. All Twilio credentials are securely configured and the system is monitoring message delivery status.