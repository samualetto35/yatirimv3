# YatirimV3 Usage Guide

## How to Use the Authentication System

### 1. Registration Process

1. Navigate to the landing page
2. Click on "Create Account" button
3. Fill in the registration form:
   - **Username**: Your display name (minimum 3 characters)
   - **Email**: Your valid email address
   - **Password**: Secure password (minimum 6 characters)
   - **Confirm Password**: Re-enter your password
4. Click "Create Account"
5. You'll receive a success message
6. Check your email inbox for the verification email

### 2. Email Verification

1. Open the verification email from Firebase (noreply@yatirimv3.firebaseapp.com)
2. Click the verification link in the email
3. You'll be redirected to confirm your email is verified
4. Return to the login page

### 3. Login Process

1. Click on "Login" button from the landing page
2. Enter your email and password
3. Click "Login"
4. **Important**: If your email is not verified:
   - You'll see a warning message
   - A new verification email will be automatically sent
   - You won't be able to login until verification is complete
5. Once verified, you'll be redirected to the dashboard

### 4. Password Reset

If you forgot your password:

1. Go to the login page
2. Click "Forgot password?" link
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email for the password reset link
6. Click the link and follow Firebase's instructions to reset your password
7. Return to login with your new password

### 5. Dashboard Access

Once logged in with a verified email:

- View your account information
- See your username and email
- Check security status (email verification, account creation date, last sign-in)
- Logout when finished

### 6. Navigation

- **Landing Page** (`/`): Home page with features overview
- **Login** (`/login`): Sign in to your account
- **Register** (`/register`): Create a new account
- **Reset Password** (`/reset-password`): Reset forgotten password
- **Verify Email** (`/verify-email`): Email verification reminder
- **Dashboard** (`/dashboard`): Protected user dashboard (requires verified email)

## Notifications

The app will show toast notifications for:

### Success Messages (Green)
- Registration successful
- Login successful
- Logout successful
- Password reset email sent
- Verification email sent

### Error Messages (Red)
- Invalid credentials
- Email already in use
- Weak password
- Network errors
- Account disabled

### Warning Messages (Orange)
- Email not verified
- Please login to access page

### Info Messages (Blue)
- General information

## Security Features

1. **Email Verification Required**: Users cannot access the dashboard until their email is verified
2. **Automatic Re-verification**: If a user tries to login without verifying, a new email is sent
3. **Protected Routes**: Dashboard and other protected pages redirect to login if not authenticated
4. **Secure Password Requirements**: Minimum 6 characters enforced by Firebase
5. **Session Management**: User state persists across page refreshes

## Troubleshooting

### I didn't receive the verification email
- Check your spam/junk folder
- Try the "Resend Verification Email" button on the verify email page
- Make sure you used a valid email address

### I can't login even though I registered
- Ensure you've verified your email by clicking the link in the verification email
- Check if you're using the correct email and password
- Try resetting your password if you've forgotten it

### The page keeps redirecting me
- This is normal for protected routes when you're not logged in
- Make sure your email is verified
- Clear your browser cache and try again

## Firebase Console Access

To manage users and view authentication data:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select the "yatirimv3" project
3. Navigate to Authentication > Users
4. Here you can:
   - View all registered users
   - Check verification status
   - Disable/enable accounts
   - Delete users

## Development

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Support

For issues or questions:
- Check this usage guide
- Review the README.md for technical details
- Check Firebase Authentication documentation
- Contact the development team

