# 🔒 Security Fix - API Key Migration

## ⚠️ IMPORTANT: API Key Compromised

Google detected that your Firebase API key was publicly exposed on GitHub. This has been fixed by moving all sensitive credentials to environment variables.

## ✅ What Was Fixed

1. **Moved Firebase config to environment variables** - All API keys are now loaded from `.env` file
2. **Updated files:**
   - `src/firebase/config.js` - Now uses `import.meta.env.VITE_*` variables
   - `scripts/createUsersCollection.js` - Now uses `process.env.VITE_*` variables
   - `scripts/setupDatabase.js` - Now uses `process.env.VITE_*` variables
3. **Created `.env.example`** - Template file for environment variables
4. **`.env` file** - Added to `.gitignore` (already was, but confirmed)

## 🚨 CRITICAL: Regenerate Your API Key

**You MUST regenerate your compromised API key immediately:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find the API key: `AIzaSyC6phzdn2txoMd_Jur5eLKgu486VjA2qMY`
4. Click **Edit** → **Regenerate key**
5. Copy the new key and update your `.env` file

## 📝 Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Firebase credentials** in `.env` file:
   ```env
   VITE_FIREBASE_API_KEY=your_new_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=yatirimv3.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=yatirimv3
   VITE_FIREBASE_STORAGE_BUCKET=yatirimv3.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=413994394319
   VITE_FIREBASE_APP_ID=1:413994394319:web:03e89e896a243558ef0dba
   VITE_FIREBASE_MEASUREMENT_ID=G-ZSDSB33KGB
   ```

3. **Add API Key Restrictions** in Google Cloud Console:
   - Application restrictions: HTTP referrers
   - API restrictions: Firebase APIs only
   - Add your domain(s): `yatirimv3.firebaseapp.com`, `localhost:5173`, etc.

## 🔐 Best Practices

- ✅ **DO** keep `.env` file local and never commit it
- ✅ **DO** use `.env.example` as a template
- ✅ **DO** add API key restrictions in Google Cloud Console
- ❌ **DON'T** commit API keys or secrets to git
- ❌ **DON'T** share `.env` file publicly

## 📚 Additional Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [Google Cloud API Key Security](https://cloud.google.com/docs/authentication/api-keys)

