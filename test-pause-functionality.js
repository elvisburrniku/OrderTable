// Test script for enhanced pause functionality with automatic unpause
const { AdminStorage } = require('./server/admin-storage');
const { storage } = require('./server/storage');

async function testPauseFunctionality() {
  try {
    console.log('Testing enhanced pause functionality...');
    
    const adminStorage = new AdminStorage();
    
    // Get a test tenant (assuming tenant ID 3 exists)
    const tenantId = 3;
    const tenant = await storage.getTenantById(tenantId);
    
    if (!tenant) {
      console.log('No tenant found with ID 3');
      return;
    }
    
    console.log(`Current tenant status: ${tenant.subscriptionStatus}`);
    
    // Test 1: Pause tenant with end date (1 minute from now for quick testing)
    const pauseEndDate = new Date(Date.now() + 60 * 1000); // 1 minute from now
    const pauseReason = "Testing automatic unpause functionality";
    
    console.log(`Pausing tenant until: ${pauseEndDate.toISOString()}`);
    await adminStorage.pauseTenant(tenantId, pauseEndDate, pauseReason);
    
    // Verify pause was applied
    const pausedTenant = await storage.getTenantById(tenantId);
    console.log(`Tenant status after pause: ${pausedTenant.subscriptionStatus}`);
    console.log(`Pause end date: ${pausedTenant.pauseEndDate}`);
    console.log(`Pause reason: ${pausedTenant.pauseReason}`);
    
    // Test 2: Check automatic unpause (simulate time passing)
    console.log('\nWaiting 65 seconds to test automatic unpause...');
    await new Promise(resolve => setTimeout(resolve, 65000));
    
    console.log('Checking for expired pauses...');
    const unpaused = await adminStorage.checkAndUnpauseExpiredTenants();
    console.log(`Tenants unpaused: ${unpaused}`);
    
    // Verify unpause
    const unpausedTenant = await storage.getTenantById(tenantId);
    console.log(`Final tenant status: ${unpausedTenant.subscriptionStatus}`);
    console.log(`Pause end date after unpause: ${unpausedTenant.pauseEndDate}`);
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPauseFunctionality();