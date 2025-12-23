/**
 * Create Users Collection in Firestore
 * This script adds a test user to create the "users" collection
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createUsersCollection() {
  console.log('='.repeat(60));
  console.log('🔥 CREATING USERS COLLECTION IN FIRESTORE');
  console.log('='.repeat(60));

  try {
    console.log('\n📝 Creating test user document...');
    
    // Create a sample user document
    const testUserId = 'test-user-' + Date.now();
    const userRef = doc(db, 'users', testUserId);
    
    const testUserData = {
      uid: testUserId,
      username: 'Test User',
      email: 'test@example.com',
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, testUserData);

    console.log('✅ Test user created successfully!');
    console.log('\n📊 User Details:');
    console.log(`   ID: ${testUserId}`);
    console.log(`   Username: ${testUserData.username}`);
    console.log(`   Email: ${testUserData.email}`);
    console.log(`   Verified: ${testUserData.emailVerified}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ USERS COLLECTION CREATED!');
    console.log('='.repeat(60));

    console.log('\n📍 Next Steps:');
    console.log('1. Go to Firebase Console → Firestore Database');
    console.log('2. You should now see "users" collection');
    console.log('3. Click on it to see your test user');
    console.log('\n🔗 Direct link:');
    console.log('   https://console.firebase.google.com/project/yatirimv3/firestore/data\n');

    console.log('💡 Note: This is a test user. Real users will be added');
    console.log('   automatically when they register in your app.\n');

    console.log('🗑️  You can delete this test user from Firebase Console\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    
    if (error.code === 'permission-denied') {
      console.error('\n⚠️  PERMISSION DENIED');
      console.log('\n📝 You need to set up Firestore security rules first!');
      console.log('\n🔧 Quick Fix:');
      console.log('1. Go to: https://console.firebase.google.com/project/yatirimv3/firestore/rules');
      console.log('2. Replace rules with:\n');
      console.log('rules_version = \'2\';');
      console.log('service cloud.firestore {');
      console.log('  match /databases/{database}/documents {');
      console.log('    match /{document=**} {');
      console.log('      allow read, write: if true;  // Temporary test rule');
      console.log('    }');
      console.log('  }');
      console.log('}');
      console.log('\n3. Click "Publish"');
      console.log('4. Run this script again\n');
      console.log('⚠️  Remember to update to secure rules after testing!');
      console.log('   See: FIRESTORE_RULES_SETUP.md\n');
    } else if (error.code === 'unavailable') {
      console.error('\n⚠️  FIRESTORE NOT AVAILABLE');
      console.log('\n📝 Solution:');
      console.log('1. Go to Firebase Console');
      console.log('2. Enable Firestore Database');
      console.log('3. Run this script again\n');
    }

    process.exit(1);
  }
}

createUsersCollection();

