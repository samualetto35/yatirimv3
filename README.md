# YatirimV3 - Firebase Authentication Platform

A modern, secure authentication platform built with React and Firebase Authentication.

## Features

- ✨ **User Registration** - Create new accounts with username, email, and password
- 🔐 **Secure Login** - Email and password authentication with Firebase
- ✉️ **Email Verification** - Mandatory email verification for all new users
- 🔄 **Password Recovery** - Easy password reset functionality
- 📱 **Responsive Design** - Beautiful UI that works on all devices
- 🔔 **Real-time Notifications** - Toast notifications for all user actions
- 🛡️ **Protected Routes** - Secure dashboard accessible only to verified users
- 📊 **Firestore Database** - User data synced to Firestore for persistence
- 🔄 **Auto-Sync** - Real-time sync between Firebase Auth and Firestore

## Tech Stack

- **React** - Frontend framework
- **Vite** - Build tool for fast development
- **Firebase Authentication** - Secure user authentication
- **Firestore** - Cloud NoSQL database for user data
- **React Router** - Client-side routing
- **React Toastify** - Beautiful toast notifications

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Enable Firestore in Firebase Console:
   - See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for detailed steps
   - Go to Firebase Console → Firestore Database → Create Database
   - Apply security rules from the setup guide

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
yatirimv3/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx    # Protected route wrapper
│   ├── context/
│   │   └── AuthContext.jsx       # Authentication context and logic
│   ├── firebase/
│   │   └── config.js             # Firebase & Firestore configuration
│   ├── services/
│   │   └── userService.js        # Firestore user operations
│   ├── hooks/
│   │   └── useEmailVerificationListener.js  # Email verification listener
│   ├── pages/
│   │   ├── Landing.jsx           # Landing page
│   │   ├── Login.jsx             # Login page
│   │   ├── Register.jsx          # Registration page
│   │   ├── ResetPassword.jsx     # Password reset page
│   │   ├── Dashboard.jsx         # User dashboard
│   │   └── VerifyEmail.jsx       # Email verification page
│   ├── App.jsx                   # Main app component
│   └── main.jsx                  # Entry point
├── FIRESTORE.md                  # Firestore integration docs
├── FIRESTORE_SETUP.md            # Firestore setup guide
├── SECURITY.md                   # Security documentation
├── index.html
└── package.json
```

## User Flow

1. **Registration**: 
   - User creates account with username, email, and password
   - User document created in Firestore with `emailVerified: false`
   - Verification email automatically sent

2. **Email Verification**: 
   - User clicks verification link in email
   - Real-time listener detects verification (checks every 3 seconds)
   - Firestore automatically updated to `emailVerified: true`

3. **Login**: 
   - Email verification checked
   - If verified: User synced with Firestore (create if missing, update if needed)
   - Access granted to dashboard

4. **Dashboard**: 
   - Displays both Firebase Auth and Firestore data
   - Shows sync status and user information

## Features in Detail

### Authentication & Database Sync

The `AuthContext` provides centralized authentication logic including:
- User registration with profile update and Firestore creation
- Email/password login with verification check and Firestore sync
- Password reset functionality
- Email verification sending with auto-detection
- User state management with Firestore integration
- Real-time sync between Firebase Auth and Firestore database

### Protected Routes

Routes are protected using the `ProtectedRoute` component which:
- Checks if user is authenticated
- Verifies email verification status
- Redirects unauthenticated users to login
- Redirects unverified users to verification page

### Notifications

All user actions trigger appropriate notifications:
- Success messages (green)
- Error messages (red)
- Warning messages (orange)
- Info messages (blue)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Firebase Configuration

The app is configured with:
- **Firebase Authentication** - User authentication
- **Firestore Database** - User data storage and sync

Configuration is located in `src/firebase/config.js`.

### Firestore Setup
See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for:
- Enabling Firestore in Firebase Console
- Setting security rules
- Testing the integration

### Firestore Integration
See [FIRESTORE.md](./FIRESTORE.md) for:
- Database structure
- Auto-sync flow
- Service functions
- Real-time updates

## Security Features

- Email verification required before account access
- Secure password requirements (minimum 6 characters)
- Protected routes for authenticated users only
- Automatic re-verification if email not verified
- Secure password reset via email
- Firestore security rules (users can only access their own data)
- Real-time verification status sync
- Auto-sync ensures Auth and Firestore always match

## Contributing

Feel free to contribute to this project by opening issues or submitting pull requests.

## License

This project is open source and available under the MIT License.
