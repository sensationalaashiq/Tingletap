import React from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import './BlockConfirmModal.css';

const BlockConfirmModal = React.memo(({ targetUser, onConfirm, onCancel }) => {
    if (!targetUser) return null;

    return (
        <div className="bcm-overlay" onClick={onCancel}>
            <div className="bcm-card" onClick={e => e.stopPropagation()}>
                <div className="bcm-icon-ring">
                    <svg className="bcm-shield-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="bcmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ff4757"/>
                                <stop offset="100%" stopColor="#c0392b"/>
                            </linearGradient>
                            <linearGradient id="bcmGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ff6b81"/>
                                <stop offset="100%" stopColor="#ff4757"/>
                            </linearGradient>
                        </defs>
                        <path d="M32 4L8 14v16c0 14 10 27 24 32 14-5 24-18 24-32V14L32 4z" fill="url(#bcmGrad)" opacity="0.15"/>
                        <path d="M32 8L10 17v13c0 12.5 9 24.5 22 29 13-4.5 22-16.5 22-29V17L32 8z" fill="url(#bcmGrad2)" opacity="0.3"/>
                        <path d="M32 12L12 20v10c0 11 8 21.5 20 26 12-4.5 20-15 20-26V20L32 12z" stroke="url(#bcmGrad)" strokeWidth="2" fill="none"/>
                        <circle cx="32" cy="30" r="10" stroke="#ff4757" strokeWidth="2.5" fill="none"/>
                        <line x1="24.5" y1="22.5" x2="39.5" y2="37.5" stroke="#ff4757" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                </div>

                <div className="bcm-title">Block User?</div>

                <div className="bcm-user-preview">
                    <div className="bcm-avatar-wrap">
                        <img
                            src={`${getDefaultAvatarUrl(targetUser.uid, targetUser.gender)}`}
                            alt="avatar"
                            className="bcm-avatar"
                        />
                    </div>
                    <span className="bcm-username">{targetUser.displayName || 'Unknown User'}</span>
                </div>

                <p className="bcm-description">
                    Once blocked, neither of you will be able to see each other's messages, send friend requests, private messages, or whispers.
                </p>

                <div className="bcm-effects">
                    <div className="bcm-effect-item">
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="#ff4757"/>
                            <line x1="6" y1="6" x2="14" y2="14" stroke="#ff4757" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>Chat messages hidden</span>
                    </div>
                    <div className="bcm-effect-item">
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <path d="M17 2H3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V3a1 1 0 00-1-1zm-1 12H4V4h12v10z" fill="#ff4757"/>
                            <line x1="4" y1="4" x2="16" y2="16" stroke="#ff4757" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>Private messages blocked</span>
                    </div>
                    <div className="bcm-effect-item">
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" fill="#ff4757"/>
                            <line x1="3" y1="3" x2="17" y2="17" stroke="#ff4757" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>Friend requests blocked</span>
                    </div>
                </div>

                <div className="bcm-actions">
                    <button className="bcm-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="bcm-btn-confirm" onClick={onConfirm}>
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <circle cx="10" cy="10" r="8" stroke="#fff" strokeWidth="1.5"/>
                            <line x1="6.5" y1="6.5" x2="13.5" y2="13.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Block User
                    </button>
                </div>
            </div>
        </div>
    );
});

export default BlockConfirmModal;
