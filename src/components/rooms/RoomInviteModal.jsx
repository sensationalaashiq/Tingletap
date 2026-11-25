// src/components/rooms/RoomInviteModal.jsx
// Lets registered users invite friends/eligible users into the current room, strictly honoring whoCanInviteRooms & blocks.

import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, limit, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import LiveAvatarImg from '../LiveAvatar';
import { areUsersFriends, canInviteToRoom, isDiscoverableInSearch, isGuestProfile } from '../../services/privacyService';
import { nameToSlug } from '../../utils/roomSlug';
import { pt } from '../../utils/premiumToast';
import '../messages/MessagingSuite.css';

const RoomInviteModal = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  loggedInUserProfile,
  friendsProfiles = [],
  blockedUsers = [],
  usersWhoBlockedMe = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [sendingUid, setSendingUid] = useState(null);
  const [sentUids, setSentUids] = useState([]);

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';

  useEffect(() => {
    if (!isOpen) return;
    setSentUids([]);
    let active = true;
    const load = async () => {
      const map = new Map();
      (friendsProfiles || []).forEach((f) => {
        if (f?.uid && f.uid !== myUid && !isGuestProfile(f)) map.set(f.uid, f);
      });
      try {
        const snap = await getDocs(query(collection(db, 'publicProfiles'), limit(120)));
        snap.forEach((d) => {
          const data = { uid: d.id, ...d.data() };
          if (data.uid && data.uid !== myUid && !isGuestProfile(data) && !data.isBanned && !map.has(data.uid)) {
            map.set(data.uid, data);
          }
        });
      } catch (_) {}
      if (active) setCandidates(Array.from(map.values()));
    };
    load();
    return () => { active = false; };
  }, [isOpen, myUid, friendsProfiles]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return candidates
      .filter((u) => {
        const isFriend = areUsersFriends(loggedInUserProfile, u);
        if (!isFriend && !isDiscoverableInSearch(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe })) {
          return false;
        }
        const check = canInviteToRoom(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe });
        if (!check.allowed && !isFriend) return false;
        if (!q) return true;
        return (u.displayName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (areUsersFriends(loggedInUserProfile, a) ? 0 : 1) - (areUsersFriends(loggedInUserProfile, b) ? 0 : 1));
  }, [candidates, searchTerm, loggedInUserProfile, blockedUsers, usersWhoBlockedMe]);

  if (!isOpen) return null;

  const handleInvite = async (target) => {
    if (!myUid || !roomId || sendingUid) return;
    const check = canInviteToRoom(loggedInUserProfile, target, { blockedUsers, usersWhoBlockedMe });
    if (!check.allowed) {
      pt.warn(check.reason || 'This user is not accepting room invitations.');
      return;
    }
    setSendingUid(target.uid);
    try {
      await addDoc(collection(db, 'roomInvites'), {
        roomId,
        roomName: roomName || 'Chat Room',
        roomSlug: nameToSlug(roomName || roomId),
        senderId: myUid,
        senderName: loggedInUserProfile?.displayName || auth.currentUser?.displayName || 'User',
        senderPhoto: loggedInUserProfile?.photoURL || null,
        receiverId: target.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSentUids((prev) => [...prev, target.uid]);
      pt.success(`Invited ${target.displayName} to ${roomName || 'room'}.`);
    } catch (_) {
      pt.error('Could not send room invite due to user privacy settings.');
    } finally {
      setSendingUid(null);
    }
  };

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="tt-modal-head">
          <div className="tt-modal-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Invite to {roomName || 'Room'}</span>
          </div>
          <button type="button" className="tt-modal-close" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tt-modal-body">
          <input
            type="search"
            className="tt-modal-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search friends or users to invite..."
          />

          <div className="tt-user-picker-list">
            {filtered.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '18px 8px' }}>
                No eligible users available to invite.
              </div>
            ) : (
              filtered.map((u) => {
                const check = canInviteToRoom(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe });
                const alreadySent = sentUids.includes(u.uid);
                return (
                  <div key={u.uid} className={`tt-user-picker-row${!check.allowed ? ' disabled' : ''}`} style={{ cursor: 'default' }}>
                    <LiveAvatarImg
                      uid={u.uid}
                      gender={u.gender}
                      fallbackPhotoURL={u.photoURL}
                      alt={u.displayName}
                      style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.displayName || 'User'}
                      </div>
                      <div style={{ fontSize: 10.5, color: check.allowed ? '#6b7280' : '#ef4444' }}>
                        {check.allowed ? (u.username ? `@${u.username}` : 'Available') : check.reason}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tt-btn-primary"
                      style={{ height: 30, padding: '0 11px', fontSize: 11.5 }}
                      disabled={!check.allowed || alreadySent || sendingUid === u.uid}
                      onClick={() => handleInvite(u)}
                    >
                      {alreadySent ? 'Sent' : sendingUid === u.uid ? '...' : 'Invite'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomInviteModal;
