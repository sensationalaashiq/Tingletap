import React from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import './AddFriendConfirmModal.css';

const AddFriendConfirmModal = ({ targetUser, onConfirm, onCancel }) => {
    if (!targetUser) return null;

    return (
        <div className="afcm-overlay" onClick={onCancel}>
            <div className="afcm-card" onClick={e => e.stopPropagation()}>

                <div className="afcm-icon-ring">
                    <svg className="afcm-main-icon" viewBox="0 0 64 64" fill="none">
                        <defs>
                            <linearGradient id="afcmG1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10b981"/>
                                <stop offset="100%" stopColor="#059669"/>
                            </linearGradient>
                            <linearGradient id="afcmG2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#34d399"/>
                                <stop offset="100%" stopColor="#10b981"/>
                            </linearGradient>
                        </defs>
                        <circle cx="22" cy="20" r="8" stroke="url(#afcmG1)" strokeWidth="2.5" fill="none"/>
                        <path d="M6 46c0-8.84 7.16-14 16-14s16 5.16 16 14" stroke="url(#afcmG1)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                        <circle cx="46" cy="18" r="6" stroke="url(#afcmG2)" strokeWidth="2" fill="none"/>
                        <path d="M34 42c0-5.5 5-10 12-10" stroke="url(#afcmG2)" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <circle cx="56" cy="10" r="9" fill="url(#afcmG1)" opacity="0.12"/>
                        <line x1="52" y1="10" x2="60" y2="10" stroke="url(#afcmG1)" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="56" y1="6" x2="56" y2="14" stroke="url(#afcmG1)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                </div>

                <div className="afcm-title">Send Friend Request?</div>

                <div className="afcm-user-preview">
                    <div className="afcm-avatar-wrap">
                        <img
                            src={targetUser.photoURL || getDefaultAvatarUrl(targetUser.uid, targetUser.gender)}
                            alt="avatar"
                            className="afcm-avatar"
                            onError={e => { e.target.src = getDefaultAvatarUrl(targetUser.uid, targetUser.gender || 'male'); }}
                        />
                    </div>
                    <div className="afcm-user-info">
                        <span className="afcm-username">{targetUser.displayName || 'Unknown User'}</span>
                        <span className="afcm-user-sub">Waiting for their approval</span>
                    </div>
                </div>

                <p className="afcm-description">
                    A friend request will be sent to <strong>{targetUser.displayName || 'this user'}</strong>. They'll need to accept before you become friends.
                </p>

                <div className="afcm-perks">
                    <div className="afcm-perk-item">
                        <div className="afcm-perk-icon">
                            <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                                <path d="M18 2H2a1 1 0 00-1 1v14l4-4h13a1 1 0 001-1V3a1 1 0 00-1-1z" fill="#10b981"/>
                            </svg>
                        </div>
                        <span>Private message anytime</span>
                    </div>
                    <div className="afcm-perk-item">
                        <div className="afcm-perk-icon">
                            <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM2 8a2 2 0 114 0A2 2 0 012 8zM1.5 14s.5-3 3.5-3c.5 0 .9.07 1.3.18C5.5 12 5 14 5 14H1.5zm15 0H15s0-2-.8-2.82c.4-.11.8-.18 1.3-.18 3 0 3.5 3 3.5 3h-3.5zm-5 0H8s-.5-3 2-3 2 3 2 3h-.5z" fill="#10b981"/>
                            </svg>
                        </div>
                        <span>Appears in your friends list</span>
                    </div>
                    <div className="afcm-perk-item">
                        <div className="afcm-perk-icon">
                            <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                                <circle cx="10" cy="10" r="3" fill="#10b981"/>
                                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z" fill="#10b981"/>
                            </svg>
                        </div>
                        <span>See their online status</span>
                    </div>
                </div>

                <div className="afcm-actions">
                    <button className="afcm-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="afcm-btn-confirm" onClick={onConfirm}>
                        <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
                            <path d="M12 10c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-8-2V5H2v3H-.5v2H2v3h2v-3h3V8H4zm8 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#fff"/>
                        </svg>
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddFriendConfirmModal;
