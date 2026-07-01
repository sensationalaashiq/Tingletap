// src/components/coins/GiftPanel.jsx
// Gift sending panel — embedded inside BroadcastPanel tab
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, rtdb } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ref, set, remove } from 'firebase/database';
import { subscribeWallet, deductCoinsForGift, formatCoins } from '../../utils/coinSystem';
import { GIFT_CATALOG, GIFT_TIERS, getGiftById } from '../../utils/giftSystem';
import { toast } from 'react-toastify';
import './GiftPanel.css';

/* ── Inline SVG icons (no emoji) ── */
const CoinIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="gp_ci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#gp_ci)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">C</text>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WalletIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="gp_wi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M21 7H3a1 1 0 00-1 1v11a2 2 0 002 2h16a2 2 0 002-2V8a1 1 0 00-1-1z" fill="url(#gp_wi)" opacity="0.9"/>
    <circle cx="17" cy="13" r="2" fill="#fde68a"/>
  </svg>
);

/* Parse SVG string to React-renderable component */
function RawSVG({ svgString, className = '' }) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: svgString }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
}

/* Gift notification overlay — brief animation then removed from RTDB */
function GiftFlyIn({ gift, senderName, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="gp-flyin">
      <div className="gp-flyin-inner">
        <RawSVG svgString={gift.renderIcon(56)} className="gp-flyin-icon" />
        <div className="gp-flyin-text">
          <span className="gp-flyin-sender">{senderName}</span>
          <span className="gp-flyin-action">sent a</span>
          <span className="gp-flyin-name">{gift.name}</span>
        </div>
      </div>
    </div>
  );
}

