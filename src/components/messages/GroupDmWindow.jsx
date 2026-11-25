// src/components/messages/GroupDmWindow.jsx
// Real-time Private Group DM Window with replies, @mentions, media/audio sharing, pinned messages, and Group Admin Controls.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { onDisconnect, onValue, ref, remove, set } from 'firebase/database';
import { auth, db, rtdb } from '../../firebase/config';
import LiveAvatarImg from '../LiveAvatar';
import CustomAudioPlayer from '../CustomAudioPlayer';
import PremiumImageMessage from '../PremiumImageMessage';
import { compressImageToWebP } from '../../utils/imageCompression';
import { uploadMediaFile } from '../../services/r2StorageService';
import {
  areUsersFriends,
  canAddToGroupDm,
  canSeeOnlineStatus,
  isDiscoverableInSearch,
  isGuestProfile,
  shouldShowTypingIndicator,
} from '../../services/privacyService';
import { pt } from '../../utils/premiumToast';
import './MessagingSuite.css';

const GroupDmWindow = ({
  group,
  isOpen,
  onClose,
  loggedInUserProfile,
  userProfilesMap,
  friendsProfiles = [],
  blockedUsers = [],
  usersWhoBlockedMe = [],
  onBlockUser,
  onReportUser,
}) => {
  const feedEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarEditRef = useRef(null);
  const typingTimerRef = useRef(null);

  const [liveGroup, setLiveGroup] = useState(group || null);
  const [messages, setMessages] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'manage'

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [sending, setSending] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Group Admin editing & adding state
  const [editName, setEditName] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [addDirectory, setAddDirectory] = useState([]);
  const [typingUids, setTypingUids] = useState([]);

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
  const groupId = group?.id || liveGroup?.id || '';

  // Subscribe to live group metadata
  useEffect(() => {
    if (!isOpen || !groupId) return;
    setViewMode('chat');
    const gRef = doc(db, 'groupDms', groupId);
    const unsub = onSnapshot(gRef, (snap) => {
      if (!snap.exists()) {
        onClose?.();
        return;
      }
      const data = { id: snap.id, ...snap.data() };
      setLiveGroup(data);
      setEditName(data.name || '');

      // Clear my unread counter when active
      if (myUid && (data.unreadBy?.[myUid] || 0) > 0) {
        updateDoc(gRef, { [`unreadBy.${myUid}`]: 0 }).catch(() => {});
      }
    }, () => {});
    return () => unsub();
  }, [isOpen, groupId, myUid, onClose]);

  // Subscribe to live group messages
  useEffect(() => {
    if (!isOpen || !groupId) return;
    let active = true;
    const msgQuery = query(
      collection(db, 'groupDms', groupId, 'messages'),
      orderBy('createdAt'),
      limitToLast(80)
    );
    const unsub = onSnapshot(msgQuery, (snap) => {
      if (!active) return;
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
      setTimeout(() => feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }, () => {
      // Fallback query without orderBy
      const fb = query(collection(db, 'groupDms', groupId, 'messages'), limit(80));
      onSnapshot(fb, (snap2) => {
        if (!active) return;
        const list = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setMessages(list);
      }, () => {});
    });
    return () => {
      active = false;
      unsub();
    };
  }, [isOpen, groupId]);

  // Load member public profiles for display, roles, mentions, and privacy checks
  useEffect(() => {
    const uids = liveGroup?.memberUids || [];
    if (!isOpen || !uids.length) return;
    let active = true;
    Promise.all(
      uids.map(async (uid) => {
        const cached = userProfilesMap?.get?.(uid) || window.userProfilesCache?.get?.(uid);
        if (cached) return { ...cached, uid };
        try {
          const snap = await getDoc(doc(db, 'publicProfiles', uid));
          if (snap.exists()) return { uid, ...snap.data() };
        } catch (_) {}
        return { uid, displayName: 'Member' };
      })
    ).then((profiles) => {
      if (!active) return;
      const map = {};
      profiles.forEach((p) => { if (p?.uid) map[p.uid] = p; });
      setMemberProfiles(map);
    });
    return () => { active = false; };
  }, [isOpen, liveGroup?.memberUids, userProfilesMap]);

  // Subscribe to ephemeral typing indicator in RTDB (if viewer allows typing indicators)
  useEffect(() => {
    if (!isOpen || !groupId || !myUid) return;
    const typingRef = ref(rtdb, `typing/group/${groupId}`);
    const unsub = onValue(typingRef, (snap) => {
      if (loggedInUserProfile?.settings?.typingIndicator === false) {
        setTypingUids([]);
        return;
      }
      const val = snap.val() || {};
      const now = Date.now();
      const activeTypers = Object.entries(val)
        .filter(([uid, entry]) => {
          if (!uid || uid === myUid || !entry) return false;
          if (now - (entry.at || 0) > 5500) return false;
          const profile = memberProfiles[uid];
          return shouldShowTypingIndicator(loggedInUserProfile, profile);
        })
        .map(([uid, entry]) => entry.name || memberProfiles[uid]?.displayName || 'Someone');
      setTypingUids(activeTypers);
    }, () => {});
    return () => unsub();
  }, [isOpen, groupId, myUid, loggedInUserProfile, memberProfiles]);

  // Load addable users directory when manage drawer opens
  useEffect(() => {
    if (!isOpen || viewMode !== 'manage') return;
    let active = true;
    const map = new Map();
    (friendsProfiles || []).forEach((f) => {
      if (f?.uid && !isGuestProfile(f)) map.set(f.uid, f);
    });
    getDocs(query(collection(db, 'publicProfiles'), limit(100)))
      .then((snap) => {
        snap.forEach((d) => {
          const p = { uid: d.id, ...d.data() };
          if (p.uid && !isGuestProfile(p) && !p.isBanned && !map.has(p.uid)) map.set(p.uid, p);
        });
        if (active) setAddDirectory(Array.from(map.values()));
      })
      .catch(() => {
        if (active) setAddDirectory(Array.from(map.values()));
      });
    return () => { active = false; };
  }, [isOpen, viewMode, friendsProfiles]);

  const myGroupRole = useMemo(() => {
    if (!liveGroup || !myUid) return 'member';
    if (liveGroup.ownerUid === myUid) return 'owner';
    return liveGroup.memberRoles?.[myUid] || 'member';
  }, [liveGroup, myUid]);

  const isGroupOwner = myGroupRole === 'owner';
  const isGroupAdmin = myGroupRole === 'owner' || myGroupRole === 'admin';
  const canInviteMembers = isGroupAdmin || liveGroup?.invitePolicy === 'all_members';

  const broadcastTyping = useCallback((typingNow) => {
    if (!groupId || !myUid) return;
    if (loggedInUserProfile?.settings?.typingIndicator === false) return;
    const myTypingRef = ref(rtdb, `typing/group/${groupId}/${myUid}`);
    if (!typingNow) {
      remove(myTypingRef).catch(() => {});
      return;
    }
    set(myTypingRef, {
      name: loggedInUserProfile?.displayName || auth.currentUser?.displayName || 'Member',
      at: Date.now(),
    }).catch(() => {});
    onDisconnect(myTypingRef).remove().catch(() => {});
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      remove(myTypingRef).catch(() => {});
    }, 3500);
  }, [groupId, myUid, loggedInUserProfile]);

  const memberListSorted = useMemo(() => {
    const uids = liveGroup?.memberUids || [];
    const rank = (r) => (r === 'owner' ? 0 : r === 'admin' ? 1 : 2);
    return uids
      .map((uid) => {
        const profile = memberProfiles[uid] || { uid, displayName: 'Member' };
        const role = liveGroup?.ownerUid === uid ? 'owner' : (liveGroup?.memberRoles?.[uid] || 'member');
        return { ...profile, uid, groupRole: role };
      })
      .sort((a, b) => rank(a.groupRole) - rank(b.groupRole));
  }, [liveGroup, memberProfiles]);

  const matchingMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return memberListSorted.filter(
      (m) => m.uid !== myUid && (m.displayName || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [mentionQuery, memberListSorted, myUid]);

  const addableCandidates = useMemo(() => {
    const existing = new Set(liveGroup?.memberUids || []);
    const q = addSearch.trim().toLowerCase();
    return addDirectory.filter((u) => {
      if (existing.has(u.uid)) return false;
      const isFriend = areUsersFriends(loggedInUserProfile, u);
      if (!isFriend && !isDiscoverableInSearch(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe })) {
        return false;
      }
      const check = canAddToGroupDm(loggedInUserProfile, u, { blockedUsers, usersWhoBlockedMe });
      if (!check.allowed && !isFriend) return false;
      if (!q) return true;
      return (u.displayName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    });
  }, [addDirectory, liveGroup?.memberUids, addSearch, loggedInUserProfile, blockedUsers, usersWhoBlockedMe]);

  if (!isOpen || !liveGroup) return null;

  const updateGroupMetaOnSend = async (previewLabel) => {
    const gRef = doc(db, 'groupDms', groupId);
    const unreadPatch = {};
    (liveGroup.memberUids || []).forEach((uid) => {
      if (uid !== myUid) {
        unreadPatch[`unreadBy.${uid}`] = (liveGroup.unreadBy?.[uid] || 0) + 1;
      }
    });
    await updateDoc(gRef, {
      lastMessage: previewLabel,
      lastMessageSenderName: loggedInUserProfile?.displayName || 'Member',
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...unreadPatch,
    });
  };

  const handleSendText = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending || !myUid) return;
    setSending(true);
    broadcastTyping(false);

    try {
      const mentions = memberListSorted
        .filter((m) => body.toLowerCase().includes(`@${(m.displayName || '').toLowerCase()}`))
        .map((m) => m.uid);

      await addDoc(collection(db, 'groupDms', groupId, 'messages'), {
        senderId: myUid,
        senderName: loggedInUserProfile?.displayName || auth.currentUser?.displayName || 'Member',
        senderPhoto: loggedInUserProfile?.photoURL || null,
        senderGender: loggedInUserProfile?.gender || 'male',
        senderRole: loggedInUserProfile?.role || 'user',
        senderBadge: loggedInUserProfile?.badge || null,
        text: body,
        replyTo: replyTo ? { id: replyTo.id, senderName: replyTo.senderName, text: (replyTo.text || 'Media').slice(0, 120) } : null,
        mentions,
        deletedFor: [],
        createdAt: serverTimestamp(),
      });

      await updateGroupMetaOnSend(body.slice(0, 80));
      setText('');
      setReplyTo(null);
      setMentionQuery(null);
    } catch (_) {
      pt.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !myUid) return;
    e.target.value = '';
    if (file.size > 15 * 1024 * 1024) {
      pt.error('File must be under 15MB.');
      return;
    }

    setSending(true);
    try {
      const isImg = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      let payload = {
        senderId: myUid,
        senderName: loggedInUserProfile?.displayName || 'Member',
        senderPhoto: loggedInUserProfile?.photoURL || null,
        senderGender: loggedInUserProfile?.gender || 'male',
        text: '',
        replyTo: replyTo ? { id: replyTo.id, senderName: replyTo.senderName, text: (replyTo.text || 'Media').slice(0, 120) } : null,
        mentions: [],
        deletedFor: [],
        createdAt: serverTimestamp(),
      };

      if (isImg) {
        const compressed = await compressImageToWebP(file, { maxDim: 1080, quality: 0.82 });
        const { key, url } = await uploadMediaFile(compressed, 'group-dm-image', { roomId: groupId });
        payload.imageUrl = url;
        payload.imageKey = key || null;
      } else if (isAudio) {
        const { key, url } = await uploadMediaFile(file, 'group-dm-audio', { roomId: groupId });
        payload.audioUrl = url;
        payload.audioKey = key || null;
        payload.audioFileName = file.name;
      } else {
        const { key, url } = await uploadMediaFile(file, 'group-dm-file', { roomId: groupId });
        payload.fileUrl = url;
        payload.fileKey = key || null;
        payload.fileName = file.name;
      }

      await addDoc(collection(db, 'groupDms', groupId, 'messages'), payload);
      await updateGroupMetaOnSend(isImg ? 'Shared an image' : isAudio ? 'Voice message' : `Shared ${file.name}`);
      setReplyTo(null);
    } catch (_) {
      pt.error('Attachment upload failed.');
    } finally {
      setSending(false);
    }
  };

  const toggleVoiceRecord = async () => {
    if (isRecording) {
      try { mediaRecorderRef.current?.stop(); } catch (_) {}
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 200) return;
        setSending(true);
        try {
          const { key, url } = await uploadMediaFile(blob, 'group-dm-voice', { roomId: groupId });
          await addDoc(collection(db, 'groupDms', groupId, 'messages'), {
            senderId: myUid,
            senderName: loggedInUserProfile?.displayName || 'Member',
            senderPhoto: loggedInUserProfile?.photoURL || null,
            senderGender: loggedInUserProfile?.gender || 'male',
            text: '',
            audioUrl: url,
            audioKey: key || null,
            audioFileName: `voice-${Date.now()}.webm`,
            replyTo: null,
            mentions: [],
            deletedFor: [],
            createdAt: serverTimestamp(),
          });
          await updateGroupMetaOnSend('Voice message');
        } catch (_) {
          pt.error('Voice upload failed.');
        } finally {
          setSending(false);
        }
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (_) {
      pt.error('Microphone permission is required for voice notes.');
    }
  };

  const handleDeleteMsg = async (msg) => {
    if (!msg?.id) return;
    if (!isGroupAdmin && msg.senderId !== myUid) return;
    try {
      await deleteDoc(doc(db, 'groupDms', groupId, 'messages', msg.id));
    } catch (_) {
      pt.error('Could not delete message.');
    }
  };

  const handlePinMsg = async (msg) => {
    if (!isGroupAdmin) return;
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        pinnedMessage: msg
          ? {
              id: msg.id,
              senderName: msg.senderName || 'Member',
              text: (msg.text || (msg.imageUrl ? 'Image' : msg.audioUrl ? 'Voice note' : msg.fileName || 'Attachment')).slice(0, 140),
              pinnedBy: myUid,
              pinnedAtMs: Date.now(),
            }
          : null,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {
      pt.error('Failed to update pin.');
    }
  };

  // Group Administration Actions
  const handleSaveGroupName = async () => {
    const trimmed = editName.trim();
    if (!isGroupAdmin || !trimmed) return;
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        name: trimmed.slice(0, 60),
        updatedAt: serverTimestamp(),
      });
      pt.success('Group name updated.');
    } catch (_) {
      pt.error('Could not update group name.');
    }
  };

  const handleChangeGroupPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isGroupAdmin) return;
    e.target.value = '';
    try {
      const compressed = await compressImageToWebP(file, { maxDim: 512, quality: 0.82 });
      const { key, url } = await uploadMediaFile(compressed, 'group-dm-avatar', { roomId: groupId });
      await updateDoc(doc(db, 'groupDms', groupId), {
        photoURL: url,
        photoKey: key || null,
        updatedAt: serverTimestamp(),
      });
      pt.success('Group photo updated.');
    } catch (_) {
      pt.error('Failed to update group photo.');
    }
  };

  const handleToggleInvitePolicy = async () => {
    if (!isGroupAdmin) return;
    const next = liveGroup.invitePolicy === 'all_members' ? 'admins_only' : 'all_members';
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        invitePolicy: next,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}
  };

  const handleAddMember = async (candidate) => {
    if (!canInviteMembers || !candidate?.uid) return;
    const check = canAddToGroupDm(loggedInUserProfile, candidate, { blockedUsers, usersWhoBlockedMe });
    if (!check.allowed) {
      pt.warn(check.reason || 'User privacy blocks adding to Group DMs.');
      return;
    }
    const existing = liveGroup.memberUids || [];
    if (existing.length >= 50) {
      pt.warn('Group DM limit is 50 members.');
      return;
    }
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        memberUids: Array.from(new Set([...existing, candidate.uid])),
        [`memberRoles.${candidate.uid}`]: 'member',
        updatedAt: serverTimestamp(),
      });
      pt.success(`Added ${candidate.displayName} to group.`);
    } catch (_) {
      pt.error('Could not add member.');
    }
  };

  const handleSetMemberRole = async (targetUid, nextRole) => {
    if (!isGroupOwner || targetUid === liveGroup.ownerUid) return;
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        [`memberRoles.${targetUid}`]: nextRole,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {
      pt.error('Failed to update role.');
    }
  };

  const handleRemoveMember = async (targetUid) => {
    if (!isGroupAdmin || targetUid === liveGroup.ownerUid) return;
    if (!isGroupOwner && liveGroup.memberRoles?.[targetUid] === 'admin') return;
    const nextUids = (liveGroup.memberUids || []).filter((id) => id !== targetUid);
    const nextRoles = { ...(liveGroup.memberRoles || {}) };
    delete nextRoles[targetUid];
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        memberUids: nextUids,
        memberRoles: nextRoles,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {
      pt.error('Could not remove member.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!myUid) return;
    const remaining = (liveGroup.memberUids || []).filter((id) => id !== myUid);
    try {
      if (remaining.length === 0) {
        await deleteDoc(doc(db, 'groupDms', groupId));
      } else {
        const nextRoles = { ...(liveGroup.memberRoles || {}) };
        delete nextRoles[myUid];
        let nextOwner = liveGroup.ownerUid;
        if (nextOwner === myUid) {
          const nextAdmin = remaining.find((id) => nextRoles[id] === 'admin') || remaining[0];
          nextOwner = nextAdmin;
          nextRoles[nextOwner] = 'owner';
        }
        await updateDoc(doc(db, 'groupDms', groupId), {
          memberUids: remaining,
          memberRoles: nextRoles,
          ownerUid: nextOwner,
          updatedAt: serverTimestamp(),
        });
      }
      pt.info('You left the Group DM.');
      onClose?.();
    } catch (_) {
      pt.error('Failed to leave group.');
    }
  };

  const renderMessageTextWithMentions = (raw) => {
    if (!raw) return null;
    const parts = String(raw).split(/(@[A-Za-z0-9_.\-\s]{1,28})/g);
    return parts.map((p, idx) =>
      p.startsWith('@') ? (
        <span key={idx} style={{ fontWeight: 800, textDecoration: 'underline', opacity: 0.96 }}>
          {p}
        </span>
      ) : (
        <React.Fragment key={idx}>{p}</React.Fragment>
      )
    );
  };

  return (
    <div className="tt-gdm-window" role="dialog" aria-label={liveGroup.name}>
      {/* Header */}
      <div className="tt-gdm-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {liveGroup.photoURL ? (
              <img src={liveGroup.photoURL} alt={liveGroup.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {liveGroup.name}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.85 }}>
              {(liveGroup.memberUids || []).length} members
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button
            type="button"
            className="tt-modal-close"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => setViewMode((m) => (m === 'chat' ? 'manage' : 'chat'))}
            title={viewMode === 'chat' ? 'Group Members & Settings' : 'Back to Chat'}
          >
            {viewMode === 'chat' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.66 0-1.25.4-1.51 1z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="tt-modal-close"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => { broadcastTyping(false); onClose?.(); }}
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {viewMode === 'chat' && liveGroup.pinnedMessage && (
        <div className="tt-gdm-pinned">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#7c3aed" style={{ flexShrink: 0 }}>
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong>{liveGroup.pinnedMessage.senderName}:</strong> {liveGroup.pinnedMessage.text}
            </span>
          </div>
          {isGroupAdmin && (
            <button
              type="button"
              onClick={() => handlePinMsg(null)}
              style={{ border: 'none', background: 'none', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {viewMode === 'manage' ? (
        <div className="tt-gdm-drawer">
          {isGroupAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 12, border: '1px solid rgba(139,92,246,0.18)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#7c3aed' }}>
                Group Administration
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  className="tt-modal-input"
                  style={{ height: 34 }}
                  maxLength={60}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <button type="button" className="tt-btn-primary" style={{ height: 34 }} onClick={handleSaveGroupName}>
                  Save
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="tt-btn-secondary" style={{ height: 32, fontSize: 11.5 }} onClick={() => avatarEditRef.current?.click()}>
                  Change Group Photo
                </button>
                <input ref={avatarEditRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChangeGroupPhoto} />
                <button type="button" className="tt-btn-secondary" style={{ height: 32, fontSize: 11.5 }} onClick={handleToggleInvitePolicy}>
                  Invites: {liveGroup.invitePolicy === 'all_members' ? 'All Members' : 'Admins Only'}
                </button>
              </div>
            </div>
          )}

          {canInviteMembers && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="tt-modal-field-label" style={{ marginBottom: 0 }}>Add Members</div>
              <input
                type="search"
                className="tt-modal-input"
                style={{ height: 34 }}
                placeholder="Search eligible users..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
              />
              {addSearch.trim() && (
                <div className="tt-user-picker-list" style={{ maxHeight: 140 }}>
                  {addableCandidates.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: '#94a3b8', padding: 8, textAlign: 'center' }}>No eligible matches</div>
                  ) : (
                    addableCandidates.slice(0, 12).map((c) => {
                      const check = canAddToGroupDm(loggedInUserProfile, c, { blockedUsers, usersWhoBlockedMe });
                      return (
                        <div key={c.uid} className="tt-user-picker-row" style={{ cursor: 'default' }}>
                          <LiveAvatarImg uid={c.uid} gender={c.gender} fallbackPhotoURL={c.photoURL} style={{ width: 26, height: 26, borderRadius: '50%' }} />
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{c.displayName}</span>
                          <button
                            type="button"
                            className="tt-btn-primary"
                            style={{ height: 26, padding: '0 9px', fontSize: 11 }}
                            disabled={!check.allowed}
                            onClick={() => handleAddMember(c)}
                          >
                            {check.allowed ? 'Add' : 'Restricted'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="tt-modal-field-label">Members ({memberListSorted.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {memberListSorted.map((m) => {
                const statusEntry = window.userOnlineStatuses?.[m.uid];
                const onlineVisible = (window.onlineUsers?.has?.(m.uid) || statusEntry?.state === 'online')
                  && canSeeOnlineStatus(loggedInUserProfile, m, statusEntry, { blockedUsers, usersWhoBlockedMe });
                const isSelf = m.uid === myUid;
                return (
                  <div key={m.uid} className="tt-user-picker-row" style={{ cursor: 'default', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <div style={{ position: 'relative' }}>
                        <LiveAvatarImg uid={m.uid} gender={m.gender} fallbackPhotoURL={m.photoURL} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: onlineVisible ? '#22c55e' : '#94a3b8',
                            border: '1.5px solid #fff',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.displayName || 'Member'}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: m.groupRole === 'owner' ? '#d97706' : m.groupRole === 'admin' ? '#7c3aed' : '#6b7280' }}>
                          {m.groupRole}
                        </div>
                      </div>
                    </div>

                    {!isSelf && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isGroupOwner && m.groupRole !== 'owner' && (
                          <button
                            type="button"
                            className="tt-btn-secondary"
                            style={{ height: 26, padding: '0 7px', fontSize: 10.5 }}
                            onClick={() => handleSetMemberRole(m.uid, m.groupRole === 'admin' ? 'member' : 'admin')}
                          >
                            {m.groupRole === 'admin' ? 'Demote' : 'Make Admin'}
                          </button>
                        )}
                        {isGroupAdmin && m.groupRole !== 'owner' && (isGroupOwner || m.groupRole !== 'admin') && (
                          <button
                            type="button"
                            className="tt-req-btn block"
                            style={{ height: 26, padding: '0 7px', fontSize: 10.5 }}
                            onClick={() => handleRemoveMember(m.uid)}
                          >
                            Remove
                          </button>
                        )}
                        <button
                          type="button"
                          className="tt-req-btn report"
                          style={{ height: 26, padding: '0 6px', fontSize: 10.5 }}
                          onClick={() => onReportUser?.({ uid: m.uid, displayName: m.displayName, id: groupId })}
                          title="Report user"
                        >
                          Report
                        </button>
                        <button
                          type="button"
                          className="tt-req-btn decline"
                          style={{ height: 26, padding: '0 6px', fontSize: 10.5 }}
                          onClick={() => onBlockUser?.(m)}
                          title="Block user"
                        >
                          Block
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="tt-req-btn block"
            style={{ height: 36, marginTop: 4 }}
            onClick={handleLeaveGroup}
          >
            Leave Group DM
          </button>
        </div>
      ) : (
        <>
          {/* Messages Feed */}
          <div className="tt-gdm-feed">
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: 12.5 }}>
                No messages yet. Say hello to the group!
              </div>
            ) : (
              messages
                .filter((m) => !m.deletedFor?.includes(myUid) && !blockedUsers.includes(m.senderId) && !usersWhoBlockedMe.includes(m.senderId))
                .map((m) => {
                  const isOwn = m.senderId === myUid;
                  return (
                    <div key={m.id} className={`tt-gdm-msg${isOwn ? ' own' : ''}`}>
                      {!isOwn && (
                        <LiveAvatarImg
                          uid={m.senderId}
                          gender={m.senderGender}
                          fallbackPhotoURL={m.senderPhoto}
                          style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                      <div className="tt-gdm-bubble">
                        {!isOwn && (
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#7c3aed', marginBottom: 2 }}>
                            {memberProfiles[m.senderId]?.displayName || m.senderName || 'Member'}
                          </div>
                        )}
                        {m.replyTo && (
                          <div style={{ fontSize: 10.5, padding: '4px 7px', borderLeft: '2.5px solid #a78bfa', background: 'rgba(0,0,0,0.08)', borderRadius: 6, marginBottom: 5 }}>
                            <strong>{m.replyTo.senderName}:</strong> {m.replyTo.text}
                          </div>
                        )}
                        {m.imageUrl && <PremiumImageMessage src={m.imageUrl} alt="Group attachment" />}
                        {m.audioUrl && <CustomAudioPlayer src={m.audioUrl} />}
                        {m.fileUrl && (
                          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}>
                            {m.fileName || 'Download File'}
                          </a>
                        )}
                        {m.text && <div>{renderMessageTextWithMentions(m.text)}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10, opacity: 0.72 }}>
                          <button type="button" onClick={() => setReplyTo(m)} style={{ border: 'none', background: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                            Reply
                          </button>
                          {isGroupAdmin && (
                            <button type="button" onClick={() => handlePinMsg(m)} style={{ border: 'none', background: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                              Pin
                            </button>
                          )}
                          {(isOwn || isGroupAdmin) && (
                            <button type="button" onClick={() => handleDeleteMsg(m)} style={{ border: 'none', background: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Typing Bar */}
          {typingUids.length > 0 && (
            <div style={{ padding: '2px 12px 4px', fontSize: 11, fontWeight: 600, color: '#8b5cf6' }}>
              {typingUids.slice(0, 2).join(', ')} {typingUids.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Composer */}
          <form className="tt-gdm-composer" onSubmit={handleSendText}>
            {mentionQuery !== null && matchingMentions.length > 0 && (
              <div style={{ position: 'absolute', bottom: '100%', left: 10, right: 10, background: '#1e1b38', color: '#fff', borderRadius: 10, padding: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 20 }}>
                {matchingMentions.map((m) => (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => {
                      const updated = text.replace(/@([^\s@]*)$/, `@${m.displayName} `);
                      setText(updated);
                      setMentionQuery(null);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                  >
                    @{m.displayName}
                  </button>
                ))}
              </div>
            )}

            {replyTo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 8, background: 'rgba(139, 92, 246, 0.12)', fontSize: 11 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Replying to <strong>{replyTo.senderName}</strong>
                </span>
                <button type="button" onClick={() => setReplyTo(null)} style={{ border: 'none', background: 'none', color: 'inherit', fontWeight: 800, cursor: 'pointer' }}>
                  ×
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="tt-modal-close"
                style={{ flexShrink: 0 }}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image or file"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.txt,.doc,.docx" style={{ display: 'none' }} onChange={handleFileUpload} />

              <button
                type="button"
                className="tt-modal-close"
                style={{ flexShrink: 0, color: isRecording ? '#ef4444' : 'inherit', borderColor: isRecording ? '#ef4444' : undefined }}
                onClick={toggleVoiceRecord}
                title={isRecording ? 'Stop & send voice note' : 'Record voice note'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </svg>
              </button>

              <input
                type="text"
                className="tt-modal-input"
                style={{ height: 34, flex: 1 }}
                value={text}
                onChange={(e) => {
                  const val = e.target.value;
                  setText(val);
                  broadcastTyping(Boolean(val.trim()));
                  const m = val.match(/@([^\s@]*)$/);
                  setMentionQuery(m ? m[1] : null);
                }}
                placeholder="Message group... (@ to mention)"
              />

              <button type="submit" className="tt-btn-primary" style={{ height: 34, padding: '0 12px' }} disabled={sending || !text.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default GroupDmWindow;
