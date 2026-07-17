/**
 * WarningsContext — FIX M-02
 * Switched from getDocs + 5-min setInterval back to onSnapshot so ban
 * announcements are received in real-time (< 1s) rather than up to 5 min late.
 * The listener is only active while the user is authenticated; it is torn down
 * cleanly on auth-state-changed or unmount.
 *
 * The WarningAnnouncementPopup and WarningAnnouncementManager components
 * consume this context and are unaffected — same { warnings } API.
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const WarningsContext = createContext({ warnings: [] });

export const useWarnings = () => useContext(WarningsContext);

export const WarningsProvider = ({ children }) => {
  const [warnings, setWarnings] = useState([]);
  const snapshotUnsubRef = useRef(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Tear down any previous Firestore listener when auth state changes.
      if (snapshotUnsubRef.current) {
        snapshotUnsubRef.current();
        snapshotUnsubRef.current = null;
      }

      if (!user) {
        setWarnings([]);
        return;
      }

      // FIX M-02: Use onSnapshot so bans/announcements are surfaced immediately.
      // limit(100) keeps the listener cost bounded.
      const q = query(
        collection(db, 'warnings_announcements'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      snapshotUnsubRef.current = onSnapshot(q, (snap) => {
        setWarnings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        if (err?.code !== 'permission-denied') {
          console.error('WarningsContext snapshot error:', err);
        }
      });
    });

    return () => {
      authUnsub();
      if (snapshotUnsubRef.current) {
        snapshotUnsubRef.current();
        snapshotUnsubRef.current = null;
      }
    };
  }, []);

  return (
    <WarningsContext.Provider value={{ warnings }}>
      {children}
    </WarningsContext.Provider>
  );
};

export default WarningsContext;
