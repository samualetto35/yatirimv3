/**
 * Add Admin User to Firestore
 * This script adds a user to the adminUsers collection
 * 
 * Usage: node scripts/addAdminUser.js <uid>
 * Example: node scripts/addAdminUser.js abc123def456
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

async function addAdminUser(uid) {
  if (!uid) {
    console.error('❌ Hata: UID gerekli');
    console.log('\nKullanım:');
    console.log('  node scripts/addAdminUser.js <uid>');
    console.log('\nÖrnek:');
    console.log('  node scripts/addAdminUser.js abc123def456');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🔐 ADMIN KULLANICI EKLEME');
  console.log('='.repeat(60));

  try {
    console.log(`\n📝 Admin kullanıcı ekleniyor: ${uid}...`);
    
    const adminRef = doc(db, 'adminUsers', uid);
    
    const adminData = {
      createdAt: serverTimestamp(),
      addedBy: 'script',
      note: 'Admin user added via script'
    };

    await setDoc(adminRef, adminData);

    console.log('✅ Admin kullanıcı başarıyla eklendi!');
    console.log('\n📊 Admin Detayları:');
    console.log(`   UID: ${uid}`);
    console.log(`   Koleksiyon: adminUsers`);
    console.log(`   Doküman ID: ${uid}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ İŞLEM TAMAMLANDI!');
    console.log('='.repeat(60));

    console.log('\n📍 Kontrol:');
    console.log('1. Firebase Console → Firestore Database → adminUsers koleksiyonuna gidin');
    console.log(`2. ${uid} ID'li dokümanı görmelisiniz`);
    console.log('\n🔗 Direct link:');
    console.log('   https://console.firebase.google.com/project/yatirimv3/firestore/data/~2FadminUsers~2F' + uid + '\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('\nDetaylar:', error);
    process.exit(1);
  }
}

// Get UID from command line arguments
const uid = process.argv[2];
addAdminUser(uid).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