export default function GiftPanel({ rjUid, rjName, rjAvatar, loggedInUserProfile, roomId }) {
  const uid = loggedInUserProfile?.uid || auth.currentUser?.uid;
  const isGuest = loggedInUserProfile?.isGuest || loggedInUserProfile?.role === 'guest';
  const [wallet, setWallet] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentGift, setSentGift] = useState(null);
  const [activeTier, setActiveTier] = useState('all');
  const [flyIns, setFlyIns] = useState([]); // live gift notifications
  const flyInRef = useRef(null);

  // Subscribe to wallet
  useEffect(() => {
    if (!uid || isGuest) return;
    const unsub = subscribeWallet(uid, setWallet);
    return unsub;
  }, [uid, isGuest]);

  // Listen for live gifts in RTDB
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    let detach = null;

    // Dynamic import keeps the ES module boundary clean (no require())
    import('firebase/database').then(({ ref: rtdbRef2, onChildAdded, off }) => {
      if (!active) return; // unmounted before import resolved
      const feedRef = rtdbRef2(rtdb, `giftFeed/${roomId}`);
      onChildAdded(feedRef, (snap) => {
        const data = snap.val();
        if (!data) return;
        const gift = getGiftById(data.giftId);
        if (!gift) return;
        const id = snap.key;
        setFlyIns(prev => [...prev, { id, gift, senderName: data.senderName }]);
        // Auto-remove from RTDB after 4s
        setTimeout(() => remove(rtdbRef2(rtdb, `giftFeed/${roomId}/${id}`)).catch(() => {}), 4000);
      });
      detach = () => { try { off(feedRef); } catch {} };
      // If already unmounted by the time the import resolved, clean up immediately
      if (!active) detach();
    });

    return () => {
      active = false;
      if (detach) detach();
    };
  }, [roomId]);

  const filteredGifts = activeTier === 'all'
    ? GIFT_CATALOG
    : GIFT_CATALOG.filter(g => g.tier === activeTier);

  const handleSend = async () => {
    if (!selectedGift || !uid || !rjUid || sending) return;
    if (isGuest) { toast.error('Guests cannot send gifts. Please register.'); return; }
    if (!wallet || wallet.balance < selectedGift.coinCost) {
      toast.error('Insufficient coins. Please buy more coins.');
      return;
    }

    setSending(true);
    try {
      await deductCoinsForGift({
        fromUid: uid,
        toUid: rjUid,
        coins: selectedGift.coinCost,
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        roomId: roomId || '',
        rjUid,
      });

      // Write to RTDB gift feed for real-time animation
      const myName = loggedInUserProfile?.displayName || loggedInUserProfile?.username || 'Someone';
      const feedKey = `${uid}_${Date.now()}`;
      await set(
        ref(rtdb, `giftFeed/${roomId}/${feedKey}`),
        { giftId: selectedGift.id, senderName: myName, sentAt: Date.now() }
      );

      setSentGift(selectedGift);
      setSelectedGift(null);
      toast.success(`${selectedGift.name} sent to ${rjName}!`, { autoClose: 2000 });
      setTimeout(() => setSentGift(null), 3000);
    } catch (e) {
      if (e.message === 'Insufficient coins') {
        toast.error('Not enough coins.');
      } else {
        toast.error('Gift failed. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  if (isGuest) {
    return (
      <div className="gp-root gp-guest">
        <div className="gp-guest-msg">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <defs><linearGradient id="gp_lock" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
            <path d="M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z" fill="url(#gp_lock)"/>
          </svg>
          <p>Register an account to send gifts to your favourite RJs.</p>
        </div>
      </div>
    );
  }

  if (!rjUid) {
    return (
      <div className="gp-root gp-no-rj">
        <p>No RJ is currently live. Gifts can be sent during a live broadcast.</p>
      </div>
    );
  }

  const tiers = ['all', 'basic', 'premium', 'elite', 'legendary'];

  return (
    <div className="gp-root">
      {/* Live fly-in notifications */}
      {flyIns.map(fi => (
        <GiftFlyIn
          key={fi.id}
          gift={fi.gift}
          senderName={fi.senderName}
          onDone={() => setFlyIns(prev => prev.filter(f => f.id !== fi.id))}
        />
      ))}

      {/* RJ target */}
      <div className="gp-rj-target">
        <img
          src={rjAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${rjUid}`}
          alt={rjName}
          className="gp-rj-avatar"
          onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${rjUid}`; }}
        />
        <div className="gp-rj-info">
          <span className="gp-rj-name">{rjName}</span>
          <span className="gp-rj-live">Live</span>
        </div>
        <div className="gp-wallet-chip">
          <WalletIcon size={13} />
          <span>{formatCoins(wallet?.balance || 0)}</span>
        </div>
      </div>

      {/* Tier filter */}
      <div className="gp-tier-row">
        {tiers.map(t => (
          <button
            key={t}
            className={`gp-tier-btn ${activeTier === t ? 'active' : ''}`}
            onClick={() => setActiveTier(t)}
            style={activeTier === t && t !== 'all' ? { background: GIFT_TIERS[t]?.gradient } : {}}
          >
            {t === 'all' ? 'All' : GIFT_TIERS[t]?.label}
          </button>
        ))}
      </div>

      {/* Gift grid */}
      <div className="gp-gift-grid">
        {filteredGifts.map(gift => {
          const isSelected = selectedGift?.id === gift.id;
          const canAfford = (wallet?.balance || 0) >= gift.coinCost;
          const tier = GIFT_TIERS[gift.tier];
          return (
            <button
              key={gift.id}
              className={`gp-gift-card ${isSelected ? 'gp-gift-card--selected' : ''} ${!canAfford ? 'gp-gift-card--locked' : ''}`}
              onClick={() => canAfford && setSelectedGift(isSelected ? null : gift)}
              title={!canAfford ? 'Not enough coins' : gift.description}
            >
              <div className="gp-gift-icon">
                <RawSVG svgString={gift.renderIcon(40)} />
              </div>
              <div className="gp-gift-name">{gift.name}</div>
              <div className="gp-gift-cost" style={{ color: tier?.color }}>
                <CoinIcon size={11} />
                {gift.coinCost}
              </div>
              {isSelected && <div className="gp-gift-check">✓</div>}
            </button>
          );
        })}
      </div>

      {/* Send bar */}
      {selectedGift && (
        <div className="gp-send-bar">
          <div className="gp-send-preview">
            <RawSVG svgString={selectedGift.renderIcon(32)} />
            <div className="gp-send-meta">
              <span className="gp-send-name">{selectedGift.name}</span>
              <span className="gp-send-cost">
                <CoinIcon size={12} /> {selectedGift.coinCost} coins
              </span>
            </div>
          </div>
          <button
            className="gp-send-btn"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? (
              <span className="gp-spinner" />
            ) : (
              <><SendIcon /> Send</>
            )}
          </button>
        </div>
      )}

      {/* Success flash */}
      {sentGift && (
        <div className="gp-sent-flash">
          <RawSVG svgString={sentGift.renderIcon(28)} />
          <span>{sentGift.name} sent!</span>
        </div>
      )}

      {/* Buy coins link */}
      <div className="gp-buy-link">
        <span>Low on coins?</span>
        <a href="/buy-coins" target="_blank" rel="noreferrer">Buy Coins</a>
      </div>
    </div>
  );
}
