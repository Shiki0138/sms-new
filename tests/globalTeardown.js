/**
 * Global test teardown - runs once after all tests
 */

module.exports = async () => {
  console.log('🏁 Test suite completed');
  console.log('⏰ Finished at:', new Date().toISOString());
  console.log('🧹 Cleaning up test environment');
  
  // Cleanup any global resources here if needed
  // For example: close database connections, clear caches, etc.
  
  console.log('✅ Global test teardown completed');
};