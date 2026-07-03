/**
 * WarningsContext — FIX 6
 * Single Firestore listener for `warnings_announcements`.
 * WarningAnnouncementPopup and WarningAnnouncementManager consume this
 * context instead of each creating their own listener.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const WarningsContext = createContext({ warnings: [] });

export const useWarnings = () => useContext(WarningsContext);

export const WarningsProvider = ({ children }) => {
  // ONE listener — newest 100 warnings; components filter as needed
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    let firestoreUnsub = null;

    // Only open the Firestore listener once a user is authenticated (FIX 6)
    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Tear down any previous Firestore listener before (re-)evaluating
      if (firestoreUnsub) { firestoreUnsub(); firestoreUnsub = null; }

      if (!user) {
        setWarnings([]);
        return;
      }

      const q = query(
        collection(db, 'warnings_announcements'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          setWarnings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          if (err?.code !== 'permission-denied') {
            console.error('WarningsContext listener error:', err);
          }
        }
      );
    });

    return () => {
      authUnsub();
      if (firestoreUnsub) firestoreUnsub();
    };
  }, []);

  return (
    <WarningsContext.Provider value={{ warnings }}>
      {children}
    </WarningsContext.Provider>
  );
};

export default WarningsContext;
