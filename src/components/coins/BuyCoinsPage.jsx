// src/components/coins/BuyCoinsPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import QRCode from 'qrcode';
import {
  subscribeCoinConfig, subscribeWallet, createPaymentOrder,
  markOrderSubmitted, formatCoins
} from '../../utils/coinSystem';
import { pt } from '../../utils/premiumToast';
import './BuyCoinsPage.css';

/* ── SVG Icons ── */
const CoinIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ci_g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a"/>
        <stop offset="50%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#d97706"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#ci_g)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">₹</text>
  </svg>
);

const WalletIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="wi_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M21 7H3a1 1 0 00-1 1v11a2 2 0 002 2h16a2 2 0 002-2V8a1 1 0 00-1-1z" fill="url(#wi_g)" opacity="0.9"/>
    <path d="M16 3H5a2 2 0 00-2 2v2h16V5a2 2 0 00-2-2h-1z" fill="#8b5cf6"/>
    <circle cx="17" cy="13" r="2" fill="#fde68a"/>
  </svg>
);

const UPIIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="upi_g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#4338ca"/>
      </linearGradient>
      <linearGradient id="upi_g2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#d97706"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#upi_g1)"/>
    <path d="M20 40 L32 20 L44 40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M26 34 L38 34" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="32" cy="48" r="4" fill="url(#upi_g2)"/>
  </svg>
);

const QRIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="qri_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#0284c7"/></linearGradient></defs>
    <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="url(#qri_g)" strokeWidth="1.8" fill="none"/>
    <rect x="14" y="2" width="8" height="8" rx="1.5" stroke="url(#qri_g)" strokeWidth="1.8" fill="none"/>
    <rect x="2" y="14" width="8" height="8" rx="1.5" stroke="url(#qri_g)" strokeWidth="1.8" fill="none"/>
    <rect x="4.5" y="4.5" width="3" height="3" fill="url(#qri_g)"/>
    <rect x="16.5" y="4.5" width="3" height="3" fill="url(#qri_g)"/>
    <rect x="4.5" y="16.5" width="3" height="3" fill="url(#qri_g)"/>
    <rect x="14" y="14" width="3" height="3" fill="url(#qri_g)"/>
    <rect x="19" y="14" width="3" height="3" fill="url(#qri_g)"/>
    <rect x="14" y="19" width="3" height="3" fill="url(#qri_g)"/>
    <rect x="19" y="19" width="3" height="3" fill="url(#qri_g)"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FireIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="fi_g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
    <path d="M12 2C12 2 18 9 18 14a6 6 0 01-12 0c0-2 1-4 3-6 0 3 2 5 4 5 1 0 2-1 2-2s-3-5-3-9z" fill="url(#fi_g)"/>
  </svg>
);

/* ── Package card colors — Light Lavender Premium ── */
const PKG_THEMES = [
  { from: '#f0eeff', to: '#e8e2ff', accent: '#5b21b6', badge: 'linear-gradient(135deg,#c4b5fd,#a78bfa)', coinColor: '#5b21b6' },
  { from: '#f0fdf6', to: '#dcfce7', accent: '#15803d', badge: 'linear-gradient(135deg,#6ee7b7,#10b981)', coinColor: '#15803d' },
  { from: '#fffbeb', to: '#fef3c7', accent: '#b45309', badge: 'linear-gradient(135deg,#fde68a,#f59e0b)', coinColor: '#b45309' },
  { from: '#fdf4ff', to: '#fae8ff', accent: '#a21caf', badge: 'linear-gradient(135deg,#e879f9,#c026d3)', coinColor: '#a21caf' },
  { from: '#eff6ff', to: '#dbeafe', accent: '#1d4ed8', badge: 'linear-gradient(135deg,#93c5fd,#3b82f6)', coinColor: '#1d4ed8' },
  { from: '#fff1f2', to: '#ffe4e6', accent: '#be123c', badge: 'linear-gradient(135deg,#fda4af,#f43f5e)', coinColor: '#be123c' },
];

