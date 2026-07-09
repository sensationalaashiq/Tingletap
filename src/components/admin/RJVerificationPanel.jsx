// src/components/admin/RJVerificationPanel.jsx
// Owner/Admin — RJ Verification Dashboard.
// Structurally identical to BadgeVerificationPanel.jsx (same bvp- CSS classes,
// same paginated-read pattern), adapted for the rjApplications collection:
// three audio recordings instead of video+audio, and a fixed 'rj' badge award
// on approval (no badge picker).

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getRJApplicationsPage,
  getRJApplicationDetail,
  getRJApplicationStats,
  invalidateRJCache,
  formatRJReviewTimeRemaining,
} from '../../services/rjApplicationService';
import { getRJMedia, reviewRJApplication } from '../../services/r2StorageService';
import { pt } from '../../utils/premiumToast';
import { db } from '../../firebase/config';
import { doc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Badges } from '../../data/Badges';
import './BadgeVerificationPanel.css';

// ── Icons ────────────────────────────────────────────────────────────────────
const MicHeaderIcon = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const UserIcon      = () => <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const GlobeIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 3c-2 2-3.5 5-3.5 9s1.5 7 3.5 9M12 3c2 2 3.5 5 3.5 9s-1.5 7-3.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M3 12h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const AudioIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const FilterIcon    = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SearchIcon    = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CloseIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const RefreshIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CheckIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ClockIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TrashIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const STATUS_BADGE = {
  pending:           { label: 'Pending',     bg: '#fef3c7', color: '#92400e' },
  approved:          { label: 'Approved',    bg: '#d1fae5', color: '#065f46' },
  rejected:          { label: 'Rejected',    bg: '#ffe4e6', color: '#9f1239' },
  expired:           { label: 'Expired',     bg: '#f1f5f9', color: '#475569' },
  resubmit_requested:{ label: 'Resubmit',    bg: '#dbeafe', color: '#1e40af' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || { label: status, bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  const color = gender === 'female' ? '#7c3aed' : gender === 'male' ? '#0ea5e9' : '#ec4899';
  const label = gender === 'female' ? 'Female' : gender === 'male' ? 'Male' : gender;
  return (
    <span style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ action, applicant, notes, onNotesChange, onConfirm, onCancel, loading }) {
  const config = {
    approve:          { title: 'Award RJ Badge',        btn: 'Approve',    cls: 'bvp-btn--green' },
    reject:           { title: 'Reject Application',    btn: 'Reject',     cls: 'bvp-btn--danger' },
    request_resubmit: { title: 'Request Resubmission',  btn: 'Send',       cls: 'bvp-btn--primary' },
    delete:           { title: 'Delete Application',    btn: 'Delete',     cls: 'bvp-btn--danger' },
  }[action] || {};

  return (
    <div className="bvp-confirm-overlay">
      <motion.div className="bvp-confirm-dialog" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="bvp-confirm-header">
          <MicHeaderIcon />
          <span>{config.title}</span>
        </div>
        <div className="bvp-confirm-body">
          <p>
            You are about to <strong>{action.replace('_', ' ')}</strong> the RJ verification application for{' '}
            <strong>{applicant?.displayName || applicant?.username}</strong>.
          </p>
          {action === 'approve' && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              This will award the official <strong>RJ badge</strong> to their profile.
            </p>
          )}
          {(action === 'reject' || action === 'request_resubmit') && (
            <>
              <p style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Review notes {action === 'reject' ? '(required)' : '(optional)'}:
              </p>
              <textarea
                className="bvp-notes-input"
                placeholder="Add review notes visible to the applicant…"
                value={notes}
                onChange={e => onNotesChange(e.target.value)}
                rows={3}
              />
            </>
          )}
          {(action === 'approve' || action === 'reject') && (
            <div className="bvp-confirm-warning">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 9v4M12 17h.01" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              All audio recordings will be permanently deleted from storage.
            </div>
          )}
        </div>
        <div className="bvp-confirm-footer">
          <button className="bvp-btn bvp-btn--secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={`bvp-btn ${config.cls}`} onClick={onConfirm} disabled={loading}>
            {loading ? '…' : config.btn}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Send TingleBot RJ resubmission DM ─────────────────────────────────────────
async function sendTinglebotRJDM(uid, displayName, notes) {
  const TINGLEBOT_UID = 'tinglebot_system_official_2024';
  const conversationId = [TINGLEBOT_UID, uid].sort().join('_');
  const notesPart = notes?.trim() ? `\n\nAdmin Notes:\n${notes.trim()}` : '';
  await addDoc(collection(db, 'privateMessages'), {
    senderId: TINGLEBOT_UID,
    senderName: 'TingleBot',
    receiverId: uid,
    participants: [TINGLEBOT_UID, uid],
    conversationId,
    text:
      `RJ Verification — Resubmission Required\n\nHi ${displayName || 'there'}, your RJ verification application requires resubmission. ` +
      `Please visit Settings to re-record and submit a fresh application.${notesPart}\n\n— TingleTap Admin Team`,
    isBot: true,
    isBotNotification: true,
    botStatusKey: 'rj_resubmit',
    tinglebotType: 'rj_resubmit',
    rjResubmit: true,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

// ── One audio recording block (reused 3x) ────────────────────────────────────
function AudioBlock({ label, mediaKey, onLoad }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [sizeLabel, setSizeLabel] = useState('');
  const blobRef = useRef(null);

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  const load = async () => {
    if (!mediaKey) return;
    setLoading(true);
    setError(false);
    try {
      const blob = await onLoad(mediaKey);
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      const blobUrl = URL.createObjectURL(blob);
      blobRef.current = blobUrl;
      setUrl(blobUrl);
      setSizeLabel(`${(blob.size / 1024).toFixed(0)} KB · Loaded ✓`);
    } catch (e) {
      pt.error(e.message || `Failed to load ${label}`);
    } finally { setLoading(false); }
  };

  if (!mediaKey) return null;

  return (
    <div className="bvp-media-block" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <AudioIcon />
        <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
        {sizeLabel && <span style={{ fontSize: 11, color: '#10b981', marginLeft: 'auto' }}>{sizeLabel}</span>}
        <button
          className="bvp-btn bvp-btn--primary"
          style={{ padding: '6px 14px', fontSize: 12, marginLeft: sizeLabel ? 0 : 'auto' }}
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Loading…' : url ? 'Reload' : 'Load Audio'}
        </button>
      </div>
      {url && !error && (
        <audio key={url} src={url} controls style={{ width: '100%', borderRadius: 8 }} onError={() => setError(true)} />
      )}
      {error && (
        <div className="bvp-media-error">
          <span>⚠️ Playback error — click Reload to try again.</span>
          <button className="bvp-btn bvp-btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => { setError(false); load(); }}>
            Reload
          </button>
        </div>
      )}
    </div>
  );
}

// ── Application Detail Panel ──────────────────────────────────────────────────
function ApplicationDetail({ app, onClose, onAction }) {
  const fmt = (v) => (v && String(v).trim()) ? v : '—';

  const submittedDate = app.submittedAt?.toDate
    ? app.submittedAt.toDate().toLocaleString()
    : app.submittedAt ? new Date(app.submittedAt).toLocaleString() : '—';

  return (
    <div className="bvp-detail">
      <div className="bvp-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="bvp-detail-avatar"><UserIcon /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
              {app.displayName || app.username}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{app.username}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={app.status} />
          <GenderBadge gender={app.gender} />
        </div>
        <button className="bvp-icon-btn" onClick={onClose} title="Close"><CloseIcon /></button>
      </div>

      <div className="bvp-detail-grid">
        <div className="bvp-detail-section">
          <div className="bvp-section-title"><UserIcon /> Profile</div>
          <table className="bvp-info-table">
            <tbody>
              <tr><td>UID</td><td><code style={{ fontSize: 11 }}>{app.uid}</code></td></tr>
              <tr><td>Email</td><td>{fmt(app.email)}</td></tr>
              <tr><td>Submitted</td><td>{submittedDate}</td></tr>
              <tr><td>Country</td><td>{fmt(app.country)}</td></tr>
              {app.status === 'pending' && (
                <tr>
                  <td>Time Remaining</td>
                  <td>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>
                      {formatRJReviewTimeRemaining(app.expiresAt)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bvp-detail-section">
          <div className="bvp-section-title"><GlobeIcon /> Network</div>
          <table className="bvp-info-table">
            <tbody>
              <tr><td>IP Address</td><td><code style={{ fontSize: 11 }}>{fmt(app.ipAddress)}</code></td></tr>
              <tr><td>Country</td><td>{fmt(app.country)}</td></tr>
              <tr><td>Region</td><td>{fmt(app.region)}</td></tr>
              <tr><td>City</td><td>{fmt(app.city)}</td></tr>
              <tr><td>ISP</td><td>{fmt(app.isp)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="bvp-detail-section">
          <div className="bvp-section-title">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
            Device
          </div>
          <table className="bvp-info-table">
            <tbody>
              <tr><td>Browser</td><td>{fmt(app.browser)}</td></tr>
              <tr><td>Platform</td><td>{fmt(app.platform)}</td></tr>
              <tr><td>Device</td><td>{fmt(app.device)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Media players — three RJ recordings */}
      {(app.introKey || app.songKey || app.welcomeKey) && (
        <div className="bvp-media-section">
          <div className="bvp-section-title" style={{ marginBottom: 12 }}>
            <AudioIcon /> Recordings
          </div>
          <AudioBlock label="Funny Introduction" mediaKey={app.introKey}   onLoad={getRJMedia} />
          <AudioBlock label="Song"               mediaKey={app.songKey}    onLoad={getRJMedia} />
          <AudioBlock label="Welcome Message"    mediaKey={app.welcomeKey} onLoad={getRJMedia} />
        </div>
      )}

      {app.reviewNotes && (
        <div className="bvp-detail-section" style={{ marginTop: 0 }}>
          <div className="bvp-section-title">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Review Notes
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{app.reviewNotes}</p>
          {app.reviewedBy && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Reviewed by: {app.reviewedBy}</p>
          )}
        </div>
      )}

      {app.status === 'pending' && (
        <div className="bvp-action-row">
          <button className="bvp-btn bvp-btn--green" onClick={() => onAction('approve')}>
            <CheckIcon /> Approve &amp; Award RJ Badge
          </button>
          <button className="bvp-btn bvp-btn--danger" onClick={() => onAction('reject')}>
            <CloseIcon /> Reject
          </button>
          <button className="bvp-btn bvp-btn--resubmit" onClick={() => onAction('request_resubmit')}>
            <RefreshIcon /> Request Resubmission
          </button>
        </div>
      )}

      <div className="bvp-action-row" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border-color, rgba(0,0,0,0.08))' }}>
        <button className="bvp-btn bvp-btn--danger" style={{ opacity: 0.85 }} onClick={() => onAction('delete')}>
          <TrashIcon /> Delete Request
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RJVerificationPanel({ currentUserProfile }) {
  const [apps, setApps]                     = useState([]);
  const [stats, setStats]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(false);
  const [lastDoc, setLastDoc]               = useState(null);
  const [statusFilter, setStatusFilter]     = useState('all');
  const [searchTerm, setSearchTerm]         = useState('');
  const [searchInput, setSearchInput]       = useState('');
  const [selectedApp, setSelectedApp]       = useState(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);

  const [confirmAction, setConfirmAction]   = useState(null);
  const [reviewNotes, setReviewNotes]       = useState('');
  const [actionLoading, setActionLoading]   = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const loadApps = useCallback(async (reset = false, filter = statusFilter, search = searchTerm) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const cursor = reset ? null : lastDoc;
      const result = await getRJApplicationsPage(filter, search, cursor, reset);
      if (mountedRef.current) {
        setApps(prev => reset ? result.docs : [...prev, ...result.docs]);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
        if (reset) {
          const s = await getRJApplicationStats();
          setStats(s);
        }
      }
    } catch (e) {
      pt.error('Failed to load applications: ' + e.message);
    } finally {
      if (mountedRef.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [statusFilter, searchTerm, lastDoc]);

  useEffect(() => { loadApps(true, statusFilter, searchTerm); }, []); // eslint-disable-line

  const handleFilterChange = (f) => {
    setStatusFilter(f);
    setLastDoc(null);
    setApps([]);
    loadApps(true, f, searchTerm);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setLastDoc(null);
    setApps([]);
    loadApps(true, statusFilter, searchInput);
  };

  const openDetail = async (app) => {
    setSelectedApp(app);
    if (!app._fullLoaded) {
      setLoadingDetail(true);
      try {
        const full = await getRJApplicationDetail(app.uid);
        setSelectedApp(full ? { ...full, _fullLoaded: true } : app);
      } finally { setLoadingDetail(false); }
    }
  };

  const handleAction = (action) => {
    setReviewNotes('');
    setConfirmAction(action);
  };

  const executeAction = async () => {
    if (!selectedApp) return;
    if (confirmAction === 'reject' && !reviewNotes.trim()) {
      pt.error('Review notes are required for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      if (confirmAction === 'delete') {
        await deleteDoc(doc(db, 'rjApplications', selectedApp.uid));
        pt.success('Application deleted successfully.');
        invalidateRJCache();
        setConfirmAction(null);
        setSelectedApp(null);
        loadApps(true);
        return;
      }

      await reviewRJApplication(selectedApp.uid, confirmAction, reviewNotes);

      if (confirmAction === 'request_resubmit') {
        try {
          await sendTinglebotRJDM(selectedApp.uid, selectedApp.displayName || selectedApp.username, reviewNotes);
        } catch (dmErr) {
          console.warn('[RJVerificationPanel] TingleBot DM failed (non-fatal):', dmErr.message);
        }
      }

      if (confirmAction === 'approve') {
        const badgeName = Badges.rj?.name || 'RJ';
        pt.success(`${badgeName} badge awarded to ${selectedApp.displayName || selectedApp.username}!`);
      } else {
        pt.success(`Application ${confirmAction.replace(/_/g, ' ')} successfully.`);
      }

      invalidateRJCache();
      setConfirmAction(null);
      setSelectedApp(null);
      loadApps(true);
    } catch (e) {
      pt.error(e.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const filters = [
    { id: 'all',      label: 'All',       count: stats?.total    },
    { id: 'pending',  label: 'Pending',   count: stats?.pending  },
    { id: 'approved', label: 'Approved',  count: stats?.approved },
    { id: 'rejected', label: 'Rejected',  count: stats?.rejected },
    { id: 'expired',  label: 'Expired',   count: stats?.expired  },
  ];

  return (
    <div className="bvp-root">
      <div className="bvp-header">
        <div className="bvp-header-left">
          <div className="bvp-header-icon"><MicHeaderIcon /></div>
          <div>
            <h2 className="bvp-title">RJ Verification</h2>
            <p className="bvp-subtitle">Review and manage RJ verification requests</p>
          </div>
        </div>
        <button className="bvp-icon-btn" onClick={() => { invalidateRJCache(); loadApps(true); }} title="Refresh">
          <RefreshIcon />
        </button>
      </div>

      {stats && (
        <div className="bvp-stats-row">
          {[
            { label: 'Pending',  value: stats.pending,  color: '#f59e0b' },
            { label: 'Approved', value: stats.approved, color: '#10b981' },
            { label: 'Rejected', value: stats.rejected, color: '#f43f5e' },
            { label: 'Expired',  value: stats.expired,  color: '#94a3b8' },
            { label: 'Total',    value: stats.total,    color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="bvp-stat-card">
              <div className="bvp-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="bvp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bvp-toolbar">
        <div className="bvp-filters">
          <FilterIcon />
          {filters.map(f => (
            <button key={f.id} className={`bvp-filter-btn ${statusFilter === f.id ? 'active' : ''}`} onClick={() => handleFilterChange(f.id)}>
              {f.label}
              {f.count != null && <span className="bvp-filter-count">{f.count}</span>}
            </button>
          ))}
        </div>
        <form className="bvp-search" onSubmit={handleSearch}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search username, email, UID, country…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit">Go</button>
        </form>
      </div>

      <div className="bvp-table-wrap">
        {loading ? (
          <div className="bvp-loading">
            <div className="bvp-spinner" />
            <p>Loading applications…</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="bvp-empty">
            <MicHeaderIcon />
            <p>No RJ applications found</p>
          </div>
        ) : (
          <table className="bvp-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Gender</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Time Remaining</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const subDate = app.submittedAt?.toDate
                  ? app.submittedAt.toDate()
                  : app.submittedAt ? new Date(app.submittedAt) : null;
                const remaining = app.status === 'pending' ? formatRJReviewTimeRemaining(app.expiresAt) : null;

                return (
                  <tr key={app.uid} className="bvp-table-row" onClick={() => openDetail(app)}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        {app.displayName || app.username}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@{app.username}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{app.country}</div>
                    </td>
                    <td><GenderBadge gender={app.gender} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {subDate ? subDate.toLocaleDateString() : '—'}
                    </td>
                    <td><StatusBadge status={app.status} /></td>
                    <td>
                      {remaining ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                          <ClockIcon /> {remaining}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="bvp-btn bvp-btn--primary"
                        style={{ padding: '5px 12px', fontSize: 12 }}
                        onClick={e => { e.stopPropagation(); openDetail(app); }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {hasMore && !loading && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button className="bvp-btn bvp-btn--secondary" onClick={() => loadApps(false)} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedApp && (
          <motion.div
            className="bvp-detail-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedApp(null); }}
          >
            <motion.div
              className="bvp-detail-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            >
              {loadingDetail ? (
                <div className="bvp-loading" style={{ height: 300 }}>
                  <div className="bvp-spinner" />
                  <p>Loading details…</p>
                </div>
              ) : (
                <ApplicationDetail app={selectedApp} onClose={() => setSelectedApp(null)} onAction={handleAction} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmAction && (
          <ConfirmDialog
            action={confirmAction}
            applicant={selectedApp}
            notes={reviewNotes}
            onNotesChange={setReviewNotes}
            onConfirm={executeAction}
            onCancel={() => setConfirmAction(null)}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
