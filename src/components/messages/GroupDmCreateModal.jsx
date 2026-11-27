// src/components/messages/GroupDmCreateModal.jsx
// Creates a private Group DM with member search, image avatar upload, and privacy/block enforcement.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, getDocs, limit, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import LiveAvatarImg from '../LiveAvatar';
import { compressImageToWebP, uploadMediaFile } from '../../services/r2StorageService';
import { areUsersFriends, canAddToGroupDm, isDiscoverableInSearch, isGuestProfile } from '../../services/privacyService';
import { pt } from '../../utils/premiumToast';
import './MessagingSuite.css';

const GroupDmCreateModal = ({
  isOpen,
  onClose,
  loggedInUserProfile,
  friendsProfiles = [],
  blockedUsers = [],
  usersWhoBlockedMe = [],
  onCreated,
}) => {
  const fileInputRef = useRef(null);
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUids, setSelectedUids] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [creating, setCreating] = useState(false);

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const loadDirectory = async () => {
      const map = new Map();
      (friendsProfiles || []).forEach((f) => {
        if (f?.uid && f.uid !== myUid && !isGuestProfile(f)) {
          map.set(f.uid, f);
        }
      });

      try {
        const snap = await getDocs(query(collection(db, 'publicProfiles'), limit(120)));
        snap.forEach((d) => {
          const data = { uid: d.id, ...d.data() };
          if (!data.uid || data.uid === myUid || isGuestProfile(data) || data.isBanned) return;
          if (!map.has(data.uid)) map.set(data.uid, data);
        });
      } catch (_) {}

      if (active) {
        setCandidates(Array.from(map.values()));
      }
    };
    loadDirectory();
    return () => { active = false; };
  }, [isOpen, myUid, friendsProfiles]);

  const filteredCandidates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return candidates
      .filter((u) => {
        const isFriend = areUsersFriends(loggedInUserProfile, u);
        if (!isFriend && !isDiscoverableInSearch(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe })) {
          return false;
        }
        const check = canAddToGroupDm(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe });
        if (!check.allowed && !isFriend) return false;
        if (!q) return true;
        return (
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aFriend = areUsersFriends(loggedInUserProfile, a) ? 0 : 1;
        const bFriend = areUsersFriends(loggedInUserProfile, b) ? 0 : 1;
        if (aFriend !== bFriend) return aFriend - bFriend;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
  }, [candidates, searchTerm, loggedInUserProfile, blockedUsers, usersWhoBlockedMe]);

  if (!isOpen) return null;

  const toggleUid = (userItem) => {
    const check = canAddToGroupDm(loggedInUserProfile, userItem, { blockedUsers, usersWhoBlockedMe });
    if (!check.allowed) {
      pt.warn(check.reason || 'This user cannot be added to Group DMs');
      return;
    }
    setSelectedUids((prev) =>
      prev.includes(userItem.uid)
        ? prev.filter((id) => id !== userItem.uid)
        : prev.length >= 49
          ? prev
          : [...prev, userItem.uid]
    );
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      pt.error('Please pick an image under 8MB.');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      pt.warn('Please enter a group name.');
      return;
    }
    if (!selectedUids.length) {
      pt.warn('Select at least 1 member to start a Group DM.');
      return;
    }
    if (!myUid) return;

    setCreating(true);
    try {
      let photoURL = null;
      let photoKey = null;
      if (avatarFile) {
        const compressed = await compressImageToWebP(avatarFile, { maxDim: 512, quality: 0.82 });
        const uploaded = await uploadMediaFile(compressed, 'group-dm-avatar', { roomId: `gdm_${myUid}` });
        photoURL = uploaded.url || null;
        photoKey = uploaded.key || null;
      }

      const memberUids = Array.from(new Set([myUid, ...selectedUids])).slice(0, 50);
      const memberRoles = {};
      memberUids.forEach((uid) => {
        memberRoles[uid] = uid === myUid ? 'owner' : 'member';
      });

      const docRef = await addDoc(collection(db, 'groupDms'), {
        name: trimmed.slice(0, 60),
        photoURL,
        photoKey,
        createdBy: myUid,
        ownerUid: myUid,
        memberUids,
        memberRoles,
        invitePolicy: 'admins_only',
        pinnedMessage: null,
        typing: {},
        unreadBy: {},
        lastMessage: 'Group created',
        lastMessageSenderName: loggedInUserProfile?.displayName || 'Owner',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const createdGroup = {
        id: docRef.id,
        name: trimmed.slice(0, 60),
        photoURL,
        photoKey,
        createdBy: myUid,
        ownerUid: myUid,
        memberUids,
        memberRoles,
        invitePolicy: 'admins_only',
      };

      setGroupName('');
      setSelectedUids([]);
      setAvatarFile(null);
      setAvatarPreview('');
      pt.success(`Group "${trimmed}" created.`);
      onCreated?.(createdGroup);
      onClose?.();
    } catch (err) {
      pt.error('Could not create Group DM. Please check member permissions.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="tt-modal-backdrop tt-gdm-create-backdrop" onClick={onClose}>
      <div className="tt-modal-card tt-gdm-create-card" onClick={(e) => e.stopPropagation()}>
        <div className="tt-modal-head">
          <div className="tt-modal-title">
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(236, 72, 153, 0.16))',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="gdmCreateTitleG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="55%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <circle cx="9.5" cy="8.5" r="3.4" fill="url(#gdmCreateTitleG)" />
                <path d="M2.5 19.5c0-3 3-5.2 7-5.2s7 2.2 7 5.2" fill="url(#gdmCreateTitleG)" />
                <circle cx="17.2" cy="9.2" r="2.6" fill="#06b6d4" />
                <path d="M16.5 14.5c2.7.3 5 2 5 4.8" stroke="#10b981" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
            </span>
            <span>New Private Group DM</span>
          </div>
          <button type="button" className="tt-modal-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="gdmCreateCloseG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <line x1="18" y1="6" x2="6" y2="18" stroke="url(#gdmCreateCloseG)" strokeWidth="2.6" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="url(#gdmCreateCloseG)" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="tt-modal-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  border: '1.5px solid rgba(139, 92, 246, 0.35)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(236, 72, 153, 0.12))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  flexShrink: 0,
                  padding: 0,
                }}
                title="Upload group image"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Group avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="gdmCreateCamG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <rect x="2.5" y="5.5" width="19" height="14" rx="3.5" fill="url(#gdmCreateCamG)" />
                    <path d="M8.5 5.5l1.3-2.2h4.4l1.3 2.2" fill="#8b5cf6" />
                    <circle cx="12" cy="12.5" r="3.4" fill="#ffffff" />
                    <circle cx="12" cy="12.5" r="1.7" fill="#6366f1" />
                  </svg>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

              <div style={{ flex: 1 }}>
                <label className="tt-modal-field-label">Group Name</label>
                <input
                  type="text"
                  className="tt-modal-input"
                  maxLength={60}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="tt-modal-field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Add Members</span>
                <span style={{ color: '#ec4899', fontWeight: 800 }}>{selectedUids.length} selected</span>
              </label>

              <div style={{ position: 'relative', marginBottom: 7 }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <defs>
                    <linearGradient id="gdmCreateSearchG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="11" cy="11" r="7" stroke="url(#gdmCreateSearchG)" strokeWidth="2.4" />
                  <path d="M16.5 16.5L21 21" stroke="#ec4899" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  className="tt-modal-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search friends or users..."
                  style={{ paddingLeft: 32 }}
                />
              </div>

              <div className="tt-user-picker-list">
                {filteredCandidates.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '16px 8px' }}>
                    No eligible users found.
                  </div>
                ) : (
                  filteredCandidates.map((u) => {
                    const isSelected = selectedUids.includes(u.uid);
                    const check = canAddToGroupDm(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe });
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        className={`tt-user-picker-row${isSelected ? ' selected' : ''}${!check.allowed ? ' disabled' : ''}`}
                        onClick={() => toggleUid(u)}
                      >
                        <LiveAvatarImg
                          uid={u.uid}
                          gender={u.gender}
                          fallbackPhotoURL={u.photoURL}
                          alt={u.displayName}
                          style={{ width: 31, height: 31, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.displayName || 'User'}
                          </div>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: check.allowed ? '#6366f1' : '#ef4444' }}>
                            {check.allowed ? (u.username ? `@${u.username}` : 'Eligible') : check.reason}
                          </div>
                        </div>
                        <span
                          style={{
                            width: 19,
                            height: 19,
                            borderRadius: 6,
                            border: isSelected ? 'none' : '1.5px solid rgba(139, 92, 246, 0.45)',
                            background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                          }}
                        >
                          {isSelected && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="tt-modal-foot">
            <button type="button" className="tt-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="tt-btn-primary" disabled={creating || !groupName.trim() || selectedUids.length === 0}>
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupDmCreateModal;
