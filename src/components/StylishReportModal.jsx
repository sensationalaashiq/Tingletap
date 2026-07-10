import React, { useState } from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import LiveAvatarImg from './LiveAvatar';
import './StylishReportModal.css';

const REPORT_REASONS = [
    {
        value: 'Spam',
        label: 'Spam',
        color: '#ef4444',
        bg: 'rgba(239,68,68,.1)',
        border: 'rgba(239,68,68,.25)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="9" fill="#ef4444" opacity=".15"/>
                <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="1.8"/>
                <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
        ),
    },
    {
        value: 'Harassment',
        label: 'Harassment',
        color: '#7c3aed',
        bg: 'rgba(124,58,237,.1)',
        border: 'rgba(124,58,237,.25)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="9" fill="#7c3aed" opacity=".12"/>
                <path d="M9 10c.5-1.5 2-2.5 3-2 1.5.6 2 2.5 1 4l-3 4" stroke="#7c3aed" strokeWidth="1.9" strokeLinecap="round"/>
                <circle cx="12" cy="18.5" r="1" fill="#7c3aed"/>
            </svg>
        ),
    },
    {
        value: 'Incest',
        label: 'Incest',
        color: '#dc2626',
        bg: 'rgba(220,38,38,.1)',
        border: 'rgba(220,38,38,.25)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="9" fill="#dc2626" opacity=".12"/>
                <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="#dc2626" strokeWidth="1.8"/>
                <line x1="7" y1="7" x2="17" y2="17" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
                <text x="12" y="13.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#dc2626">18+</text>
            </svg>
        ),
    },
    {
        value: 'Hate Speech',
        label: 'Hate Speech',
        color: '#d97706',
        bg: 'rgba(217,119,6,.1)',
        border: 'rgba(217,119,6,.25)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="9" fill="#d97706" opacity=".12"/>
                <path d="M6 8h12v6a2 2 0 01-2 2H8l-2 2V8z" stroke="#d97706" strokeWidth="1.8" strokeLinejoin="round"/>
                <line x1="9" y1="11.5" x2="15" y2="11.5" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="9" y1="14" x2="13" y2="14" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
        ),
    },
    {
        value: 'Inappropriate Content',
        label: 'Inappropriate',
        color: '#f97316',
        bg: 'rgba(249,115,22,.1)',
        border: 'rgba(249,115,22,.25)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path d="M12 3L2.5 20h19L12 3z" fill="#f97316" opacity=".14"/>
                <path d="M12 3L2.5 20h19L12 3z" stroke="#f97316" strokeWidth="1.8" strokeLinejoin="round"/>
                <line x1="12" y1="10" x2="12" y2="14.5" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1.1" fill="#f97316"/>
            </svg>
        ),
    },
    {
        value: 'Sharing Personal Info',
        label: 'Personal Info',
        color: '#0ea5e9',
        bg: 'rgba(14,165,233,.1)',
        border: 'rgba(14,165,233,.25)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="9" fill="#0ea5e9" opacity=".12"/>
                <rect x="8" y="5" width="8" height="14" rx="1.5" stroke="#0ea5e9" strokeWidth="1.8"/>
                <line x1="10" y1="9" x2="14" y2="9" stroke="#0ea5e9" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="10" y1="12" x2="14" y2="12" stroke="#0ea5e9" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="10" y1="15" x2="12" y2="15" stroke="#0ea5e9" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
        ),
    },
    {
        value: 'Other',
        label: 'Other',
        color: '#6b7280',
        bg: 'rgba(107,114,128,.1)',
        border: 'rgba(107,114,128,.22)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <circle cx="12" cy="12" r="9" fill="#6b7280" opacity=".12"/>
                <path d="M9.5 9.5C9.5 8.12 10.62 7 12 7s2.5 1.12 2.5 2.5c0 1.5-1.5 2-1.5 3.5" stroke="#6b7280" strokeWidth="1.9" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1.1" fill="#6b7280"/>
            </svg>
        ),
    },
];

