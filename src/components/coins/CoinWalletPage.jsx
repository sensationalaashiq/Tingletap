// src/components/coins/CoinWalletPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import {
  subscribeWallet, subscribeUserTransactions, formatCoins, coinsToRupees
} from '../../utils/coinSystem';
import './CoinWalletPage.css';

/* ── Icons ── */
const CoinIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="cwci" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a"/>
        <stop offset="50%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#d97706"/>
      </linearGradient>
      <filter id="cwci-glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#cwci)" filter="url(#cwci-glow)"/>
    <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#78350f">₹</text>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PurchaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="puri" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6ee7b7"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#puri)" opacity="0.15"/>
    <path d="M12 6v2M12 16v2M8 10h5c.55 0 1 .45 1 1s-.45 1-1 1H9c-1.1 0-2 .9-2 2s.9 2 2 2h1M16 10h-1" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 8h6" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const GiftSentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="gsi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f9a8d4"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs>
    <rect x="3" y="10" width="18" height="12" rx="2" fill="url(#gsi)" opacity="0.18"/>
    <rect x="3" y="10" width="18" height="3" rx="0" fill="url(#gsi)" opacity="0.35"/>
    <path d="M12 10V22M7 6c0-1.66 1.34-3 3-3 1.66 0 3 1.34 3 3H7z" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M17 6c0-1.66-1.34-3-3-3-1.66 0-3 1.34-3 3h6z" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const GiftReceivedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="gri" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <rect x="3" y="10" width="18" height="12" rx="2" fill="url(#gri)" opacity="0.2"/>
    <rect x="3" y="10" width="18" height="3" rx="0" fill="url(#gri)" opacity="0.4"/>
    <path d="M12 10V22M7 6c0-1.66 1.34-3 3-3 1.66 0 3 1.34 3 3H7z" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M17 6c0-1.66-1.34-3-3-3-1.66 0-3 1.34-3 3h6z" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const ShopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="cw-shopi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="url(#cw-shopi)" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
    <line x1="3" y1="6" x2="21" y2="6" stroke="url(#cw-shopi)" strokeWidth="1.8"/>
    <path d="M16 10a4 4 0 01-8 0" stroke="url(#cw-shopi)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const LeaderboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="lb_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <rect x="2" y="11" width="4" height="10" rx="1.5" fill="url(#lb_a)" opacity="0.7"/>
    <rect x="10" y="5" width="4" height="16" rx="1.5" fill="url(#lb_a)"/>
    <rect x="18" y="14" width="4" height="7" rx="1.5" fill="url(#lb_a)" opacity="0.7"/>
  </svg>
);

const TX_TYPE_META = {
  purchase:       { label: 'Coins Purchased',  color: '#22c55e', sign: '+', Icon: PurchaseIcon },
  gift_sent:      { label: 'Gift Sent',        color: '#f43f5e', sign: '-', Icon: GiftSentIcon },
  gift_received:  { label: 'Gift Received',    color: '#8b5cf6', sign: '+', Icon: GiftReceivedIcon },
};

function formatTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CoinWalletPage() {
  const navigate = useNavigate();
  const [firebaseUser] = useAuthState(auth);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [userNames, setUserNames] = useState({});

  useEffect(() => {
    if (!firebaseUser) return;
    const u1 = subscribeWallet(firebaseUser.uid, setWallet);
    const u2 = subscribeUserTransactions(firebaseUser.uid, setTransactions);
    return () => { u1(); u2(); };
  }, [firebaseUser]);

  // Load display names for gift transactions
  useEffect(() => {
    const uids = new Set();
    transactions.forEach(tx => {
      if (tx.toUid) uids.add(tx.toUid);
      if (tx.fromUid) uids.add(tx.fromUid);
    });
    uids.forEach(async uid => {
      if (userNames[uid] || uid === firebaseUser?.uid) return;
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          setUserNames(prev => ({ ...prev, [uid]: snap.data().displayName || uid }));
        }
      } catch {}
    });
  }, [transactions]);

  const filteredTx = transactions.filter(tx => {
    if (activeTab === 'all') return true;
    if (activeTab === 'purchases') return tx.type === 'purchase';
    if (activeTab === 'gifts') return tx.type === 'gift_sent' || tx.type === 'gift_received';
    return true;
  });

  const stats = wallet ? [
    { label: 'Balance', value: formatCoins(wallet.balance), icon: '💰', color: '#f59e0b' },
    { label: 'Purchased', value: formatCoins(wallet.totalPurchased), icon: '🛒', color: '#22c55e' },
    { label: 'Gifted', value: formatCoins(wallet.totalGifted), icon: '🎁', color: '#f43f5e' },
    { label: 'Received', value: formatCoins(wallet.totalReceived), icon: '✨', color: '#8b5cf6' },
  ] : [];

  return (
    <div className="cw-root">
      <div className="cw-orb cw-orb--1" />
      <div className="cw-orb cw-orb--2" />
      <div className="cw-orb cw-orb--3" />

      {/* Header */}
      <header className="cw-header">
        <button className="cw-back-btn" onClick={() => navigate(-1)}><ArrowLeftIcon /></button>
        <div className="cw-header-title">
          <CoinIcon size={24} />
          <span>My Wallet</span>
        </div>
        <button className="cw-buy-btn" onClick={() => navigate('/buy-coins')}>
          <ShopIcon /> Buy Coins
        </button>
      </header>

      <div className="cw-content">
        {/* Balance hero */}
        <div className="cw-balance-hero">
          <div className="cw-balance-label">Current Balance</div>
          <div className="cw-balance-amount">
            <CoinIcon size={40} />
            <span>{(wallet?.balance || 0).toLocaleString()}</span>
          </div>
          <div className="cw-balance-sub">coins available</div>
        </div>

        {/* Stats grid */}
        {wallet && (
          <div className="cw-stats-grid">
            {stats.map(s => (
              <div key={s.label} className="cw-stat-card">
                <div className="cw-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="cw-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="cw-actions">
          <button className="cw-action-btn cw-action-btn--primary" onClick={() => navigate('/buy-coins')}>
            <ShopIcon /> Buy Coins
          </button>
          <button className="cw-action-btn cw-action-btn--secondary" onClick={() => navigate('/leaderboard')}>
            <LeaderboardIcon />
            Leaderboard
          </button>
        </div>

        {/* Transaction history */}
        <div className="cw-tx-section">
          <h3 className="cw-tx-title">Transaction History</h3>
          <div className="cw-tx-tabs">
            {['all','purchases','gifts'].map(t => (
              <button
                key={t}
                className={`cw-tx-tab ${activeTab === t ? 'active' : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {filteredTx.length === 0 ? (
            <div className="cw-tx-empty">
              <CoinIcon size={40} />
              <p>No transactions yet</p>
              <span>Your transaction history will appear here</span>
            </div>
          ) : (
            <div className="cw-tx-list">
              {filteredTx.map(tx => {
                const meta = TX_TYPE_META[tx.type] || { label: tx.type, color: '#6b7280', sign: '', Icon: CoinIcon };
                const isPositive = tx.coins > 0;
                return (
                  <div key={tx.id} className="cw-tx-item">
                    <div className="cw-tx-icon">
                      <meta.Icon />
                    </div>
                    <div className="cw-tx-info">
                      <div className="cw-tx-name">{meta.label}</div>
                      <div className="cw-tx-detail">
                        {tx.giftName && <span className="cw-tx-gift">{tx.giftName}</span>}
                        {tx.toUid && tx.type === 'gift_sent' && (
                          <span>to {userNames[tx.toUid] || 'User'}</span>
                        )}
                        {tx.fromUid && tx.type === 'gift_received' && (
                          <span>from {userNames[tx.fromUid] || 'User'}</span>
                        )}
                        {tx.orderId && <span className="cw-tx-order">#{tx.orderId}</span>}
                      </div>
                      <div className="cw-tx-time">{formatTime(tx.timestamp)}</div>
                    </div>
                    <div className={`cw-tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                      {isPositive ? '+' : ''}{Math.abs(tx.coins).toLocaleString()}
                      <span className="cw-tx-coin-label">coins</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
