# Firestore Database Integration

## 📊 Database Structure

### Collection: `users`

Each user document contains:

```javascript
{
  uid: "firebase-user-id",           // Firebase Auth UID
  username: "johndoe",               // User's display name
  email: "user@example.com",         // User's email
  emailVerified: true,               // Email verification status
  createdAt: Timestamp,              // Account creation time
  updatedAt: Timestamp,              // Last update time
}
```

## 🔄 Auto-Sync Flow

### 1. **User Registration**
```
User Registers
    ↓
Create Firebase Auth account
    ↓
Update profile with username
    ↓
Create Firestore document ✅
    ↓
Send verification email
```

**Code:** `AuthContext.jsx` - `register()` function
- Creates user in Firebase Auth
- Immediately creates Firestore document with `emailVerified: false`
- Username, email, and timestamps are stored

### 2. **Email Verification**
```
User clicks email link
    ↓
Firebase verifies email
    ↓
User on /verify-email page
    ↓
Auto-check every 3 seconds
    ↓
When verified detected:
    ↓
Update Firestore emailVerified: true ✅
    ↓
Show success message
```

**Code:** `useEmailVerificationListener` hook
- Polls verification status every 3 seconds
- Auto-updates Firestore when verified
- Shows success notification

### 3. **User Login**
```
User enters credentials
    ↓
Check email verification
    ↓
If verified:
    ↓
Check Firestore for user doc
    ↓
If missing: Create document ✅
If exists: Update verification status ✅
    ↓
Sync complete → Dashboard access
```

**Code:** `login()` function calls `ensureUserDocument()`
- **If user in Auth but NOT in Firestore:** Creates Firestore doc
- **If user exists:** Updates verification status if changed
- Ensures 100% sync between Auth and Firestore

### 4. **Dashboard Display**
```
User logged in
    ↓
Load currentUser (Firebase Auth)
    ↓
Load userDoc (Firestore) ✅
    ↓
Display both Auth and Firestore data
```

**Data Priority:**
- Username: `userDoc.username` → fallback to `currentUser.displayName`
- Email: `userDoc.email` → fallback to `currentUser.email`
- All data: Primarily from Firestore (for future extensions)

## 🛠️ Service Functions

### Location: `src/services/userService.js`

#### `createUserDocument(userId, userData)`
Creates a new user document in Firestore.

```javascript
await createUserDocument(user.uid, {
  username: "John Doe",
  email: "john@example.com",
  emailVerified: false
});
```

#### `getUserDocument(userId)`
Retrieves user document from Firestore.

```javascript
const userDoc = await getUserDocument(user.uid);
// Returns null if not found
```

#### `updateEmailVerificationStatus(userId, isVerified)`
Updates only the email verification status.

```javascript
await updateEmailVerificationStatus(user.uid, true);
```

#### `updateUserDocument(userId, updates)`
Updates any user fields.

```javascript
await updateUserDocument(user.uid, {
  username: "New Name",
  // any other fields
});
```

#### `ensureUserDocument(firebaseUser)` ⭐ **Key Function**
Ensures user exists in Firestore, creates if missing.

```javascript
// Called on every login
const userDoc = await ensureUserDocument(firebaseUser);

// Logic:
// 1. Check if user exists in Firestore
// 2. If NO → Create document
// 3. If YES → Update verification status if changed
// 4. Return the user document
```

## 🔐 Security Rules (Recommended)

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can only read their own document
      allow read: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
      
      // Users can only update their own document
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && request.auth.token.email_verified == true;
      
      // Only server/admin can create (via Cloud Functions)
      // Or allow authenticated users to create their own:
      allow create: if request.auth != null 
        && request.auth.uid == userId;
      
      // No one can delete (only admins via console)
      allow delete: if false;
    }
  }
}
```

## 📱 Real-Time Updates

### Auto-Verification Detection
The `/verify-email` page automatically detects when email is verified:

```javascript
// Checks every 3 seconds
useEmailVerificationListener(auth.currentUser);

