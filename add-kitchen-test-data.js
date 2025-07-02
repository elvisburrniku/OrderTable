
const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const { kitchenOrders, kitchenStations, kitchenStaff, kitchenMetrics } = require('./shared/schema.ts');

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function addKitchenTestData() {
  try {
    console.log('Adding kitchen test data for tenant 3, restaurant 8...');

    // Add kitchen stations
    const stations = [
      {
        restaurantId: 8,
        tenantId: 3,
        name: 'Grill Station',
        type: 'grill',
        currentOrders: 2,
        capacity: 5,
        efficiency: 85,
        averageTime: 18,
        isActive: true,
        temperature: 400,
        lastMaintenance: new Date('2024-01-15').toISOString()
      },
      {
        restaurantId: 8,
        tenantId: 3,
        name: 'Fryer Station',
        type: 'fryer',
        currentOrders: 1,
        capacity: 3,
        efficiency: 92,
        averageTime: 12,
        isActive: true,
        temperature: 375,
        lastMaintenance: new Date('2024-01-10').toISOString()
      },
      {
        restaurantId: 8,
        tenantId: 3,
        name: 'Salad Prep',
        type: 'salad',
        currentOrders: 3,
        capacity: 4,
        efficiency: 78,
        averageTime: 8,
        isActive: true,
        lastMaintenance: new Date('2024-01-20').toISOString()
      },
      {
        restaurantId: 8,
        tenantId: 3,
        name: 'Dessert Station',
        type: 'dessert',
        currentOrders: 0,
        capacity: 2,
        efficiency: 95,
        averageTime: 15,
        isActive: true,
        lastMaintenance: new Date('2024-01-18').toISOString()
      },
      {
        restaurantId: 8,
        tenantId: 3,
        name: 'Beverage Station',
        type: 'beverage',
        currentOrders: 4,
        capacity: 6,
        efficiency: 88,
        averageTime: 5,
        isActive: true,
        lastMaintenance: new Date('2024-01-22').toISOString()
      },
      {
        restaurantId: 8,
        tenantId: 3,
        name: 'Prep Kitchen',
        type: 'prep',
        currentOrders: 1,
        capacity: 3,
        efficiency: 82,
        averageTime: 25,
        isActive: true,
        lastMaintenance: new Date('2024-01-12').toISOString()
      }
    ];

    await db.insert(kitchenStations).values(stations);
    console.log('Kitchen stations added successfully');

    // Add kitchen staff
    const staff = [
      {
        restaurantId: 8,
        tenantId: 3,
        userId: null,
        name: 'Chef Marcus Johnson',
        role: 'head_chef',
        shift: 'evening',
        efficiency: 95,
        ordersCompleted: 24,
        status: 'active',
        currentStation: 'Grill Station'
      },
      {
        restaurantId: 8,
        tenantId: 3,
        userId: null,
        name: 'Sarah Chen',
        role: 'sous_chef',
        shift: 'evening',
        efficiency: 88,
        ordersCompleted: 18,
        status: 'active',
        currentStation: 'Prep Kitchen'
      },
      {
        restaurantId: 8,
        tenantId: 3,
        userId: null,
        name: 'Mike Rodriguez',
        role: 'line_cook',
        shift: 'evening',
        efficiency: 82,
        ordersCompleted: 15,
        status: 'active',
        currentStation: 'Fryer Station'
      },
      {
        restaurantId: 8,
        tenantId: 3,
        userId: null,
        name: 'Emily Thompson',
        role: 'line_cook',
        shift: 'evening',
        efficiency: 85,
        ordersCompleted: 16,
        status: 'active',
        currentStation: 'Salad Prep'
      },
      {
        restaurantId: 8,
        tenantId: 3,
        userId: null,
        name: 'David Kim',
        role: 'prep_cook',
        shift: 'morning',
        efficiency: 78,
        ordersCompleted: 12,
        status: 'break',
        currentStation: 'Prep Kitchen'
      },
      {
        restaurantId: 8,
        tenantId: 3,
        userId: null,
        name: 'Lisa Garcia',
        role: 'line_cook',
        shift: 'evening',
        efficiency: 90,
        ordersCompleted: 19,
        status: 'active',
        currentStation: 'Dessert Station'
      }
    ];

    await db.insert(kitchenStaff).values(staff);
    console.log('Kitchen staff added successfully');

    // Add kitchen orders
    const orders = [
      {
        restaurantId: 8,
        tenantId: 3,
        orderNumber: 'K001',
        tableNumber: '12',
        customerName: 'John Smith',
        items: JSON.stringify([
          { id: 1, name: 'Grilled Salmon', quantity: 1, preparationTime: 15, category: 'main', specialInstructions: 'Medium rare' },
          { id: 2, name: 'Caesar Salad', quantity: 1, preparationTime: 8, category: 'salad' }
        ]),
        status: 'preparing',
        priority: 'medium',
        estimatedTime: 20,
        startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        totalAmount: 2850,
        specialInstructions: 'Customer has shellfish allergy'
      },
      {
        restaurantId: 8,
        tenantId: 3,
        orderNumber: 'K002',
        tableNumber: '8',
        customerName: 'Maria Garcia',
        items: JSON.stringify([
          { id: 3, name: 'Chicken Wings', quantity: 12, preparationTime: 12, category: 'appetizer' },
          { id: 4, name: 'Craft Beer', quantity: 2, preparationTime: 2, category: 'beverage' }
        ]),
        status: 'pending',
        priority: 'high',
        estimatedTime: 15,
        totalAmount: 1650
      },
      {
        restaurantId: 8,
        tenantId: 3,
        orderNumber: 'K003',
        tableNumber: '15',
        customerName: 'Robert Johnson',
        items: JSON.stringify([
          { id: 5, name: 'Ribeye Steak', quantity: 1, preparationTime: 25, category: 'main', specialInstructions: 'Well done' },
          { id: 6, name: 'Loaded Fries', quantity: 1, preparationTime: 10, category: 'side' },
          { id: 7, name: 'Red Wine', quantity: 1, preparationTime: 3, category: 'beverage' }
        ]),
        status: 'ready',
        priority: 'medium',
        estimatedTime: 28,
        actualTime: 25,
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        readyAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        totalAmount: 4200
      },
      {
        restaurantId: 8,
        tenantId: 3,
        orderNumber: 'K004',
        tableNumber: '22',
        customerName: 'Lisa Chen',
        items: JSON.stringify([
          { id: 8, name: 'Vegetarian Pasta', quantity: 1, preparationTime: 18, category: 'main' },
          { id: 9, name: 'Garlic Bread', quantity: 2, preparationTime: 6, category: 'side' }
        ]),
        status: 'preparing',
        priority: 'low',
        estimatedTime: 20,
        startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        totalAmount: 1850
      },
      {
        restaurantId: 8,
        tenantId: 3,
        orderNumber: 'K005',
        tableNumber: '5',
        customerName: 'David Brown',
        items: JSON.stringify([
          { id: 10, name: 'Fish & Chips', quantity: 1, preparationTime: 15, category: 'main' },
          { id: 11, name: 'Coleslaw', quantity: 1, preparationTime: 5, category: 'side' },
          { id: 12, name: 'Lemonade', quantity: 2, preparationTime: 3, category: 'beverage' }
        ]),
        status: 'ready',
        priority: 'high',
        estimatedTime: 18,
        actualTime: 16,
        startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
        readyAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(), // 9 minutes ago
        totalAmount: 2200
      }
    ];

    await db.insert(kitchenOrders).values(orders);
    console.log('Kitchen orders added successfully');

    // Add kitchen metrics
    const today = new Date().toISOString().split('T')[0];
    const metrics = {
      restaurantId: 8,
      tenantId: 3,
      date: today,
      ordersCompleted: 8,
      averageTime: 18,
      efficiency: 87,
      revenue: 15750, // in cents
      peakHour: 19, // 7 PM
      popularItems: JSON.stringify([
        { name: 'Grilled Salmon', orders: 3, time: 15 },
        { name: 'Chicken Wings', orders: 5, time: 12 },
        { name: 'Ribeye Steak', orders: 2, time: 25 }
      ]),
      stationUtilization: JSON.stringify([
        { station: 'Grill Station', utilization: 85 },
        { station: 'Fryer Station', utilization: 92 },
        { station: 'Salad Prep', utilization: 78 },
        { station: 'Dessert Station', utilization: 45 },
        { station: 'Beverage Station', utilization: 88 },
        { station: 'Prep Kitchen', utilization: 65 }
      ]),
      waitTimes: JSON.stringify([
        { time: '17:00', wait: 12 },
        { time: '18:00', wait: 15 },
        { time: '19:00', wait: 22 },
        { time: '20:00', wait: 18 },
        { time: '21:00', wait: 14 }
      ])
    };

    await db.insert(kitchenMetrics).values([metrics]);
    console.log('Kitchen metrics added successfully');

    console.log('All kitchen test data added successfully!');
    console.log('You can now visit /3/kitchen-dashboard to see the functional stations and staff tabs');

  } catch (error) {
    console.error('Error adding kitchen test data:', error);
  }
}

addKitchenTestData();
