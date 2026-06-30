import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, rtdb, auth } from '../firebase/config';
import {
  ref, set, get, update, remove, onValue, push, off, onDisconnect
} from 'firebase/database';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import './BroadcastPanel.css';

/* ── STUN config ── */
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/* ── Helpers ── */
const fmtTime = (secs) => {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const extractYtId = (url) => {
  const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

/* ── Premium Animated Music SVG ── */
const MusicVisual = ({ isPlaying }) => (
  <div className={`bp-music-visual${isPlaying ? '' : ' paused'}`}>
    {[...Array(9)].map((_, i) => <div key={i} className="bp-bar" />)}
  </div>
);

/* ── Broadcast SVG icon ── */
const BroadcastIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bcGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#6d28d9"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="3" fill="url(#bcGrad)"/>
    <path d="M8.5 8.5a5 5 0 000 7" stroke="url(#bcGrad)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M15.5 8.5a5 5 0 010 7" stroke="url(#bcGrad)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M5.5 5.5a9 9 0 000 13" stroke="url(#bcGrad)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".6"/>
    <path d="M18.5 5.5a9 9 0 010 13" stroke="url(#bcGrad)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".6"/>
  </svg>
);

/* ── Mic icon ── */
const MicIcon = ({ muted }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    {muted
      ? <><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3m-3 0h6M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/><line x1="2" y1="2" x2="22" y2="22" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/></>
      : <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3m-3 0h6M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>}
  </svg>
);

/* ── Play/Pause/Stop/Skip icons ── */
const PlayIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const StopIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>;
const SkipNextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm8.5-6v6H17V6h-2.5v6z"/></svg>;
const SkipPrevIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6v12l-8.5-6L18 6zM9.5 12V6H7v12h2.5V12z"/></svg>;
const LockIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>;
const UsersIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;
const MusicNoteIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>;
const YoutubeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.43 12.43 0 00-8.18 2.86 12.3 12.3 0 00-4.43 9.37 4.83 4.83 0 002.78 4.34A4.83 4.83 0 009.77 22a12.37 12.37 0 008.18-2.86 12.3 12.3 0 004.43-9.37 4.83 4.83 0 00-2.79-3.08zM10 15V9l5 3-5 3z"/></svg>;
const RadioWaveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>;

/* ════════════════════════════════════════════
   MAIN BROADCAST PANEL
════════════════════════════════════════════ */
const BroadcastPanel = ({ isOpen, onClose, loggedInUserProfile, allUsersProfiles = [] }) => {
  const [activeTab, setActiveTab] = useState(0);

  /* ── RJ Broadcast state ── */
  const [rjBroadcast, setRjBroadcast] = useState(null);          // live RTDB data
  const [rjIsLive, setRjIsLive] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytPlayerState, setYtPlayerState] = useState('stopped'); // playing/paused/stopped
  const [ytCurrentSongName, setYtCurrentSongName] = useState('');
  const [micMuted, setMicMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [speakerMap, setSpeakerMap] = useState({});              // uid → {name, photoURL}
  const [broadcastDuration, setBroadcastDuration] = useState(0); // secs since live
  const durationRef = useRef(null);

  /* ── Join Requests state ── */
  const [joinRequests, setJoinRequests] = useState([]);           // array of {uid, name, photoURL, ts}
  const [myRequestStatus, setMyRequestStatus] = useState(null);   // null / 'pending' / 'accepted' / 'rejected'
  const [iAmSpeaker, setIAmSpeaker] = useState(false);

  /* ── Public Broadcasts state ── */
  const [publicBroadcasts, setPublicBroadcasts] = useState([]);
  const [myActiveBroadcast, setMyActiveBroadcast] = useState(null);
  const [pubTitle, setPubTitle] = useState('');
  const [pubPassword, setPubPassword] = useState('');
  const [pubIsProtected, setPubIsProtected] = useState(false);
  const [listeningTo, setListeningTo] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(null); // { broadcastId, title }
  const [pwInput, setPwInput] = useState('');

  /* ── WebRTC refs ── */
  const peerConnections = useRef({});
  const localStream = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);

  /* ── Permission flags ── */
  const isRJ = loggedInUserProfile?.badge === 'rj';
  const isOwnerAdmin = ['owner', 'admin'].includes(loggedInUserProfile?.role);
  const canManageRJ = isRJ || isOwnerAdmin;
  const isGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role === 'guest';
  const myUid = loggedInUserProfile?.uid || auth.currentUser?.uid;
  const myName = loggedInUserProfile?.username || loggedInUserProfile?.displayName || 'User';
  const myPhoto = loggedInUserProfile?.photoURL || '';

  /* ══════════════════════════════════════
     FIREBASE LISTENERS
  ══════════════════════════════════════ */

  /* ── RJ Broadcast RTDB listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const bcRef = ref(rtdb, 'broadcasts/rj');
    const unsub = onValue(bcRef, (snap) => {
      const data = snap.val();
      setRjBroadcast(data);
      const live = !!(data && data.isLive);
      setRjIsLive(live);
      if (data) {
        setListenerCount(data.listenerCount || 0);
        setSpeakerMap(data.speakers || {});
        setYtPlayerState(data.youtube?.state || 'stopped');
        setYtCurrentSongName(data.youtube?.songName || '');
        // Check if I am a speaker
        if (myUid && data.speakers && data.speakers[myUid]) {
          setIAmSpeaker(true);
        } else {
          setIAmSpeaker(false);
        }
      } else {
        setListenerCount(0);
        setSpeakerMap({});
        setIAmSpeaker(false);
      }
    });
    return () => off(bcRef, 'value', unsub);
  }, [isOpen, myUid]);

  /* ── Join requests RTDB listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const reqRef = ref(rtdb, 'broadcasts/rj/joinRequests');
    const unsub = onValue(reqRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([uid, v]) => ({ uid, ...v }));
      setJoinRequests(list);
      if (myUid) {
        const mine = data[myUid];
        setMyRequestStatus(mine ? mine.status : null);
      }
    });
    return () => off(reqRef, 'value', unsub);
  }, [isOpen, myUid]);

  /* ── Register/unregister listener presence ── */
  useEffect(() => {
    if (!isOpen || !myUid || !rjIsLive) return;
    const lRef = ref(rtdb, `broadcasts/rj/listeners/${myUid}`);
    set(lRef, { uid: myUid, name: myName, joinedAt: Date.now() });
    onDisconnectCleanup(lRef);
    return () => remove(lRef);
  }, [isOpen, myUid, rjIsLive]);

  const onDisconnectCleanup = (lRef) => {
    onDisconnect(lRef).remove();
  };

  /* ── Duration timer ── */
  useEffect(() => {
    if (rjIsLive && rjBroadcast?.startedAt) {
      const tick = () => {
        const elapsed = Math.floor((Date.now() - rjBroadcast.startedAt) / 1000);
        setBroadcastDuration(elapsed);
      };
      tick();
      durationRef.current = setInterval(tick, 1000);
    } else {
      setBroadcastDuration(0);
      if (durationRef.current) clearInterval(durationRef.current);
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [rjIsLive, rjBroadcast?.startedAt]);

  /* ── YouTube player sync ── */
  useEffect(() => {
    if (!rjIsLive || !isOpen) return;
    const ytRef = ref(rtdb, 'broadcasts/rj/youtube');
    const unsub = onValue(ytRef, (snap) => {
      const yt = snap.val();
      if (!yt) return;
      syncYouTubePlayer(yt);
    });
    return () => off(ytRef, 'value', unsub);
  }, [rjIsLive, isOpen]);

  /* ── Public broadcasts Firestore listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'publicBroadcasts'), where('isLive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPublicBroadcasts(list);
      if (myUid) {
        const mine = list.find(b => b.hostUid === myUid);
        setMyActiveBroadcast(mine || null);
      }
    });
    return () => unsub();
  }, [isOpen, myUid]);

  /* ══════════════════════════════════════
     YOUTUBE PLAYER
  ══════════════════════════════════════ */
  const initYtPlayer = useCallback((videoId) => {
    if (!videoId) return;
    if (ytPlayerRef.current) {
      ytPlayerRef.current.loadVideoById(videoId);
      return;
    }
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
      return;
    }
    createPlayer(videoId);
  }, []);

  const createPlayer = (videoId) => {
    if (!ytContainerRef.current) return;
    ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
      height: '1',
      width: '1',
      videoId,
      playerVars: { autoplay: 0, controls: 0 },
      events: {
        onReady: (e) => {
          e.target.setVolume(80);
        },
        onStateChange: () => {}
      }
    });
  };

  const syncYouTubePlayer = (ytData) => {
    const player = ytPlayerRef.current;
    if (!player || !player.loadVideoById) return;
    const { state, videoId, seekTo } = ytData;
    if (videoId) {
      const cur = player.getVideoUrl?.() || '';
      if (!cur.includes(videoId)) {
        player.loadVideoById({ videoId, startSeconds: seekTo || 0 });
      }
    }
    if (state === 'playing') {
      player.playVideo?.();
      if (seekTo != null) player.seekTo?.(seekTo, true);
    } else if (state === 'paused') {
      player.pauseVideo?.();
    } else if (state === 'stopped') {
      player.stopVideo?.();
    }
  };

  /* ══════════════════════════════════════
     RJ CONTROLS
  ══════════════════════════════════════ */
  const handleGoLive = async () => {
    if (!myUid) return;
    const bcData = {
      isLive: true,
      rjUid: myUid,
      rjName: myName,
      rjAvatar: myPhoto,
      rjBadge: 'RJ',
      title: broadcastTitle || 'Live Broadcast',
      listenerCount: 0,
      startedAt: Date.now(),
      speakers: {},
      joinRequests: {},
      youtube: { state: 'stopped', videoId: null, seekTo: 0, songName: '' }
    };
    await set(ref(rtdb, 'broadcasts/rj'), bcData);
  };

  const handleEndBroadcast = async () => {
    await remove(ref(rtdb, 'broadcasts/rj'));
    setYtUrl('');
    setYtCurrentSongName('');
    setYtPlayerState('stopped');
    stopLocalMic();
  };

  const handleMicToggle = async () => {
    if (!localStream.current) {
      await startLocalMic();
      setMicMuted(false);
    } else {
      const enabled = !micMuted;
      localStream.current.getAudioTracks().forEach(t => { t.enabled = !enabled; });
      setMicMuted(enabled);
    }
  };

  const startLocalMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
    } catch (e) {
      console.warn('Mic error:', e);
    }
  };

  const stopLocalMic = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
  };

  const handleYtLoad = () => {
    const vid = extractYtId(ytUrl);
    if (!vid) return;
    const songName = ytUrl;
    initYtPlayer(vid);
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      videoId: vid,
      state: 'paused',
      seekTo: 0,
      songName: songName,
      updatedAt: Date.now()
    });
    setYtCurrentSongName(songName);
  };

  const handleYtControl = (action) => {
    const player = ytPlayerRef.current;
    let newState = ytPlayerState;
    let seekTo = 0;
    if (action === 'play') {
      player?.playVideo?.();
      newState = 'playing';
      seekTo = player?.getCurrentTime?.() || 0;
    } else if (action === 'pause') {
      player?.pauseVideo?.();
      newState = 'paused';
      seekTo = player?.getCurrentTime?.() || 0;
    } else if (action === 'stop') {
      player?.stopVideo?.();
      newState = 'stopped';
      seekTo = 0;
    } else if (action === 'skipnext') {
      seekTo = (player?.getCurrentTime?.() || 0) + 30;
      player?.seekTo?.(seekTo, true);
      newState = 'playing';
      player?.playVideo?.();
    } else if (action === 'skipprev') {
      seekTo = Math.max(0, (player?.getCurrentTime?.() || 0) - 15);
      player?.seekTo?.(seekTo, true);
    }
    setYtPlayerState(newState);
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      state: newState,
      seekTo,
      updatedAt: Date.now()
    });
  };

  /* ── Invite speaker ── */
  const handleInviteSpeaker = async (uid) => {
    if (!uid) return;
    const target = allUsersProfiles.find(u => u.uid === uid);
    if (!target) return;
    await update(ref(rtdb, `broadcasts/rj/speakers/${uid}`), {
      uid,
      name: target.username || target.displayName || 'User',
      photoURL: target.photoURL || '',
      joinedAt: Date.now(),
      muted: false
    });
    // Remove from join requests
    await remove(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`));
  };

  const handleRemoveSpeaker = async (uid) => {
    await remove(ref(rtdb, `broadcasts/rj/speakers/${uid}`));
  };

  /* ══════════════════════════════════════
     JOIN REQUESTS
  ══════════════════════════════════════ */
  const handleRequestToJoin = async () => {
    if (!myUid || !rjIsLive) return;
    await set(ref(rtdb, `broadcasts/rj/joinRequests/${myUid}`), {
      uid: myUid,
      name: myName,
      photoURL: myPhoto,
      status: 'pending',
      requestedAt: Date.now()
    });
    setMyRequestStatus('pending');
  };

  const handleCancelRequest = async () => {
    if (!myUid) return;
    await remove(ref(rtdb, `broadcasts/rj/joinRequests/${myUid}`));
    setMyRequestStatus(null);
  };

  const handleAcceptRequest = async (uid) => {
    await handleInviteSpeaker(uid);
  };

  const handleRejectRequest = async (uid) => {
    await update(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`), { status: 'rejected' });
    setTimeout(() => remove(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`)), 3000);
  };

  /* ══════════════════════════════════════
     PUBLIC BROADCASTS
  ══════════════════════════════════════ */
  const handleCreatePublicBroadcast = async () => {
    if (!myUid || !pubTitle.trim()) return;
    const data = {
      hostUid: myUid,
      hostName: myName,
      hostAvatar: myPhoto,
      title: pubTitle.trim(),
      isLive: true,
      isPasswordProtected: pubIsProtected,
      password: pubIsProtected ? pubPassword : '',
      listenerCount: 0,
      createdAt: new Date().toISOString(),
      startedAt: Date.now()
    };
    const docRef = await addDoc(collection(db, 'publicBroadcasts'), data);
    setMyActiveBroadcast({ id: docRef.id, ...data });
    setPubTitle('');
    setPubPassword('');
    setPubIsProtected(false);
  };

  const handleStopPublicBroadcast = async () => {
    if (!myActiveBroadcast?.id) return;
    await updateDoc(doc(db, 'publicBroadcasts', myActiveBroadcast.id), { isLive: false });
    setMyActiveBroadcast(null);
  };

  const handleJoinPublicBroadcast = (bc) => {
    if (listeningTo?.id === bc.id) {
      setListeningTo(null);
      return;
    }
    if (bc.isPasswordProtected) {
      setPasswordPrompt({ broadcastId: bc.id, title: bc.title, password: bc.password });
      return;
    }
    setListeningTo(bc);
  };

  const handlePasswordSubmit = () => {
    if (!passwordPrompt) return;
    const bc = publicBroadcasts.find(b => b.id === passwordPrompt.broadcastId);
    if (bc && pwInput === bc.password) {
      setListeningTo(bc);
      setPasswordPrompt(null);
      setPwInput('');
    } else {
      setPwInput('');
    }
  };

  /* ══════════════════════════════════════
     RENDER HELPERS
  ══════════════════════════════════════ */
  const renderTabBadge = (tab) => {
    if (tab === 1 && joinRequests.filter(r => r.status === 'pending').length > 0) {
      const count = joinRequests.filter(r => r.status === 'pending').length;
      if (canManageRJ) return <span className="bp-tab-badge">{count}</span>;
    }
    return null;
  };

  if (!isOpen) return null;

  /* ══════════════════════════════════════
     TAB 0 — RJ BROADCAST
  ══════════════════════════════════════ */
  const renderRJTab = () => {
    if (canManageRJ) return renderRJControls();
    return renderListenerView();
  };

  const renderRJControls = () => (
    <div>
      {/* Go Live / End */}
      <div className="bp-golive-card">
        <div className="bp-golive-row">
          <div className="bp-golive-info">
            <h3>{rjIsLive ? 'You are LIVE' : 'Start Broadcast'}</h3>
            <p>{rjIsLive ? `${listenerCount} listener${listenerCount !== 1 ? 's' : ''} tuned in` : 'Go live to start broadcasting'}</p>
            {rjIsLive && (
              <div className="bp-live-indicator">
                <span className="bp-live-dot" />
                <span className="bp-live-text">LIVE</span>
                <span className="bp-live-timer">· {fmtTime(broadcastDuration)}</span>
              </div>
            )}
          </div>
          {rjIsLive
            ? <button className="bp-golive-btn end" onClick={handleEndBroadcast}><StopIcon /> End</button>
            : <button className="bp-golive-btn start" onClick={handleGoLive}><RadioWaveIcon /> Go Live</button>
          }
        </div>
      </div>

      {/* Broadcast title */}
      {!rjIsLive && (
        <div className="bp-title-row">
          <input
            className="bp-input"
            placeholder="Broadcast title..."
            value={broadcastTitle}
            onChange={e => setBroadcastTitle(e.target.value)}
          />
        </div>
      )}

      {/* Controls */}
      {rjIsLive && (
        <>
          <div className="bp-control-grid">
            <button
              className={`bp-ctrl-btn${micMuted ? ' danger' : ''}`}
              onClick={handleMicToggle}
            >
              <MicIcon muted={micMuted} />
              {micMuted ? 'Mic Off' : 'Mic On'}
            </button>
            <button className="bp-ctrl-btn" onClick={() => setActiveTab(1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              Invite Speaker
            </button>
            <button className="bp-ctrl-btn" onClick={() => setActiveTab(1)}>
              <UsersIcon />
              Requests ({joinRequests.filter(r => r.status === 'pending').length})
            </button>
          </div>

          {/* Analytics */}
          <div className="bp-analytics-row">
            <div className="bp-stat-card">
              <div className="bp-stat-value">{listenerCount}</div>
              <div className="bp-stat-label">Listeners</div>
            </div>
            <div className="bp-stat-card">
              <div className="bp-stat-value">{Object.keys(speakerMap).length}</div>
              <div className="bp-stat-label">Speakers</div>
            </div>
            <div className="bp-stat-card">
              <div className="bp-stat-value">{fmtTime(broadcastDuration)}</div>
              <div className="bp-stat-label">Duration</div>
            </div>
          </div>

          {/* YouTube section */}
          <div className="bp-yt-section">
            <div className="bp-yt-label"><YoutubeIcon /> Music Sync</div>
            <div className="bp-yt-url-row">
              <input
                className="bp-input"
                placeholder="YouTube URL..."
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
              />
              <button className="bp-yt-load-btn" onClick={handleYtLoad}>Load</button>
            </div>
            {ytCurrentSongName && (
              <div className="bp-song-controls">
                <button className="bp-song-btn" onClick={() => handleYtControl('skipprev')}>
                  <SkipPrevIcon />
                </button>
                {ytPlayerState === 'playing'
                  ? <button className="bp-song-btn play-main" onClick={() => handleYtControl('pause')}><PauseIcon /></button>
                  : <button className="bp-song-btn play-main" onClick={() => handleYtControl('play')}><PlayIcon /></button>
                }
                <button className="bp-song-btn" onClick={() => handleYtControl('skipnext')}><SkipNextIcon /></button>
                <button className="bp-song-btn danger" onClick={() => handleYtControl('stop')}><StopIcon /></button>
              </div>
            )}
          </div>

          {/* Active speakers */}
          {Object.keys(speakerMap).length > 0 && (
            <div className="bp-speakers-section">
              <div className="bp-section-label">Active Speakers</div>
              <div className="bp-speaker-list">
                {Object.entries(speakerMap).map(([uid, sp]) => (
                  <div key={uid} className="bp-speaker-item">
                    <img
                      className="bp-speaker-avatar"
                      src={sp.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`}
                      alt={sp.name}
                      onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`; }}
                    />
                    <span className="bp-speaker-name">{sp.name}</span>
                    <button className="bp-remove-speaker-btn" onClick={() => handleRemoveSpeaker(uid)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderListenerView = () => {
    if (!rjIsLive || !rjBroadcast) {
      return (
        <div className="bp-no-broadcast">
          <div className="bp-no-broadcast-icon">
            <BroadcastIcon size={56} />
          </div>
          <h3>No Active Broadcast</h3>
          <p>The RJ is not live right now. Check back later!</p>
        </div>
      );
    }

    const speakers = Object.values(speakerMap);

    return (
      <div className="bp-player-card">
        <MusicVisual isPlaying={ytPlayerState === 'playing'} />

        <div className="bp-rj-avatar-wrap">
          <img
            className="bp-rj-avatar"
            src={rjBroadcast.rjAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${rjBroadcast.rjUid}`}
            alt={rjBroadcast.rjName}
            onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${rjBroadcast.rjUid}`; }}
          />
          <div className="bp-rj-live-ring" />
          <div className="bp-rj-badge-wrap">RJ</div>
        </div>

        <h3 className="bp-rj-name">{rjBroadcast.rjName}</h3>
        <div className="bp-rj-title">{rjBroadcast.title || 'Live Broadcast'}</div>

        <div className="bp-live-badge">
          <span className="bp-live-dot" />
          <span>LIVE</span>
          <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 4 }}>· {fmtTime(broadcastDuration)}</span>
        </div>

        {ytCurrentSongName && (
          <div className="bp-song-info">
            <div className="bp-song-icon"><MusicNoteIcon /></div>
            <div className="bp-song-details">
              <div className="bp-song-label">Now Playing</div>
              <div className="bp-song-name">{ytCurrentSongName}</div>
            </div>
          </div>
        )}

        <div className="bp-listener-row">
          <div className="bp-listener-chip">
            <UsersIcon />
            <strong>{listenerCount}</strong> Listeners
          </div>
          {broadcastDuration > 0 && (
            <div className="bp-listener-chip">
              <RadioWaveIcon />
              {fmtTime(broadcastDuration)}
            </div>
          )}
        </div>

        {speakers.length > 0 && (
          <div className="bp-connected-speakers" style={{ marginTop: 12 }}>
            {speakers.slice(0, 5).map(sp => (
              <img
                key={sp.uid}
                className="bp-speaker-bubble"
                src={sp.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${sp.uid}`}
                alt={sp.name}
                title={sp.name}
                onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${sp.uid}`; }}
              />
            ))}
            {speakers.length > 5 && (
              <span className="bp-speaker-count">+{speakers.length - 5} more</span>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════
     TAB 1 — JOIN REQUESTS
  ══════════════════════════════════════ */
  const renderJoinTab = () => {
    if (!rjIsLive) {
      return (
        <div className="bp-empty">
          <div style={{ marginBottom: 10, opacity: 0.25 }}><BroadcastIcon size={40} /></div>
          No active broadcast to join.
        </div>
      );
    }

    if (iAmSpeaker) {
      return (
        <div>
          <div className="bp-speaker-status">
            <h3>🎙️ You are a Speaker</h3>
            <p>Your voice is live on the broadcast</p>
          </div>
          <button
            className="bp-request-btn cancel"
            style={{ width: '100%' }}
            onClick={() => handleRemoveSpeaker(myUid)}
          >
            Leave Stage
          </button>
        </div>
      );
    }

    if (canManageRJ) {
      const pending = joinRequests.filter(r => r.status === 'pending');
      return (
        <div>
          <div className="bp-section-label" style={{ marginBottom: 12 }}>
            Pending Requests ({pending.length})
          </div>
          {pending.length === 0 ? (
            <div className="bp-queue-empty">No pending join requests</div>
          ) : (
            <div className="bp-requests-list">
              {pending.map(req => (
                <div key={req.uid} className="bp-req-item">
                  <img
                    className="bp-req-avatar"
                    src={req.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`}
                    alt={req.name}
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`; }}
                  />
                  <div className="bp-req-info">
                    <div className="bp-req-name">{req.name}</div>
                    <div className="bp-req-time">{req.requestedAt ? new Date(req.requestedAt).toLocaleTimeString() : ''}</div>
                  </div>
                  <div className="bp-req-actions">
                    <button className="bp-req-accept" onClick={() => handleAcceptRequest(req.uid)}>Accept</button>
                    <button className="bp-req-reject" onClick={() => handleRejectRequest(req.uid)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (isGuest) {
      return (
        <div className="bp-guest-lock">
          <div className="bp-guest-lock-icon"><LockIcon /></div>
          <h3>Register to Join</h3>
          <p>Create an account to request to speak on live broadcasts.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="bp-joinreq-hero">
          <h3>Join the Broadcast Stage</h3>
          <p>Request to speak live on the broadcast. The RJ will review your request.</p>
          {myRequestStatus === 'pending' ? (
            <>
              <button className="bp-request-btn pending" disabled>Request Pending...</button>
              <div style={{ marginTop: 8 }}>
                <button className="bp-request-btn cancel" onClick={handleCancelRequest}>Cancel Request</button>
              </div>
            </>
          ) : myRequestStatus === 'rejected' ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>Request was declined.</div>
              <button className="bp-request-btn join" onClick={handleRequestToJoin}>Request Again</button>
            </div>
          ) : (
            <button className="bp-request-btn join" onClick={handleRequestToJoin}>Request to Join</button>
          )}
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════
     TAB 2 — PUBLIC BROADCASTS
  ══════════════════════════════════════ */
  const renderPublicTab = () => {
    const others = publicBroadcasts.filter(b => b.hostUid !== myUid);

    return (
      <div>
        {/* My active broadcast banner */}
        {myActiveBroadcast && (
          <div className="bp-my-broadcast-banner">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RadioWaveIcon />
            </div>
            <div className="bp-my-broadcast-info">
              <h4>You are live — {myActiveBroadcast.title}</h4>
              <p>Others can join and listen to you</p>
            </div>
            <button className="bp-stop-broadcast-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={handleStopPublicBroadcast}>Stop</button>
          </div>
        )}

        {/* Create broadcast */}
        {!isGuest && !myActiveBroadcast && (
          <div className="bp-create-section">
            <div className="bp-create-card">
              <h3><BroadcastIcon size={16} /> Start Your Broadcast</h3>
              <div className="bp-create-form">
                <input
                  className="bp-input"
                  placeholder="Broadcast title..."
                  value={pubTitle}
                  onChange={e => setPubTitle(e.target.value)}
                />
                <div className="bp-form-row">
                  <label className="bp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={pubIsProtected}
                      onChange={e => setPubIsProtected(e.target.checked)}
                    />
                    Password Protected
                  </label>
                  {pubIsProtected && (
                    <input
                      className="bp-input"
                      placeholder="Password..."
                      value={pubPassword}
                      onChange={e => setPubPassword(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  )}
                </div>
                <button
                  className="bp-create-btn"
                  onClick={handleCreatePublicBroadcast}
                  disabled={!pubTitle.trim() || (pubIsProtected && !pubPassword.trim())}
                >
                  <BroadcastIcon size={15} />
                  Go Live Now
                </button>
              </div>
            </div>
          </div>
        )}

        {isGuest && (
          <div className="bp-guest-lock" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <h3>Register to Broadcast</h3>
            <p>Create a free account to start your own live broadcasts.</p>
          </div>
        )}

        {/* List of public broadcasts */}
        {others.length > 0 ? (
          <>
            <div className="bp-broadcasts-list-label">Live Broadcasts ({others.length})</div>
            <div className="bp-broadcast-items">
              {others.map(bc => (
                <div key={bc.id} className="bp-broadcast-item">
                  <div className="bp-bc-avatar-wrap">
                    <img
                      className="bp-bc-avatar"
                      src={bc.hostAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${bc.hostUid}`}
                      alt={bc.hostName}
                      onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${bc.hostUid}`; }}
                    />
                    <span className="bp-bc-live-dot" />
                  </div>
                  <div className="bp-bc-info">
                    <div className="bp-bc-title">{bc.title}</div>
                    <div className="bp-bc-host">{bc.hostName}</div>
                    <div className="bp-bc-meta">
                      <span className="bp-bc-chip"><UsersIcon /> {bc.listenerCount || 0}</span>
                      {bc.isPasswordProtected && <span className="bp-bc-chip bp-bc-locked"><LockIcon /> Private</span>}
                    </div>
                  </div>
                  <div className="bp-bc-actions">
                    <button
                      className={`bp-bc-join-btn${listeningTo?.id === bc.id ? ' listening' : ''}`}
                      onClick={() => handleJoinPublicBroadcast(bc)}
                    >
                      {listeningTo?.id === bc.id ? 'Listening' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !myActiveBroadcast ? (
          <div className="bp-empty">
            <div><BroadcastIcon size={36} /></div>
            No public broadcasts live right now.
            <br />Be the first to go live!
          </div>
        ) : null}

        {/* Password prompt modal */}
        {passwordPrompt && (
          <div className="bp-password-modal">
            <div className="bp-password-box">
              <h3>🔒 {passwordPrompt.title}</h3>
              <input
                className="bp-input"
                type="password"
                placeholder="Enter password..."
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
              <div className="bp-password-actions">
                <button className="bp-pw-btn cancel-pw" onClick={() => { setPasswordPrompt(null); setPwInput(''); }}>Cancel</button>
                <button className="bp-pw-btn confirm" onClick={handlePasswordSubmit}>Join</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════ */
  return (
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-panel" onClick={e => e.stopPropagation()}>

        {/* Hidden YouTube container */}
        <div className="bp-yt-hidden-player">
          <div ref={ytContainerRef} id="bp-yt-player" />
        </div>

        {/* Header */}
        <div className="bp-header">
          <div className="bp-header-left">
            <div className="bp-header-icon"><BroadcastIcon size={20} /></div>
            <div>
              <div className="bp-header-title">Broadcast Studio</div>
              <div className="bp-header-subtitle">{rjIsLive ? '🔴 RJ Live' : 'Premium Broadcast'}</div>
            </div>
          </div>
          <button className="bp-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="bp-tabs">
          <button
            className={`bp-tab${activeTab === 0 ? ' active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            <BroadcastIcon size={13} />
            {canManageRJ ? 'RJ Controls' : 'RJ Live'}
            {rjIsLive && <span className="bp-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: 2 }} />}
          </button>
          <button
            className={`bp-tab${activeTab === 1 ? ' active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <UsersIcon />
            Join Stage
            {renderTabBadge(1)}
          </button>
          <button
            className={`bp-tab${activeTab === 2 ? ' active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <RadioWaveIcon />
            Public
            {myActiveBroadcast && <span className="bp-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginLeft: 2 }} />}
          </button>
        </div>

        {/* Content */}
        <div className="bp-content">
          {activeTab === 0 && renderRJTab()}
          {activeTab === 1 && renderJoinTab()}
          {activeTab === 2 && renderPublicTab()}
        </div>
      </div>
    </div>
  );
};

export default BroadcastPanel;