// When verified:
// 1. Updates Firestore
// 2. Shows success notification
// 3. Redirects to login
```

### Manual Check Button
Users can also manually trigger verification check:
- Button: "I Verified My Email"
- Immediately checks Firebase Auth
- Updates Firestore if verified
- Redirects to login

## 🔄 Sync Scenarios

### Scenario 1: New User Registration
✅ **Auto-handled**
- User created in Auth → Immediately created in Firestore
- No manual intervention needed

### Scenario 2: User Verifies Email
✅ **Auto-handled**
- Real-time listener detects verification
- Firestore automatically updated
- User can login immediately

### Scenario 3: Old Auth User (No Firestore Doc)
✅ **Auto-handled**
- On login: `ensureUserDocument()` creates Firestore doc
- User data synced automatically
- Dashboard displays correctly

### Scenario 4: Firestore Out of Sync
✅ **Auto-handled**
- On every login: Verification status checked
- If different: Firestore updated
- Always in sync

## 🎯 Future Extensions

The Firestore structure is ready for:

1. **User Profiles**
```javascript
{
  ...existingFields,
  photoURL: "https://...",
  bio: "User bio",
  phone: "+1234567890"
}
```

2. **User Preferences**
```javascript
{
  ...existingFields,
  settings: {
    theme: "dark",
    notifications: true,
    language: "en"
  }
}
```

3. **User Activity**
```javascript
{
  ...existingFields,
  lastActive: Timestamp,
  loginCount: 42,
  devices: []
}
```

4. **Additional Collections**
- `users/{userId}/transactions`
- `users/{userId}/notifications`
- `users/{userId}/settings`

## 📊 Dashboard Data Display

### Current Implementation

**Firestore Database Info Card:**
- Username (from Firestore)
- Email (from Firestore)
- User ID
- DB Sync Status

**Firebase Auth Status Card:**
- Email Verification Status
- Account Creation Date
- Last Sign-In Time

### Why Both?
- **Firestore:** Primary source for app data (extendable)
- **Auth:** Security and authentication status
- **Sync:** Both always in sync via `ensureUserDocument()`

## 🧪 Testing the Integration

### Test 1: New User Registration
1. Register new user → ✅ Check Firestore Console
2. Document should exist with `emailVerified: false`

### Test 2: Email Verification
1. Stay on verify-email page
2. Click verification link in email
3. Wait ~3 seconds → ✅ Auto-detects
4. Check Firestore → `emailVerified: true`

### Test 3: Login After Verification
1. Login with verified account
2. Check dashboard → ✅ Shows Firestore data
3. Check Firestore Console → ✅ Document exists

### Test 4: Old Auth User
1. Delete Firestore document (keep Auth)
2. Login
3. ✅ Document auto-created
4. Dashboard shows data correctly

## 🔍 Debugging

### Check if User Exists in Firestore
```javascript
import { getUserDocument } from './services/userService';

const userDoc = await getUserDocument(userId);
console.log('User in Firestore:', userDoc);
```

### Force Sync User
```javascript
import { ensureUserDocument } from './services/userService';
import { auth } from './firebase/config';

const syncedDoc = await ensureUserDocument(auth.currentUser);
console.log('Synced user:', syncedDoc);
```

### Check Verification Status
```javascript
// Auth status
console.log('Auth verified:', auth.currentUser?.emailVerified);

// Firestore status
const userDoc = await getUserDocument(auth.currentUser.uid);
console.log('Firestore verified:', userDoc?.emailVerified);
```

## 📝 Important Notes

1. **Timestamps:** Created automatically with `serverTimestamp()`
2. **User ID:** Always matches Firebase Auth UID
3. **Auto-Sync:** Happens on login, no manual trigger needed
4. **Real-Time:** Verification status updates within 3 seconds
5. **Fallbacks:** Dashboard shows Auth data if Firestore fails

## 🚀 Next Steps

1. **Enable Firestore** in Firebase Console if not already done
2. **Set Security Rules** as shown above
3. **Test** new user registration
4. **Verify** data appears in Firestore Console
5. **Monitor** auto-sync during login

Your Firestore integration is complete and fully automated! 🎉

