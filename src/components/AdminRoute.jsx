import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const AdminRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const [allowed, setAllowed] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (!currentUser) {
          console.log('[AdminRoute] No current user');
          setAllowed(false);
          setError('Kullanıcı giriş yapmamış');
          return;
        }

        if (!currentUser.emailVerified) {
          console.log('[AdminRoute] Email not verified:', currentUser.email);
          setAllowed(false);
          setError('Email doğrulanmamış');
          return;
        }

        console.log('[AdminRoute] Checking admin access for:', currentUser.uid, currentUser.email);
        const ref = doc(db, 'adminUsers', currentUser.uid);
        const snap = await getDoc(ref);
        const exists = snap.exists();
        console.log('[AdminRoute] Admin check result:', exists, 'for UID:', currentUser.uid);
        
        if (!exists) {
          setError(`Bu kullanıcı adminUsers koleksiyonunda bulunamadı. UID: ${currentUser.uid}`);
        }
        
        setAllowed(exists);
      } catch (e) {
        console.error('[AdminRoute] Admin check failed:', e);
        setError(`Hata: ${e.message || 'Bilinmeyen hata'}`);
        setAllowed(false);
      }
    })();
  }, [currentUser]);

  if (allowed === null) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div>Admin erişimi kontrol ediliyor...</div>
        {currentUser && (
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            UID: {currentUser.uid}
          </div>
        )}
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem', color: '#ef4444', fontWeight: 'bold' }}>
          Admin erişimi reddedildi
        </div>
        {error && (
          <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        {currentUser && (
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <div>UID: {currentUser.uid}</div>
            <div>Email: {currentUser.email}</div>
            <div>Email Verified: {currentUser.emailVerified ? 'Evet' : 'Hayır'}</div>
          </div>
        )}
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <div>Admin erişimi için:</div>
          <div style={{ marginTop: '0.5rem' }}>
            1. Firebase Console → Firestore Database → adminUsers koleksiyonuna gidin
          </div>
          <div>
            2. UID ile yeni bir doküman oluşturun (doküman ID = kullanıcının UID'si)
          </div>
          <div>
            3. Doküman içeriği boş olabilir veya {'{ createdAt: timestamp }'} gibi bir alan ekleyebilirsiniz
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return children;
};

export default AdminRoute;


