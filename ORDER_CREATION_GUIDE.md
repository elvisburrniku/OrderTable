# Kitchen Order Creation Guide

## How to Create Orders for Kitchen Management

### Method 1: Using the Kitchen Dashboard (Recommended)

1. **Access the Kitchen Dashboard**
   - Navigate to: `http://localhost:5000/58/kitchen-dashboard`
   - Look for the "Create New Order" button in the top-right corner

2. **Click "Create New Order"**
   - Opens a comprehensive order creation dialog
   - Contains two main sections: Order Details and Menu Items

3. **Fill Order Information (Left Side)**
   - **Order Number**: Enter manually or click "Generate" for auto-number (e.g., K123456789)
   - **Table Number**: Enter table identifier (e.g., T12, Table 5)
   - **Customer Name**: Enter customer's name
   - **Priority Level**: Select from Low, Medium, High, or Urgent
   - **Special Instructions**: Add any kitchen notes (optional)

4. **Add Menu Items (Right Side)**
   - Browse menu items organized by category
   - Click on any item to add it to the order
   - Items show: name, description, preparation time, and price
   - Menu items are automatically loaded from your restaurant's menu

5. **Manage Order Items (Left Side - Order Summary)**
   - Adjust quantities using +/- buttons
   - Remove items with X button
   - Add special instructions for individual items
   - View real-time totals: estimated time and price

6. **Submit Order**
   - Review order summary at bottom
   - Click "Send to Kitchen" to create the order
   - Order immediately appears in Active Orders tab
   - Kitchen staff receive real-time notification

### Method 2: API Integration

For system integration, orders can be created via API:

**Endpoint**: `POST /api/tenants/{tenantId}/restaurants/{restaurantId}/kitchen/orders`

**Request Body Example**:
```json
{
  "orderNumber": "K123456789",
  "tableNumber": "T12",
  "customerName": "John Smith",
  "items": [
    {
      "id": 6,
      "name": "Grilled Salmon",
      "quantity": 2,
      "price": 24.99,
      "preparationTime": 15,
      "category": "Main Course",
      "specialInstructions": "Medium-rare"
    }
  ],
  "priority": "medium",
  "estimatedTime": 15,
  "totalAmount": 4998,
  "specialInstructions": "Rush order for anniversary dinner"
}
```

### Order Processing Workflow

Once created, orders follow this workflow:

1. **Pending** → Order created, waiting for kitchen to start
2. **Preparing** → Kitchen has started preparation
3. **Ready** → Order is complete and ready for service
4. **Served** → Order has been delivered to customer

### Key Features

- **Smart Time Calculation**: System automatically calculates estimated preparation time based on menu items and kitchen capacity
- **Priority Management**: Color-coded priority levels (Red=Urgent, Orange=High, Yellow=Medium, Green=Low)
- **Real-time Updates**: Orders appear immediately in kitchen dashboard
- **Menu Integration**: Uses actual menu items with real pricing and prep times
- **Auto Order Numbers**: Generate unique order numbers automatically
- **Special Instructions**: Support for both order-level and item-level instructions

### Testing the System

1. Access the kitchen dashboard
2. Click "Create New Order"
3. Fill in sample data:
   - Order Number: K001 (or generate)
   - Table: T5
   - Customer: Test Customer
   - Add a few menu items
   - Set priority to High
4. Submit the order
5. Check the "Active Orders" tab to see your new order
6. Test order status updates by clicking status buttons

### Integration Points

The order creation system integrates with:
- **Menu Management**: Uses actual menu items and categories
- **Kitchen Dashboard**: Real-time order display and status tracking
- **Performance Analytics**: Orders contribute to efficiency metrics
- **Staff Management**: Orders are assigned to kitchen stations and staff

Orders created through this system become part of the complete kitchen workflow and contribute to all performance metrics and analytics displayed in the kitchen dashboard.