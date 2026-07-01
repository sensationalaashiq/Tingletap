// src/components/rj/RJEarningsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  subscribeRJEarnings, subscribeUserTransactions, fetchCoinConfig,
  formatCoins, coinsToRupees
} from '../../utils/coinSystem';
import './RJEarningsDashboard.css';

/* ── Icons ── */
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const MicIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rje_mi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <rect x="9" y="2" width="6" height="12" rx="3" fill="url(#rje_mi)"/>
    <path d="M5 10a7 7 0 0014 0" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <line x1="12" y1="17" x2="12" y2="21" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const CoinIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rje_ci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#rje_ci)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#92400e">C</text>
  </svg>
);
const GiftIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rje_gi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
    <path d="M20 12v-2h-2.18C17.93 9.08 18 8.55 18 8c0-2.21-1.79-4-4-4-1.58 0-2.93.93-3.57 2.27C9.93 4.93 8.58 4 7 4 4.79 4 3 5.79 3 8c0 .55.07 1.08.18 1.58V12H1l3 8h16l3-8h-3z" fill="url(#rje_gi)"/>
  </svg>
);
const RupeeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rje_ri" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#rje_ri)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">₹</text>
  </svg>
);
const WithdrawIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rje_wi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M12 2v12m0 0l-4-4m4 4l4-4M3 20h18" stroke="url(#rje_wi)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function formatTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RJEarningsDashboard({ profileOverride }) {
  const navigate = useNavigate();
  const [fbUser] = useAuthState(auth);
  const uid = profileOverride?.uid || fbUser?.uid;
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeRJEarnings(uid, setEarnings);
    const u2 = subscribeUserTransactions(uid, (txs) => {
      setTransactions(txs.filter(t => t.type === 'gift_received'));
    });
    fetchCoinConfig().then(setConfig);
    return () => { u1(); u2(); };
  }, [uid]);

  const commissionPct = config?.commissionPct || 20;
  const totalCoins = earnings?.totalCoins || 0;
  const { gross, commission, net } = coinsToRupees(totalCoins, commissionPct);
  const pendingCoins = earnings?.pendingCoins || 0;
  const { net: pendingNet } = coinsToRupees(pendingCoins, commissionPct);

  const stats = [
    { label: 'Total Coins', value: formatCoins(totalCoins), sub: `₹${gross} gross`, color: '#f59e0b', Icon: CoinIcon },
    { label: 'Total Gifts', value: (earnings?.totalGifts || 0).toLocaleString(), sub: 'received', color: '#ec4899', Icon: GiftIcon },
    { label: 'Net Earnings', value: `₹${net}`, sub: `After ${commissionPct}% commission`, color: '#22c55e', Icon: RupeeIcon },
    { label: 'Pending Pay', value: `₹${pendingNet}`, sub: `${formatCoins(pendingCoins)} coins`, color: '#8b5cf6', Icon: WithdrawIcon },
  ];

  const periodStats = [
    { label: 'Today', coins: earnings?.todayCoins || 0 },
    { label: 'This Week', coins: earnings?.weekCoins || 0 },
    { label: 'This Month', coins: earnings?.monthCoins || 0 },
    { label: 'All Time', coins: earnings?.totalCoins || 0 },
  ];

  return (
    <div className="rje-root">
      <div className="rje-orb rje-orb--1" />
      <div className="rje-orb rje-orb--2" />

      {/* Header */}
      <header className="rje-header">
        {!profileOverride && (
          <button className="rje-back-btn" onClick={() => navigate(-1)}><ArrowLeftIcon /></button>
        )}
        <div className="rje-header-brand">
          <MicIcon size={22} />
          <span>RJ Earnings</span>
        </div>
        <button className="rje-withdraw-btn" onClick={() => navigate('/rj-withdrawal')}>
          <WithdrawIcon /> Withdrawal Info
        </button>
      </header>

      <div className="rje-content">
        {/* Stats grid */}
        <div className="rje-stats-grid">
          {stats.map(s => (
            <div key={s.label} className="rje-stat-card">
              <div className="rje-stat-icon" style={{ color: s.color }}>
                <s.Icon size={20} />
              </div>
              <div className="rje-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="rje-stat-label">{s.label}</div>
              <div className="rje-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Commission info */}
        <div className="rje-commission-card">
          <div className="rje-commission-row">
            <div className="rje-commission-item">
              <span className="rje-commission-label">Total Coins Received</span>
              <span className="rje-commission-value">{formatCoins(totalCoins)}</span>
            </div>
            <div className="rje-commission-item">
              <span className="rje-commission-label">Platform Commission ({commissionPct}%)</span>
              <span className="rje-commission-value rje-neg">-₹{commission}</span>
            </div>
            <div className="rje-commission-divider" />
            <div className="rje-commission-item rje-commission-item--total">
              <span className="rje-commission-label">Your Net Earnings</span>
              <span className="rje-commission-value rje-pos">₹{net}</span>
            </div>
          </div>
          <p className="rje-commission-note">
            Earnings are transferred manually by admin to your UPI ID. Update your withdrawal info to receive payments.
          </p>
        </div>

        {/* Period breakdown */}
        <div className="rje-period-section">
          <h3 className="rje-section-title">Earnings Timeline</h3>
          <div className="rje-period-grid">
            {periodStats.map(p => {
              const { net: pNet } = coinsToRupees(p.coins, commissionPct);
              return (
                <div key={p.label} className="rje-period-card">
                  <div className="rje-period-label">{p.label}</div>
                  <div className="rje-period-coins">
                    <CoinIcon size={14} />
                    <span>{formatCoins(p.coins)}</span>
                  </div>
                  <div className="rje-period-rupee">₹{pNet}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gift history */}
        <div className="rje-history-section">
          <h3 className="rje-section-title">Gift History</h3>
          {transactions.length === 0 ? (
            <div className="rje-empty">
              <GiftIcon size={40} />
              <p>No gifts received yet</p>
              <span>Gifts sent during your broadcasts will appear here</span>
            </div>
          ) : (
            <div className="rje-tx-list">
              {transactions.slice(0, 30).map(tx => (
                <div key={tx.id} className="rje-tx-item">
                  <div className="rje-tx-icon"><GiftIcon size={16} /></div>
                  <div className="rje-tx-info">
                    <span className="rje-tx-name">{tx.giftName || 'Gift'}</span>
                    <span className="rje-tx-time">{formatTime(tx.timestamp)}</span>
                  </div>
                  <div className="rje-tx-coins">
                    <CoinIcon size={12} />
                    <span>+{Math.abs(tx.coins)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
