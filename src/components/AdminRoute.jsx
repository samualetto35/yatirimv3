import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const AdminRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (!currentUser) {
          setAllowed(false);
          return;
        }
        const ref = doc(db, 'adminUsers', currentUser.uid);
        const snap = await getDoc(ref);
        setAllowed(!!snap.exists());
      } catch (e) {
        console.warn('Admin check failed:', e);
        setAllowed(false);
      }
    })();
  }, [currentUser]);

  if (allowed === null) return <div style={{ padding: 24, textAlign: 'center' }}>Checking admin access...</div>;
  if (!allowed) return <Navigate to="/" replace />;
  return children;
};

export default AdminRoute;


