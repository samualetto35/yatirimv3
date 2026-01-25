/**
 * Email Service - Gmail SMTP (Nodemailer)
 * 
 * Haftalık hatırlatmalar ve duyuru emaillerini yönetir.
 * 
 * Emails:
 * - Cumartesi 10:00: Hafta açıldı hatırlatması (tüm kullanıcılar)
 * - Pazar 21:00: Son dakika hatırlatması (sadece tahsis yapmayanlar)
 * - Duyuru: Yeni duyuru eklendiğinde (tüm kullanıcılar)
 */

const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Gmail SMTP transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const email = functions.config().gmail?.email || process.env.GMAIL_EMAIL;
    const password = functions.config().gmail?.password || process.env.GMAIL_PASSWORD;
    
    if (!email || !password) {
      throw new Error('Gmail credentials not configured. Run: firebase functions:config:set gmail.email="x" gmail.password="y"');
    }
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password
      }
    });
  }
  return transporter;
}

// Email gönderici bilgileri
const FROM_NAME = 'Yatırım Yarışması';
const APP_URL = 'https://yatirimv3.netlify.app';

function getFromEmail() {
  return functions.config().gmail?.email || process.env.GMAIL_EMAIL || 'yatirimoyun@gmail.com';
}

// Firestore referansı
function getDb() {
  return admin.firestore();
}

/**
 * Tüm doğrulanmış kullanıcıların email bilgilerini getir
 */
async function getAllUserEmails() {
  const db = getDb();
  const usersSnap = await db.collection('users').get();
  const users = [];
  
  usersSnap.forEach(doc => {
    const data = doc.data();
    // Sadece email doğrulanmış kullanıcıları al
    if (data.email && data.emailVerified !== false) {
      users.push({
        uid: doc.id,
        email: data.email,
        username: data.username || 'Yarışmacı',
        emailPreferences: data.emailPreferences || {
          weeklyReminder: true,
          sundayReminder: true,
          announcements: true
        }
      });
    }
  });
  
  console.log(`Found ${users.length} verified users for email`);
  return users;
}

/**
 * Belirli bir haftada tahsis yapmamış kullanıcıları getir
 */
async function getUsersWithoutAllocation(weekId) {
  const db = getDb();
  
  // Tahsis yapanları bul
  const allocsSnap = await db.collection('allocations')
    .where('weekId', '==', weekId)
    .get();
  
  const allocatedUids = new Set(allocsSnap.docs.map(d => d.data().uid));
  
  // Tüm kullanıcıları al ve tahsis yapmayanları filtrele
  const allUsers = await getAllUserEmails();
  const usersWithoutAlloc = allUsers.filter(u => !allocatedUids.has(u.uid));
  
  console.log(`Found ${usersWithoutAlloc.length} users without allocation for ${weekId}`);
  return usersWithoutAlloc;
}

