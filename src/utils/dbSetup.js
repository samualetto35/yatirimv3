/**
 * Database Setup Utility
 * Run this to verify Firestore is properly configured
 */

import { initializeDatabase, checkDatabaseHealth, getDatabaseStats } from '../services/initializeDatabase';

/**
 * Run database setup and verification
 */
export const runDatabaseSetup = async () => {
  console.log('='.repeat(50));
  console.log('🚀 FIRESTORE DATABASE SETUP');
  console.log('='.repeat(50));

  // Step 1: Initialize database
  console.log('\n📋 Step 1: Initializing database structure...');
  const initResult = await initializeDatabase();
  
  if (!initResult.success) {
    console.error('\n❌ Database initialization failed!');
    console.error('Error:', initResult.error);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Firestore is enabled in Firebase Console');
    console.log('2. Check your security rules');
    console.log('3. Verify your Firebase configuration');
    return false;
  }

  // Step 2: Health check
  console.log('\n📋 Step 2: Running health check...');
  const health = await checkDatabaseHealth();
  
  if (health.status === 'healthy') {
    console.log('✅ Database connection: Healthy');
  } else {
    console.error('❌ Database connection: Unhealthy');
    console.error('Error:', health.error);
    return false;
  }

  // Step 3: Get stats
  console.log('\n📋 Step 3: Getting database statistics...');
  const stats = await getDatabaseStats();
  
  if (stats) {
    console.log('📊 Database Statistics:');
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Verified Users: ${stats.verifiedUsers}`);
    console.log(`   Unverified Users: ${stats.unverifiedUsers}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ DATABASE SETUP COMPLETE!');
  console.log('='.repeat(50));
  console.log('\n📝 Next Steps:');
  console.log('1. Register a test user');
  console.log('2. Verify the email');
  console.log('3. Login to see the dashboard');
  console.log('4. Check Firestore Console to see your data\n');

  return true;
};

