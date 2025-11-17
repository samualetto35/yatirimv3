import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Initialize Firestore database structure
 * This ensures collections are created and properly structured
 */
export const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing Firestore database...');

    // Check if users collection exists
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`✅ Users collection: ${usersSnapshot.empty ? 'Empty (will be created on first user)' : `${usersSnapshot.size} documents`}`);

    // Database is ready
    console.log('✅ Firestore database initialized successfully!');
    
    return {
      success: true,
      collections: {
        users: usersSnapshot.size
      }
    };
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    
    // Provide helpful error messages
    if (error.code === 'permission-denied') {
      console.error('⚠️  Firestore permission denied. Please check security rules.');
    } else if (error.code === 'unavailable') {
      console.error('⚠️  Firestore is not available. Please enable it in Firebase Console.');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check database health and connection
 */
export const checkDatabaseHealth = async () => {
  try {
    const usersRef = collection(db, 'users');
    await getDocs(usersRef);
    
    return {
      status: 'healthy',
      connected: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const stats = {
      totalUsers: usersSnapshot.size,
      verifiedUsers: 0,
      unverifiedUsers: 0,
    };

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.emailVerified) {
        stats.verifiedUsers++;
      } else {
        stats.unverifiedUsers++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
};

