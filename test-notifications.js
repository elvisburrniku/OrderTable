// Quick test script to check notification API response
const fetch = require('node-fetch');

async function testNotifications() {
  try {
    const response = await fetch('http://localhost:5000/api/tenants/6/restaurants/2/notifications', {
      headers: {
        'Cookie': 'connect.sid=s%3A5VdZnZQO8OW_P0FZ6L6T8EhvFE2ZrJ6K.%2BkQsGlP8wUQZ6gGl%2Fp8LgH6Z8J2fQ6sZ8wR6K4E8Wr6'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('First notification:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Response status:', response.status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testNotifications();