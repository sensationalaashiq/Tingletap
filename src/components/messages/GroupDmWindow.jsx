// src/components/messages/GroupDmWindow.jsx
// Real-time Draggable Private Group DM Window with Minimize, Pin/Unpin, Reply/Reply All,
// @mentions, R2 image/file & inline audio recording/upload matching LuxuryPrivateMessageWindow.

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
import useDraggable from '../../hooks/useDraggable';
import LiveAvatarImg from '../LiveAvatar';
import CustomAudioPlayer from '../CustomAudioPlayer';
import PremiumImageMessage from '../PremiumImageMessage';
import { compressImageToWebP, uploadMediaFile } from '../../services/r2StorageService';
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
  onMinimize,
  loggedInUserProfile,
  userProfilesMap,
  friendsProfiles = [],
  blockedUsers = [],
  usersWhoBlockedMe = [],
  onBlockUser,
  onReportUser,
}) => {
  const feedEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const avatarEditRef = useRef(null);
  const typingTimerRef = useRef(null);
  const attachWrapRef = useRef(null);
  const audioPopupRef = useRef(null);

  const [liveGroup, setLiveGroup] = useState(group || null);
  const [messages, setMessages] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'manage'

  const [text, setText] = useState('');
  const [replyState, setReplyState] = useState(null); // { message, mode: 'single' | 'all' }
  const [mentionQuery, setMentionQuery] = useState(null);
  const [sending, setSending] = useState(false);

  // Attachment dropdown & inline mini audio popup (mirrors LuxuryPrivateMessageWindow)
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isInlineAudioOpen, setIsInlineAudioOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Group Admin editing & adding state
  const [editName, setEditName] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [addDirectory, setAddDirectory] = useState([]);
  const [typingUids, setTypingUids] = useState([]);

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
  const groupId = group?.id || liveGroup?.id || '';

  const getInitialWindowPos = () => {
    if (typeof window === 'undefined') return { x: 20, y: 80 };
    const winW = Math.min(338, window.innerWidth - 16);
    const winH = Math.min(404, window.innerHeight - 24);
    if (window.innerWidth <= 768) {
      return {
        x: Math.max(8, Math.round((window.innerWidth - winW) / 2)),
        y: Math.max(64, Math.round(window.innerHeight - winH - 22)),
      };
    }
    return {
      x: Math.max(20, window.innerWidth - winW - 360),
      y: Math.max(60, window.innerHeight - winH - 22),
    };
  };

  const {
    ref: dragRef,
    onMouseDown,
    onTouchStart,
    style: dragStyle,
    setPosition,
  } = useDraggable({
    initialPosition: getInitialWindowPos(),
    handle: '.tt-gdm-drag-handle',
    bounds: {
      top: 10,
      left: 10,
      right: typeof window !== 'undefined' ? window.innerWidth - 10 : 1190,
      bottom: typeof window !== 'undefined' ? window.innerHeight - 10 : 790,
    },
  });

  // Restore draft text and reposition cleanly when opened
  useEffect(() => {
    if (!isOpen || !group?.id) return;
    setLiveGroup(group);
    setText(group._restoredDraft || '');
    setReplyState(null);
    setIsAttachOpen(false);
    setIsInlineAudioOpen(false);
    setPosition(getInitialWindowPos());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, group?.id]);

  // Recording elapsed timer
  useEffect(() => {
    if (!isRecording) {
      clearInterval(recordingTimerRef.current);
      return undefined;
    }
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  // Close attachment / audio popups on outside click
  useEffect(() => {
    if (!isAttachOpen && !isInlineAudioOpen) return undefined;
    const onOutside = (e) => {
      if (isAttachOpen && attachWrapRef.current && !attachWrapRef.current.contains(e.target)) {
        setIsAttachOpen(false);
      }
      if (isInlineAudioOpen && audioPopupRef.current && !audioPopupRef.current.contains(e.target)) {
        setIsInlineAudioOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [isAttachOpen, isInlineAudioOpen]);

  // Subscribe to live group metadata
  useEffect(() => {
    if (!isOpen || !groupId) return undefined;
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

      if (myUid && (data.unreadBy?.[myUid] || 0) > 0) {
        updateDoc(gRef, { [`unreadBy.${myUid}`]: 0 }).catch(() => {});
      }
    }, () => {});
    return () => unsub();
  }, [isOpen, groupId, myUid, onClose]);

  // Subscribe to live group messages
  useEffect(() => {
    if (!isOpen || !groupId) return undefined;
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

  // Load member public profiles
  useEffect(() => {
    const uids = liveGroup?.memberUids || [];
    if (!isOpen || !uids.length) return undefined;
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

  // Subscribe to ephemeral typing indicator in RTDB
  useEffect(() => {
    if (!isOpen || !groupId || !myUid) return undefined;
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
    if (!isOpen || viewMode !== 'manage') return undefined;
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buildReplyPayload = () => {
    if (!replyState?.message) return null;
    const msg = replyState.message;
    return {
      id: msg.id,
      mode: replyState.mode || 'single',
      senderName: msg.senderName || 'Member',
      text: (msg.text || (msg.imageUrl ? 'Photo' : msg.audioUrl ? 'Voice note' : msg.fileName || 'Media')).slice(0, 120),
    };
  };

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
      const explicitMentions = memberListSorted
        .filter((m) => body.toLowerCase().includes(`@${(m.displayName || '').toLowerCase()}`))
        .map((m) => m.uid);
      const replyAllUids = replyState?.mode === 'all'
        ? memberListSorted.filter((m) => m.uid !== myUid).map((m) => m.uid)
        : [];
      const mentions = Array.from(new Set([...explicitMentions, ...replyAllUids]));

      await addDoc(collection(db, 'groupDms', groupId, 'messages'), {
        senderId: myUid,
        senderName: loggedInUserProfile?.displayName || auth.currentUser?.displayName || 'Member',
        senderPhoto: loggedInUserProfile?.photoURL || null,
        senderGender: loggedInUserProfile?.gender || 'male',
        senderRole: loggedInUserProfile?.role || 'user',
        senderBadge: loggedInUserProfile?.badge || null,
        text: body,
        replyTo: buildReplyPayload(),
        mentions,
        deletedFor: [],
        createdAt: serverTimestamp(),
      });

      await updateGroupMetaOnSend(body.slice(0, 80));
      setText('');
      setReplyState(null);
      setMentionQuery(null);
    } catch (_) {
      pt.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !myUid) return;
    e.target.value = '';
    if (file.size > 15 * 1024 * 1024) {
      pt.error('Image must be under 15MB.');
      return;
    }

    setSending(true);
    try {
      const isImg = file.type.startsWith('image/');
      const replyAllUids = replyState?.mode === 'all'
        ? memberListSorted.filter((m) => m.uid !== myUid).map((m) => m.uid)
        : [];
      const payload = {
        senderId: myUid,
        senderName: loggedInUserProfile?.displayName || 'Member',
        senderPhoto: loggedInUserProfile?.photoURL || null,
        senderGender: loggedInUserProfile?.gender || 'male',
        text: '',
        replyTo: buildReplyPayload(),
        mentions: replyAllUids,
        deletedFor: [],
        createdAt: serverTimestamp(),
      };

      if (isImg) {
        const compressed = await compressImageToWebP(file, { maxDim: 1080, quality: 0.82 });
        const { key, url } = await uploadMediaFile(compressed, 'group-dm-image', { roomId: groupId });
        payload.imageUrl = url;
        payload.imageKey = key || null;
      } else {
        const { key, url } = await uploadMediaFile(file, 'group-dm-file', { roomId: groupId });
        payload.fileUrl = url;
        payload.fileKey = key || null;
        payload.fileName = file.name;
      }

      await addDoc(collection(db, 'groupDms', groupId, 'messages'), payload);
      await updateGroupMetaOnSend(isImg ? 'Shared an image' : `Shared ${file.name}`);
      setReplyState(null);
    } catch (_) {
      pt.error('Attachment upload failed.');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size >= 200) {
          setRecordedBlob(blob);
          setAudioPreviewUrl(URL.createObjectURL(blob));
        }
      };
      mediaRecorderRef.current = rec;
      setRecordingTime(0);
      rec.start();
      setIsRecording(true);
    } catch (_) {
      pt.error('Microphone permission is required for voice notes.');
    }
  };

  const stopRecording = () => {
    try { mediaRecorderRef.current?.stop(); } catch (_) {}
    setIsRecording(false);
  };

  const handleAudioFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('audio/') || file.size > 15 * 1024 * 1024) {
      pt.error('Please choose an audio file under 15MB.');
      return;
    }
    setSelectedAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
  };

  const clearInlineAudio = () => {
    setSelectedAudioFile(null);
    setRecordedBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
  };

  const handleInlineAudioSend = async () => {
    const source = recordedBlob || selectedAudioFile;
    if (!source || !myUid || sending) return;
    setSending(true);
    try {
      const kind = recordedBlob ? 'group-dm-voice' : 'group-dm-audio';
      const { key, url } = await uploadMediaFile(source, kind, { roomId: groupId });
      await addDoc(collection(db, 'groupDms', groupId, 'messages'), {
        senderId: myUid,
        senderName: loggedInUserProfile?.displayName || 'Member',
        senderPhoto: loggedInUserProfile?.photoURL || null,
        senderGender: loggedInUserProfile?.gender || 'male',
        text: '',
        audioUrl: url,
        audioKey: key || null,
        audioFileName: selectedAudioFile?.name || `voice-${Date.now()}.webm`,
        replyTo: buildReplyPayload(),
        mentions: replyState?.mode === 'all' ? memberListSorted.filter((m) => m.uid !== myUid).map((m) => m.uid) : [],
        deletedFor: [],
        createdAt: serverTimestamp(),
      });
      await updateGroupMetaOnSend('Voice message');
      clearInlineAudio();
      setIsInlineAudioOpen(false);
      setReplyState(null);
    } catch (_) {
      pt.error('Audio upload failed.');
    } finally {
      setSending(false);
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
    if (!myUid) return;
    const isAlreadyPinned = Boolean(msg && liveGroup?.pinnedMessage?.id === msg.id);
    const nextPinned = (!msg || isAlreadyPinned)
      ? null
      : {
          id: msg.id,
          senderName: msg.senderName || 'Member',
          text: (msg.text || (msg.imageUrl ? 'Photo' : msg.audioUrl ? 'Voice note' : msg.fileName || 'Attachment')).slice(0, 140),
          pinnedBy: myUid,
          pinnedAtMs: Date.now(),
        };
    try {
      await updateDoc(doc(db, 'groupDms', groupId), {
        pinnedMessage: nextPinned,
        updatedAt: serverTimestamp(),
      });
      pt.success(nextPinned ? 'Message pinned to group.' : 'Pinned message cleared.');
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

  const handleMinimizeClick = () => {
    broadcastTyping(false);
    if (onMinimize) {
      onMinimize(liveGroup, text);
    } else {
      onClose?.();
    }
  };

  return (
    <div
      ref={dragRef}
      className="tt-gdm-window"
      role="dialog"
      aria-label={liveGroup.name}
      style={dragStyle}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Draggable Header */}
      <div className="tt-gdm-header tt-gdm-drag-handle">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'rgba(255,255,255,0.22)',
              border: '1.5px solid rgba(255,255,255,0.45)',
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="9.5" cy="8.5" r="3.2" fill="#ffffff" />
                <path d="M3 19c0-2.9 2.9-5 6.5-5s6.5 2.1 6.5 5" fill="#ffffff" />
                <circle cx="17" cy="9.5" r="2.4" fill="#fde047" />
                <path d="M16.5 14.5c2.5.4 4.5 2 4.5 4.5" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {liveGroup.name}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.9 }}>
              {(liveGroup.memberUids || []).length} members
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button
            type="button"
            className="tt-gdm-hdr-btn"
            onClick={() => setViewMode((m) => (m === 'chat' ? 'manage' : 'chat'))}
            title={viewMode === 'chat' ? 'Group Members & Settings' : 'Back to Chat'}
          >
            {viewMode === 'chat' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="gdmGearG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="3.1" fill="url(#gdmGearG)" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.66 0-1.25.4-1.51 1z" stroke="url(#gdmGearG)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="gdmChatBackG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <path d="M21 14a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="url(#gdmChatBackG)" />
                <path d="M8 8.5h8M8 12h5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="tt-gdm-hdr-btn"
            onClick={handleMinimizeClick}
            title="Minimize"
            aria-label="Minimize Group DM"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="gdmMinG" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <line x1="5" y1="13" x2="19" y2="13" stroke="url(#gdmMinG)" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            className="tt-gdm-hdr-btn"
            onClick={() => { broadcastTyping(false); onClose?.(); }}
            title="Close"
            aria-label="Close Group DM"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="gdmCloseG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <line x1="18" y1="6" x2="6" y2="18" stroke="url(#gdmCloseG)" strokeWidth="2.7" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="url(#gdmCloseG)" strokeWidth="2.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {viewMode === 'chat' && liveGroup.pinnedMessage && (
        <div className="tt-gdm-pinned">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="gdmPinBarG" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" fill="url(#gdmPinBarG)" />
            </svg>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong>{liveGroup.pinnedMessage.senderName}:</strong> {liveGroup.pinnedMessage.text}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handlePinMsg(null)}
            style={{ border: 'none', background: 'rgba(236, 72, 153, 0.14)', borderRadius: 6, padding: '2px 7px', color: '#db2777', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}
          >
            Unpin
          </button>
        </div>
      )}

      {viewMode === 'manage' ? (
        <div className="tt-gdm-drawer">
          {isGroupAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 12, border: '1px solid rgba(139,92,246,0.2)' }}>
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
                    <div style={{ fontSize: 11.5, color: '#64748b', padding: 8, textAlign: 'center' }}>No eligible matches</div>
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
                        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: m.groupRole === 'owner' ? '#d97706' : m.groupRole === 'admin' ? '#7c3aed' : '#6366f1' }}>
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
              <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
                No messages yet. Say hello to the group!
              </div>
            ) : (
              messages
                .filter((m) => !m.deletedFor?.includes(myUid) && !blockedUsers.includes(m.senderId) && !usersWhoBlockedMe.includes(m.senderId))
                .map((m) => {
                  const isOwn = m.senderId === myUid;
                  const isPinned = liveGroup?.pinnedMessage?.id === m.id;
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
                          <div style={{ fontSize: 10.5, padding: '4px 7px', borderLeft: '2.5px solid #ec4899', background: isOwn ? 'rgba(255,255,255,0.16)' : 'rgba(139,92,246,0.1)', borderRadius: 6, marginBottom: 5 }}>
                            {m.replyTo.mode === 'all' && (
                              <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#ec4899', color: '#fff', marginRight: 5 }}>
                                REPLY ALL
                              </span>
                            )}
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

                        <div className="tt-gdm-msg-actions">
                          <button
                            type="button"
                            className="tt-gdm-action-chip"
                            onClick={() => setReplyState({ message: m, mode: 'single' })}
                            title="Reply to sender"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M9 14L4 9l5-5" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5V20" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
                            </svg>
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            className="tt-gdm-action-chip"
                            onClick={() => setReplyState({ message: m, mode: 'all' })}
                            title="Reply to everyone in this group"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M7 14L2 9l5-5M12 14L7 9l5-5" stroke="#ec4899" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M7 9h8a6 6 0 0 1 6 6v5" stroke="#8b5cf6" strokeWidth="2.3" strokeLinecap="round" />
                            </svg>
                            <span>Reply All</span>
                          </button>

                          <button
                            type="button"
                            className="tt-gdm-action-chip"
                            onClick={() => handlePinMsg(m)}
                            title={isPinned ? 'Unpin message' : 'Pin message'}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" fill={isPinned ? '#ec4899' : '#f59e0b'} />
                            </svg>
                            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                          </button>

                          {(isOwn || isGroupAdmin) && (
                            <button
                              type="button"
                              className="tt-gdm-action-chip"
                              onClick={() => handleDeleteMsg(m)}
                              title="Delete message"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span>Delete</span>
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

            {replyState?.message && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 8, background: 'rgba(139, 92, 246, 0.14)', fontSize: 11 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {replyState.mode === 'all' ? 'Replying to All · ' : 'Replying to '}
                  <strong>{replyState.message.senderName}</strong>
                </span>
                <button type="button" onClick={() => setReplyState(null)} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>
                  ×
                </button>
              </div>
            )}

            {/* Inline Mini Audio Popup (mirrors LuxuryPrivateMessageWindow) */}
            {isInlineAudioOpen && (
              <div
                ref={audioPopupRef}
                className="ultra-mini-audio-popup"
                style={{
                  position: 'absolute',
                  bottom: '115%',
                  left: 10,
                  width: 175,
                  minHeight: 72,
                  zIndex: 1000,
                }}
              >
                <button
                  type="button"
                  onClick={() => { if (isRecording) stopRecording(); setIsInlineAudioOpen(false); }}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: 'linear-gradient(135deg, #ff416c, #ff4757)',
                    border: '1.5px solid rgba(255,255,255,0.85)',
                    borderRadius: '50%',
                    width: 19,
                    height: 19,
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(isRecording || recordedBlob) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.85)', borderRadius: 8, padding: '2px 6px', color: '#4c1d95' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isRecording ? '#ff416c' : '#10b981' }} />
                      <span>{formatTime(recordingTime)}</span>
                    </div>
                  )}

                  {(audioPreviewUrl || recordedBlob) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 6px', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (audioPreviewUrl) new Audio(audioPreviewUrl).play().catch(() => {});
                        }}
                        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        title="Preview audio"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="#ffffff">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                      <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#4c1d95', textAlign: 'center' }}>Ready</span>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={handleInlineAudioSend}
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        title="Send audio"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#ffffff">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={clearInlineAudio}
                        style={{ background: 'linear-gradient(135deg, #ff416c, #ff4757)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        title="Discard"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4">
                          <path d="M3 6h18M19 6v14H5V6" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.75)', borderRadius: 10, padding: '6px 8px' }}>
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{
                          background: isRecording ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #ff416c, #ff4757)',
                          border: '1.5px solid #fff',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={isRecording ? 'Stop recording' : 'Record voice note'}
                      >
                        {isRecording ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
                            <rect x="6" y="6" width="12" height="12" rx="3" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#ffffff" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          border: '1.5px solid #fff',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Upload audio file"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFileSelect} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Exact PM Attachment (+) Link Button & Dropdown */}
              <div ref={attachWrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className="tt-gdm-icon-btn"
                  onClick={() => setIsAttachOpen((v) => !v)}
                  title="Attachments"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 231.8828 202.3201" width="19" height="19">
                    <g>
                      <path fill="#5CB0FF" d="M118.7695,98.3201c24.2617,0,44-19.7383,44-44s-19.7383-44-44-44s-44,19.7383-44,44 S94.5078,98.3201,118.7695,98.3201z M90.7695,50.3201h24v-24c0-2.209,1.7891-4,4-4s4,1.791,4,4v24h24c2.2109,0,4,1.791,4,4 s-1.7891,4-4,4h-24v24c0,2.209-1.7891,4-4,4s-4-1.791-4-4v-24h-24c-2.2109,0-4-1.791-4-4S88.5586,50.3201,90.7695,50.3201z" />
                      <path fill="#1C71DA" d="M8,162.4509c0-17.5742,14.3086-31.8711,31.8984-31.8711h80.0859c17.5898,0,31.8984,14.2969,31.8984,31.8711 v4h8v-4c0-21.9844-17.8984-39.8711-39.8984-39.8711H39.8984c-22,0-39.8984,17.8867-39.8984,39.8711 s17.8984,39.8691,39.8984,39.8691h31.0039v-8H39.8984C22.3086,194.3201,8,180.0232,8,162.4509z" />
                      <path fill="#1C71DA" d="M191.9844,122.5798h-31.0039v8h31.0039c17.5898,0,31.8984,14.2969,31.8984,31.8691 c0,17.5742-14.3086,31.8711-31.8984,31.8711h-80.0859C94.3086,194.3201,80,180.0232,80,162.449v-4h-8v4 c0,21.9844,17.8984,39.8711,39.8984,39.8711h80.0859c22,0,39.8984-17.8867,39.8984-39.8711S213.9844,122.5798,191.9844,122.5798z" />
                      <path fill="#1C71DA" d="M118.7695,106.3201c28.6719,0,52-23.3262,52-52s-23.3281-52-52-52s-52,23.3262-52,52 S90.0977,106.3201,118.7695,106.3201z M118.7695,10.3201c24.2617,0,44,19.7383,44,44s-19.7383,44-44,44s-44-19.7383-44-44 S94.5078,10.3201,118.7695,10.3201z" />
                      <path fill="#FFFFFF" d="M90.7695,58.3201h24v24c0,2.209,1.7891,4,4,4s4-1.791,4-4v-24h24c2.2109,0,4-1.791,4-4s-1.7891-4-4-4h-24 v-24c0-2.209-1.7891-4-4-4s-4,1.791-4,4v24h-24c-2.2109,0-4,1.791-4,4S88.5586,58.3201,90.7695,58.3201z" />
                    </g>
                    <path fill="#FF5D5D" d="M199.0215,22.1438c-1.0234,0-2.0469-0.3906-2.8281-1.1714c-1.5625-1.5625-1.5625-4.0952,0-5.6572 l14.1426-14.1421c1.5605-1.5615,4.0938-1.5615,5.6562,0c1.5625,1.5625,1.5625,4.0952,0,5.6572l-14.1426,14.1421 C201.0693,21.7532,200.0449,22.1438,199.0215,22.1438z" />
                    <path fill="#FF5D5D" d="M213.1641,22.1423c-1.0234,0-2.0479-0.3906-2.8281-1.1714L196.1934,6.8284 c-1.5625-1.5625-1.5625-4.0947,0-5.6572c1.5605-1.5615,4.0957-1.5615,5.6562,0l14.1426,14.1426 c1.5625,1.5625,1.5625,4.0947,0,5.6572C215.2119,21.7517,214.1875,22.1423,213.1641,22.1423z" />
                    <path fill="#00D40B" d="M205.0215,122.1438c-7.7197,0-14-6.2803-14-14s6.2803-14,14-14s14,6.2803,14,14 S212.7412,122.1438,205.0215,122.1438z M205.0215,102.1438c-3.3086,0-6,2.6914-6,6s2.6914,6,6,6s6-2.6914,6-6 S208.3301,102.1438,205.0215,102.1438z" />
                    <path fill="#FFC504" d="M22.3359,112.7693c-1.0234,0-2.0469-0.3906-2.8281-1.1714L8.1934,100.2844 c-0.75-0.75-1.1719-1.7676-1.1719-2.8286s0.4219-2.0786,1.1719-2.8286l11.3145-11.3135c1.5625-1.5615,4.0938-1.5615,5.6562,0 l11.3135,11.3135c1.5625,1.5625,1.5625,4.0947,0,5.6572l-11.3135,11.3135C24.3838,112.3787,23.3594,112.7693,22.3359,112.7693z M16.6787,97.4558l5.6572,5.6567l5.6562-5.6567l-5.6562-5.6567L16.6787,97.4558z" />
                  </svg>
                </button>

                {isAttachOpen && (
                  <div className="ultra-pm-attach-dropdown" style={{ left: 0, right: 'auto' }}>
                    <button
                      type="button"
                      className="ultra-attach-option"
                      onClick={() => {
                        setIsAttachOpen(false);
                        imageInputRef.current?.click();
                      }}
                      title="Send Picture or File"
                    >
                      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                        <defs>
                          <linearGradient id="linear-gradient-gdm" gradientUnits="userSpaceOnUse" x1="43.585" x2="67.615" y1="73.878" y2="49.848">
                            <stop offset="0" stopColor="#e6dee9" />
                            <stop offset="1" stopColor="#fdcbf1" />
                          </linearGradient>
                          <linearGradient id="New_Gradient_Swatch_9_gdm" gradientUnits="userSpaceOnUse" x1="5.016" x2="94.984" y1="50" y2="50">
                            <stop offset="0" stopColor="#ba0089" />
                            <stop offset="1" stopColor="#2e3192" />
                          </linearGradient>
                        </defs>
                        <path d="m53.889 74.853c0 2.134-1.73 3.864-3.864 3.864s-3.864-1.73-3.864-3.864 1.73-3.864 3.864-3.864 3.864 1.73 3.864 3.864zm11.996 8.778h1.797v-10.238h-1.797c-1.52 0-2.751 1.232-2.751 2.751v4.735c0 1.52 1.232 2.751 2.751 2.751zm-1.239-35.423-14.621-11.027-14.621 11.027 5.158 4.072h29.486z" fill="url(#linear-gradient-gdm)" />
                        <path d="m21.271 58.542c0 .561-.455 1.015-1.015 1.015h-7.07c-.561 0-1.015-.455-1.015-1.015s.455-1.015 1.015-1.015h7.07c.561 0 1.015.455 1.015 1.015zm-11.196-1.015c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm10.181 3.49h-7.07c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015h7.07c.561 0 1.015-.455 1.015-1.015s-.455-1.015-1.015-1.015zm-10.181 0c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm10.181 3.49h-7.07c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015h7.07c.561 0 1.015-.455 1.015-1.015s-.455-1.015-1.015-1.015zm-10.181 0c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm84.909-46.094v46.899c0 3.882-3.158 7.041-7.041 7.041h-19.286v12.579c0 2.039-1.659 3.697-3.698 3.697h-29.918c-2.039 0-3.698-1.659-3.698-3.697v-12.579h-19.286c-3.883 0-7.041-3.159-7.041-7.041v-46.899c0-3.882 3.158-7.041 7.041-7.041h75.886c3.883 0 7.041 3.159 7.041 7.041zm-28.327 66.519v-.133h-.797c-2.068 0-3.752-1.683-3.752-3.751v-4.735c0-2.068 1.684-3.751 3.752-3.751h.797v-3.383c0-.936-.762-1.698-1.698-1.698h-6.491c-.418 0-.792-.26-.938-.652l-1.197-3.223c-.354-.95-1.271-1.588-2.285-1.588h-8.096c-1.014 0-1.932.638-2.285 1.588l-1.197 3.222c-.146.392-.52.652-.938.652h-6.491c-.937 0-1.698.762-1.698 1.698v15.754c0 .936.762 1.697 1.698 1.697h29.918c.937 0 1.698-.761 1.698-1.697zm0-10.371h-.797c-.966 0-1.752.786-1.752 1.751v4.735c0 .966.786 1.751 1.752 1.751h.797v-8.238zm26.327-56.147c0-2.78-2.262-5.041-5.041-5.041h-75.886c-2.779 0-5.041 2.261-5.041 5.041v46.899c0 2.78 2.262 5.041 5.041 5.041h19.286v-1.176c0-2.039 1.659-3.698 3.698-3.698h5.796l.955-2.571c.644-1.73 2.315-2.892 4.16-2.892h8.096c1.845 0 3.517 1.162 4.16 2.891l.955 2.571h5.796c2.039 0 3.698 1.659 3.698 3.698v1.176h19.286c2.779 0 5.041-2.261 5.041-5.041v-46.899zm-2.06 1.974v28.104c0 2.73-2.222 4.952-4.952 4.952h-71.945c-2.73 0-4.952-2.221-4.952-4.952v-28.105c0-2.73 2.222-4.952 4.952-4.952h71.946c2.73 0 4.952 2.221 4.952 4.952zm-63.353 23.108-10.069 7.946h20.148l-.013-.01zm13.294 7.936.013.011h26.15l-17.028-12.841-12.984 9.792zm41.633.011-10.007-.292c.391-.391.391-1.024 0-1.415l-.739-.74z" fill="url(#New_Gradient_Swatch_9_gdm)" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="ultra-attach-option"
                      onClick={() => {
                        setIsAttachOpen(false);
                        setIsInlineAudioOpen((v) => !v);
                      }}
                      title="Send Audio"
                    >
                      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                        <defs>
                          <linearGradient id="GradientFill_1_gdm" gradientUnits="userSpaceOnUse" x1="255.999" x2="256.001" y1="512" y2="-.006">
                            <stop offset="0" stopColor="#6c54a3" />
                            <stop offset="1" stopColor="#00b1d2" />
                          </linearGradient>
                        </defs>
                        <path d="m195.638 92.371a60.365 60.365 0 1 1 120.73 0v161.086a60.365 60.365 0 1 1 -120.73 0zm60.362 253.456a92.762 92.762 0 0 0 92.37-92.37v-161.086a92.363 92.363 0 0 0 -184.725 0v161.086a92.748 92.748 0 0 0 92.355 92.37zm38.269 127v7.173h-76.542v-7.17a.4.4 0 0 1 .314-.314h75.917a.388.388 0 0 1 .307.314zm112.49-219.37a16 16 0 1 0 -32 0 118.759 118.759 0 1 1 -237.518 0 16 16 0 1 0 -32 0c0 77.732 59.129 141.9 134.761 149.914v37.148h-21.96a32.348 32.348 0 0 0 -32.312 32.311v23.17a16.009 16.009 0 0 0 16 16h108.538a16.009 16.009 0 0 0 16-16v-23.17a32.339 32.339 0 0 0 -32.312-32.311h-21.956v-37.148c75.644-8.016 134.759-72.182 134.759-149.914z" fill="url(#GradientFill_1_gdm)" fillRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <input ref={imageInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" style={{ display: 'none' }} onChange={handleImageFileChange} />

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

              <button
                type="submit"
                className="ultra-pm-send-btn"
                style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10 }}
                disabled={sending || !text.trim()}
                title="Send message"
              >
                <svg viewBox="0 0 512.019 512.019" xmlns="http://www.w3.org/2000/svg" width="17" height="17">
                  <g>
                    <path d="m242.532 355.703 168.472 85.314c.021-.147 59.984-430.889 60-431l-12.56 17.699z" fill="#e2c4ff" />
                    <path d="m41.003 231.017 150 80 267.44-283.301 12.56-17.699c-49.879 25.251-143.984 73.988-430 221z" fill="#e2c4ff" />
                    <path d="m466.431 1.123-430 221c-7.049 3.622-7.27 13.644-.389 17.577l134.961 77.121v185.195c0 8.386 9.643 12.936 16.135 7.896l132.857-103.221 86.535 43.27c6.115 3.055 13.434-.795 14.377-7.566l60-431c1.114-8.003-7.275-13.974-14.476-10.272zm-257.019 466.162 46.09-92.838 44.662 22.331zm193.607-41.44-147.544-73.771c-4.915-2.461-10.954-.487-13.429 4.498l-51.043 102.815v-148.37c0-3.588-1.924-6.901-5.039-8.682l-123.99-70.852 396.469-203.767z" fill="#020288" />
                  </g>
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
