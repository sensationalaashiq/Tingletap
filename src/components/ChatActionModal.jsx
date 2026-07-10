import React from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import LiveAvatarImg from './LiveAvatar';
import './ChatActionModal.css';

const ChatActionModal = React.memo(({
  isOpen,
  type,
  user,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case 'kick':
        return {
          color: '#f59e0b',
          colorLight: '#fffbeb',
          colorBorder: '#fde68a',
          title: 'Kick from Room',
          description: 'User will be removed from the current room',
          confirmText: 'Yes, Kick',
          icon: (
            <path fill="#f59e0b" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
          ),
          confirmIcon: (
            <path fill="#fff" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
          )
        };
      case 'delete':
        return {
          color: '#ef4444',
          colorLight: '#fff1f1',
          colorBorder: '#fecaca',
          title: 'Delete Message',
          description: 'This message will be permanently removed',
          confirmText: 'Yes, Delete',
          icon: (
            <path fill="#ef4444" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          ),
          confirmIcon: (
            <path fill="#fff" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          )
        };
      case 'deleteAll':
        return {
          color: '#dc2626',
          colorLight: '#fef2f2',
          colorBorder: '#fca5a5',
          title: 'Clear All Messages',
          description: 'All messages in this room will be permanently deleted',
          confirmText: 'Yes, Clear All',
          icon: (
            <>
              <path fill="#dc2626" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
              <path fill="#dc2626" d="M11,9H13V17H11V9M8,9H10V17H8V9M14,9H16V17H14V9Z" opacity="0.5"/>
            </>
          ),
          confirmIcon: (
            <path fill="#fff" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          )
        };
      default:
        return {
          color: '#7c3aed', colorLight: '#faf5ff', colorBorder: '#e9d5ff',
          title: 'Confirm', description: '', confirmText: 'Confirm',
          icon: null, confirmIcon: null
        };
    }
  };

  const cfg = getConfig();

  return (
    <div className="cam-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cam-card">

        <div className="cam-header" style={{ borderTopColor: cfg.color }}>
          <div className="cam-header-icon" style={{ background: cfg.colorLight, border: `2px solid ${cfg.colorBorder}` }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}>
              {cfg.icon}
            </svg>
          </div>
          <div className="cam-header-text">
            <h2 className="cam-title">{cfg.title}</h2>
            {type === 'kick' && user && (
              <p className="cam-subtitle">
                <span className="cam-target-name">{user.displayName || 'Unknown'}</span>
              </p>
            )}
          </div>
          <button className="cam-close" onClick={onCancel} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
              <path fill="#94a3b8" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>

        <div className="cam-desc-bar" style={{ background: cfg.colorLight, borderBottom: `1px solid ${cfg.colorBorder}` }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}>
            <path fill={cfg.color} d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <span style={{ color: cfg.color }}>{cfg.description}</span>
        </div>

        <div className="cam-body">
          {type === 'kick' && user && (
            <div className="cam-user-strip">
              <LiveAvatarImg
                uid={user.uid}
                gender={user.gender}
                fallbackPhotoURL={user.photoURL}
                alt=""
                className="cam-user-avatar"
              />
              <div className="cam-user-meta">
                <span className="cam-user-name">{user.displayName || 'Unknown'}</span>
                {user.email && <span className="cam-user-email">{user.email}</span>}
              </div>
              <div className="cam-user-badges">
                <span className="cam-role-pill">{user.role?.toUpperCase() || 'USER'}</span>
              </div>
            </div>
          )}

          {(type === 'delete' || type === 'deleteAll') && (
            <div className="cam-warn-strip" style={{ background: cfg.colorLight, border: `1.5px solid ${cfg.colorBorder}` }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20, flexShrink: 0 }}>
                <path fill={cfg.color} d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
              </svg>
              <span className="cam-warn-text" style={{ color: cfg.color }}>
                {type === 'deleteAll'
                  ? 'This will permanently delete ALL messages in this room. This action cannot be undone.'
                  : 'This message will be permanently deleted. This action cannot be undone.'}
              </span>
            </div>
          )}
        </div>

        <div className="cam-footer">
          <button className="cam-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="cam-btn-confirm"
            style={{ background: cfg.color }}
            onClick={onConfirm}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
              {cfg.confirmIcon}
            </svg>
            {cfg.confirmText}
          </button>
        </div>

      </div>
    </div>
  );
});

export default ChatActionModal;
