// src/components/coins/Leaderboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import {
  collection, query, where, orderBy, limit, onSnapshot, getDocs
} from 'firebase/firestore';
import { formatCoins } from '../../utils/coinSystem';
import './Leaderboard.css';

/* ── Icons ── */
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrophyIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="lb_ti" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <path d="M6 4h12v7a6 6 0 01-12 0V4zm-3 2H1v3a4 4 0 003 3.87V6zm16 0h2v3a4 4 0 01-3 3.87V6zm-8 14v-3h-2v-2h6v2h-2v3h-2zm-3 2h8v2H8v-2z" fill="url(#lb_ti)"/>
  </svg>
);
const CoinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="lb_ci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#lb_ci)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#92400e">C</text>
  </svg>
);
const GiftIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="lb_gi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
    <path d="M20 12v-2h-2.18C17.93 9.08 18 8.55 18 8c0-2.21-1.79-4-4-4-1.58 0-2.93.93-3.57 2.27C9.93 4.93 8.58 4 7 4 4.79 4 3 5.79 3 8c0 .55.07 1.08.18 1.58V12H1l3 8h16l3-8h-3z" fill="url(#lb_gi)"/>
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

function useLeaderboard(type, period) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    setLoading(true);
    const txType = type === 'senders' ? 'gift_sent' : 'gift_received';

    let q;
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    q = query(
      collection(db, 'coinTransactions'),
      where('type', '==', txType),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const txs = snap.docs.map(d => d.data());

      // Filter by period
      const filtered = txs.filter(tx => {
        if (!tx.timestamp) return false;
        const ts = tx.timestamp.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
        if (period === 'today') return ts.toISOString().slice(0, 10) === todayKey;
        if (period === 'week') return ts >= weekStart;
        if (period === 'month') return ts >= monthStart;
        return true;
      });

      // Aggregate
      const map = {};
      filtered.forEach(tx => {
        const uid = tx.uid;
        if (!map[uid]) map[uid] = { uid, coins: 0, gifts: 0 };
        map[uid].coins += Math.abs(tx.coins);
        map[uid].gifts += 1;
      });
      const sorted = Object.values(map).sort((a, b) => b.coins - a.coins).slice(0, 20);
      setData(sorted);

      // Load user profiles
      const uids = sorted.map(s => s.uid);
      const newMap = { ...userMap };
      await Promise.all(uids.filter(uid => !newMap[uid]).map(async uid => {
        try {
          const { doc: fsDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
          const snap2 = await fsGetDoc(fsDoc(db, 'users', uid));
          if (snap2.exists()) newMap[uid] = snap2.data();
        } catch {}
      }));
      setUserMap(newMap);
      setLoading(false);
    });

    return unsub;
  }, [type, period]);

  return { data, loading, userMap };
}

function RankBadge({ rank }) {
  if (rank <= 3) {
    return (
      <div className="lb-medal" style={{ background: MEDAL_COLORS[rank - 1] }}>
        {MEDAL_LABELS[rank - 1]}
      </div>
    );
  }
  return <div className="lb-rank-num">#{rank}</div>;
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
              const name = user.displayName || 'User';
              const photo = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${entry.uid}`;
              return (
                <div key={entry.uid} className={`lb-podium-item lb-podium-item--${rank}`}>
                  <div className="lb-podium-avatar-wrap">
                    <img src={photo} alt={name} className="lb-podium-avatar"
                      onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${entry.uid}`; }}
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
              const name = user.displayName || 'User';
              const photo = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${entry.uid}`;
              return (
                <div key={entry.uid} className={`lb-row ${i < 3 ? 'lb-row--top' : ''}`}>
                  <RankBadge rank={i + 1} />
                  <img src={photo} alt={name} className="lb-avatar"
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${entry.uid}`; }}
                  />
                  <div className="lb-user-info">
                    <span className="lb-user-name">{name}</span>
                    <span className="lb-user-gifts">{entry.gifts} gifts</span>
                  </div>
                  <div className="lb-user-coins">
                    <CoinIcon size={13} />
                    <span>{formatCoins(entry.coins)}</span>
                  </div>
                  {i < 3 && <div className="lb-glow" style={{ background: MEDAL_COLORS[i] }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
