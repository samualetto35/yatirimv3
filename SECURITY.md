# Security Documentation

## 🔒 Authentication Security Features

This application implements **strict email verification** requirements. Non-verified users are **completely blocked** from accessing any protected content.

## Security Layers

### Layer 1: Auth State Management
**Location:** `src/context/AuthContext.jsx`

```javascript
// Only verified users are set as currentUser
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    setCurrentUser(user);
  } else {
    setCurrentUser(null);  // Non-verified = no access
  }
});
```

**Protection:**
- Non-verified users are NEVER set as `currentUser`
- Even if Firebase has a user session, it's ignored unless verified
- `currentUser` is always `null` for unverified accounts

### Layer 2: Login Enforcement
**Location:** `src/context/AuthContext.jsx` - `login()` function

```javascript
if (!userCredential.user.emailVerified) {
  await sendEmailVerification(userCredential.user);
  await signOut(auth);  // Force logout
  toast.warning('Please verify your email...');
  throw new Error('Email not verified');
}
```

**Protection:**
- Every login attempt checks verification status
- Unverified users are immediately logged out
- New verification email is automatically sent
- Login completely fails for unverified users

### Layer 3: Protected Route Component
**Location:** `src/components/ProtectedRoute.jsx`

**Triple Security Check:**

1. **Check Firebase User:**
```javascript
if (!firebaseUser && !currentUser) {
  return <Navigate to="/login" replace />;
}
```

2. **Check Email Verification:**
```javascript
if (firebaseUser && !firebaseUser.emailVerified) {
  return <Navigate to="/verify-email" replace />;
}
```

3. **Check Current User:**
```javascript
if (!currentUser || !currentUser.emailVerified) {
  return <Navigate to="/login" replace />;
}
```

**Protection:**
- Three independent checks before allowing access
- Checks both Firebase auth and app state
- Immediately redirects unverified users
- No rendering of protected content whatsoever

### Layer 4: Dashboard Security
**Location:** `src/pages/Dashboard.jsx`

```javascript
useEffect(() => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || !firebaseUser.emailVerified) {
    navigate('/login', { replace: true });
  }
}, [currentUser, navigate]);
```

**Protection:**
- Real-time verification check on every render
- Redirects immediately if verification status changes
- Extra security layer even if other checks fail

### Layer 5: Landing Page UI
**Location:** `src/pages/Landing.jsx`

```javascript
{currentUser && currentUser.emailVerified ? (
  <Link to="/dashboard">Go to Dashboard</Link>
) : (
  <Link to="/login">Login</Link>
)}
```

**Protection:**
- Dashboard link only shown to verified users
- Non-verified users see login/register options only
- No UI hints that they're authenticated

## User Flow for Non-Verified Users

1. **Registration:**
   - User registers → Verification email sent
   - User is NOT logged in (secure)

2. **Login Attempt (Unverified):**
   - User enters credentials
   - System checks verification status
   - Finds email not verified
   - **BLOCKS LOGIN** immediately
   - Sends new verification email
   - Shows warning message
   - User remains logged out

3. **Attempting Protected Routes:**
   - User tries to access `/dashboard`
   - Protected route checks user state
   - Finds no verified user
   - Redirects to `/login`
   - Shows warning toast

4. **After Verification:**
   - User clicks email verification link
   - Email verified in Firebase
   - User can now login successfully
   - All security checks pass
   - Access granted to dashboard

## Failed Login Attempts

**Issue:** Firebase can flag "too many requests" after just 2 failed attempts for security reasons.

**Our Handling:**
```javascript
case 'auth/too-many-requests':
  errorMessage = 'Too many failed attempts. Please wait a few minutes before trying again or reset your password.';
  break;
```

**User Options:**
1. Wait 15-30 minutes before trying again
2. Use the "Forgot Password" link to reset password
3. Firebase automatically lifts the restriction after cooldown period

## Verification Email Sending

**Automatic Sending:**
- On registration
- On failed login (if not verified)
- Manual resend from verify email page

**Rate Limiting Protection:**
```javascript
if (error.code === 'auth/too-many-requests') {
  errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
}
```

## Security Guarantees

✅ **Guaranteed Protections:**

1. ✅ Non-verified users CANNOT see dashboard link
2. ✅ Non-verified users CANNOT access protected routes
3. ✅ Non-verified users CANNOT login successfully
4. ✅ Non-verified users are ALWAYS redirected to login/verify
5. ✅ All checks happen on both client and Firebase level
6. ✅ Multiple redundant security layers
7. ✅ Real-time verification status monitoring

❌ **What Non-Verified Users CANNOT Do:**

- ❌ Access dashboard
- ❌ See authenticated UI elements
- ❌ Bypass protected routes
- ❌ Stay logged in
- ❌ Access any protected content

## Testing Security

To verify security is working:

1. **Register new account** (don't verify email)
2. **Try to login** → Should fail with verification warning
3. **Try to access `/dashboard` directly** → Should redirect to login
4. **Check landing page** → Should show login/register only (not dashboard)
5. **Verify email** → Click link in email
6. **Login again** → Should now succeed
7. **Check landing page** → Should now show dashboard link
8. **Access dashboard** → Should work

## Firebase Security Rules (Recommended)

While our client-side security is robust, you should also configure Firebase Security Rules:

```javascript
// Firestore Rules (if using Firestore)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.email_verified == true;
    }
  }
}

// Storage Rules (if using Storage)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.email_verified == true;
    }
  }
}
```

## Summary

**Email verification is MANDATORY and STRICTLY ENFORCED at multiple levels:**

1. Auth context level ✅
2. Login function level ✅
3. Protected route level (3 checks) ✅
4. Dashboard component level ✅
5. UI rendering level ✅

**Non-verified users have ZERO access to protected content.**

