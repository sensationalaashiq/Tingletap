// src/components/badge/BadgeStatusCard.jsx
// Shows the user's current badge application status with premium UI.

import React from 'react';
import { formatReviewTimeRemaining } from '../../services/badgeApplicationService';

const STATUS_CONFIG = {
  pending: {
    cls: 'bv-status-card--pending',
    iconCls: 'bv-status-icon-wrap--pending',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2"/>
        <path d="M12 7v5l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Under Review',
    sub: 'Your application is being reviewed by our team. You will be notified once a decision is made.',
  },
  approved: {
    cls: 'bv-status-card--approved',
    iconCls: 'bv-status-icon-wrap--approved',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <circle cx="12" cy="12" r="9" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2"/>
        <path d="M7 12l4 4 6-7" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Badge Approved',
    sub: 'Congratulations! Your verified badge has been approved. It is now displayed on your profile.',
  },
  rejected: {
    cls: 'bv-status-card--rejected',
    iconCls: 'bv-status-icon-wrap--rejected',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <circle cx="12" cy="12" r="9" stroke="#f43f5e" strokeWidth="2"/>
        <path d="M15 9l-6 6M9 9l6 6" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Application Rejected',
    sub: 'Your application was not approved. You may submit a fresh application at any time.',
  },
  expired: {
    cls: 'bv-status-card--expired',
    iconCls: 'bv-status-icon-wrap--expired',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="2"/>
        <path d="M12 7v5l3 3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 2l20 20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Application Expired',
    sub: 'Your application was not reviewed within 48 hours and has expired. You may submit a fresh application now.',
  },
  resubmit_requested: {
    cls: 'bv-status-card--resubmit',
    iconCls: 'bv-status-icon-wrap--resubmit',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2"/>
        <path d="M12 8v4M12 16h.01" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Resubmission Requested',
    sub: 'Our team has requested additional information. Please submit a fresh application.',
  },
};

export default function BadgeStatusCard({ application, onApplyAgain }) {
  if (!application) return null;

  const { status, reviewNotes, expiresAt, reviewedAt } = application;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const remaining = status === 'pending' ? formatReviewTimeRemaining(expiresAt) : null;

  const canReapply = ['rejected', 'expired', 'resubmit_requested'].includes(status);

  return (
    <div className={`bv-status-card ${cfg.cls}`} style={{ gap: 14 }}>
      <div className={`bv-status-icon-wrap ${cfg.iconCls}`}>
        {cfg.icon}
      </div>

      <div className="bv-status-title">{cfg.title}</div>
      <div className="bv-status-sub">{cfg.sub}</div>

      {/* Remaining review time for pending */}
      {status === 'pending' && remaining && (
        <div className="bv-status-timer">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {remaining} remaining
        </div>
      )}

      {/* Metadata */}
      {reviewedAt && (
        <div className="bv-status-meta">
          Reviewed: {new Date(reviewedAt?.toDate ? reviewedAt.toDate() : reviewedAt).toLocaleDateString()}
        </div>
      )}

      {/* Review notes */}
      {reviewNotes && (
        <div className="bv-status-review-notes">
          <strong style={{ display: 'block', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.7 }}>
            Review Notes
          </strong>
          {reviewNotes}
        </div>
      )}

      {/* Re-apply button */}
      {canReapply && onApplyAgain && (
        <button className="bv-btn bv-btn--primary" onClick={onApplyAgain} style={{ marginTop: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M23 4v6h-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Apply Again
        </button>
      )}
    </div>
  );
}
