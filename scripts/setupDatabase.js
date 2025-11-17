/**
 * Firestore Database Setup Script
 * Run this script to verify and initialize your Firestore database
 * 
 * Usage: node scripts/setupDatabase.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC6phzdn2txoMd_Jur5eLKgu486VjA2qMY",
  authDomain: "yatirimv3.firebaseapp.com",
  projectId: "yatirimv3",
  storageBucket: "yatirimv3.firebasestorage.app",
  messagingSenderId: "413994394319",
  appId: "1:413994394319:web:03e89e896a243558ef0dba",
  measurementId: "G-ZSDSB33KGB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupDatabase() {
  console.log('='.repeat(60));
  console.log('🔥 FIRESTORE DATABASE SETUP SCRIPT');
  console.log('='.repeat(60));

  try {
    console.log('\n📋 Checking Firestore connection...');
    
    // Try to access users collection
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log('✅ Firestore connection: SUCCESS');
    console.log(`📊 Users collection: ${snapshot.empty ? 'Empty (ready for first user)' : `${snapshot.size} documents found`}`);
    
    if (!snapshot.empty) {
      console.log('\n👥 Existing users:');
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`   - ${data.username} (${data.email}) - Verified: ${data.emailVerified ? '✓' : '✗'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📝 Collection Structure:');
    console.log('   └── users/');
    console.log('       ├── {userId}/');
    console.log('       │   ├── uid: string');
    console.log('       │   ├── username: string');
    console.log('       │   ├── email: string');
    console.log('       │   ├── emailVerified: boolean');
    console.log('       │   ├── createdAt: timestamp');
    console.log('       │   └── updatedAt: timestamp');
    
    console.log('\n💡 Next Steps:');
    console.log('1. ✅ Firestore is ready to use');
    console.log('2. Register a new user in your app');
    console.log('3. User data will automatically appear in Firestore');
    console.log('4. Check Firebase Console → Firestore to view data\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n⚠️  PERMISSION DENIED');
      console.log('📝 Solution:');
      console.log('1. Go to Firebase Console → Firestore → Rules');
      console.log('2. Update rules to allow read/write access');
      console.log('3. For testing, you can temporarily use:');
      console.log('\n   allow read, write: if true;\n');
    } else if (error.code === 'unavailable') {
      console.error('\n⚠️  FIRESTORE NOT ENABLED');
      console.log('📝 Solution:');
      console.log('1. Go to Firebase Console');
      console.log('2. Click "Firestore Database"');
      console.log('3. Click "Create Database"');
      console.log('4. Choose a location and click "Enable"\n');
    } else {
      console.log('\n📝 Troubleshooting:');
      console.log('1. Verify Firestore is enabled in Firebase Console');
      console.log('2. Check your internet connection');
      console.log('3. Verify Firebase configuration is correct\n');
    }

    process.exit(1);
  }
}

setupDatabase();

