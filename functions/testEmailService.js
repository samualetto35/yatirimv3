/**
 * Email Service Test Script
 * 
 * Bu script email servisini lokal olarak test etmenizi sağlar.
 * 
 * Kullanım:
 *   node testEmailService.js [command]
 * 
 * Komutlar:
 *   single   - Tek bir test emaili gönder (admin email'e)
 *   saturday - Cumartesi hatırlatma şablonunu test et
 *   sunday   - Pazar hatırlatma şablonunu test et
 *   announce - Duyuru şablonunu test et
 *   list     - Tüm kullanıcı emaillerini listele
 * 
 * Önce API key'i ayarlayın:
 *   export RESEND_API_KEY="re_xxxxx"
 */

const admin = require('firebase-admin');

// Firebase Admin'i başlat
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Email service'i yükle
const emailService = require('./emailService');

// Test için hafta ID'si
function getTestWeekId() {
  const now = new Date();
  const tmp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo + 1).padStart(2, '0')}`;
}

// Admin email - bu emaile test gönderilecek
const TEST_EMAIL = 'abdussamet.yildiz@sabanciuniv.edu';

async function testSingleEmail() {
  console.log('\n📧 Testing single email send...\n');
  
  const result = await emailService.sendEmail({
    to: TEST_EMAIL,
    subject: '🧪 Test Email - Yatırım Yarışması',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #6366f1;">✅ Email Sistemi Çalışıyor!</h1>
        <p>Bu bir test emailidir.</p>
        <p>Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}</p>
      </div>
    `
  });
  
  console.log('Result:', result);
  return result;
}

async function testSaturdayTemplate() {
  console.log('\n📧 Testing Saturday reminder template...\n');
  
  const weekId = getTestWeekId();
  const template = emailService.EMAIL_TEMPLATES.saturdayReminder(weekId);
  
  console.log('Subject:', template.subject);
  console.log('WeekId:', weekId);
  
  const result = await emailService.sendEmail({
    to: TEST_EMAIL,
    subject: `[TEST] ${template.subject}`,
    html: template.html.replace(/\{\{username\}\}/g, 'Test Kullanıcı')
  });
  
  console.log('Result:', result);
  return result;
}

async function testSundayTemplate() {
  console.log('\n📧 Testing Sunday reminder template...\n');
  
  const weekId = getTestWeekId();
  const template = emailService.EMAIL_TEMPLATES.sundayReminder(weekId, 3);
  
  console.log('Subject:', template.subject);
  console.log('WeekId:', weekId);
  
  const result = await emailService.sendEmail({
    to: TEST_EMAIL,
    subject: `[TEST] ${template.subject}`,
    html: template.html.replace(/\{\{username\}\}/g, 'Test Kullanıcı')
  });
  
  console.log('Result:', result);
  return result;
}

async function testAnnouncementTemplate() {
  console.log('\n📧 Testing announcement template...\n');
  
  const template = emailService.EMAIL_TEMPLATES.announcement(
    'Önemli Güncelleme: Yeni Özellikler Eklendi',
    'Merhaba değerli yarışmacımız,\n\nPlatformumuzda yeni özellikler aktif hale geldi:\n\n• Günlük portföy takibi\n• Gelişmiş grafik analizi\n• Haftalık raporlar\n\nİyi yatırımlar!',
    'https://yatirimapp.com/updates'
  );
  
  console.log('Subject:', template.subject);
  
  const result = await emailService.sendEmail({
    to: TEST_EMAIL,
    subject: `[TEST] ${template.subject}`,
    html: template.html.replace(/\{\{username\}\}/g, 'Test Kullanıcı')
  });
  
  console.log('Result:', result);
  return result;
}

async function listAllUsers() {
  console.log('\n👥 Fetching all user emails...\n');
  
  const users = await emailService.getAllUserEmails();
  
  console.log(`Found ${users.length} verified users:\n`);
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email} (${user.username})`);
  });
  
  return users;
}

async function testGetUsersWithoutAllocation() {
  console.log('\n👥 Fetching users without allocation...\n');
  
  const weekId = getTestWeekId();
  console.log('Week ID:', weekId);
  
  const users = await emailService.getUsersWithoutAllocation(weekId);
  
  console.log(`Found ${users.length} users without allocation:\n`);
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email} (${user.username})`);
  });
  
  return users;
}

// Ana çalıştırma fonksiyonu
async function main() {
  const command = process.argv[2] || 'help';
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  📧 Email Service Test Tool - Yatırım Yarışması');
  console.log('═══════════════════════════════════════════════════════');
  
  // API key kontrolü
  if (!process.env.RESEND_API_KEY) {
    console.error('\n❌ RESEND_API_KEY environment variable is not set!');
    console.log('\nSet it with:');
    console.log('  export RESEND_API_KEY="re_xxxxx"');
    console.log('\nOr run with:');
    console.log('  RESEND_API_KEY="re_xxxxx" node testEmailService.js single\n');
    process.exit(1);
  }
  
  console.log(`\nAPI Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`Command: ${command}\n`);
  
  try {
    switch (command) {
      case 'single':
        await testSingleEmail();
        break;
      case 'saturday':
        await testSaturdayTemplate();
        break;
      case 'sunday':
        await testSundayTemplate();
        break;
      case 'announce':
        await testAnnouncementTemplate();
        break;
      case 'list':
        await listAllUsers();
        break;
      case 'noalloc':
        await testGetUsersWithoutAllocation();
        break;
      case 'all':
        await testSingleEmail();
        await testSaturdayTemplate();
        await testSundayTemplate();
        await testAnnouncementTemplate();
        break;
      case 'help':
      default:
        console.log('Available commands:');
        console.log('  single   - Send a simple test email');
        console.log('  saturday - Test Saturday reminder template');
        console.log('  sunday   - Test Sunday reminder template');
        console.log('  announce - Test announcement template');
        console.log('  list     - List all user emails');
        console.log('  noalloc  - List users without allocation');
        console.log('  all      - Run all email tests');
        console.log('  help     - Show this help');
        break;
    }
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