const StylishReportModal = React.memo(({
    isOpen,
    onClose,
    messageToReport,
    onSubmit,
    reportType: initialReportType = 'Message',
    reportCategory,
    setReportCategory,
    reportReason,
    setReportReason
}) => {
    const [reportType, setReportType] = useState(initialReportType);

    const handleSubmit = () => {
        if (!reportCategory) return;
        onSubmit({ reportType, category: reportCategory, reason: reportReason });
        handleClose();
    };

    const handleClose = () => {
        setReportType(initialReportType || 'Message');
        if (setReportCategory) setReportCategory('Spam');
        if (setReportReason) setReportReason('');
        onClose();
    };

    React.useEffect(() => {
        if (isOpen) {
            setReportType(initialReportType || 'Message');
            if (setReportCategory) setReportCategory('Spam');
            if (setReportReason) setReportReason('');
        }
    }, [isOpen, initialReportType]);

    if (!isOpen) return null;

    const selectedReason = REPORT_REASONS.find(r => r.value === (reportCategory || 'Spam'));

    return (
        <div className="srm-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="srm-card" onClick={e => e.stopPropagation()}>

                {/* Icon Ring */}
                <div className="srm-icon-ring">
                    <svg className="srm-flag-icon" viewBox="0 0 64 64" fill="none">
                        <defs>
                            <linearGradient id="srmG1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f97316"/>
                                <stop offset="100%" stopColor="#dc2626"/>
                            </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r="22" fill="url(#srmG1)" opacity=".12"/>
                        <circle cx="32" cy="32" r="22" stroke="url(#srmG1)" strokeWidth="2" fill="none"/>
                        <line x1="26" y1="18" x2="26" y2="46" stroke="#f97316" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M26 18 L46 24 L42 32 L46 40 L26 36 Z" fill="#f97316" opacity=".85" strokeLinejoin="round"/>
                    </svg>
                </div>

                {/* Title */}
                <div className="srm-title">Report Content</div>

                {/* User preview */}
                <div className="srm-user-preview">
                    <div className="srm-avatar-wrap">
                        <LiveAvatarImg
                            uid={messageToReport?.uid || messageToReport?.id}
                            gender={messageToReport?.gender}
                            fallbackPhotoURL={messageToReport?.photoURL}
                            alt="avatar"
                            className="srm-avatar"
                        />
                    </div>
                    <div className="srm-user-info">
                        <span className="srm-username">{messageToReport?.displayName || 'Unknown User'}</span>
                        {reportType === 'Message' && messageToReport?.text && (
                            <span className="srm-preview-text">"{messageToReport.text.substring(0, 38)}{messageToReport.text.length > 38 ? '…' : ''}"</span>
                        )}
                    </div>
                </div>

                {/* Report type toggle */}
                <div className="srm-type-row">
                    <button className={`srm-type-btn${reportType === 'Message' ? ' active' : ''}`} onClick={() => setReportType('Message')}>
                        <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
                            <path d="M17 2H3a1 1 0 00-1 1v11a1 1 0 001 1h12l3 3V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill={reportType === 'Message' ? 'rgba(249,115,22,.18)' : 'none'}/>
                        </svg>
                        Message
                    </button>
                    <button className={`srm-type-btn${reportType === 'User' ? ' active' : ''}`} onClick={() => setReportType('User')}>
                        <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
                            <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" fill={reportType === 'User' ? 'rgba(249,115,22,.18)' : 'none'}/>
                            <path d="M2.5 18c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                        User
                    </button>
                </div>

                {/* Reason label */}
                <div className="srm-section-label">Select Reason</div>

                {/* Premium SVG reason cards grid */}
                <div className="srm-reason-grid">
                    {REPORT_REASONS.map(r => (
                        <button
                            key={r.value}
                            className={`srm-reason-card${(reportCategory || 'Spam') === r.value ? ' selected' : ''}`}
                            style={{
                                '--rc': r.color,
                                '--rb': r.bg,
                                '--rbd': r.border,
                            }}
                            onClick={() => { if (setReportCategory) setReportCategory(r.value); }}
                        >
                            <span className="srm-reason-icon">{r.icon}</span>
                            <span className="srm-reason-label">{r.label}</span>
                        </button>
                    ))}
                </div>

                {/* Details textarea */}
                <div className="srm-fields">
                    <div className="srm-field-label">
                        Additional Details
                        <span className="srm-optional"> (optional)</span>
                    </div>
                    <textarea
                        className="srm-textarea"
                        rows="2"
                        value={reportReason || ''}
                        onChange={e => { if (setReportReason) setReportReason(e.target.value); }}
                        placeholder="Describe the issue in more detail..."
                    />
                </div>

                {/* Actions */}
                <div className="srm-actions">
                    <button className="srm-btn-cancel" onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        className="srm-btn-submit"
                        onClick={handleSubmit}
                        style={{
                            background: 'linear-gradient(135deg,#f97316,#dc2626)',
                            color: '#fff',
                            WebkitTextFillColor: '#fff',
                            border: 'none',
                            boxShadow: '0 4px 16px rgba(249,115,22,.4)',
                        }}
                    >
                        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="10" cy="10" r="8" stroke="#fff" strokeWidth="1.6"/>
                            <path d="M7 10l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ color: '#fff', WebkitTextFillColor: '#fff', fontWeight: 700 }}>Submit Report</span>
                    </button>
                </div>

            </div>
        </div>
    );
});

export default StylishReportModal;
