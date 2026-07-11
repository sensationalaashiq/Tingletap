// src/components/admin/AdminCoinsPanel.jsx
// Complete admin management for coins, UPI, RJ earnings, and payments
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  subscribeCoinConfig, updateCoinConfig,
  subscribePaymentOrders, verifyPaymentOrder, rejectPaymentOrder,
  subscribeAllRJEarnings, fetchRJWithdrawalInfo,
  subscribeRJPayments, createRJPayment, updateRJPaymentStatus,
  DEFAULT_COIN_PACKAGES, formatCoins, coinsToRupees
} from '../../utils/coinSystem';
import { db } from '../../firebase/config';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { pt } from '../../utils/premiumToast';
import './AdminCoinsPanel.css';

/* ── Inline SVG Icons ── */
const CoinIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="acp_ci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#acp_ci)"/>
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">C</text>
  </svg>
);
const UPIIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="acp_ui" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#4338ca"/></linearGradient></defs>
    <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#acp_ui)" strokeWidth="1.5" fill="none"/>
    <path d="M8 15l4-6 4 6M9.5 13h5" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const MicIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="acp_mi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <rect x="9" y="2" width="6" height="12" rx="3" fill="url(#acp_mi)"/>
    <path d="M5 10a7 7 0 0014 0" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <line x1="12" y1="17" x2="12" y2="21" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const PayIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="acp_pi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="url(#acp_pi)" strokeWidth="1.5" fill="none"/>
    <path d="M2 10h20" stroke="#34d399" strokeWidth="1.5"/>
    <rect x="5" y="13" width="4" height="2" rx="1" fill="#34d399"/>
  </svg>
);
const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const CheckIcon = ({ color = '#22c55e' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const QRIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="#06b6d4" strokeWidth="1.8" fill="none"/>
    <rect x="14" y="2" width="8" height="8" rx="1.5" stroke="#06b6d4" strokeWidth="1.8" fill="none"/>
    <rect x="2" y="14" width="8" height="8" rx="1.5" stroke="#06b6d4" strokeWidth="1.8" fill="none"/>
    <rect x="4.5" y="4.5" width="3" height="3" fill="#06b6d4"/>
    <rect x="16.5" y="4.5" width="3" height="3" fill="#06b6d4"/>
    <rect x="4.5" y="16.5" width="3" height="3" fill="#06b6d4"/>
    <rect x="14" y="14" width="3" height="3" fill="#06b6d4"/>
    <rect x="19" y="14" width="3" height="3" fill="#06b6d4"/>
    <rect x="14" y="19" width="3" height="3" fill="#06b6d4"/>
    <rect x="19" y="19" width="3" height="3" fill="#06b6d4"/>
  </svg>
);

const STATUS_META = {
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  submitted:  { label: 'Submitted',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  verified:   { label: 'Verified',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  failed:     { label: 'Failed',     color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  processing: { label: 'Processing', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  paid:       { label: 'Paid',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
  return (
    <span className="acp-badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

/* ════════════════════════════════════
   SECTION: Coin Packages Manager
════════════════════════════════════ */
function CoinPackagesSection({ config, onSave }) {
  const [packages, setPackages] = useState(config?.packages || DEFAULT_COIN_PACKAGES);
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.packages) setPackages(config.packages);
  }, [config]);

  const startEdit = (i) => {
    setEditIdx(i);
    setEditForm({ ...packages[i] });
  };

  const saveEdit = () => {
    const updated = packages.map((p, i) => i === editIdx ? { ...p, ...editForm, coins: Number(editForm.coins), price: Number(editForm.price), bonus: Number(editForm.bonus || 0) } : p);
    setPackages(updated);
    setEditIdx(null);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave({ packages });
      pt.success('Coin packages saved!', { containerId: 'admin-panel' });
    } catch { pt.error('Save failed', { containerId: 'admin-panel' }); }
    finally { setSaving(false); }
  };

  const addPackage = () => {
    const newPkg = { id: `pkg_custom_${Date.now()}`, coins: 100, price: 9, label: '100 Coins', popular: false, bonus: 0 };
    setPackages(prev => [...prev, newPkg]);
    setEditIdx(packages.length);
    setEditForm(newPkg);
  };

  const removePackage = (i) => {
    setPackages(prev => prev.filter((_, idx) => idx !== i));
    if (editIdx === i) setEditIdx(null);
  };

  return (
    <div className="acp-section">
      <div className="acp-section-head">
        <h3><CoinIcon size={18} /> Coin Packages</h3>
        <div className="acp-section-actions">
          <button className="acp-btn acp-btn--outline" onClick={addPackage}><PlusIcon /> Add Package</button>
          <button className="acp-btn acp-btn--primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>
      <div className="acp-pkg-list">
        {packages.map((pkg, i) => (
          <div key={pkg.id || i} className={`acp-pkg-row ${editIdx === i ? 'acp-pkg-row--editing' : ''}`}>
            {editIdx === i ? (
              <div className="acp-pkg-edit">
                <div className="acp-edit-grid">
                  <div className="acp-edit-field">
                    <label>Label</label>
                    <input value={editForm.label || ''} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} />
                  </div>
                  <div className="acp-edit-field">
                    <label>Coins</label>
                    <input type="number" value={editForm.coins || ''} onChange={e => setEditForm(p => ({ ...p, coins: e.target.value }))} />
                  </div>
                  <div className="acp-edit-field">
                    <label>Price (₹)</label>
                    <input type="number" value={editForm.price || ''} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <div className="acp-edit-field">
                    <label>Bonus Coins</label>
                    <input type="number" value={editForm.bonus || 0} onChange={e => setEditForm(p => ({ ...p, bonus: e.target.value }))} />
                  </div>
                  <div className="acp-edit-field">
                    <label>Popular?</label>
                    <select value={editForm.popular ? 'yes' : 'no'} onChange={e => setEditForm(p => ({ ...p, popular: e.target.value === 'yes' }))}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
                <div className="acp-edit-actions">
                  <button className="acp-btn acp-btn--sm acp-btn--primary" onClick={saveEdit}><CheckIcon color="#fff"/> Done</button>
                  <button className="acp-btn acp-btn--sm acp-btn--outline" onClick={() => setEditIdx(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="acp-pkg-info">
                  <span className="acp-pkg-label">{pkg.label}</span>
                  {pkg.popular && <span className="acp-pkg-popular">Popular</span>}
                </div>
                <div className="acp-pkg-meta">
                  <span><CoinIcon size={13} /> {pkg.coins.toLocaleString()} coins</span>
                  {pkg.bonus > 0 && <span className="acp-pkg-bonus">+{pkg.bonus} bonus</span>}
                  <span className="acp-pkg-price">₹{pkg.price}</span>
                </div>
                <div className="acp-pkg-actions">
                  <button className="acp-icon-btn" onClick={() => startEdit(i)} title="Edit"><EditIcon /></button>
                  <button className="acp-icon-btn acp-icon-btn--danger" onClick={() => removePackage(i)} title="Remove"><XIcon /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   SECTION: UPI Settings
════════════════════════════════════ */
function UPISection({ config, onSave }) {
  const [upiId, setUpiId] = useState(config?.upiId || '');
  const [enabled, setEnabled] = useState(config?.upiEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [testAmount, setTestAmount] = useState(9);

  useEffect(() => {
    if (config?.upiId !== undefined) setUpiId(config.upiId);
    if (config?.upiEnabled !== undefined) setEnabled(config.upiEnabled);
  }, [config]);

  useEffect(() => {
    const gen = async () => {
      if (!upiId) { setQrDataUrl(''); return; }
      try {
        const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=TingleTap&am=${testAmount}&cu=INR&tn=TingleTap+Coins`;
        const url = await QRCode.toDataURL(link, { width: 180, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } });
        setQrDataUrl(url);
      } catch {}
    };
    gen();
  }, [upiId, testAmount]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ upiId, upiEnabled: enabled });
      pt.success('UPI settings saved!', { containerId: 'admin-panel' });
    } catch { pt.error('Save failed', { containerId: 'admin-panel' }); }
    finally { setSaving(false); }
  };

  return (
    <div className="acp-section">
      <div className="acp-section-head">
        <h3><UPIIcon size={18} /> UPI Settings</h3>
      </div>
      <div className="acp-upi-layout">
        <div className="acp-upi-form">
          <div className="acp-field">
            <label>UPI ID</label>
            <input
              className="acp-input acp-input--mono"
              type="text"
              placeholder="yourid@upi"
              value={upiId}
              onChange={e => setUpiId(e.target.value.trim())}
            />
          </div>
          <div className="acp-field">
            <label>Payment Status</label>
            <div className="acp-toggle-row">
              <button
                className={`acp-toggle ${enabled ? 'acp-toggle--on' : 'acp-toggle--off'}`}
                onClick={() => setEnabled(!enabled)}
              >
                <span className="acp-toggle-knob" />
              </button>
              <span className="acp-toggle-label">{enabled ? 'Payments Enabled' : 'Payments Disabled'}</span>
            </div>
          </div>
          <div className="acp-field">
            <label>QR Test Amount (₹)</label>
            <input
              className="acp-input"
              type="number"
              value={testAmount}
              onChange={e => setTestAmount(Number(e.target.value))}
            />
          </div>
          <button className="acp-btn acp-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save UPI Settings'}
          </button>
          {!enabled && (
            <div className="acp-info-note">
              Payments are currently disabled. Users will not be able to buy coins.
            </div>
          )}
        </div>

        {/* QR Preview */}
        <div className="acp-qr-preview">
          <div className="acp-qr-card">
            <div className="acp-qr-label"><QRIcon /> Live QR Preview</div>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="UPI QR" className="acp-qr-img" />
                <div className="acp-qr-upi">{upiId}</div>
                <div className="acp-qr-amount">₹{testAmount}</div>
              </>
            ) : (
              <div className="acp-qr-placeholder">
                <QRIcon size={40} />
                <span>Enter UPI ID to preview</span>
              </div>
            )}
          </div>
          <p className="acp-qr-note">QR updates automatically when you change the UPI ID</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   SECTION: Commission Settings
════════════════════════════════════ */
function CommissionSection({ config, onSave }) {
  const [commissionPct, setCommissionPct] = useState(config?.commissionPct ?? 20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.commissionPct !== undefined) setCommissionPct(config.commissionPct);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ commissionPct: Number(commissionPct) });
      pt.success('Commission saved!', { containerId: 'admin-panel' });
    } catch { pt.error('Save failed', { containerId: 'admin-panel' }); }
    finally { setSaving(false); }
  };

  const exampleCoins = 10000;
  const { gross, commission, net } = coinsToRupees(exampleCoins, Number(commissionPct));

  return (
    <div className="acp-section">
      <div className="acp-section-head">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <defs><linearGradient id="acp_pct" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM9 7a2 2 0 110 4A2 2 0 019 7zm6 10a2 2 0 110-4 2 2 0 010 4zm-1.5-9l-8 12" stroke="url(#acp_pct)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Commission Settings
        </h3>
      </div>
      <div className="acp-commission-layout">
        <div className="acp-field">
          <label>Commission Percentage (%)</label>
          <div className="acp-commission-input-row">
            <input
              className="acp-input"
              type="number" min="0" max="100" step="1"
              value={commissionPct}
              onChange={e => setCommissionPct(e.target.value)}
              style={{ width: 100 }}
            />
            <span className="acp-commission-pct-label">%</span>
          </div>
          <p className="acp-hint">Platform fee deducted from RJ earnings before payout</p>
        </div>
        <div className="acp-commission-example">
          <div className="acp-example-title">Example with {exampleCoins.toLocaleString()} coins:</div>
          <div className="acp-example-row"><span>Gross Value</span><span>₹{gross}</span></div>
          <div className="acp-example-row acp-example-row--neg"><span>Commission ({commissionPct}%)</span><span>-₹{commission}</span></div>
          <div className="acp-example-divider" />
          <div className="acp-example-row acp-example-row--pos"><span>RJ Receives</span><span>₹{net}</span></div>
        </div>
        <button className="acp-btn acp-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Commission'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   SECTION: Payment Orders (Buy Coins)
════════════════════════════════════ */
function PaymentOrdersSection() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('submitted');
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    const unsub = subscribePaymentOrders(setOrders);
    return unsub;
  }, []);

  const filtered = orders.filter(o => filter === 'all' ? true : o.status === filter);

  const handleVerify = async (order) => {
    if (processing[order.id]) return;
    setProcessing(prev => ({ ...prev, [order.id]: true }));
    try {
      await verifyPaymentOrder(order.id, order);
      pt.coin(`Verified! ${(order.coins || 0).toLocaleString()} coins credited to ${order.displayName}`, { containerId: 'admin-panel' });
    } catch (e) {
      pt.error('Verification failed: ' + e.message, { containerId: 'admin-panel' });
    } finally {
      setProcessing(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleReject = async (order) => {
    if (processing[order.id]) return;
    setProcessing(prev => ({ ...prev, [order.id]: true }));
    try {
      await rejectPaymentOrder(order.id);
      pt.success('Order rejected', { containerId: 'admin-panel' });
    } catch { pt.error('Failed', { containerId: 'admin-panel' }); }
    finally { setProcessing(prev => ({ ...prev, [order.id]: false })); }
  };

  const filterOpts = ['submitted', 'pending', 'verified', 'failed', 'all'];
  const counts = {};
  filterOpts.forEach(f => counts[f] = f === 'all' ? orders.length : orders.filter(o => o.status === f).length);

  return (
    <div className="acp-section">
      <div className="acp-section-head">
        <h3><PayIcon size={18} /> Coin Purchase Orders</h3>
      </div>
      <div className="acp-filter-row">
        {filterOpts.map(f => (
          <button
            key={f}
            className={`acp-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {counts[f] > 0 && <span className="acp-filter-count">{counts[f]}</span>}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="acp-empty"><PayIcon size={36} /><p>No {filter} orders</p></div>
      ) : (
        <div className="acp-order-list">
          {filtered.map(order => (
            <div key={order.id} className="acp-order-card">
              <div className="acp-order-row">
                <div className="acp-order-user">
                  <span className="acp-order-name">{order.displayName || 'User'}</span>
                  <span className="acp-order-id">{order.orderId}</span>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="acp-order-row">
                <div className="acp-order-meta">
                  <span><CoinIcon size={12} /> {(order.coins || 0).toLocaleString()} coins</span>
                  <span className="acp-order-price">₹{order.price}</span>
                  <span className="acp-order-time">{formatTime(order.createdAt)}</span>
                </div>
                {order.upiId && <span className="acp-order-upi">UPI: {order.upiId}</span>}
              </div>
              {order.status === 'submitted' && (
                <div className="acp-order-actions">
                  <button
                    className="acp-btn acp-btn--sm acp-btn--success"
                    onClick={() => handleVerify(order)}
                    disabled={processing[order.id]}
                  >
                    {processing[order.id] ? '…' : <><CheckIcon color="#fff" /> Verify & Credit</>}
                  </button>
                  <button
                    className="acp-btn acp-btn--sm acp-btn--danger"
                    onClick={() => handleReject(order)}
                    disabled={processing[order.id]}
                  >
                    <XIcon /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════
   SECTION: RJ Earnings Management
════════════════════════════════════ */
function RJEarningsSection({ config }) {
  const [rjEarnings, setRjEarnings] = useState([]);
  const [rjWithdrawals, setRjWithdrawals] = useState({});
  const [payments, setPayments] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('earnings');
  const [paymentProcessing, setPaymentProcessing] = useState({});
  const [createModal, setCreateModal] = useState(null);
  const [createForm, setCreateForm] = useState({ notes: '' });

  const commissionPct = config?.commissionPct || 20;

  useEffect(() => {
    const u1 = subscribeAllRJEarnings(async (rjs) => {
      setRjEarnings(rjs);
      // Batch-fetch all withdrawal info in one pass (replaces N individual getDoc calls)
      try {
        const uids = rjs.map(rj => rj.uid).filter(Boolean);
        const withdrawals = await fetchRJWithdrawalInfoBatch(uids);
        setRjWithdrawals(withdrawals);
      } catch {}
    });
    const u2 = subscribeRJPayments(setPayments);
    return () => { u1(); u2(); };
  }, []);

  const openCreatePayment = (rj) => {
    const wd = rjWithdrawals[rj.uid];
    setCreateModal(rj);
    setCreateForm({ notes: '', upiId: wd?.upiId || '' });
  };

  const handleCreatePayment = async () => {
    if (!createModal) return;
    try {
      await createRJPayment({
        rjUid: createModal.uid,
        rjName: createModal.rjName || createModal.uid,
        coins: createModal.pendingCoins || 0,
        commissionPct,
        upiId: createForm.upiId,
        notes: createForm.notes,
      });
      pt.success('Payment record created!', { containerId: 'admin-panel' });
      setCreateModal(null);
    } catch (e) {
      pt.error('Failed: ' + e.message, { containerId: 'admin-panel' });
    }
  };

  const handleUpdatePayment = async (paymentId, status) => {
    if (paymentProcessing[paymentId]) return;
    setPaymentProcessing(prev => ({ ...prev, [paymentId]: true }));
    try {
      await updateRJPaymentStatus(paymentId, status);
      pt.success(`Payment marked as ${status}`, { containerId: 'admin-panel' });
    } catch { pt.error('Update failed', { containerId: 'admin-panel' }); }
    finally { setPaymentProcessing(prev => ({ ...prev, [paymentId]: false })); }
  };

  return (
    <div className="acp-section">
      <div className="acp-section-head">
        <h3><MicIcon size={18} /> RJ Earnings Management</h3>
        <div className="acp-sub-tabs">
          {['earnings','payments'].map(t => (
            <button key={t} className={`acp-sub-tab ${activeSubTab === t ? 'active' : ''}`}
              onClick={() => setActiveSubTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'earnings' && (
        <>
          {rjEarnings.length === 0 ? (
            <div className="acp-empty"><MicIcon size={36} /><p>No RJ earnings data yet</p></div>
          ) : (
            <div className="acp-rj-list">
              {rjEarnings.map(rj => {
                const wd = rjWithdrawals[rj.uid];
                const { gross, commission, net } = coinsToRupees(rj.totalCoins || 0, commissionPct);
                const { net: pendingNet } = coinsToRupees(rj.pendingCoins || 0, commissionPct);
                return (
                  <div key={rj.uid} className="acp-rj-card">
                    <div className="acp-rj-header">
                      <div className="acp-rj-name">{rj.rjName || rj.uid}</div>
                      <div className="acp-rj-uid">{rj.uid.slice(0, 12)}…</div>
                    </div>
                    <div className="acp-rj-stats">
                      <div className="acp-rj-stat">
                        <span className="acp-rj-stat-v" style={{color:'#f59e0b'}}>{formatCoins(rj.totalCoins)}</span>
                        <span className="acp-rj-stat-l">Total Coins</span>
                      </div>
                      <div className="acp-rj-stat">
                        <span className="acp-rj-stat-v" style={{color:'#ec4899'}}>{(rj.totalGifts||0).toLocaleString()}</span>
                        <span className="acp-rj-stat-l">Total Gifts</span>
                      </div>
                      <div className="acp-rj-stat">
                        <span className="acp-rj-stat-v" style={{color:'#22c55e'}}>₹{net}</span>
                        <span className="acp-rj-stat-l">Net ({commissionPct}% off)</span>
                      </div>
                      <div className="acp-rj-stat">
                        <span className="acp-rj-stat-v" style={{color:'#8b5cf6'}}>₹{pendingNet}</span>
                        <span className="acp-rj-stat-l">Pending</span>
                      </div>
                    </div>
                    <div className="acp-rj-upi-row">
                      <span className="acp-rj-upi-label">UPI:</span>
                      <span className="acp-rj-upi-val">{wd?.upiId || <em>Not provided</em>}</span>
                    </div>
                    {(rj.pendingCoins || 0) > 0 && wd?.upiId && (
                      <button className="acp-btn acp-btn--sm acp-btn--primary" onClick={() => openCreatePayment(rj)}>
                        Create Payment Record
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeSubTab === 'payments' && (
        <>
          {payments.length === 0 ? (
            <div className="acp-empty"><PayIcon size={36} /><p>No payment records yet</p></div>
          ) : (
            <div className="acp-payment-list">
              {payments.map(pay => (
                <div key={pay.id} className="acp-payment-card">
                  <div className="acp-payment-row">
                    <div>
                      <div className="acp-payment-rj">{pay.rjName || pay.rjUid}</div>
                      <div className="acp-payment-upi">{pay.upiId}</div>
                    </div>
                    <StatusBadge status={pay.status} />
                  </div>
                  <div className="acp-payment-amounts">
                    <div className="acp-pa"><span>Coins</span><strong>{formatCoins(pay.coins)}</strong></div>
                    <div className="acp-pa"><span>Commission ({pay.commissionPct}%)</span><strong className="neg">-₹{pay.commissionAmount}</strong></div>
                    <div className="acp-pa acp-pa--total"><span>Final Payable</span><strong className="pos">₹{pay.finalAmount}</strong></div>
                  </div>
                  <div className="acp-payment-time">{formatTime(pay.createdAt)}</div>
                  {pay.status !== 'paid' && pay.status !== 'failed' && (
                    <div className="acp-payment-actions">
                      <button className="acp-btn acp-btn--sm acp-btn--success"
                        onClick={() => handleUpdatePayment(pay.id, 'paid')}
                        disabled={paymentProcessing[pay.id]}>
                        <CheckIcon color="#fff" /> Mark Paid
                      </button>
                      <button className="acp-btn acp-btn--sm acp-btn--outline"
                        onClick={() => handleUpdatePayment(pay.id, 'processing')}
                        disabled={paymentProcessing[pay.id]}>
                        Processing
                      </button>
                      <button className="acp-btn acp-btn--sm acp-btn--danger"
                        onClick={() => handleUpdatePayment(pay.id, 'failed')}
                        disabled={paymentProcessing[pay.id]}>
                        <XIcon /> Failed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Payment Modal */}
      {createModal && (
        <div className="acp-modal-overlay" onClick={() => setCreateModal(null)}>
          <div className="acp-modal" onClick={e => e.stopPropagation()}>
            <div className="acp-modal-head">
              <h4>Create Payment Record</h4>
              <button className="acp-modal-close" onClick={() => setCreateModal(null)}><XIcon /></button>
            </div>
            <div className="acp-modal-body">
              <div className="acp-field">
                <label>RJ</label>
                <input className="acp-input" value={createModal.rjName || createModal.uid} disabled />
              </div>
              <div className="acp-field">
                <label>Pending Coins</label>
                <input className="acp-input" value={(createModal.pendingCoins||0).toLocaleString()} disabled />
              </div>
              <div className="acp-field">
                <label>UPI ID</label>
                <input className="acp-input acp-input--mono" value={createForm.upiId}
                  onChange={e => setCreateForm(p => ({ ...p, upiId: e.target.value }))}
                  placeholder="rj@upi"
                />
              </div>
              <div className="acp-field">
                <label>Notes</label>
                <textarea className="acp-textarea" value={createForm.notes}
                  onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Optional notes…"
                />
              </div>
            </div>
            <div className="acp-modal-footer">
              <button className="acp-btn acp-btn--outline" onClick={() => setCreateModal(null)}>Cancel</button>
              <button className="acp-btn acp-btn--primary" onClick={handleCreatePayment}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════ */
const TABS = [
  { id: 'packages', label: 'Packages', Icon: CoinIcon },
  { id: 'upi',      label: 'UPI',      Icon: UPIIcon  },
  { id: 'orders',   label: 'Orders',   Icon: PayIcon  },
  { id: 'rj',       label: 'RJ Pay',   Icon: MicIcon  },
];

export default function AdminCoinsPanel() {
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('packages');

  useEffect(() => {
    const unsub = subscribeCoinConfig(setConfig);
    return unsub;
  }, []);

  const handleSave = async (updates) => {
    await updateCoinConfig(updates);
  };

  return (
    <div className="acp-root">
      {/* Sub-navigation */}
      <div className="acp-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`acp-nav-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <t.Icon size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="acp-body">
        {activeTab === 'packages' && (
          <>
            <CoinPackagesSection config={config} onSave={handleSave} />
            <CommissionSection config={config} onSave={handleSave} />
          </>
        )}
        {activeTab === 'upi' && <UPISection config={config} onSave={handleSave} />}
        {activeTab === 'orders' && <PaymentOrdersSection />}
        {activeTab === 'rj' && <RJEarningsSection config={config} />}
      </div>
    </div>
  );
}
