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
import { getBadgeMedia, getSignedMediaUrl, reviewApplication } from '../../services/r2StorageService';
import { pt } from '../../utils/premiumToast';
import { db } from '../../firebase/config';
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Badges } from '../../data/Badges';
import { useLiveDisplayName } from '../../utils/liveUsernames';
import './BadgeVerificationPanel.css';

// Resolves the applicant's CURRENT username live so the badge verification
// list/detail reflect a rename instantly instead of the stale doc copy.
const LiveAppName = ({ uid, fallback }) => useLiveDisplayName(uid, fallback) || fallback || 'Unknown';

// ── Icons ────────────────────────────────────────────────────────────────────
const ShieldIcon    = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2L2 7l1 5a9 9 0 0 0 9 7 9 9 0 0 0 9-7l1-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const UserIcon      = () => <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const GlobeIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 3c-2 2-3.5 5-3.5 9s1.5 7 3.5 9M12 3c2 2 3.5 5 3.5 9s-1.5 7-3.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M3 12h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const VideoIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/></svg>;
const AudioIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 19v3M9 22h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const FilterIcon    = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SearchIcon    = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CloseIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const RefreshIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CheckIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ClockIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TrashIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
// Geo row icons
const GeoCountryIcon  = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><circle cx="12" cy="12" r="9" stroke="#7c3aed" strokeWidth="1.8"/><path d="M12 3c-2 2-3.5 5-3.5 9s1.5 7 3.5 9M12 3c2 2 3.5 5 3.5 9s-1.5 7-3.5 9" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round"/><path d="M3 12h18" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const GeoRegionIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><path d="M3 11l19-9-9 19-2-8-8-2z" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const GeoCityIcon     = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h2M9 13h2M13 9h2M13 13h2" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const GeoTimezoneIcon = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><circle cx="12" cy="12" r="9" stroke="#7c3aed" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const GeoIspIcon      = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#7c3aed" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const GeoAsnIcon      = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><circle cx="12" cy="5" r="2.5" stroke="#7c3aed" strokeWidth="1.7"/><circle cx="5" cy="19" r="2.5" stroke="#7c3aed" strokeWidth="1.7"/><circle cx="19" cy="19" r="2.5" stroke="#7c3aed" strokeWidth="1.7"/><path d="M12 7.5v4.5M12 12l-5.5 4.5M12 12l5.5 4.5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const GeoNoDataIcon   = () => <svg viewBox="0 0 24 24" fill="none" width="13" height="13"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#f59e0b" strokeWidth="1.8"/><circle cx="12" cy="10" r="3" stroke="#f59e0b" strokeWidth="1.8"/></svg>;

// Allowed badge keys for verification approval
const APPROVAL_BADGE_KEYS = ['gold_knight','platinum_lord','diamond_king','ruby_queen','emerald_empress','sapphire_goddess','rj'];

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
    delete:           { title: 'Delete Application',    btn: 'Delete',     cls: 'bvp-btn--danger' },
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

