// src/components/messages/MessageRequestsPanel.jsx
// Renders incoming Message Requests from non-connected users with full profile metadata and Accept/Decline/Block/Report actions.

import React from 'react';
import LiveAvatarImg from '../LiveAvatar';
import { computeMutualFriendsCount } from '../../services/privacyService';
import './MessagingSuite.css';

const MessageRequestsPanel = ({
  requests = [],
  loggedInUserProfile,
  userProfilesMap,
  onAccept,
  onDecline,
  onBlock,
  onReport,
}) => {
  if (!requests.length) {
    return (
      <div className="pm-popup-empty">
        <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#8b5cf6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.65">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9 10h6M12 7v6" />
        </svg>
        <p>No message requests</p>
        <small>Messages from people you are not connected with will appear here.</small>
      </div>
    );
  }

  return (
    <div className="tt-req-list">
      {requests.map((req) => {
        const liveSender = userProfilesMap?.get?.(req.senderId) || window.userProfilesCache?.get?.(req.senderId) || null;
        const displayName = liveSender?.displayName || req.senderName || 'User';
        const username = liveSender?.username || req.senderUsername || '';
        const photoURL = liveSender?.photoURL || req.senderPhoto || null;
        const gender = liveSender?.gender || req.senderGender || 'male';
        const isVerified = Boolean(liveSender?.isVerified || req.senderIsVerified || liveSender?.badge || req.senderBadge);

        const mutualCount = computeMutualFriendsCount(
          loggedInUserProfile,
          liveSender || { uid: req.senderId, friends: req.senderFriends || [] }
        );

        return (
          <div key={req.id} className="tt-req-card">
            <div className="tt-req-top">
              <LiveAvatarImg
                uid={req.senderId}
                gender={gender}
                fallbackPhotoURL={photoURL}
                alt={displayName}
                className="tt-req-avatar"
              />
              <div className="tt-req-meta">
                <div className="tt-req-name-row">
                  <span className="tt-req-display">{displayName}</span>
                  {isVerified && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#3b82f6" aria-label="Verified">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
                      <path d="M8.5 12.2l2.2 2.2 4.8-4.8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {username && <div className="tt-req-username">@{username}</div>}
                {mutualCount > 0 && (
                  <div className="tt-req-mutual">
                    {mutualCount} mutual {mutualCount === 1 ? 'connection' : 'connections'}
                  </div>
                )}
              </div>
            </div>

            <div className="tt-req-preview">
              {req.lastMessagePreview || 'Sent you a message'}
            </div>

            <div className="tt-req-actions">
              <button
                type="button"
                className="tt-req-btn accept"
                onClick={() => onAccept(req)}
                title="Accept message request"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Accept</span>
              </button>
              <button
                type="button"
                className="tt-req-btn decline"
                onClick={() => onDecline(req)}
                title="Decline request"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Decline</span>
              </button>
              <button
                type="button"
                className="tt-req-btn block"
                onClick={() => onBlock(req, liveSender)}
                title="Block user"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
                </svg>
                <span>Block</span>
              </button>
              <button
                type="button"
                className="tt-req-btn report"
                onClick={() => onReport(req, liveSender)}
                title="Report user"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                <span>Report</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageRequestsPanel;
