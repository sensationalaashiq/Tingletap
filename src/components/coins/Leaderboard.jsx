// src/components/coins/Leaderboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import {
  collection, query, where, orderBy, limit, getDocs, doc, getDoc
} from 'firebase/firestore';
import { formatCoins } from '../../utils/coinSystem';
import { getCachedUserProfile } from '../../utils/userProfileCache';
import { useLiveDisplayName } from '../../utils/liveUsernames';
import LiveAvatarImg from '../LiveAvatar';
import './Leaderboard.css';

/* ── Icons ── */
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrophyIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="lb_ti" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a"/>
        <stop offset="60%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#d97706"/>
      </linearGradient>
    </defs>
    <path d="M6 4h12v7a6 6 0 01-12 0V4z" fill="url(#lb_ti)" opacity="0.92"/>
    <path d="M3 6H1v3a4 4 0 003 3.87V6z" fill="url(#lb_ti)" opacity="0.6"/>
    <path d="M21 6h2v3a4 4 0 01-3 3.87V6z" fill="url(#lb_ti)" opacity="0.6"/>
    <path d="M12 18v-3" stroke="url(#lb_ti)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 18h4" stroke="url(#lb_ti)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 22h6" stroke="url(#lb_ti)" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const CoinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="lb_ci" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a"/>
        <stop offset="100%" stopColor="#d97706"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#lb_ci)"/>
    <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#78350f">₹</text>
  </svg>
);
const GiftIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="lb_gi" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f9a8d4"/>
        <stop offset="100%" stopColor="#db2777"/>
      </linearGradient>
    </defs>
    <rect x="3" y="10" width="18" height="11" rx="2" fill="url(#lb_gi)" opacity="0.22"/>
    <rect x="3" y="10" width="18" height="3" rx="0" fill="url(#lb_gi)" opacity="0.55"/>
    <line x1="12" y1="10" x2="12" y2="21" stroke="#db2777" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M8.5 7c0-1.93 1.57-3.5 3.5-3.5S15.5 5.07 15.5 7H8.5z" stroke="#db2777" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    <path d="M3 10h18" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];
const TYPE_OPTIONS = [
  { id: 'senders', label: 'Top Supporters' },
  { id: 'receivers', label: 'Top Receivers' },
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_LABELS = ['1st', '2nd', '3rd'];

/* FIX-PERF-3: module-level in-memory cache shared across mounts/tab-switches.
   Previously used a live onSnapshot(limit 500) — an always-open listener that
   shipped 500 Firestore documents to every user visiting the leaderboard page.
   Replaced with a one-time getDocs + 5-minute sessionStorage cache.
   On tab focus (visibilitychange) stale entries are invalidated so data stays
   reasonably fresh without a permanent listener. */
const lbResultCache = {}; // key: `${type}:${period}` -> { data, userMap, ts }
const LB_RESULT_TTL_MS = 5 * 60 * 1000; // 5 minutes (was 30 s live-snapshot)
const SS_KEY = (k) => `lb_cache_${k}`;

function readSSCache(cacheKey) {
  try {
    const raw = sessionStorage.getItem(SS_KEY(cacheKey));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > LB_RESULT_TTL_MS) { sessionStorage.removeItem(SS_KEY(cacheKey)); return null; }
    return entry;
  } catch { return null; }
}
function writeSSCache(cacheKey, entry) {
  try { sessionStorage.setItem(SS_KEY(cacheKey), JSON.stringify(entry)); } catch {}
}

