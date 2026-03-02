import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

const ProtectedRoute = ({ children, profile }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest user first
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const guestData = localStorage.getItem('guestUser');

    if (isGuest && guestData) {
      try {
        const parsedGuestData = JSON.parse(guestData);
        // Guest user is logged in
        setUser({ 
          isGuest: true, 
          uid: parsedGuestData.uid,
          displayName: parsedGuestData.displayName,
          ...parsedGuestData 
        });
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error parsing guest data:', error);
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
      }
    }

    // Check for Firebase authenticated user
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Check authentication
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Pass the user and profile prop to children
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { user, profile });
  }

  return children;
};

export default ProtectedRoute;