// ── Send TingleBot badge resubmission DM ─────────────────────────────────────
async function sendTinglebotBadgeDM(uid, displayName, notes) {
  const TINGLEBOT_UID = 'tinglebot_system_official_2024';
  const conversationId = [TINGLEBOT_UID, uid].sort().join('_');
  const notesPart = notes?.trim()
    ? `\n\nAdmin Notes:\n${notes.trim()}`
    : '';
  await addDoc(collection(db, 'privateMessages'), {
    senderId: TINGLEBOT_UID,
    senderName: 'TingleBot',
    receiverId: uid,
    participants: [TINGLEBOT_UID, uid],
    conversationId,
    text:
      `Badge Verification — Resubmission Required\n\nHi ${displayName || 'there'}, your badge verification application requires resubmission. ` +
      `Please visit Settings to submit a fresh application.${notesPart}\n\n— TingleTap Admin Team`,
    isBot: true,
    isBotNotification: true,
    botStatusKey: 'badge_resubmit',
    tinglebotType: 'badge_resubmit',
    badgeResubmit: true,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

// ── Application Detail Panel ───────────────────────────────────────────────────
function ApplicationDetail({ app, onClose, onAction, onGeoUpdate }) {
  const [videoUrl, setVideoUrl]   = useState('');
  const [audioUrl, setAudioUrl]   = useState('');
  const [loadingV, setLoadingV]   = useState(false);
  const [loadingA, setLoadingA]   = useState(false);
  const [vidLabel, setVidLabel]   = useState('');
  const [audLabel, setAudLabel]   = useState('');
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);

  // Refs to track active blob URLs so we can revoke them on reload / unmount
  const videoBlobRef = useRef(null);
  const audioBlobRef = useRef(null);

  // Revoke blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (videoBlobRef.current) URL.revokeObjectURL(videoBlobRef.current);
      if (audioBlobRef.current) URL.revokeObjectURL(audioBlobRef.current);
    };
  }, []);

  // Local geo override — populated when admin clicks Refresh Geo
  const [geo, setGeo]               = useState({
    country:  app.country  || '',
    region:   app.region   || '',
    city:     app.city     || '',
    timezone: app.timezone || '',
    isp:      app.isp      || '',
    asn:      app.asn      || '',
  });
  const [refreshingGeo, setRefreshingGeo] = useState(false);

  // Sync local geo when a different application is opened in the panel
  useEffect(() => {
    setGeo({
      country:  app.country  || '',
      region:   app.region   || '',
      city:     app.city     || '',
      timezone: app.timezone || '',
      isp:      app.isp      || '',
      asn:      app.asn      || '',
    });
  }, [app.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v) => (v && String(v).trim()) ? v : '—';
  const bool = (v) => v ? (
    <span style={{ color: '#f43f5e', fontWeight: 700 }}>Yes</span>
  ) : (
    <span style={{ color: '#10b981', fontWeight: 700 }}>No</span>
  );

  // Fetch media via server-side proxy → blob → objectURL.
  // The proxy (getBadgeMedia Netlify function) fetches from R2 server-side so
  // the browser never makes a cross-origin request — no CORS config needed.
  // Falls back to presigned URL (direct tab) if the proxy itself errors.
  const loadVideo = async () => {
    if (!app.videoKey) return;
    setLoadingV(true);
    setVideoError(false);
    try {
      const blob = await getBadgeMedia(app.videoKey);
      if (videoBlobRef.current) URL.revokeObjectURL(videoBlobRef.current);
      const blobUrl = URL.createObjectURL(blob);
      videoBlobRef.current = blobUrl;
      setVideoUrl(blobUrl);
      setVidLabel(`${(blob.size / 1024 / 1024).toFixed(1)} MB · Loaded ✓`);
    } catch (e) {
      pt.error(e.message || 'Failed to load video');
    } finally { setLoadingV(false); }
  };

  const loadAudio = async () => {
    if (!app.audioKey) return;
    setLoadingA(true);
    setAudioError(false);
    try {
      const blob = await getBadgeMedia(app.audioKey);
      if (audioBlobRef.current) URL.revokeObjectURL(audioBlobRef.current);
      const blobUrl = URL.createObjectURL(blob);
      audioBlobRef.current = blobUrl;
      setAudioUrl(blobUrl);
      setAudLabel(`${(blob.size / 1024).toFixed(0)} KB · Loaded ✓`);
    } catch (e) {
      pt.error(e.message || 'Failed to load audio');
    } finally { setLoadingA(false); }
  };

  const refreshGeo = async () => {
    if (!app.ipAddress) return pt.error('No IP address stored for this application.');
    setRefreshingGeo(true);
    try {
      const res = await fetch(`/.netlify/functions/ip-geo?ip=${encodeURIComponent(app.ipAddress)}`);
      if (!res.ok) { pt.error('Geo lookup service unavailable.'); return; }
      const data = await res.json();
      if (data._error || data.error) {
        pt.error('Geo lookup unavailable for this IP address.');
        return;
      }
      // Guard: only write if at least one field came back
      const hasAnyGeo = !!(data.country || data.region || data.city || data.isp);
      if (!hasAnyGeo) { pt.error('No location data found for this IP.'); return; }
      const updated = {
        country:  data.country  || '',
        region:   data.region   || '',
        city:     data.city     || '',
        timezone: data.timezone || '',
        isp:      data.isp      || '',
        asn:      data.asn ? String(data.asn) : '',
      };
      // Update local display immediately
      setGeo(updated);
      // Persist to Firestore
      await updateDoc(doc(db, 'badgeApplications', app.uid), updated);
      // Notify parent to refresh selectedApp
      if (onGeoUpdate) onGeoUpdate(app.uid, updated);
      pt.success('Location data refreshed!');
    } catch (e) {
      pt.error('Failed to refresh geo: ' + e.message);
    } finally {
      setRefreshingGeo(false);
    }
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
          <div className="bvp-section-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GlobeIcon /> Network &amp; Location
            </span>
            {app.ipAddress && (
              <button
                className="bvp-btn bvp-btn--primary"
                style={{ padding: '3px 10px', fontSize: 11, marginLeft: 'auto' }}
                onClick={refreshGeo}
                disabled={refreshingGeo}
                title="Re-fetch geo data from IP (useful when location fields are empty)"
              >
                {refreshingGeo ? '…' : <><RefreshIcon /> Refresh</>}
              </button>
            )}
          </div>
          <table className="bvp-info-table">
            <tbody>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoAsnIcon /> IP Address</span></td>
                <td><code style={{ fontSize: 11 }}>{fmt(app.ipAddress)}</code></td>
              </tr>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoCountryIcon /> Country</span></td>
                <td style={{ fontWeight: geo.country ? 600 : 400, color: geo.country ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{fmt(geo.country)}</td>
              </tr>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoRegionIcon /> Region</span></td>
                <td style={{ fontWeight: geo.region ? 600 : 400, color: geo.region ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{fmt(geo.region)}</td>
              </tr>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoCityIcon /> City</span></td>
                <td style={{ fontWeight: geo.city ? 600 : 400, color: geo.city ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{fmt(geo.city)}</td>
              </tr>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoTimezoneIcon /> Timezone</span></td>
                <td style={{ color: geo.timezone ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{fmt(geo.timezone)}</td>
              </tr>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoIspIcon /> ISP</span></td>
                <td style={{ fontWeight: geo.isp ? 600 : 400, color: geo.isp ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{fmt(geo.isp)}</td>
              </tr>
              <tr>
                <td><span style={{ display:'flex', alignItems:'center', gap:5 }}><GeoAsnIcon /> ASN</span></td>
                <td style={{ color: geo.asn ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{fmt(geo.asn)}</td>
              </tr>
              {app.ipAddress && !geo.country && !geo.city && !geo.isp && (
                <tr>
                  <td colSpan="2">
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#f59e0b', fontStyle:'italic', paddingTop:6 }}>
                      <GeoNoDataIcon />
                      Location data not collected — click Refresh to fetch from IP
                    </div>
                  </td>
                </tr>
              )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <VideoIcon />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Selfie Video</span>
                {vidLabel && <span style={{ fontSize: 11, color: '#10b981', marginLeft: 'auto' }}>{vidLabel}</span>}
                <button
                  className="bvp-btn bvp-btn--primary"
                  style={{ padding: '6px 14px', fontSize: 12, marginLeft: vidLabel ? 0 : 'auto' }}
                  onClick={loadVideo}
                  disabled={loadingV}
                >
                  {loadingV ? 'Loading…' : videoUrl ? 'Reload' : 'Load Video'}
                </button>
              </div>
              {videoUrl && !videoError && (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  playsInline
                  className="bvp-media-player"
                  style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 320 }}
                  onError={() => setVideoError(true)}
                />
              )}
              {videoError && (
                <div className="bvp-media-error">
                  <span>⚠️ Playback error — click Reload to try again.</span>
                  <button
                    className="bvp-btn bvp-btn--primary"
                    style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={() => { setVideoError(false); loadVideo(); }}
                  >
                    Reload
                  </button>
                </div>
              )}
            </div>
          )}

          {app.audioKey && (
            <div className="bvp-media-block" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <AudioIcon />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Spoken Declaration</span>
                {audLabel && <span style={{ fontSize: 11, color: '#10b981', marginLeft: 'auto' }}>{audLabel}</span>}
                <button
                  className="bvp-btn bvp-btn--primary"
                  style={{ padding: '6px 14px', fontSize: 12, marginLeft: audLabel ? 0 : 'auto' }}
                  onClick={loadAudio}
                  disabled={loadingA}
                >
                  {loadingA ? 'Loading…' : audioUrl ? 'Reload' : 'Load Audio'}
                </button>
              </div>
              {audioUrl && !audioError && (
                <audio
                  key={audioUrl}
                  src={audioUrl}
                  controls
                  style={{ width: '100%', borderRadius: 8 }}
                  onError={() => setAudioError(true)}
                />
              )}
              {audioError && (
                <div className="bvp-media-error">
                  <span>⚠️ Playback error — click Reload to try again.</span>
                  <button
                    className="bvp-btn bvp-btn--primary"
                    style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={() => { setAudioError(false); loadAudio(); }}
                  >
                    Reload
                  </button>
                </div>
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
          <button className="bvp-btn bvp-btn--resubmit" onClick={() => onAction('request_resubmit')}>
            <RefreshIcon /> Request Resubmission
          </button>
        </div>
      )}

      {/* Delete — always visible for all statuses */}
      <div className="bvp-action-row" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border-color, rgba(0,0,0,0.08))' }}>
        <button className="bvp-btn bvp-btn--danger" style={{ opacity: 0.85 }} onClick={() => onAction('delete')}>
          <TrashIcon /> Delete Request
        </button>
      </div>
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

  // Badge picker (for approve action)
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [pickerBadgeKey, setPickerBadgeKey]   = useState(null);
  const [assigningBadge, setAssigningBadge]   = useState(false);

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
    if (action === 'approve') {
      // Open badge picker instead of confirm dialog
      setPickerBadgeKey(null);
      setShowBadgePicker(true);
      return;
    }
    setReviewNotes('');
    setConfirmAction(action);
  };

  // Execute badge approval: mark application approved + assign badge to user
  const executeBadgeApproval = async () => {
    if (!selectedApp || !pickerBadgeKey) {
      pt.error('Please select a badge to award.');
      return;
    }
    setAssigningBadge(true);
    try {
      // 1. Approve the verification application
      await reviewApplication(selectedApp.uid, 'approve', '');
      // 2. Assign the selected badge to the user
      await updateDoc(doc(db, 'users', selectedApp.uid), { badge: pickerBadgeKey });
      const badgeName = Badges[pickerBadgeKey]?.name || pickerBadgeKey;
      pt.success(`Badge "${badgeName}" awarded to ${selectedApp.displayName || selectedApp.username}!`);
      setShowBadgePicker(false);
      setPickerBadgeKey(null);
      invalidateCache();
      setSelectedApp(null);
      loadApps(true);
    } catch (e) {
      pt.error(e.message || 'Failed to approve badge.');
    } finally { setAssigningBadge(false); }
  };

  const executeAction = async () => {
    if (!selectedApp) return;
    if (confirmAction === 'reject' && !reviewNotes.trim()) {
      pt.error('Review notes are required for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      // Delete: remove the Firestore document entirely
      if (confirmAction === 'delete') {
        await deleteDoc(doc(db, 'badgeApplications', selectedApp.uid));
        pt.success('Application deleted successfully.');
        invalidateCache();
        setConfirmAction(null);
        setSelectedApp(null);
        loadApps(true);
        return;
      }

      await reviewApplication(selectedApp.uid, confirmAction, reviewNotes);

      // On resubmit: send TingleBot DM to the user (same pattern as Feedback & Complaints)
      if (confirmAction === 'request_resubmit') {
        try {
          await sendTinglebotBadgeDM(
            selectedApp.uid,
            selectedApp.displayName || selectedApp.username,
            reviewNotes
          );
        } catch (dmErr) {
          console.warn('[BadgeVerificationPanel] TingleBot DM failed (non-fatal):', dmErr.message);
        }
      }

      pt.success(`Application ${confirmAction.replace(/_/g, ' ')} successfully.`);
      invalidateCache();
      setConfirmAction(null);
      setSelectedApp(null);
      loadApps(true);
    } catch (e) {
      pt.error(e.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleGeoUpdate = (uid, geoData) => {
    setSelectedApp(prev => prev && prev.uid === uid ? { ...prev, ...geoData } : prev);
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
                        <LiveAppName uid={app.uid} fallback={app.displayName || app.username} />
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
                  onGeoUpdate={handleGeoUpdate}
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

      {/* Badge Picker Modal — shown when admin clicks "Approve Badge" */}
      <AnimatePresence>
        {showBadgePicker && selectedApp && (
          <div
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:10002, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowBadgePicker(false); setPickerBadgeKey(null); } }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{ background:'var(--modal-bg,#fff)', borderRadius:22, width:'min(560px,96vw)', boxShadow:'0 20px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}
            >
              {/* Header */}
              <div style={{ background:'linear-gradient(135deg,#10b981 0%,#059669 60%,#047857 100%)', padding:'20px 22px 18px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.32)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width:26, height:26 }}>
                    <path fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                    <circle cx="12" cy="12" r="2.5" fill="#fbbf24"/>
                  </svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#fff', letterSpacing:0.2 }}>Award Badge</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.82)', marginTop:2 }}>
                    Awarding to <strong style={{ color:'#fff' }}>{selectedApp.displayName || selectedApp.username}</strong>
                  </div>
                </div>
                <button
                  onClick={() => { setShowBadgePicker(false); setPickerBadgeKey(null); }}
                  style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" style={{ width:14, height:14 }}><path fill="#fff" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                </button>
              </div>

              <div style={{ padding:'18px 20px 0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width:13, height:13 }}><path fill="#059669" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  <span style={{ fontSize:11, fontWeight:700, color:'#065f46', letterSpacing:0.5, textTransform:'uppercase' }}>Select Badge to Award</span>
                </div>

                {/* Badge grid — only the approved verification badges */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:10 }}>
                  {Object.entries(Badges)
                    .filter(([key]) => APPROVAL_BADGE_KEYS.includes(key))
                    .map(([key, badge]) => {
                      const isActive = pickerBadgeKey === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setPickerBadgeKey(key)}
                          disabled={assigningBadge}
                          style={{
                            display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                            padding:'14px 8px 12px', borderRadius:16, cursor:assigningBadge ? 'default' : 'pointer',
                            border: isActive ? '2px solid #10b981' : '1.5px solid rgba(16,185,129,0.18)',
                            background: isActive ? 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.07))' : 'rgba(255,255,255,0.9)',
                            boxShadow: isActive ? '0 0 0 3px rgba(16,185,129,0.15), 0 4px 12px rgba(16,185,129,0.14)' : '0 2px 6px rgba(0,0,0,0.06)',
                            transition:'all .18s cubic-bezier(.34,1.56,.64,1)',
                            opacity: assigningBadge ? 0.6 : 1,
                            position:'relative',
                          }}
                          onMouseEnter={e => { if (!assigningBadge) { e.currentTarget.style.transform='scale(1.04) translateY(-2px)'; e.currentTarget.style.boxShadow=isActive ? '0 0 0 3px rgba(16,185,129,0.2),0 8px 20px rgba(16,185,129,0.18)':'0 6px 18px rgba(0,0,0,0.1)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=isActive ? '0 0 0 3px rgba(16,185,129,0.15),0 4px 12px rgba(16,185,129,0.14)':'0 2px 6px rgba(0,0,0,0.06)'; }}
                        >
                          {isActive && (
                            <div style={{ position:'absolute', top:7, right:7, width:16, height:16, borderRadius:'50%', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <svg viewBox="0 0 24 24" fill="none" style={{ width:10, height:10 }}><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                          <div style={{ width:48, height:48, flexShrink:0, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' }}
                            dangerouslySetInnerHTML={{ __html: badge.svg }}
                          />
                          <span style={{ fontSize:10.5, fontWeight:700, color:isActive ? '#065f46' : '#1e293b', textAlign:'center', lineHeight:1.3 }}>{badge.name}</span>
                          {isActive && (
                            <span style={{ fontSize:9, background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', borderRadius:5, padding:'2px 7px', fontWeight:700, letterSpacing:0.3 }}>Selected</span>
                          )}
                        </button>
                      );
                    })}
                </div>

                {!pickerBadgeKey && (
                  <div style={{ marginTop:10, padding:'8px 12px', borderRadius:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', display:'flex', alignItems:'center', gap:8 }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width:14, height:14, flexShrink:0 }}><path d="M12 2L2 19h20L12 2z" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(245,158,11,0.12)"/><path d="M12 9v5M12 16.5v.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    <span style={{ fontSize:11.5, color:'#92400e', fontWeight:500 }}>Select a badge to award before approving.</span>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:10, padding:'16px 20px 20px', marginTop:4 }}>
                <button
                  onClick={() => { setShowBadgePicker(false); setPickerBadgeKey(null); }}
                  disabled={assigningBadge}
                  className="bvp-btn bvp-btn--secondary"
                  style={{ flex:1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={executeBadgeApproval}
                  disabled={assigningBadge || !pickerBadgeKey}
                  className="bvp-btn bvp-btn--green"
                  style={{ flex:2 }}
                >
                  {assigningBadge ? (
                    <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'bvp-spin 0.7s linear infinite' }} />
                      Awarding…
                    </span>
                  ) : (
                    <><CheckIcon /> Award Badge & Approve</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
