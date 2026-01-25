import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { useEmailVerificationListener } from '../hooks/useEmailVerificationListener';
import { toast } from 'react-toastify';
import './Auth.css';

const VerifyEmail = () => {
  const { currentUser, logout, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [checking, setChecking] = useState(false);

  // Listen for email verification in real-time
  useEmailVerificationListener(auth.currentUser);

  useEffect(() => {
    const firebaseUser = auth.currentUser;
    
    // If no Firebase user at all, go to login
    if (!firebaseUser) {
      navigate('/login');
      return;
    }

    // If user is verified, go to dashboard
    if (firebaseUser.emailVerified) {
      navigate('/dashboard');
      return;
    }

    // Set email for display
    setUserEmail(firebaseUser.email);
  }, [currentUser, navigate]);

  // Manual check for verification
  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          navigate('/login');
        } else {
          toast.info('Email not verified yet. Please check your inbox and click the verification link.');
        }
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      
      // Handle expired verification link
      if (error.code === 'auth/expired-action-code' || error.message?.includes('expired')) {
        toast.warning('Verification link has expired. A new verification email will be sent.');
        try {
          await resendVerification();
        } catch (resendError) {
          console.error('Error resending verification:', resendError);
        }
      } else {
        toast.error('Error checking verification status. Please try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      await resendVerification();
    } catch (error) {
      // Error handled in context
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      // Error handled in context
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Verify Your Email</h2>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
          <p className="auth-subtitle">
            We've sent a verification email to:
            <br />
            <strong>{userEmail || auth.currentUser?.email}</strong>
          </p>
          <p style={{ color: '#666', marginTop: '1rem' }}>
            Please check your inbox and click the verification link to continue.
          </p>
          
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button onClick={handleCheckVerification} className="btn btn-primary btn-full" disabled={checking}>
              {checking ? 'Checking...' : 'I Verified My Email'}
            </button>
            <button onClick={handleResendEmail} className="btn btn-secondary btn-full">
              Resend Verification Email
            </button>
            <button onClick={handleLogout} className="btn btn-secondary btn-full">
              Logout
            </button>
          </div>
          
          <p style={{ color: '#6c757d', fontSize: '0.85rem', marginTop: '1rem', fontWeight: '500' }}>
            ℹ️ Verification status auto-checks every 3 seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

