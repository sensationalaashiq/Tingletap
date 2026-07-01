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
    <defs><linearGradient id="cwci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#cwci)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">₹</text>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PurchaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="puri" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 14.5v1.5h-2v-1.5C9.55 16.77 9 15.97 9 15c0-1.1.9-2 2-2h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1H8c0-1.65 1.09-3.05 2.6-3.5V6.5h2v1.5c1.45.25 2.5 1.58 2.4 2.98L13 11c0 .55.45 1 1 1h.01C15.11 12 16 12.9 16 14c0 1.1-.9 2-2 2l-.01-.5H11c-.55 0-1 .45-1 1s.45 1 1 1h2z" fill="url(#puri)"/>
  </svg>
);

const GiftSentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="gsi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
    <path d="M20 12v-2h-2.18C17.93 9.08 18 8.55 18 8c0-2.21-1.79-4-4-4-1.58 0-2.93.93-3.57 2.27C9.93 4.93 8.58 4 7 4c-2.21 0-4 1.79-4 4 0 .55.07 1.08.18 1.58V12H1l3 8h16l3-8h-3zm-7-8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6 2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" fill="url(#gsi)"/>
  </svg>
);

const GiftReceivedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="gri" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M20 12v-2h-2.18C17.93 9.08 18 8.55 18 8c0-2.21-1.79-4-4-4-1.58 0-2.93.93-3.57 2.27C9.93 4.93 8.58 4 7 4c-2.21 0-4 1.79-4 4 0 .55.07 1.08.18 1.58V12H1l3 8h16l3-8h-3zm-7-8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6 2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" fill="url(#gri)"/>
  </svg>
);

const ShopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="shi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4338ca"/></linearGradient></defs>
    <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z" fill="url(#shi)"/>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="lb_a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
              <path d="M3 17h4v-6H3v6zm7 0h4V7h-4v10zm7 0h4v-3h-4v3z" fill="url(#lb_a)"/>
            </svg>
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