export default function BuyCoinsPage() {
  const navigate = useNavigate();
  const [firebaseUser] = useAuthState(auth);
  const [config, setConfig] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [step, setStep] = useState('packages'); // packages | payment | done
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeCoinConfig(setConfig);
    if (!firebaseUser) return;
    const unsub2 = subscribeWallet(firebaseUser.uid, setWallet);
    return () => { unsub1(); unsub2(); };
  }, [firebaseUser]);

  /* Generate QR when UPI + package is set */
  useEffect(() => {
    const generateQR = async () => {
      if (!config?.upiId || !selectedPkg || !config?.upiEnabled) return;
      const upiLink = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=TingleTap&am=${selectedPkg.price}&cu=INR&tn=TingleTap+Coins+${selectedPkg.coins}`;
      try {
        const url = await QRCode.toDataURL(upiLink, {
          width: 240, margin: 1,
          color: { dark: '#1e1b4b', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
      } catch (e) {
        console.error('QR generation failed', e);
      }
    };
    generateQR();
  }, [config?.upiId, selectedPkg, config?.upiEnabled]);

  const handleSelectPackage = (pkg) => {
    setSelectedPkg(pkg);
    setStep('payment');
    setSubmitted(false);
    setOrderInfo(null);
  };

  const handleInitiatePayment = useCallback(async () => {
    if (!firebaseUser || !selectedPkg || !config?.upiId) return;
    try {
      const profile = await import('../../firebase/config').then(m =>
        m.db ? import('firebase/firestore').then(fs =>
          fs.getDoc(fs.doc(m.db, 'users', firebaseUser.uid))
        ) : null
      );
      const displayName = profile?.data?.()?.displayName || firebaseUser.displayName || 'User';
      const order = await createPaymentOrder({
        uid: firebaseUser.uid,
        displayName,
        coins: selectedPkg.coins + (selectedPkg.bonus || 0),
        price: selectedPkg.price,
        packageId: selectedPkg.id,
        upiId: config.upiId,
      });
      setOrderInfo(order);
    } catch (e) {
      console.error(e);
      pt.error('Could not create order. Please try again.');
    }
  }, [firebaseUser, selectedPkg, config]);

  // Auto-create order when entering payment step
  useEffect(() => {
    if (step === 'payment' && !orderInfo && config?.upiId) {
      handleInitiatePayment();
    }
  }, [step, orderInfo, config, handleInitiatePayment]);

  const handlePaymentDone = async () => {
    if (!orderInfo) return;
    setSubmitting(true);
    try {
      await markOrderSubmitted(orderInfo.orderDocId);
      setSubmitted(true);
      setStep('done');
    } catch (e) {
      pt.error('Could not mark payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!config?.upiId) return;
    navigator.clipboard.writeText(config.upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const packages = config?.packages || [];
  const upiEnabled = config?.upiEnabled;

  return (
    <div className="bc-root">
      {/* Ambient orbs */}
      <div className="bc-orb bc-orb--1" />
      <div className="bc-orb bc-orb--2" />

      {/* Header */}
      <header className="bc-header">
        <button className="bc-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftIcon />
        </button>
        <div className="bc-header-brand">
          <CoinIcon size={28} />
          <span>Buy Coins</span>
        </div>
        <div className="bc-header-wallet">
          <WalletIcon size={16} />
          <span>{formatCoins(wallet?.balance || 0)}</span>
        </div>
      </header>

      <div className="bc-content">

        {/* ── PACKAGES STEP ── */}
        {step === 'packages' && (
          <>
            <div className="bc-section-title">
              <h2>Choose a Coin Package</h2>
              <p>Select the package that suits you best</p>
            </div>

            {!upiEnabled && (
              <div className="bc-unavailable">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Payments are temporarily unavailable. Please check back soon.</p>
              </div>
            )}

            <div className="bc-packages-grid">
              {packages.map((pkg, i) => {
                const theme = PKG_THEMES[i % PKG_THEMES.length];
                const totalCoins = pkg.coins + (pkg.bonus || 0);
                return (
                  <button
                    key={pkg.id}
                    className={`bc-pkg-card ${pkg.popular ? 'bc-pkg-card--popular' : ''}`}
                    style={{ '--pkg-from': theme.from, '--pkg-to': theme.to, '--pkg-accent': theme.accent }}
                    onClick={() => upiEnabled && handleSelectPackage(pkg)}
                    disabled={!upiEnabled}
                  >
                    {pkg.popular && (
                      <div className="bc-pkg-popular" style={{ background: theme.badge }}>
                        <FireIcon /> Most Popular
                      </div>
                    )}
                    <div className="bc-pkg-coins">
                      <CoinIcon size={38} />
                      <span className="bc-pkg-coin-count" style={{ color: theme.coinColor }}>{pkg.coins.toLocaleString()}</span>
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="bc-pkg-bonus" style={{ color: theme.accent }}>
                        +{pkg.bonus} bonus coins
                      </div>
                    )}
                    {totalCoins !== pkg.coins && (
                      <div className="bc-pkg-total" style={{ color: theme.accent }}>
                        = {totalCoins.toLocaleString()} total
                      </div>
                    )}
                    <div className="bc-pkg-price" style={{ color: theme.accent }}>
                      ₹{pkg.price}
                    </div>
                    {upiEnabled && (
                      <div className="bc-pkg-cta" style={{ background: theme.badge }}>
                        Buy Now
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bc-info-strip">
              <QRIcon size={16} />
              <span>Secure UPI payment · Instant processing</span>
            </div>
          </>
        )}

        {/* ── PAYMENT STEP ── */}
        {step === 'payment' && selectedPkg && (
          <div className="bc-payment-wrap">
            <button className="bc-step-back" onClick={() => { setStep('packages'); setOrderInfo(null); }}>
              <ArrowLeftIcon /> Back to packages
            </button>

            <div className="bc-payment-card">
              <div className="bc-payment-header">
                <CoinIcon size={32} />
                <div>
                  <div className="bc-payment-coins">{(selectedPkg.coins + (selectedPkg.bonus || 0)).toLocaleString()} Coins</div>
                  <div className="bc-payment-amount">₹{selectedPkg.price}</div>
                </div>
                {orderInfo && (
                  <div className="bc-order-id">Order: {orderInfo.orderId}</div>
                )}
              </div>

              {/* QR Code */}
              {config?.upiId && qrDataUrl ? (
                <div className="bc-qr-section">
                  <div className="bc-qr-card">
                    <div className="bc-qr-label">
                      <QRIcon size={18} />
                      <span>Scan to Pay</span>
                    </div>
                    <img src={qrDataUrl} alt="UPI QR Code" className="bc-qr-img" />
                    <div className="bc-qr-amount">₹{selectedPkg.price}</div>
                  </div>

                  <div className="bc-upi-row">
                    <UPIIcon size={28} />
                    <div className="bc-upi-id-wrap">
                      <span className="bc-upi-label">UPI ID</span>
                      <span className="bc-upi-id">{config.upiId}</span>
                    </div>
                    <button className="bc-copy-btn" onClick={handleCopy}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="bc-pay-apps">
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=TingleTap&am=${selectedPkg.price}&cu=INR&tn=TingleTap+Coins`}
                      className="bc-pay-app-btn"
                    >
                      <UPIIcon size={20} />
                      Open UPI App
                    </a>
                  </div>

                  <div className="bc-payment-steps">
                    <div className="bc-step"><span className="bc-step-num">1</span>Scan QR or open UPI app</div>
                    <div className="bc-step"><span className="bc-step-num">2</span>Pay ₹{selectedPkg.price} to complete purchase</div>
                    <div className="bc-step"><span className="bc-step-num">3</span>Click "I've Paid" after payment</div>
                    <div className="bc-step"><span className="bc-step-num">4</span>Admin will verify and credit coins (usually within minutes)</div>
                  </div>

                  <button
                    className="bc-paid-btn"
                    onClick={handlePaymentDone}
                    disabled={submitting || !orderInfo}
                  >
                    {submitting ? 'Submitting…' : "I've Paid — Notify Admin"}
                  </button>
                </div>
              ) : (
                <div className="bc-loading-qr">
                  <div className="bc-spinner" />
                  <p>Generating payment details…</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DONE STEP ── */}
        {step === 'done' && (
          <div className="bc-done-wrap">
            <div className="bc-done-card">
              <div className="bc-done-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="done_g" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399"/>
                      <stop offset="100%" stopColor="#059669"/>
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="30" fill="url(#done_g)" opacity="0.15"/>
                  <circle cx="32" cy="32" r="24" fill="url(#done_g)"/>
                  <path d="M20 32l9 9 15-15" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>Payment Submitted!</h2>
              <p>Your payment notification has been sent to the admin. Coins will be credited to your wallet after verification.</p>
              {orderInfo && <div className="bc-done-order">Order ID: <strong>{orderInfo.orderId}</strong></div>}
              <div className="bc-done-actions">
                <button className="bc-done-btn-primary" onClick={() => navigate('/wallet')}>View Wallet</button>
                <button className="bc-done-btn-secondary" onClick={() => { setStep('packages'); setSelectedPkg(null); setOrderInfo(null); }}>Buy More</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
