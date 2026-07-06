/**
 * WarningsContext — FIX-PERF-4
 * Replaced the always-on onSnapshot listener with a one-time getDocs fetch
 * on mount + a 5-minute setInterval refresh. This eliminates a permanent
 * Firestore connection that was open for every authenticated session even
 * though warnings/announcements change very rarely.
 *
 * The WarningAnnouncementPopup and WarningAnnouncementManager components
 * consume this context and are unaffected — same { warnings } API.
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const WarningsContext = createContext({ warnings: [] });

export const useWarnings = () => useContext(WarningsContext);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const WarningsProvider = ({ children }) => {
  const [warnings, setWarnings] = useState([]);
  const intervalRef = useRef(null);
  const authedRef = useRef(false);

  useEffect(() => {
    async function fetchWarnings() {
      if (!authedRef.current) return;
      try {
        const q = query(
          collection(db, 'warnings_announcements'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snap = await getDocs(q);
        setWarnings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        if (err?.code !== 'permission-denied') {
          console.error('WarningsContext fetch error:', err);
        }
      }
    }

    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Clear previous interval whenever auth state changes
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

      if (!user) {
        authedRef.current = false;
        setWarnings([]);
        return;
      }

      authedRef.current = true;
      // Initial load
      fetchWarnings();
      // Periodic refresh every 5 minutes (replaces always-open onSnapshot)
      intervalRef.current = setInterval(fetchWarnings, REFRESH_INTERVAL_MS);
    });

    return () => {
      authUnsub();
      if (intervalRef.current) clearInterval(intervalRef.current);
      authedRef.current = false;
    };
  }, []);

  return (
    <WarningsContext.Provider value={{ warnings }}>
      {children}
    </WarningsContext.Provider>
  );
};

export default WarningsContext;
