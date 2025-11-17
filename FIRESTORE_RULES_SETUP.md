# 🔐 Firestore Security Rules Setup

## ⚠️ Important: Set Up Security Rules First!

Your Firestore database is enabled but needs security rules to work properly.

## 🚀 Quick Setup (5 Minutes)

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **yatirimv3**
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at the top

### Step 2: Replace Rules
Copy and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection rules
    match /users/{userId} {
      allow read: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
      allow create: if request.auth != null 
        && request.auth.uid == userId;
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
      allow delete: if false;
    }

    // Weeks (server-managed)
    match /weeks/{weekId} {
      allow read: if request.auth != null && request.auth.token.email_verified == true;
      allow write: if false;
    }

    // Market data (server-managed)
    match /marketData/{weekId} {
      allow read: if request.auth != null && request.auth.token.email_verified == true;
      allow write: if false;
    }

    // Allocations (client creates/updates own)
    match /allocations/{docId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow delete: if false;
    }

    // Balances (server-managed)
    match /balances/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    // Admin allowlist
    match /adminUsers/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    // Logs (readable by admins only; functions write)
    match /logs/{logId} {
      allow read: if request.auth != null && exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid));
      // Allow cloud functions to write by checking auth is null (Admin SDK writes bypass
      // standard client auth). If you want stricter control, keep false and rely on server only.
      allow write: if false;
    }
  }
}
```

### Step 3: Publish Rules
1. Click **Publish** button
2. Wait for "Rules published successfully" message
3. Done! ✅

## 🧪 Verify Setup

After publishing rules, run this command:

```bash
npm run setup:db
```

You should see:
```
✅ Firestore connection: SUCCESS
📊 Users collection: Empty (ready for first user)
✅ DATABASE SETUP COMPLETE!
```

## 📊 What These Rules Do

### ✅ **Read Access**
```javascript
allow read: if request.auth != null 
  && request.auth.uid == userId
  && request.auth.token.email_verified == true;
```
- User must be logged in
- Can only read their OWN document
- Email must be verified

### ✅ **Create Access**
```javascript
allow create: if request.auth != null 
  && request.auth.uid == userId;
```
- User must be logged in
- Can only create their OWN document
- Needed for registration to work

### ✅ **Update Access**
```javascript
allow update: if request.auth != null 
  && request.auth.uid == userId
  && request.auth.token.email_verified == true;
```
- User must be logged in
- Can only update their OWN document
- Email must be verified

### ❌ **Delete Access**
```javascript
allow delete: if false;
```
- NO ONE can delete documents
- Only admins via Firebase Console

## 🔧 Alternative: Development/Test Rules

**For development/testing ONLY**, you can use these permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // WARNING: These rules allow ANY authenticated user
      // Use ONLY for testing!
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **Remember to switch to production rules before deploying!**

## 🎯 Step-by-Step Visual Guide

1. **Navigate to Firestore Rules:**
   ```
   Firebase Console → yatirimv3 → Firestore Database → Rules
   ```

2. **You'll see the rules editor:**
   ```
   ┌─────────────────────────────────┐
   │  Rules   Data   Indexes   Usage │
   ├─────────────────────────────────┤
   │                                 │
   │  [Rules editor appears here]    │
   │                                 │
   └─────────────────────────────────┘
   ```

3. **Delete existing rules and paste new ones**

4. **Click "Publish" button** (top right)

5. **Wait for confirmation** ✅

## 🐛 Troubleshooting

### Issue: "Publish" Button Grayed Out
- **Cause:** Syntax error in rules
- **Solution:** Copy rules exactly as shown above

### Issue: Still Getting Permission Errors
- **Solution:** 
  1. Hard refresh your app (Ctrl/Cmd + Shift + R)
  2. Clear browser cache
  3. Log out and log back in
  4. Rules may take 1-2 minutes to propagate

### Issue: Can't Find Rules Tab
- **Solution:** Make sure you're in "Firestore Database" not "Realtime Database"

## ✅ Verification Checklist

After setting up rules:

- [ ] Rules published in Firebase Console
- [ ] Run `npm run setup:db` - shows SUCCESS
- [ ] Register a test user
- [ ] User appears in Firestore Console
- [ ] Login works
- [ ] Dashboard shows Firestore data

## 🔗 Quick Links

- [Your Firestore Rules](https://console.firebase.google.com/project/yatirimv3/firestore/rules)
- [Firestore Security Rules Docs](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Reference](https://firebase.google.com/docs/firestore/security/rules-structure)

---

**Once rules are set up, your database is ready to use!** 🚀

