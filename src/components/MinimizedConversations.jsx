import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLiveDisplayName } from '../utils/liveUsernames';
import LiveAvatarImg from './LiveAvatar';
import './MinimizedConversations.css';

// Resolves the other user's CURRENT username live, so a username change
// reflects instantly in the minimized-conversations tray too.
const LiveConvName = ({ uid, fallback, render }) => render(useLiveDisplayName(uid, fallback) || fallback || 'User');

const MinimizedConversations = ({
  minimizedConversations = [],
  onOpenConversation,
  onRemoveConversation,
  unreadCounts = {},
  onlineUserIds = [],
  groupDms = [],
  currentUid = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Make remove function globally available
  useEffect(() => {
    window.removeMinimizedConversation = (conversationId) => {
      if (onRemoveConversation) onRemoveConversation(conversationId);
    };
    return () => { delete window.removeMinimizedConversation; };
  }, [onRemoveConversation]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close when all conversations are gone
  useEffect(() => {
    if (minimizedConversations.length === 0) setIsOpen(false);
  }, [minimizedConversations.length]);

  if (minimizedConversations.length === 0) return null;

  const groupDmMap = {};
  (groupDms || []).forEach((g) => {
    if (g?.id) groupDmMap[g.id] = g;
  });

  const getUnreadCount = (conv) => {
    if (conv?.isGroup && conv.group?.id) {
      const liveG = groupDmMap[conv.group.id] || conv.group;
      return Number(liveG?.unreadBy?.[currentUid]) || 0;
    }
    return unreadCounts[conv.conversationId] || unreadCounts[conv.otherUserId] || 0;
  };

  const totalUnread = Object.values(unreadCounts).reduce((s, c) => s + (c || 0), 0)
    + minimizedConversations.filter((c) => c.isGroup).reduce((s, c) => s + getUnreadCount(c), 0);

  // Sort by latest activity
  const sorted = [...minimizedConversations].sort((a, b) => {
    const ta = a.minimizedAt || 0;
    const tb = b.minimizedAt || 0;
    return tb - ta;
  });

  const getIsOnline = (uid) => onlineUserIds.includes(uid);

  const getRoleBorderClass = (conv) => {
    if (conv?.isGroup) return 'mc-role-admin';
    const role = conv.otherUser?.role;
    if (role === 'owner') return 'mc-role-owner';
    if (role === 'admin') return 'mc-role-admin';
    if (role === 'moderator') return 'mc-role-mod';
    if (role === 'badge_holder' || conv.otherUser?.badge) return 'mc-role-badge';
    return 'mc-role-user';
  };

  const truncate = (str, n) =>
    str && str.length > n ? str.slice(0, n) + '…' : (str || '');

  return createPortal(
    <div className="mc-root" ref={panelRef}>
      {/* Expanded panel */}
      {isOpen && (
        <div className="mc-panel" role="dialog" aria-label="Minimized conversations">
          {/* Panel header */}
          <div className="mc-panel-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mc-header-icon">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Z"
                fill="url(#mc-header-grad)" />
              <defs>
                <linearGradient id="mc-header-grad" x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="mc-header-title">Messages</span>
            <span className="mc-header-count">{minimizedConversations.length}</span>
            <button className="mc-header-close" onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Conversation list */}
          <div className="mc-list">
            {sorted.map((conv) => {
              const unread = getUnreadCount(conv);
              const isGroup = Boolean(conv.isGroup && conv.group);
              const liveGroup = isGroup ? (groupDmMap[conv.group.id] || conv.group) : null;
              const isOnline = !isGroup && getIsOnline(conv.otherUserId);
              const preview = truncate(
                isGroup ? (liveGroup?.lastMessage || conv.lastMessage || '') : (conv.lastMessage || ''),
                38
              );
              const hasDraft = !!conv.draftMessage;
              const groupPhoto = isGroup ? (liveGroup?.photoURL || conv.otherUserPhoto) : null;
              const groupTitle = isGroup ? (liveGroup?.name || conv.otherUserName || 'Group Chat') : '';

              return (
                <div
                  key={conv.conversationId}
                  className={`mc-card ${getRoleBorderClass(conv)}`}
                  onClick={() => {
                    onOpenConversation(isGroup ? { ...conv, group: liveGroup || conv.group } : conv);
                    setIsOpen(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onOpenConversation(isGroup ? { ...conv, group: liveGroup || conv.group } : conv);
                      setIsOpen(false);
                    }
                  }}
                >
                  {/* Avatar + online dot */}
                  <div className="mc-avatar-wrap">
                    {isGroup ? (
                      groupPhoto ? (
                        <img src={groupPhoto} alt={groupTitle} className="mc-avatar" />
                      ) : (
                        <div
                          className="mc-avatar"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="9.5" cy="8.5" r="3.2" fill="#ffffff" />
                            <path d="M3 19c0-2.9 2.9-5 6.5-5s6.5 2.1 6.5 5" fill="#ffffff" />
                            <circle cx="17" cy="9.5" r="2.4" fill="#fde047" />
                            <path d="M16.5 14.5c2.5.4 4.5 2 4.5 4.5" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                      )
                    ) : (
                      <>
                        <LiveAvatarImg
                          uid={conv.otherUserId}
                          gender={conv.otherUser?.gender || 'male'}
                          fallbackPhotoURL={conv.otherUser?.photoURL || conv.otherUserPhoto}
                          alt={conv.otherUserName || 'User'}
                          className="mc-avatar"
                        />
                        <span className={`mc-online-dot ${isOnline ? 'mc-online' : 'mc-offline'}`} />
                      </>
                    )}
                  </div>

                  {/* Text block */}
                  <div className="mc-card-body">
                    <div className="mc-card-top">
                      <span className="mc-name">
                        {isGroup ? (
                          truncate(groupTitle, 18)
                        ) : (
                          <LiveConvName uid={conv.otherUserId} fallback={conv.otherUserName} render={(n) => truncate(n, 18)} />
                        )}
                      </span>
                      {unread > 0 && (
                        <span className="mc-unread-badge">{unread > 99 ? '99+' : unread}</span>
                      )}
                    </div>
                    <div className="mc-preview">
                      {hasDraft && <span className="mc-draft-label">Draft: </span>}
                      <span className="mc-preview-text">
                        {hasDraft ? truncate(conv.draftMessage, 30) : preview}
                      </span>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    className="mc-card-close"
                    aria-label="Close conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveConversation(conv.conversationId);
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        className={`mc-trigger ${isOpen ? 'mc-trigger--active' : ''}`}
        onClick={() => setIsOpen(v => !v)}
        aria-label="Minimized conversations"
        aria-expanded={isOpen}
      >
        {/* Chat bubble SVG */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Z"
            fill="white"
            opacity="0.95"
          />
          <path d="M8 10h8M8 14h5" stroke="rgba(79,70,229,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Count badge */}
        <span className="mc-trigger-count">
          {minimizedConversations.length}
        </span>

        {/* Unread pulse */}
        {totalUnread > 0 && <span className="mc-trigger-unread-pulse" />}
      </button>
    </div>,
    document.body
  );
};

export default MinimizedConversations;
