# Firestore Setup Guide

## 🚀 Quick Setup Steps

### Step 1: Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **yatirimv3**
3. Click on **"Firestore Database"** in the left menu
4. Click **"Create database"**
5. Choose **Production mode** or **Test mode**:
   - **Test mode** (for development): Open access for 30 days
   - **Production mode** (recommended): Use security rules (provided below)
6. Select database location: Choose closest to your users (e.g., `us-central1`)
7. Click **"Enable"**

### Step 2: Set Security Rules ⚠️ **IMPORTANT**

1. In Firestore Console, go to **"Rules"** tab
2. **Delete all existing rules**
3. Replace with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection rules
    match /users/{userId} {
      // Allow users to read their own document if verified
      allow read: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
      
      // Allow users to create their own document on registration
      allow create: if request.auth != null 
        && request.auth.uid == userId;
      
      // Allow users to update their own document if verified
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
      
      // Don't allow deletion (admin only via console)
      allow delete: if false;
    }
  }
}
```

3. Click **"Publish"**

### Step 3: Verify Setup

1. Run your app: `npm run dev`
2. Register a new test user
3. Go to Firebase Console → Firestore Database
4. You should see:
   - Collection: `users`
   - Document: `[user-id]`
   - Fields: `uid`, `username`, `email`, `emailVerified`, `createdAt`, `updatedAt`

## 📋 Expected Firestore Structure

```
Firestore Database
└── users (collection)
    ├── abc123... (document - user ID)
    │   ├── uid: "abc123..."
    │   ├── username: "John Doe"
    │   ├── email: "john@example.com"
    │   ├── emailVerified: false
    │   ├── createdAt: October 8, 2025 at 4:00:00 PM
    │   └── updatedAt: October 8, 2025 at 4:00:00 PM
    │
    ├── xyz789... (document - another user ID)
    │   └── ...
```

## 🔐 Security Rules Explained

### Read Access
```javascript
allow read: if request.auth != null 
  && request.auth.uid == userId
  && request.auth.token.email_verified == true;
```
- User must be authenticated
- Can only read their own document
- Email must be verified

### Create Access
```javascript
allow create: if request.auth != null 
  && request.auth.uid == userId;
```
- User must be authenticated
- Can only create their own document
- Allows registration flow to work

### Update Access
```javascript
allow update: if request.auth != null 
  && request.auth.uid == userId
  && request.auth.token.email_verified == true;
```
- User must be authenticated
- Can only update their own document
- Email must be verified

### Delete Access
```javascript
allow delete: if false;
```
- No one can delete documents
- Only admins via Firebase Console

## 🧪 Testing Checklist

### Test 1: User Registration
- [ ] Register new user
- [ ] Check Firestore Console
- [ ] Document created with correct data
- [ ] `emailVerified: false`

### Test 2: Email Verification
- [ ] Click verification link
- [ ] Wait on verify-email page (~3 sec)
- [ ] Check Firestore Console
- [ ] `emailVerified: true`

### Test 3: Login & Sync
- [ ] Login with verified account
- [ ] Dashboard loads
- [ ] Shows Firestore data
- [ ] Both cards display correctly

### Test 4: Missing Firestore Doc
- [ ] Delete Firestore doc (keep Auth user)
- [ ] Login
- [ ] Document auto-created
- [ ] Dashboard works correctly

## ⚙️ Optional: Index Configuration

If you get index errors, Firestore will provide a link. Click it to auto-create the index.

Or manually create composite indexes:

1. Go to Firestore → **Indexes** tab
2. Click **Create Index**
3. Collection: `users`
4. Fields to index:
   - `emailVerified` - Ascending
   - `createdAt` - Descending
5. Click **Create**

## 🔧 Troubleshooting

### Issue: "Missing or insufficient permissions"
**Solution:** Check Firestore Rules are published correctly

### Issue: User document not created
**Solution:** 
1. Check browser console for errors
2. Verify Firestore is enabled
3. Check security rules allow `create`

### Issue: emailVerified not updating
**Solution:**
1. Check `/verify-email` page is active
2. Listener should run every 3 seconds
3. Verify email first, then check

### Issue: Dashboard shows "Loading..."
**Solution:**
1. Check network tab for Firestore errors
2. Verify user is authenticated
3. Check security rules allow `read`

## 📊 Monitoring

### View All Users
1. Firebase Console → Firestore
2. Click `users` collection
3. See all user documents

### Check Specific User
1. Copy user ID from Auth tab
2. Firestore → users → [paste ID]
3. View all fields

### Query Users
1. Firestore Console → Query tab
2. Collection: `users`
3. Add filters:
   - `emailVerified == true` (verified users)
   - `createdAt > [date]` (recent users)

## 🎯 Production Checklist

Before going live:

- [ ] Firestore enabled
- [ ] Security rules set (production mode)
- [ ] Test all flows (register, verify, login)
- [ ] Verify data in Firestore Console
- [ ] Set up backup (Firestore → Backups)
- [ ] Monitor usage (Firestore → Usage tab)
- [ ] Set up alerts for quota limits

## 📈 Cost Management

**Free Tier (Spark Plan):**
- 1 GB storage
- 50K reads/day
- 20K writes/day
- 20K deletes/day

**Your App Usage (Estimate):**
- Registration: 1 write
- Login: 1 read + 0-1 write (if update needed)
- Dashboard load: 1 read

**Optimization:**
- User data cached in context
- Only syncs on login
- Minimal reads/writes

## 🔗 Useful Links

- [Firestore Console](https://console.firebase.google.com/project/yatirimv3/firestore)
- [Security Rules Reference](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [Pricing Calculator](https://firebase.google.com/pricing)

---

**Your Firestore database is ready to use!** 🎉

Just enable it in Firebase Console and the app will automatically start syncing user data.

