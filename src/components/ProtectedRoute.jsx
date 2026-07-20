// H-01 fix: eliminated the redundant onAuthStateChanged subscription.
//
// Problem: every ProtectedRoute mount started its own onAuthStateChanged
// listener, duplicating the one already running in App.jsx and causing a
// "loading" flash on every protected-page navigation after initial login.
//
// Fix: resolve auth state synchronously from auth.currentUser (populated by
// App.jsx's listener before any route renders) or from localStorage for guests.
// Only fall back to a one-shot subscription on the very first page load, when
// Firebase hasn't yet fired its first auth event (auth.currentUser === null).

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

// Try to resolve the current user without starting a subscription.
// Returns { user, resolved } — resolved=true means no subscription is needed.
function resolveSync() {
  const isGuest   = localStorage.getItem('isGuest') === 'true';
  const guestData = localStorage.getItem('guestUser');

  if (isGuest && guestData) {
    try {
      const parsed = JSON.parse(guestData);
      return {
        resolved: true,
        user: { isGuest: true, uid: parsed.uid, displayName: parsed.displayName, ...parsed },
      };
    } catch {
      localStorage.removeItem('guestUser');
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guestGender');
    }
  }

  // auth.currentUser is synchronously populated after App.jsx's onAuthStateChanged
  // fires. On normal page navigation (post-login) this is always non-null, so we
  // never need to open an extra subscription.
  if (auth.currentUser !== null) {
    return { resolved: true, user: auth.currentUser };
  }

  // auth.currentUser is null only on the very first cold load before Firebase has
  // fired its initial event. Fall through to the one-shot subscription below.
  return { resolved: false, user: null };
}

const ProtectedRoute = ({ children, profile }) => {
  const [state] = useState(resolveSync);            // run once on mount only
  const [user, setUser]       = useState(state.user);
  const [loading, setLoading] = useState(!state.resolved);

  useEffect(() => {
    // Fast path: auth was already resolved synchronously — no subscription needed.
    if (state.resolved) return;

    // Slow path: Firebase hasn't fired yet (first cold load). Subscribe once,
    // then immediately unsubscribe after the first event.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
      setLoading(false);
      // Unsubscribe right away — App.jsx owns the authoritative listener.
      unsubscribe();
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (React.isValidElement(children)) {
    return React.cloneElement(children, { user, profile });
  }

  return children;
};

export default ProtectedRoute;