/**
 * Tek bir email gönder
 */
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  const fromEmail = getFromEmail();
  
  try {
    const info = await transport.sendMail({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html
    });
    
    console.log(`✅ Email sent to ${to}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Kullanıcı listesine toplu email gönder
 */
async function sendBulkEmail({ users, subject, html, preferenceKey = null }) {
  if (!users || users.length === 0) {
    console.log('No users to send email to');
    return { sent: 0, failed: 0, total: 0, skipped: 0 };
  }
  
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  
  // Gmail rate limit için delay
  const delayBetweenEmails = 500; // ms
  
  for (const user of users) {
    // Email tercihlerini kontrol et
    if (preferenceKey && user.emailPreferences && user.emailPreferences[preferenceKey] === false) {
      skipped++;
      continue;
    }
    
    const personalizedHtml = html.replace(/\{\{username\}\}/g, user.username);
    
    const result = await sendEmail({
      to: user.email,
      subject,
      html: personalizedHtml
    });
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, delayBetweenEmails));
  }
  
  console.log(`📧 Bulk email complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  return { sent, failed, skipped, total: users.length };
}

// ============ EMAIL ŞABLONLARI ============

const EMAIL_TEMPLATES = {
  /**
   * Cumartesi sabahı - Hafta açıldı hatırlatması
   */
  saturdayReminder: (weekId) => ({
    subject: `🎯 ${weekId} Haftası Başladı! Tahsisinizi Yapın`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yeni Hafta Başladı</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f1f5f9; -webkit-font-smoothing: antialiased;">
  <div style="max-width:560px; margin:0 auto; padding:24px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding:36px 32px; border-radius:20px 20px 0 0; text-align:center;">
      <div style="font-size:48px; margin-bottom:12px;">📈</div>
      <h1 style="margin:0; color:#fff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">Yeni Hafta Başladı!</h1>
      <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:15px;">${weekId}</p>
    </div>
    
    <!-- Content -->
    <div style="background:#fff; padding:32px; border-radius:0 0 20px 20px; border:1px solid #e2e8f0; border-top:none;">
      <p style="font-size:17px; color:#1e293b; margin:0 0 16px; line-height:1.5;">
        Merhaba <strong>{{username}}</strong> 👋
      </p>
      <p style="color:#475569; line-height:1.7; font-size:15px; margin:0 0 20px;">
        Bu hafta için tahsis penceresi açıldı! Portföyünüzü oluşturmak ve yarışmaya katılmak için hisselerinizi seçin.
      </p>
      
      <!-- Alert Box -->
      <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left:4px solid #f59e0b; padding:16px 18px; margin:24px 0; border-radius:12px;">
        <div style="display:flex; align-items:center;">
          <span style="font-size:20px; margin-right:10px;">⏰</span>
          <div>
            <strong style="color:#92400e; font-size:14px;">Son Tarih</strong>
            <div style="color:#78350f; font-size:15px; font-weight:600;">Pazar 23:00 (Türkiye Saati)</div>
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align:center; margin:28px 0 8px;">
        <a href="${APP_URL}" style="display:inline-block; background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color:#fff; padding:16px 40px; text-decoration:none; border-radius:12px; font-weight:600; font-size:16px; box-shadow:0 4px 14px rgba(99,102,241,0.4);">
          🚀 Tahsisimi Yap
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center; padding:20px;">
      <p style="color:#94a3b8; font-size:12px; margin:0;">
        Yatırım Yarışması • <a href="${APP_URL}" style="color:#6366f1; text-decoration:none;">yatirimv3.netlify.app</a>
      </p>
    </div>
  </div>
</body>
</html>`
  }),

  /**
   * Pazar akşamı - Son dakika hatırlatması (sadece tahsis yapmayanlar)
   */
  sundayReminder: (weekId, hoursLeft = 2) => ({
    subject: `⚠️ Son ${hoursLeft} Saat! ${weekId} Tahsisinizi Yapmayı Unutmayın`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Son Dakika Hatırlatması</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f1f5f9; -webkit-font-smoothing: antialiased;">
  <div style="max-width:560px; margin:0 auto; padding:24px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding:36px 32px; border-radius:20px 20px 0 0; text-align:center;">
      <div style="font-size:48px; margin-bottom:12px;">⏰</div>
      <h1 style="margin:0; color:#fff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">Son Dakika!</h1>
      <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:15px;">Sadece ${hoursLeft} saat kaldı</p>
    </div>
    
    <!-- Content -->
    <div style="background:#fff; padding:32px; border-radius:0 0 20px 20px; border:1px solid #e2e8f0; border-top:none;">
      <p style="font-size:17px; color:#1e293b; margin:0 0 16px; line-height:1.5;">
        Merhaba <strong>{{username}}</strong> 👋
      </p>
      <p style="color:#475569; line-height:1.7; font-size:15px; margin:0 0 20px;">
        <strong>${weekId}</strong> haftası için tahsis penceresi <strong>bu gece 23:00'te kapanıyor!</strong> Henüz tahsisinizi yapmadığınızı fark ettik.
      </p>
      
      <!-- Urgent Alert Box -->
      <div style="background:linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left:4px solid #ef4444; padding:16px 18px; margin:24px 0; border-radius:12px;">
        <div style="display:flex; align-items:flex-start;">
          <span style="font-size:20px; margin-right:10px;">🔴</span>
          <div>
            <strong style="color:#991b1b; font-size:14px;">Dikkat!</strong>
            <div style="color:#7f1d1d; font-size:14px; line-height:1.5; margin-top:4px;">
              Tahsisinizi yapmadığınız takdirde bu hafta yarışmaya katılamayacaksınız ve sıralamanız etkilenecek.
            </div>
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align:center; margin:28px 0 8px;">
        <a href="${APP_URL}" style="display:inline-block; background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color:#fff; padding:16px 40px; text-decoration:none; border-radius:12px; font-weight:600; font-size:16px; box-shadow:0 4px 14px rgba(239,68,68,0.4);">
          🚀 Hemen Tahsis Yap
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center; padding:20px;">
      <p style="color:#94a3b8; font-size:12px; margin:0;">
        Yatırım Yarışması • <a href="${APP_URL}" style="color:#ef4444; text-decoration:none;">yatirimv3.netlify.app</a>
      </p>
    </div>
  </div>
</body>
</html>`
  }),

  /**
   * Yeni duyuru emaili
   */
  announcement: (title, body, link = null) => ({
    subject: `📢 ${title}`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f1f5f9; -webkit-font-smoothing: antialiased;">
  <div style="max-width:560px; margin:0 auto; padding:24px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding:36px 32px; border-radius:20px 20px 0 0; text-align:center;">
      <div style="font-size:48px; margin-bottom:12px;">📢</div>
      <h1 style="margin:0; color:#fff; font-size:24px; font-weight:700; letter-spacing:-0.5px;">Yeni Duyuru</h1>
    </div>
    
    <!-- Content -->
    <div style="background:#fff; padding:32px; border-radius:0 0 20px 20px; border:1px solid #e2e8f0; border-top:none;">
      <h2 style="color:#1e293b; margin:0 0 16px; font-size:20px; font-weight:700;">${title}</h2>
      <div style="color:#475569; line-height:1.8; font-size:15px; white-space:pre-wrap;">${body}</div>
      
      ${link ? `
      <!-- Link Button -->
      <div style="text-align:center; margin:28px 0 8px;">
        <a href="${link}" style="display:inline-block; background:#3b82f6; color:#fff; padding:14px 32px; text-decoration:none; border-radius:10px; font-weight:600; font-size:15px;">
          Detayları Gör →
        </a>
      </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div style="text-align:center; padding:20px;">
      <p style="color:#94a3b8; font-size:12px; margin:0;">
        Yatırım Yarışması • <a href="${APP_URL}" style="color:#3b82f6; text-decoration:none;">yatirimv3.netlify.app</a>
      </p>
    </div>
  </div>
</body>
</html>`
  })
};

module.exports = {
  getAllUserEmails,
  getUsersWithoutAllocation,
  sendEmail,
  sendBulkEmail,
  EMAIL_TEMPLATES,
  APP_URL
};