function useLeaderboard(type, period) {
  const cacheKey = `${type}:${period}`;

  // Prefer in-memory → sessionStorage → fetch
  const memCached = lbResultCache[cacheKey];
  const ssCached = !memCached ? readSSCache(cacheKey) : null;
  const boot = memCached || ssCached;
  const hasFreshBoot = boot && (Date.now() - boot.ts) < LB_RESULT_TTL_MS;

  const [data, setData] = useState(boot ? boot.data : []);
  const [loading, setLoading] = useState(!hasFreshBoot);
  const [userMap, setUserMap] = useState(boot ? boot.userMap : {});

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard(force = false) {
      // Return early if fresh cache exists and not forced
      const mem = lbResultCache[cacheKey];
      if (!force && mem && (Date.now() - mem.ts) < LB_RESULT_TTL_MS) {
        setData(mem.data); setUserMap(mem.userMap); setLoading(false);
        return;
      }
      const ss = !force ? readSSCache(cacheKey) : null;
      if (ss) {
        setData(ss.data); setUserMap(ss.userMap); setLoading(false);
        lbResultCache[cacheKey] = ss;
        return;
      }

      setLoading(true);
      try {
        // H-03 fix: read pre-computed leaderboard doc first (1 read, no aggregation).
        // The computeLeaderboard scheduled function writes leaderboard/{type}_{period}
        // hourly. If the doc exists and is < 2h old, use it directly.
        // Falls back to the legacy 500-doc client-side aggregation when the
        // pre-computed doc is missing or stale (e.g. before the first scheduled run).
        let sorted = null;
        try {
          const lbDoc = await getDoc(doc(db, 'leaderboard', `${type}_${period}`));
          if (lbDoc.exists()) {
            const lbData = lbDoc.data();
            const ageMs = lbData.computedAt
              ? Date.now() - new Date(lbData.computedAt).getTime()
              : Infinity;
            if (ageMs < 2 * 60 * 60 * 1000 && Array.isArray(lbData.top)) {
              sorted = lbData.top; // already sorted top-20
            }
          }
        } catch { /* no pre-computed doc — fall through to legacy aggregation */ }
        if (cancelled) return;

        if (!sorted) {
          // Legacy client-side aggregation (fallback when no pre-computed doc yet)
          const txType = type === 'senders' ? 'gift_sent' : 'gift_received';
          const now = new Date();
          const todayKey = now.toISOString().slice(0, 10);
          const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const q = query(
            collection(db, 'coinTransactions'),
            where('type', '==', txType),
            orderBy('timestamp', 'desc'),
            limit(500)
          );
          const snap = await getDocs(q);
          if (cancelled) return;
          const txs = snap.docs.map(d => d.data());

          const filtered = txs.filter(tx => {
            if (!tx.timestamp) return false;
            const ts = tx.timestamp.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
            if (period === 'today') return ts.toISOString().slice(0, 10) === todayKey;
            if (period === 'week') return ts >= weekStart;
            if (period === 'month') return ts >= monthStart;
            return true;
          });

          const map = {};
          filtered.forEach(tx => {
            const uid = tx.uid;
            if (!map[uid]) map[uid] = { uid, coins: 0, gifts: 0 };
            map[uid].coins += Math.abs(tx.coins);
            map[uid].gifts += 1;
          });
          sorted = Object.values(map).sort((a, b) => b.coins - a.coins).slice(0, 20);
        }

        const newMap = { ...lbResultCache[cacheKey]?.userMap };
        await Promise.all(sorted.map(s => s.uid).filter(uid => !newMap[uid]).map(async uid => {
          try { const p = await getCachedUserProfile(uid); if (p) newMap[uid] = p; } catch {}
        }));
        if (cancelled) return;

        const entry = { data: sorted, userMap: newMap, ts: Date.now() };
        lbResultCache[cacheKey] = entry;
        writeSSCache(cacheKey, entry);
        setData(sorted);
        setUserMap(newMap);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();

    // Refresh when the tab becomes visible again (user returns after a while)
    const onVisible = () => {
      const mem = lbResultCache[cacheKey];
      if (!mem || (Date.now() - mem.ts) > LB_RESULT_TTL_MS) fetchLeaderboard(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [type, period]);

  return { data, loading, userMap };
}

// FIX L-12: Add aria-label so screen readers announce the rank position.
// Previously the medal divs had no accessible name — MEDAL_LABELS text ("1st"
// etc.) was readable but the surrounding context ("this is a rank") was not.
function RankBadge({ rank }) {
  if (rank <= 3) {
    return (
      <div
        className="lb-medal"
        style={{ background: MEDAL_COLORS[rank - 1] }}
        aria-label={`Rank ${rank}`}
        role="img"
      >
        <span aria-hidden="true">{MEDAL_LABELS[rank - 1]}</span>
      </div>
    );
  }
  return (
    <div className="lb-rank-num" aria-label={`Rank ${rank}`} role="img">
      <span aria-hidden="true">#{rank}</span>
    </div>
  );
}

/**
 * LbPodiumItem — isolated component so useLiveDisplayName is called once per uid,
 * never inside a .map() body (Rules of Hooks).
 */
function LbPodiumItem({ entry, rank, fallbackName, fallbackPhotoURL }) {
  const name = useLiveDisplayName(entry.uid, fallbackName);
  return (
    <div className={`lb-podium-item lb-podium-item--${rank}`}>
      <div className="lb-podium-avatar-wrap">
        <LiveAvatarImg
          uid={entry.uid}
          fallbackPhotoURL={fallbackPhotoURL}
          className="lb-podium-avatar"
          alt={name}
        />
        <div className="lb-podium-medal" style={{ background: MEDAL_COLORS[rank - 1] }}>
          {rank}
        </div>
      </div>
      <div className="lb-podium-name">{name.split(' ')[0]}</div>
      <div className="lb-podium-coins">
        <CoinIcon size={12} /> {formatCoins(entry.coins)}
      </div>
    </div>
  );
}

/**
 * LbListRow — isolated component for the same reason as LbPodiumItem.
 */
function LbListRow({ entry, index, fallbackName, fallbackPhotoURL }) {
  const name = useLiveDisplayName(entry.uid, fallbackName);
  return (
    <div className={`lb-row ${index < 3 ? 'lb-row--top' : ''}`}>
      <RankBadge rank={index + 1} />
      <LiveAvatarImg
        uid={entry.uid}
        fallbackPhotoURL={fallbackPhotoURL}
        className="lb-avatar"
        alt={name}
      />
      <div className="lb-user-info">
        <span className="lb-user-name">{name}</span>
        <span className="lb-user-gifts">{entry.gifts} gifts</span>
      </div>
      <div className="lb-user-coins">
        <CoinIcon size={13} />
        <span>{formatCoins(entry.coins)}</span>
      </div>
      {index < 3 && <div className="lb-glow" style={{ background: MEDAL_COLORS[index] }} />}
    </div>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('all');
  const [type, setType] = useState('senders');
  const { data, loading, userMap } = useLeaderboard(type, period);

  return (
    <div className="lb-root">
      <div className="lb-orb lb-orb--1" />
      <div className="lb-orb lb-orb--2" />

      {/* Header */}
      <header className="lb-header">
        <button className="lb-back-btn" onClick={() => navigate(-1)}><ArrowLeftIcon /></button>
        <div className="lb-header-title">
          <TrophyIcon size={24} />
          <span>Leaderboard</span>
        </div>
      </header>

      <div className="lb-content">
        {/* Type toggle */}
        <div className="lb-type-row">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t.id}
              className={`lb-type-btn ${type === t.id ? 'active' : ''}`}
              onClick={() => setType(t.id)}
            >
              {t.id === 'senders' ? <GiftIcon size={13} /> : <TrophyIcon size={13} />}
              {t.label}
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div className="lb-period-row">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.id}
              className={`lb-period-btn ${period === p.id ? 'active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Section title */}
        <div className="lb-section-header">
          <TrophyIcon size={20} />
          <h3>{TYPE_OPTIONS.find(t => t.id === type)?.label} · {PERIOD_OPTIONS.find(p => p.id === period)?.label}</h3>
        </div>

        {/* Loading */}
        {loading && (
          <div className="lb-loading">
            <div className="lb-spinner" />
            <span>Loading leaderboard…</span>
          </div>
        )}

        {/* Top 3 podium */}
        {!loading && data.length >= 3 && (
          <div className="lb-podium">
            {[data[1], data[0], data[2]].map((entry, i) => {
              if (!entry) return null;
              const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
              const user = userMap[entry.uid] || {};
              return (
                <LbPodiumItem
                  key={entry.uid}
                  entry={entry}
                  rank={rank}
                  fallbackName={user.displayName || 'User'}
                  fallbackPhotoURL={user.photoURL}
                />
              );
            })}
          </div>
        )}

        {/* Full list */}
        {!loading && data.length === 0 && (
          <div className="lb-empty">
            <TrophyIcon size={48} />
            <p>No data for this period yet.</p>
            <span>Be the first to send a gift!</span>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div className="lb-list">
            {data.map((entry, i) => {
              const user = userMap[entry.uid] || {};
              return (
                <LbListRow
                  key={entry.uid}
                  entry={entry}
                  index={i}
                  fallbackName={user.displayName || 'User'}
                  fallbackPhotoURL={user.photoURL}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
