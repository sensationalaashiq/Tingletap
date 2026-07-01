// src/components/rj/RJWithdrawal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { fetchRJWithdrawalInfo, saveRJWithdrawalInfo } from '../../utils/coinSystem';
import { toast } from 'react-toastify';
import './RJWithdrawal.css';

/* ── Icons ── */
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BankIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rjw_bi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs>
    <path d="M3 21h18M3 7h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11v6M12 11v6M16 11v6" stroke="url(#rjw_bi)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const UPIIcon2 = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rjw_ui" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#4338ca"/></linearGradient></defs>
    <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#rjw_ui)" opacity="0.15" stroke="url(#rjw_ui)" strokeWidth="1.5"/>
    <path d="M8 15l4-6 4 6" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 13h5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rjw_ck" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#rjw_ck)" opacity="0.15"/>
    <path d="M7 12.5l4 4 6-7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="1.5"/>
    <path d="M12 7v1M12 11v6" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default function RJWithdrawal() {
  const navigate = useNavigate();
  const [fbUser] = useAuthState(auth);
  const [form, setForm] = useState({ fullName: '', upiId: '', accountHolderName: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!fbUser) return;
    fetchRJWithdrawalInfo(fbUser.uid).then(info => {
      if (info) setForm({
        fullName: info.fullName || '',
        upiId: info.upiId || '',
        accountHolderName: info.accountHolderName || '',
        notes: info.notes || '',
      });
      setLoading(false);
    });
  }, [fbUser]);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.upiId.trim()) errs.upiId = 'UPI ID is required';
    else if (!form.upiId.includes('@')) errs.upiId = 'Enter a valid UPI ID (e.g. name@upi)';
    if (!form.accountHolderName.trim()) errs.accountHolderName = 'Account holder name is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await saveRJWithdrawalInfo(fbUser.uid, form);
      setSaved(true);
      setErrors({});
      toast.success('Withdrawal info saved successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    setSaved(false);
  };

  return (
    <div className="rjw-root">
      <div className="rjw-orb rjw-orb--1" />
      <div className="rjw-orb rjw-orb--2" />

      <header className="rjw-header">
        <button className="rjw-back-btn" onClick={() => navigate(-1)}><ArrowLeftIcon /></button>
        <div className="rjw-header-brand">
          <BankIcon size={22} />
          <span>Withdrawal Info</span>
        </div>
      </header>

      <div className="rjw-content">
        {/* Info banner */}
        <div className="rjw-info-banner">
          <InfoIcon />
          <div>
            <strong>How withdrawals work</strong>
            <p>Save your UPI details below. Admin will review your earnings and manually transfer money to your UPI ID. You will be notified when payment is processed.</p>
          </div>
        </div>

        {loading ? (
          <div className="rjw-loading"><div className="rjw-spinner" /></div>
        ) : (
          <div className="rjw-form">
            {/* Full Name */}
            <div className="rjw-field">
              <label className="rjw-label">Full Name <span className="rjw-required">*</span></label>
              <input
                className={`rjw-input ${errors.fullName ? 'rjw-input--error' : ''}`}
                type="text"
                placeholder="Your legal full name"
                value={form.fullName}
                onChange={e => handleChange('fullName', e.target.value)}
              />
              {errors.fullName && <span className="rjw-error">{errors.fullName}</span>}
            </div>

            {/* Account Holder Name */}
            <div className="rjw-field">
              <label className="rjw-label">Account Holder Name <span className="rjw-required">*</span></label>
              <input
                className={`rjw-input ${errors.accountHolderName ? 'rjw-input--error' : ''}`}
                type="text"
                placeholder="Name as on UPI account"
                value={form.accountHolderName}
                onChange={e => handleChange('accountHolderName', e.target.value)}
              />
              {errors.accountHolderName && <span className="rjw-error">{errors.accountHolderName}</span>}
              <span className="rjw-hint">This will be used to verify your identity during payment</span>
            </div>

            {/* UPI ID */}
            <div className="rjw-field">
              <label className="rjw-label">
                <UPIIcon2 size={16} /> UPI ID <span className="rjw-required">*</span>
              </label>
              <input
                className={`rjw-input rjw-input--mono ${errors.upiId ? 'rjw-input--error' : ''}`}
                type="text"
                placeholder="yourname@upi"
                value={form.upiId}
                onChange={e => handleChange('upiId', e.target.value.trim())}
                inputMode="email"
              />
              {errors.upiId && <span className="rjw-error">{errors.upiId}</span>}
              <span className="rjw-hint">Accepted: GPay, PhonePe, Paytm, BHIM UPI</span>
            </div>

            {/* Notes */}
            <div className="rjw-field">
              <label className="rjw-label">Additional Notes <span className="rjw-optional">(optional)</span></label>
              <textarea
                className="rjw-textarea"
                placeholder="Any notes for the admin…"
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Save button */}
            <button
              className={`rjw-save-btn ${saved ? 'rjw-save-btn--saved' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><div className="rjw-spinner-sm" /> Saving…</>
              ) : saved ? (
                <><CheckIcon /> Saved Successfully</>
              ) : (
                <><SaveIcon /> Save Withdrawal Info</>
              )}
            </button>

            {/* Privacy note */}
            <div className="rjw-privacy-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" fill="#22c55e" opacity="0.7"/>
              </svg>
              Your UPI ID is stored securely and only visible to admins for payment processing.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
