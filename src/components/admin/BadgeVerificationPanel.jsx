// src/components/admin/BadgeVerificationPanel.jsx
// Owner/Admin — Premium Badge Verification Dashboard.
// No realtime listeners — paginated getDoc/getDocs only.
// Session cache to minimise Firestore reads.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getApplicationsPage,
  getApplicationDetail,
  getApplicationStats,
  invalidateCache,
  formatReviewTimeRemaining,
} from '../../services/badgeApplicationService';
import { getSignedMediaUrl, reviewApplication } from '../../services/r2StorageService';
import { pt } from '../../utils/premiumToast';
import './BadgeVerificationPanel.css';

// ── Icons ────────────────────────────────────────────────────────────────────
const ShieldIcon  = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2L2 7l1 5a9 9 0 0 0 9 7 9 9 0 0 0 9-7l1-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const UserIcon    = () => <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const GlobeIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 3c-2 2-3.5 5-3.5 9s1.5 7 3.5 9M12 3c2 2 3.5 5 3.5 9s-1.5 7-3.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M3 12h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const VideoIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/></svg>;
const AudioIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const FilterIcon  = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SearchIcon  = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CloseIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const RefreshIcon = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CheckIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ClockIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

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
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  );
}

function GenderBadge({ gender }) {
  const color = gender === 'female' ? '#7c3aed' : '#0ea5e9';
  const label = gender === 'female' ? 'Female' : 'Male';
  return (
    <span style={{ background: `${color}15`, color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
}

function SecurityFlag({ label, active, color }) {
  if (!active) return null;
  return (
    <span style={{
      background: `${color}18`, color,
      border: `1px solid ${color}40`,
      padding: '1px 7px', borderRadius: 6,
      fontSize: 10.5, fontWeight: 700,
    }}>
      {label}
    </span>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ action, applicant, notes, onNotesChange, onConfirm, onCancel, loading }) {
  const config = {
    approve:          { title: 'Approve Badge',         btn: 'Approve',    cls: 'bvp-btn--green' },
    reject:           { title: 'Reject Application',    btn: 'Reject',     cls: 'bvp-btn--danger' },
    request_resubmit: { title: 'Request Resubmission',  btn: 'Send',       cls: 'bvp-btn--primary' },
  }[action] || {};

  return (
    <div className="bvp-confirm-overlay">
      <motion.div className="bvp-confirm-dialog" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="bvp-confirm-header">
          <ShieldIcon />
          <span>{config.title}</span>
        </div>
        <div className="bvp-confirm-body">
          <p>
            You are about to <strong>{action.replace('_', ' ')}</strong> the badge application for{' '}
            <strong>{applicant?.displayName || applicant?.username}</strong>.
          </p>
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
              All media will be permanently deleted from storage.
            </div>
          )}
        </div>
        <div className="bvp-confirm-footer">
          <button className="bvp-btn bvp-btn--secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={`bvp-btn ${config.cls}`} onClick={onConfirm} disabled={loading}>
            {loading ? '…' : config.btn}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Application Detail Panel ───────────────────────────────────────────────────
function ApplicationDetail({ app, onClose, onAction }) {
  const [videoUrl, setVideoUrl]   = useState('');
  const [audioUrl, setAudioUrl]   = useState('');
  const [loadingV, setLoadingV]   = useState(false);
  const [loadingA, setLoadingA]   = useState(false);
  const [vidExpiry, setVidExpiry] = useState('');
  const [audExpiry, setAudExpiry] = useState('');

  const fmt = (v) => v ?? '—';
  const bool = (v) => v ? (
    <span style={{ color: '#f43f5e', fontWeight: 700 }}>Yes</span>
  ) : (
    <span style={{ color: '#10b981', fontWeight: 700 }}>No</span>
  );

  const loadVideo = async () => {
    if (!app.videoKey) return;
    setLoadingV(true);
    try {
      const url = await getSignedMediaUrl(app.videoKey);
      setVideoUrl(url);
      const exp = new Date(Date.now() + 5 * 60 * 1000);
      setVidExpiry(`Expires ${exp.toLocaleTimeString()}`);
    } catch (e) {
      pt.error(e.message || 'Failed to load video');
    } finally { setLoadingV(false); }
  };

  const loadAudio = async () => {
    if (!app.audioKey) return;
    setLoadingA(true);
    try {
      const url = await getSignedMediaUrl(app.audioKey);
      setAudioUrl(url);
      const exp = new Date(Date.now() + 5 * 60 * 1000);
      setAudExpiry(`Expires ${exp.toLocaleTimeString()}`);
    } catch (e) {
      pt.error(e.message || 'Failed to load audio');
    } finally { setLoadingA(false); }
  };

  const submittedDate = app.submittedAt?.toDate
    ? app.submittedAt.toDate().toLocaleString()
    : app.submittedAt
      ? new Date(app.submittedAt).toLocaleString()
      : '—';

  return (
    <div className="bvp-detail">
      <div className="bvp-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="bvp-detail-avatar">
            <UserIcon />
          </div>
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
        {/* Profile section */}
        <div className="bvp-detail-section">
          <div className="bvp-section-title">
            <UserIcon /> Profile
          </div>
          <table className="bvp-info-table">
            <tbody>
              <tr><td>UID</td><td><code style={{ fontSize: 11 }}>{app.uid}</code></td></tr>
              <tr><td>Email</td><td>{fmt(app.email)}</td></tr>
              <tr><td>Submitted</td><td>{submittedDate}</td></tr>
              <tr><td>Account Age</td><td>{fmt(app.accountAge)} days</td></tr>
              <tr><td>Gender</td><td><GenderBadge gender={app.gender} /></td></tr>
              {app.status === 'pending' && (
                <tr>
                  <td>Time Remaining</td>
                  <td>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>
                      {formatReviewTimeRemaining(app.expiresAt)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Geo / Network */}
        <div className="bvp-detail-section">
          <div className="bvp-section-title">
            <GlobeIcon /> Network &amp; Location
          </div>
          <table className="bvp-info-table">
            <tbody>
              <tr><td>IP Address</td><td><code style={{ fontSize: 11 }}>{fmt(app.ipAddress)}</code></td></tr>
              <tr><td>Country</td><td>{fmt(app.country)}</td></tr>
              <tr><td>Region</td><td>{fmt(app.region)}</td></tr>
              <tr><td>City</td><td>{fmt(app.city)}</td></tr>
              <tr><td>Timezone</td><td>{fmt(app.timezone)}</td></tr>
              <tr><td>ISP</td><td>{fmt(app.isp)}</td></tr>
              <tr><td>ASN</td><td>{fmt(app.asn)}</td></tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <SecurityFlag label="VPN"     active={app.vpn}     color="#f59e0b" />
            <SecurityFlag label="Proxy"   active={app.proxy}   color="#f43f5e" />
            <SecurityFlag label="Tor"     active={app.tor}     color="#7c3aed" />
            <SecurityFlag label="Hosting" active={app.hosting} color="#0ea5e9" />
          </div>
        </div>

        {/* Device */}
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

        {/* Liveness */}
        {app.gender === 'female' && (
          <div className="bvp-detail-section">
            <div className="bvp-section-title">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
              Liveness
            </div>
            <table className="bvp-info-table">
              <tbody>
                <tr>
                  <td>Verified</td>
                  <td>{bool(app.livenessPassed)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Media players */}
      {app.gender === 'female' && (app.videoKey || app.audioKey) && (
        <div className="bvp-media-section">
          <div className="bvp-section-title" style={{ marginBottom: 12 }}>
            <VideoIcon /> Media
          </div>

          {app.videoKey && (
            <div className="bvp-media-block">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <VideoIcon />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Selfie Video</span>
                {vidExpiry && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 'auto' }}>{vidExpiry}</span>}
                <button
                  className="bvp-btn bvp-btn--primary"
                  style={{ padding: '6px 14px', fontSize: 12, marginLeft: vidExpiry ? 0 : 'auto' }}
                  onClick={loadVideo}
                  disabled={loadingV}
                >
                  {loadingV ? '…' : videoUrl ? 'Refresh URL' : 'View Video'}
                </button>
              </div>
              {videoUrl && (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  className="bvp-media-player"
                  style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 300 }}
                />
              )}
            </div>
          )}

          {app.audioKey && (
            <div className="bvp-media-block" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <AudioIcon />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Spoken Declaration</span>
                {audExpiry && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 'auto' }}>{audExpiry}</span>}
                <button
                  className="bvp-btn bvp-btn--primary"
                  style={{ padding: '6px 14px', fontSize: 12, marginLeft: audExpiry ? 0 : 'auto' }}
                  onClick={loadAudio}
                  disabled={loadingA}
                >
                  {loadingA ? '…' : audioUrl ? 'Refresh URL' : 'Play Audio'}
                </button>
              </div>
              {audioUrl && (
                <audio key={audioUrl} src={audioUrl} controls style={{ width: '100%' }} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Review notes */}
      {app.reviewNotes && (
        <div className="bvp-detail-section" style={{ marginTop: 0 }}>
          <div className="bvp-section-title">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Review Notes
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {app.reviewNotes}
          </p>
          {app.reviewedBy && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
              Reviewed by: {app.reviewedBy}
            </p>
          )}
        </div>
      )}

      {/* Actions — only for pending */}
      {app.status === 'pending' && (
        <div className="bvp-action-row">
          <button className="bvp-btn bvp-btn--green" onClick={() => onAction('approve')}>
            <CheckIcon /> Approve Badge
          </button>
          <button className="bvp-btn bvp-btn--danger" onClick={() => onAction('reject')}>
            <CloseIcon /> Reject
          </button>
          <button className="bvp-btn bvp-btn--secondary" onClick={() => onAction('request_resubmit')}>
            <RefreshIcon /> Request Resubmission
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BadgeVerificationPanel({ currentUserProfile }) {
  const [apps, setApps]             = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [lastDoc, setLastDoc]       = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState(null);
  const [reviewNotes, setReviewNotes]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const loadApps = useCallback(async (reset = false, filter = statusFilter, search = searchTerm) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const cursor = reset ? null : lastDoc;
      const result = await getApplicationsPage(filter, search, cursor, reset);
      if (mountedRef.current) {
        setApps(prev => reset ? result.docs : [...prev, ...result.docs]);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);

        if (reset) {
          const s = await getApplicationStats();
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
        const full = await getApplicationDetail(app.uid);
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
      await reviewApplication(selectedApp.uid, confirmAction, reviewNotes);
      pt.success(`Application ${confirmAction.replace('_', ' ')}d successfully.`);
      invalidateCache();
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
      {/* Header */}
      <div className="bvp-header">
        <div className="bvp-header-left">
          <div className="bvp-header-icon"><ShieldIcon /></div>
          <div>
            <h2 className="bvp-title">Badge Verification</h2>
            <p className="bvp-subtitle">Review and manage verification requests</p>
          </div>
        </div>
        <button className="bvp-icon-btn" onClick={() => { invalidateCache(); loadApps(true); }} title="Refresh">
          <RefreshIcon />
        </button>
      </div>

      {/* Stats row */}
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

      {/* Filters + Search */}
      <div className="bvp-toolbar">
        <div className="bvp-filters">
          <FilterIcon />
          {filters.map(f => (
            <button
              key={f.id}
              className={`bvp-filter-btn ${statusFilter === f.id ? 'active' : ''}`}
              onClick={() => handleFilterChange(f.id)}
            >
              {f.label}
              {f.count != null && (
                <span className="bvp-filter-count">{f.count}</span>
              )}
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

      {/* Table */}
      <div className="bvp-table-wrap">
        {loading ? (
          <div className="bvp-loading">
            <div className="bvp-spinner" />
            <p>Loading applications…</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="bvp-empty">
            <ShieldIcon />
            <p>No applications found</p>
          </div>
        ) : (
          <table className="bvp-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Gender</th>
                <th>Submitted</th>
                <th>Account Age</th>
                <th>Status</th>
                <th>Time Remaining</th>
                <th>Security</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const subDate = app.submittedAt?.toDate
                  ? app.submittedAt.toDate()
                  : app.submittedAt ? new Date(app.submittedAt) : null;
                const remaining = app.status === 'pending' ? formatReviewTimeRemaining(app.expiresAt) : null;

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
                    <td style={{ fontSize: 12 }}>{app.accountAge}d</td>
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
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <SecurityFlag label="VPN"   active={app.vpn}   color="#f59e0b" />
                        <SecurityFlag label="Proxy" active={app.proxy} color="#f43f5e" />
                        <SecurityFlag label="Tor"   active={app.tor}   color="#7c3aed" />
                      </div>
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

      {/* Detail panel */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            className="bvp-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedApp(null); }}
          >
            <motion.div
              className="bvp-detail-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            >
              {loadingDetail ? (
                <div className="bvp-loading" style={{ height: 300 }}>
                  <div className="bvp-spinner" />
                  <p>Loading details…</p>
                </div>
              ) : (
                <ApplicationDetail
                  app={selectedApp}
                  onClose={() => setSelectedApp(null)}
                  onAction={handleAction}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm dialog */}
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
