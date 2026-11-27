// src/components/theatre/TheatreCinema.jsx
// Tingletap Synchronized Watch Cinema inside the existing Theatre room.
// Uses direct YouTube embed + postMessage sync (no fragile iframe_api script blocking),
// exclusive Owner / Admin / Moderator host controls, Connected Users sidebar/overlay
// with Host / Owner / Admin / Moderator indicators, pure SVG icons (zero emojis),
// full CSS-variable support across all Tingletap themes, and real-time clock drift sync.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { auth, db, rtdb } from '../../firebase/config';
import { isGuestUser, isStaffRole, normalizeRole } from '../../utils/roleUtils';
import { useLiveDisplayName } from '../../utils/liveUsernames';
import { renderUserBadge } from '../../utils/badgeRenderHelper';
import LiveAvatarImg from '../LiveAvatar';
import { fetchYouTubeVideoTitle, formatTheatreClock, parseTheatreMediaUrl } from '../../utils/theatreMediaParser';
import './TheatreCinema.css';

const TheatreLiveName = memo(({ uid, fallback }) => useLiveDisplayName(uid, fallback) || fallback || 'User');

const ROLE_TIER_ORDER = {
  owner: 1,
  admin: 2,
  moderator: 3,
  rj: 4,
  user: 5,
  guest: 6,
};

function getTheatreRoleMeta(userItem, activeHostUid, isActiveSession, theatreAllowedUids = []) {
  const normRole = normalizeRole(userItem);
  const isGuest = isGuestUser(userItem) || normRole === 'guest';
  const isAppointedHost = Boolean(!isGuest && userItem?.uid && Array.isArray(theatreAllowedUids) && theatreAllowedUids.includes(userItem.uid));
  const isHost = Boolean((isActiveSession && activeHostUid && userItem?.uid === activeHostUid) || isAppointedHost);

  let roleLabel = 'Member';
  let roleTone = 'member';

  if (normRole === 'owner') {
    roleLabel = 'Owner';
    roleTone = 'owner';
  } else if (normRole === 'admin') {
    roleLabel = 'Admin';
    roleTone = 'admin';
  } else if (normRole === 'moderator') {
    roleLabel = 'Moderator';
    roleTone = 'moderator';
  } else if (normRole === 'rj') {
    roleLabel = 'RJ';
    roleTone = 'rj';
  } else if (isGuest) {
    roleLabel = 'Guest';
    roleTone = 'guest';
  }

  const tier = isHost ? 0 : (ROLE_TIER_ORDER[normRole] ?? 5);
  return { normRole, isGuest, isHost, roleLabel, roleTone, tier };
}

function mapYouTubeErrorMessage(code) {
  switch (Number(code)) {
    case 2:
      return 'Invalid YouTube link or video ID. Check the link and try again.';
    case 5:
      return 'Playback failed inside the YouTube embed. Tap Sync or try another video.';
    case 100:
      return 'This YouTube video is unavailable, removed, or set to private.';
    case 101:
    case 150:
      return 'The video owner blocked external playback (Error 150). Try another YouTube link or direct .mp4 URL.';
    default:
      return 'Unable to play this video right now. Try another YouTube link or direct .mp4 stream.';
  }
}

// Memoized Video Surface — NEVER re-renders when live chat messages or viewer list updates
const TheatrePlayerSurface = memo(({
  session,
  canControl,
  localMuted,
  localVolume,
  getExpectedTimeSec,
  onDurationChange,
  onCurrentTimeSample,
  onHostTransportEvent,
  onNeedsUnmutePrompt,
  onPlayerError,
  playerControlRef,
}) => {
  const ytIframeRef = useRef(null);
  const videoRef = useRef(null);

  const ytLoadedRef = useRef(false);
  const ytPlayerStateRef = useRef(-1);
  const ytIsMutedRef = useRef(false);
  const ytCurrentTimeRef = useRef(0);
  const ytDurationRef = useRef(0);
  const suppressBroadcastRef = useRef(false);
  const handshakeTimersRef = useRef([]);
  const autoplayVerifyTimerRef = useRef(null);

  const latestRef = useRef({
    session,
    canControl,
    localMuted,
    localVolume,
    getExpectedTimeSec,
    onDurationChange,
    onCurrentTimeSample,
    onHostTransportEvent,
    onNeedsUnmutePrompt,
    onPlayerError,
  });
  latestRef.current = {
    session,
    canControl,
    localMuted,
    localVolume,
    getExpectedTimeSec,
    onDurationChange,
    onCurrentTimeSample,
    onHostTransportEvent,
    onNeedsUnmutePrompt,
    onPlayerError,
  };

  const sourceType = session?.sourceType || 'youtube';
  const videoId = session?.videoId || '';
  const videoUrl = session?.videoUrl || '';
  const isActive = session?.status === 'active' && Boolean(videoUrl);

  // Remember initial autoplay param for mount stability so typing/sync never reloads iframe
  const initialAutoplayRef = useRef(1);
  const initialControlsRef = useRef(canControl ? 1 : 0);
  const prevMountKeyRef = useRef('');
  const mountKey = `${sourceType}:${videoId || videoUrl}`;
  if (prevMountKeyRef.current !== mountKey) {
    prevMountKeyRef.current = mountKey;
    initialAutoplayRef.current = session?.isPlaying === false ? 0 : 1;
    initialControlsRef.current = canControl ? 1 : 0;
  }

  const sendYtCommand = useCallback((func, args = '') => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return false;
    try {
      win.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendYtListeningHandshake = useCallback(() => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening', id: 'tt-theatre-yt', channel: 'widget' }), '*');
    } catch (_) {}
  }, []);

  const applyLocalAudio = useCallback(() => {
    const { localMuted: muted, localVolume: vol } = latestRef.current;
    if (sourceType === 'mp4' && videoRef.current) {
      videoRef.current.muted = Boolean(muted || vol === 0);
      videoRef.current.volume = Math.max(0, Math.min(1, vol / 100));
      return;
    }
    if (sourceType === 'youtube' && ytLoadedRef.current) {
      if (muted || vol === 0) {
        sendYtCommand('mute', '');
        ytIsMutedRef.current = true;
      } else {
        sendYtCommand('unMute', '');
        sendYtCommand('setVolume', [Math.max(0, Math.min(100, vol))]);
        ytIsMutedRef.current = false;
      }
    }
  }, [sourceType, sendYtCommand]);

  // Sync local volume / mute without re-initializing player
  useEffect(() => {
    applyLocalAudio();
  }, [localMuted, localVolume, applyLocalAudio]);

  // Reset YouTube runtime refs when video changes or ends
  useEffect(() => {
    ytLoadedRef.current = false;
    ytPlayerStateRef.current = -1;
    ytCurrentTimeRef.current = 0;
    ytDurationRef.current = 0;
    handshakeTimersRef.current.forEach((t) => clearTimeout(t));
    handshakeTimersRef.current = [];
    if (autoplayVerifyTimerRef.current) {
      clearTimeout(autoplayVerifyTimerRef.current);
      autoplayVerifyTimerRef.current = null;
    }
    return () => {
      handshakeTimersRef.current.forEach((t) => clearTimeout(t));
      handshakeTimersRef.current = [];
      if (autoplayVerifyTimerRef.current) {
        clearTimeout(autoplayVerifyTimerRef.current);
        autoplayVerifyTimerRef.current = null;
      }
    };
  }, [isActive, sourceType, videoId, videoUrl]);

  const scheduleAutoplayRecovery = useCallback((delayMs = 1100) => {
    if (autoplayVerifyTimerRef.current) {
      clearTimeout(autoplayVerifyTimerRef.current);
      autoplayVerifyTimerRef.current = null;
    }
    autoplayVerifyTimerRef.current = setTimeout(() => {
      const { session: curSession, localMuted: curMuted, localVolume: curVol, onNeedsUnmutePrompt: onPrompt } = latestRef.current;
      if (!curSession || curSession.status !== 'active' || !curSession.isPlaying) return;
      const st = ytPlayerStateRef.current;
      if (st !== 1 && st !== 3) {
        // Browser blocked unmuted autoplay -> mute + start video immediately, show Tap for Audio pill
        sendYtCommand('mute', '');
        ytIsMutedRef.current = true;
        sendYtCommand('playVideo', '');
        onPrompt?.(true);
      } else if (!curMuted && curVol > 0 && ytIsMutedRef.current) {
        onPrompt?.(true);
      }
    }, delayMs);
  }, [sendYtCommand]);

  const handleYtIframeLoad = useCallback(() => {
    ytLoadedRef.current = true;
    handshakeTimersRef.current.forEach((t) => clearTimeout(t));
    handshakeTimersRef.current = [];

    sendYtListeningHandshake();
    handshakeTimersRef.current.push(
      setTimeout(() => sendYtListeningHandshake(), 250),
      setTimeout(() => sendYtListeningHandshake(), 700),
      setTimeout(() => sendYtListeningHandshake(), 1500)
    );

    const { session: curSession, getExpectedTimeSec: getExp } = latestRef.current;
    applyLocalAudio();

    const target = getExp();
    if (target > 1.5) {
      suppressBroadcastRef.current = true;
      sendYtCommand('seekTo', [target, true]);
      setTimeout(() => { suppressBroadcastRef.current = false; }, 550);
    }

    if (curSession?.isPlaying) {
      suppressBroadcastRef.current = true;
      sendYtCommand('playVideo', '');
      setTimeout(() => { suppressBroadcastRef.current = false; }, 550);
      scheduleAutoplayRecovery(1150);
    }
  }, [sendYtListeningHandshake, applyLocalAudio, sendYtCommand, scheduleAutoplayRecovery]);

  // Listen to YouTube postMessage events (onReady, infoDelivery, onStateChange, onError)
  useEffect(() => {
    if (!isActive || sourceType !== 'youtube' || !videoId) return undefined;

    const onYtMessage = (event) => {
      if (!ytIframeRef.current || event.source !== ytIframeRef.current.contentWindow) return;
      let payload = event.data;
      if (typeof payload === 'string') {
        if (!payload.startsWith('{')) return;
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (!payload || typeof payload !== 'object') return;

      const {
        session: curSession,
        canControl: isHost,
        localMuted: curMuted,
        localVolume: curVol,
        getExpectedTimeSec: getExp,
        onDurationChange: onDur,
        onCurrentTimeSample: onTime,
        onHostTransportEvent: onTransport,
        onNeedsUnmutePrompt: onPrompt,
        onPlayerError: onErr,
      } = latestRef.current;

      if (payload.event === 'onReady') {
        ytLoadedRef.current = true;
        onErr?.('');
        applyLocalAudio();
        const target = getExp();
        if (target > 1.5) {
          suppressBroadcastRef.current = true;
          sendYtCommand('seekTo', [target, true]);
        }
        if (curSession?.isPlaying) {
          suppressBroadcastRef.current = true;
          sendYtCommand('playVideo', '');
          scheduleAutoplayRecovery(1050);
        } else {
          sendYtCommand('pauseVideo', '');
        }
        setTimeout(() => { suppressBroadcastRef.current = false; }, 550);
        return;
      }

      if (payload.event === 'onError') {
        const code = payload.info;
        onErr?.(mapYouTubeErrorMessage(code));
        return;
      }

      if (payload.event === 'infoDelivery' && payload.info) {
        const info = payload.info;

        if (typeof info.errorCode === 'number') {
          onErr?.(mapYouTubeErrorMessage(info.errorCode));
          return;
        }

        if (typeof info.duration === 'number' && Number.isFinite(info.duration) && info.duration > 0) {
          ytDurationRef.current = info.duration;
          onDur?.(info.duration);
        }

        if (typeof info.currentTime === 'number' && Number.isFinite(info.currentTime) && info.currentTime >= 0) {
          ytCurrentTimeRef.current = info.currentTime;
          onTime?.(info.currentTime);
        }

        if (typeof info.muted === 'boolean') {
          ytIsMutedRef.current = info.muted;
        }

        if (typeof info.playerState === 'number') {
          const prevSt = ytPlayerStateRef.current;
          const st = info.playerState;
          ytPlayerStateRef.current = st;

          if (st === 1) {
            onErr?.('');
            if (!curMuted && curVol > 0 && info.muted === true) {
              sendYtCommand('unMute', '');
              sendYtCommand('setVolume', [Math.max(0, Math.min(100, curVol))]);
              setTimeout(() => {
                if (ytIsMutedRef.current && !latestRef.current.localMuted && latestRef.current.localVolume > 0) {
                  latestRef.current.onNeedsUnmutePrompt?.(true);
                } else {
                  latestRef.current.onNeedsUnmutePrompt?.(false);
                }
              }, 260);
            } else {
              onPrompt?.(false);
            }
          }

          // Only host state transitions from YouTube controls propagate to Firestore
          if (isHost && !suppressBroadcastRef.current && prevSt !== st) {
            const sampleTime = typeof info.currentTime === 'number' ? info.currentTime : ytCurrentTimeRef.current;
            if (st === 1 && curSession?.isPlaying === false) {
              onTransport?.(true, sampleTime);
            } else if (st === 2 && curSession?.isPlaying === true) {
              onTransport?.(false, sampleTime);
            } else if (st === 0) {
              onTransport?.(false, ytDurationRef.current || sampleTime);
            }
          }
        }
      }
    };

    window.addEventListener('message', onYtMessage);
    return () => window.removeEventListener('message', onYtMessage);
  }, [isActive, sourceType, videoId, applyLocalAudio, sendYtCommand, scheduleAutoplayRecovery]);

  // Expose imperative resync/seek/unmute handle to parent TheatreCinema
  useEffect(() => {
    playerControlRef.current = {
      getCurrentTime: () => {
        if (sourceType === 'mp4' && videoRef.current) return videoRef.current.currentTime || 0;
        if (sourceType === 'youtube') return ytCurrentTimeRef.current || 0;
        return 0;
      },
      applyRemoteSync: (targetPlaying, targetSec, forceSeek = false) => {
        suppressBroadcastRef.current = true;
        if (sourceType === 'mp4' && videoRef.current) {
          const el = videoRef.current;
          const diff = Math.abs((el.currentTime || 0) - targetSec);
          if (forceSeek || diff > 1.8) {
            try { el.currentTime = Math.max(0, targetSec); } catch (_) {}
          }
          if (targetPlaying && el.paused) {
            el.play().catch(() => {
              el.muted = true;
              el.play().catch(() => {});
              latestRef.current.onNeedsUnmutePrompt?.(true);
            });
          } else if (!targetPlaying && !el.paused) {
            el.pause();
          }
          setTimeout(() => { suppressBroadcastRef.current = false; }, 350);
          return;
        }

        if (sourceType === 'youtube' && ytLoadedRef.current) {
          const cur = ytCurrentTimeRef.current || 0;
          const st = ytPlayerStateRef.current;
          if (forceSeek || Math.abs(cur - targetSec) > 2.2) {
            sendYtCommand('seekTo', [Math.max(0, targetSec), true]);
            ytCurrentTimeRef.current = Math.max(0, targetSec);
          }
          if (targetPlaying && st !== 1 && st !== 3) {
            if (!latestRef.current.localMuted && latestRef.current.localVolume > 0) {
              sendYtCommand('unMute', '');
              sendYtCommand('setVolume', [Math.max(0, Math.min(100, latestRef.current.localVolume))]);
            }
            sendYtCommand('playVideo', '');
            scheduleAutoplayRecovery(900);
          } else if (!targetPlaying && (st === 1 || st === 3)) {
            sendYtCommand('pauseVideo', '');
          }
          setTimeout(() => { suppressBroadcastRef.current = false; }, 500);
          return;
        }

        suppressBroadcastRef.current = false;
      },
      unmuteAndPlay: () => {
        if (sourceType === 'mp4' && videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = Math.max(0, Math.min(1, latestRef.current.localVolume / 100));
          videoRef.current.play().catch(() => {});
        } else if (sourceType === 'youtube') {
          ytIsMutedRef.current = false;
          sendYtCommand('unMute', '');
          sendYtCommand('setVolume', [Math.max(0, Math.min(100, latestRef.current.localVolume))]);
          if (latestRef.current.session?.isPlaying !== false) {
            sendYtCommand('playVideo', '');
          }
        }
      },
    };
  }, [sourceType, sendYtCommand, scheduleAutoplayRecovery, playerControlRef]);

  // Smooth local clock progression between YouTube infoDelivery ticks & for MP4
  useEffect(() => {
    if (!isActive) return undefined;
    const timer = setInterval(() => {
      if (sourceType === 'mp4' && videoRef.current) {
        const el = videoRef.current;
        if (Number.isFinite(el.duration) && el.duration > 0) latestRef.current.onDurationChange?.(el.duration);
        latestRef.current.onCurrentTimeSample?.(el.currentTime || 0);
      } else if (sourceType === 'youtube' && latestRef.current.session?.isPlaying && ytPlayerStateRef.current === 1) {
        const exp = latestRef.current.getExpectedTimeSec();
        if (Math.abs(exp - ytCurrentTimeRef.current) < 4) {
          ytCurrentTimeRef.current = ytCurrentTimeRef.current + 0.5;
        } else {
          ytCurrentTimeRef.current = exp;
        }
        latestRef.current.onCurrentTimeSample?.(ytCurrentTimeRef.current);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isActive, sourceType]);

  if (!isActive) {
    return (
      <div className="tt-theatre-idle-screen">
        <div className="tt-theatre-idle-badge" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2.5" stroke="currentColor" fill="none" />
            <path d="M8 21h8M12 18v3" stroke="currentColor" fill="none" />
            <polygon points="10,8.5 15.5,11 10,13.5" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h3 className="tt-theatre-idle-title">Tingletap Cinema Stage</h3>
        <p className="tt-theatre-idle-sub">
          {canControl
            ? 'Paste a media link below and press Start to launch synchronized watch-party playback.'
            : 'Waiting for the Theatre Host, Owner, Admin, or Moderator to start playback.'}
        </p>
        <div className="tt-theatre-idle-formats" aria-hidden="true">
          <span>YouTube</span>
          <span>Music</span>
          <span>Shorts</span>
          <span>Live</span>
          <span>MP4</span>
        </div>
      </div>
    );
  }

  if (sourceType === 'mp4') {
    return (
      <div className="tt-theatre-aspect-frame">
        <video
          ref={videoRef}
          key={videoUrl}
          src={videoUrl}
          className="tt-theatre-html-video"
          playsInline
          preload="auto"
          controls={false}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            if (Number.isFinite(el.duration) && el.duration > 0) onDurationChange(el.duration);
            const target = getExpectedTimeSec();
            try { el.currentTime = Math.max(0, target); } catch (_) {}
            el.muted = localMuted;
            el.volume = Math.max(0, Math.min(1, localVolume / 100));
            if (session?.isPlaying) {
              el.play().catch(() => {
                el.muted = true;
                el.play().catch(() => {});
                onNeedsUnmutePrompt(true);
              });
            }
          }}
          onError={() => onPlayerError?.('Could not play this MP4 stream. Check that the link is publicly reachable.')}
          onEnded={() => {
            if (canControl && videoRef.current) {
              onHostTransportEvent(false, videoRef.current.duration || 0);
            }
          }}
        />
      </div>
    );
  }

  const originParam = typeof window !== 'undefined' && window.location?.origin
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';
  const controlsVal = initialControlsRef.current;
  const autoplayVal = initialAutoplayRef.current;
  const ytEmbedSrc = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${autoplayVal}&controls=${controlsVal}&disablekb=${controlsVal ? 0 : 1}&fs=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3${originParam}`;

  return (
    <div className="tt-theatre-aspect-frame">
      <iframe
        key={videoId}
        ref={ytIframeRef}
        src={ytEmbedSrc}
        className="tt-theatre-player-host"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title={session?.title || 'Theatre YouTube Player'}
        onLoad={handleYtIframeLoad}
      />
      {!canControl && <div className="tt-theatre-viewer-shield" aria-hidden="true" />}
    </div>
  );
});

const TheatreCinema = ({
  roomId,
  roomName,
  loggedInUserProfile,
  viewerCount = 0,
  connectedUsers = [],
  theatreAllowedUids = [],
  isAppointedTheatreHost = false,
  onViewUser,
  chatPanel,
}) => {
  const stageRef = useRef(null);
  const playerControlRef = useRef(null);
  const serverOffsetRef = useRef(0);

  const [session, setSession] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [durationSec, setDurationSec] = useState(0);
  const [displayTimeSec, setDisplayTimeSec] = useState(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragSeekSec, setDragSeekSec] = useState(0);

  const [localMuted, setLocalMuted] = useState(false);
  const [localVolume, setLocalVolume] = useState(85);
  const [needsUnmutePrompt, setNeedsUnmutePrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Connected Users Sidebar (wide desktop >= 1200px) / Overlay Drawer (< 1200px & mobile)
  const [showUsersPanel, setShowUsersPanel] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth >= 1200 : false
  ));
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [keyboardMetrics, setKeyboardMetrics] = useState({
    open: false,
    inChat: false,
    shellHeightPx: null,
  });
  const baseViewportHeightRef = useRef(
    typeof window !== 'undefined' ? Math.max(window.innerHeight || 0, window.visualViewport?.height || 0) : 800
  );

  const currentUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
  const myNormRole = normalizeRole(loggedInUserProfile);
  // Theatre Host Controls belong to Owner, Admin, Moderator, and Owner-appointed Theatre Hosts
  const canControl = isStaffRole(loggedInUserProfile)
    || (Boolean(currentUid) && !isGuestUser(loggedInUserProfile) && (isAppointedTheatreHost || (Array.isArray(theatreAllowedUids) && theatreAllowedUids.includes(currentUid))));

  const isActive = session?.status === 'active' && Boolean(session?.videoUrl);
  const activeHostUid = isActive ? (session?.hostUid || '') : '';

  // Deduplicate, enrich with Host / Owner / Admin / Moderator role metadata, and sort connected users
  const enrichedUsers = useMemo(() => {
    const map = new Map();
    (Array.isArray(connectedUsers) ? connectedUsers : []).forEach((u) => {
      if (!u?.uid || u.isBanned) return;
      map.set(u.uid, u);
    });

    const list = Array.from(map.values()).map((u) => ({
      user: u,
      meta: getTheatreRoleMeta(u, activeHostUid, isActive, theatreAllowedUids),
      isSelf: Boolean(currentUid && u.uid === currentUid),
    }));

    list.sort((a, b) => {
      if (a.meta.tier !== b.meta.tier) return a.meta.tier - b.meta.tier;
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
      return String(a.user.displayName || '').localeCompare(String(b.user.displayName || ''));
    });

    return list;
  }, [connectedUsers, activeHostUid, isActive, currentUid, theatreAllowedUids]);

  const roleSummary = useMemo(() => {
    let hasHost = false;
    let owners = 0;
    let admins = 0;
    let mods = 0;
    enrichedUsers.forEach(({ meta }) => {
      if (meta.isHost) hasHost = true;
      if (meta.normRole === 'owner') owners += 1;
      else if (meta.normRole === 'admin') admins += 1;
      else if (meta.normRole === 'moderator') mods += 1;
    });
    return { total: enrichedUsers.length, hasHost, owners, admins, mods };
  }, [enrichedUsers]);

  const filteredUsers = useMemo(() => {
    const q = usersSearchQuery.trim().toLowerCase();
    if (!q) return enrichedUsers;
    return enrichedUsers.filter(({ user, meta }) => {
      const name = String(user.displayName || '').toLowerCase();
      const role = meta.roleLabel.toLowerCase();
      const hostStr = meta.isHost ? 'host' : '';
      return name.includes(q) || role.includes(q) || hostStr.includes(q);
    });
  }, [enrichedUsers, usersSearchQuery]);

  const effectiveViewerCount = enrichedUsers.length || viewerCount;

  const getServerNowMs = useCallback(() => Date.now() + (serverOffsetRef.current || 0), []);

  const getExpectedTimeSec = useCallback((overrideSession = null) => {
    const s = overrideSession || session;
    if (!s || s.status !== 'active') return 0;
    const base = Number(s.anchorTimeSec || 0);
    if (!s.isPlaying) return Math.max(0, base);
    const elapsedSec = Math.max(0, (getServerNowMs() - Number(s.anchorMs || getServerNowMs())) / 1000);
    const rate = Number(s.playbackRate || 1);
    return Math.max(0, base + elapsedSec * rate);
  }, [session, getServerNowMs]);

  // Subscribe to RTDB server clock offset for sub-second cross-device sync
  useEffect(() => {
    const unsub = onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => {
      const val = snap.val();
      if (typeof val === 'number' && Number.isFinite(val)) {
        serverOffsetRef.current = val;
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to live Theatre room watch session
  useEffect(() => {
    if (!roomId) return undefined;
    const theatreRef = doc(db, 'rooms', roomId, 'theatre', 'current');
    const unsub = onSnapshot(theatreRef, (snap) => {
      if (!snap.exists()) {
        setSession(null);
        setPlayerError('');
        return;
      }
      const data = snap.data();
      setSession(data);
      const expected = (() => {
        if (!data || data.status !== 'active') return 0;
        const base = Number(data.anchorTimeSec || 0);
        if (!data.isPlaying) return Math.max(0, base);
        const elapsed = Math.max(0, (getServerNowMs() - Number(data.anchorMs || getServerNowMs())) / 1000);
        return Math.max(0, base + elapsed * Number(data.playbackRate || 1));
      })();
      if (playerControlRef.current?.applyRemoteSync) {
        playerControlRef.current.applyRemoteSync(Boolean(data.isPlaying), expected, true);
      }
    }, () => {});
    return () => unsub();
  }, [roomId, getServerNowMs]);

  // Continuous drift guard for viewers and staff
  useEffect(() => {
    if (!session || session.status !== 'active') return undefined;
    const interval = setInterval(() => {
      if (isDraggingSeek) return;
      const expected = getExpectedTimeSec();
      if (playerControlRef.current?.applyRemoteSync) {
        playerControlRef.current.applyRemoteSync(Boolean(session.isPlaying), expected, false);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [session, isDraggingSeek, getExpectedTimeSec]);

  // Track Fullscreen API state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const [topOffsetPx, setTopOffsetPx] = useState(50);

  // Mobile soft-keyboard & top-header/Silent-Watch offset awareness so nothing clips or overlaps
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafTimer = null;

    const measureTopOffset = () => {
      if (isFullscreen) return 0;
      const hpEl = document.querySelector('.homepage-container');
      const hdrH = hpEl?.querySelector('.chat-header')?.offsetHeight || 50;
      const dockH = hpEl?.querySelector('.tt-top-dock-stack')?.offsetHeight || 0;
      return Math.max(44, hdrH + dockH);
    };

    const syncViewportLayout = () => {
      const measuredTop = measureTopOffset();
      setTopOffsetPx((prev) => (prev !== measuredTop ? measuredTop : prev));

      const vv = window.visualViewport;
      const curH = vv ? vv.height : window.innerHeight;
      const curW = window.innerWidth;
      const activeEl = document.activeElement;
      const focusedInsideStage = Boolean(
        activeEl
        && stageRef.current?.contains(activeEl)
        && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')
        && activeEl.type !== 'range'
      );
      const focusedInChat = Boolean(focusedInsideStage && activeEl.closest?.('.tt-theatre-chat-rail'));

      if (!focusedInsideStage && curH > baseViewportHeightRef.current - 40) {
        baseViewportHeightRef.current = Math.max(baseViewportHeightRef.current, curH);
      }
      if (curW >= 960) {
        setKeyboardMetrics((prev) => (prev.open || prev.inChat || prev.shellHeightPx !== null)
          ? { open: false, inChat: false, shellHeightPx: null }
          : prev);
        return;
      }

      const shrunkBy = baseViewportHeightRef.current - curH;
      const isKbOpen = shrunkBy > 115 || focusedInsideStage;
      const availPx = Math.max(220, Math.round(curH + (vv?.offsetTop || 0) - measuredTop));

      setKeyboardMetrics({
        open: isKbOpen,
        inChat: focusedInChat,
        shellHeightPx: isKbOpen ? availPx : null,
      });

      if (isKbOpen && focusedInChat && stageRef.current) {
        if (rafTimer) cancelAnimationFrame(rafTimer);
        rafTimer = requestAnimationFrame(() => {
          const feed = stageRef.current?.querySelector('.tt-theatre-chat-rail-body .chat-feed');
          if (feed) {
            const distFromBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
            if (distFromBottom < 180) {
              feed.scrollTop = feed.scrollHeight;
            }
          }
        });
      }
    };

    syncViewportLayout();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewportLayout);
    vv?.addEventListener('scroll', syncViewportLayout);
    window.addEventListener('resize', syncViewportLayout);
    document.addEventListener('focusin', syncViewportLayout);
    document.addEventListener('focusout', syncViewportLayout);

    const hpEl = document.querySelector('.homepage-container');
    let mo = null;
    if (hpEl && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => syncViewportLayout());
      mo.observe(hpEl, { childList: true, subtree: false });
    }

    return () => {
      if (rafTimer) cancelAnimationFrame(rafTimer);
      mo?.disconnect();
      vv?.removeEventListener('resize', syncViewportLayout);
      vv?.removeEventListener('scroll', syncViewportLayout);
      window.removeEventListener('resize', syncViewportLayout);
      document.removeEventListener('focusin', syncViewportLayout);
      document.removeEventListener('focusout', syncViewportLayout);
    };
  }, [isFullscreen]);

  const writeTheatreState = useCallback(async (patch) => {
    if (!roomId || !currentUid) return false;
    setIsSaving(true);
    try {
      const theatreRef = doc(db, 'rooms', roomId, 'theatre', 'current');
      await setDoc(theatreRef, {
        ...patch,
        updatedBy: currentUid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setUrlError('');
      return true;
    } catch (_) {
      setUrlError('Only Theatre Hosts, Owners, Admins, and Moderators can control Theatre playback.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [roomId, currentUid]);

  const handleLoadUrl = async (e) => {
    e.preventDefault();
    if (!canControl || isSaving) return;
    const parsed = parseTheatreMediaUrl(urlInput);
    if (!parsed.valid) {
      setUrlError(parsed.error);
      return;
    }
    setUrlError('');
    setPlayerError('');
    setNeedsUnmutePrompt(false);
    setDurationSec(0);
    setDisplayTimeSec(parsed.startSec || 0);

    const saved = await writeTheatreState({
      videoUrl: parsed.normalizedUrl,
      sourceType: parsed.sourceType,
      videoId: parsed.videoId || '',
      title: parsed.title,
      status: 'active',
      isPlaying: true,
      anchorTimeSec: parsed.startSec || 0,
      anchorMs: getServerNowMs(),
      playbackRate: 1,
      hostUid: currentUid,
      hostName: loggedInUserProfile?.displayName || 'Host',
      coHostUids: [],
    });

    if (saved) {
      setUrlInput('');
      if (parsed.sourceType === 'youtube' && parsed.videoId) {
        fetchYouTubeVideoTitle(parsed.videoId).then((realTitle) => {
          if (realTitle) {
            setDoc(doc(db, 'rooms', roomId, 'theatre', 'current'), { title: realTitle }, { merge: true }).catch(() => {});
          }
        });
      }
    }
  };

  const handleTogglePlayPause = async () => {
    if (!canControl || !session || session.status !== 'active') return;
    const curSec = playerControlRef.current?.getCurrentTime?.() ?? getExpectedTimeSec();
    const nextPlaying = !session.isPlaying;
    if (nextPlaying && !localMuted) {
      playerControlRef.current?.unmuteAndPlay?.();
    }
    await writeTheatreState({
      isPlaying: nextPlaying,
      anchorTimeSec: Math.max(0, curSec),
      anchorMs: getServerNowMs(),
    });
  };

  const handleSeekCommit = async (targetSec) => {
    if (!canControl || !session || session.status !== 'active') return;
    const clamped = Math.max(0, durationSec > 0 ? Math.min(durationSec, targetSec) : targetSec);
    setDisplayTimeSec(clamped);
    await writeTheatreState({
      anchorTimeSec: clamped,
      anchorMs: getServerNowMs(),
    });
  };

  const handleHostTransportEvent = useCallback((isPlaying, currentSec) => {
    if (!canControl || !session || session.status !== 'active') return;
    writeTheatreState({
      isPlaying,
      anchorTimeSec: Math.max(0, currentSec),
      anchorMs: getServerNowMs(),
    });
  }, [canControl, session, writeTheatreState, getServerNowMs]);

  const handleEndSession = async () => {
    if (!canControl) return;
    setPlayerError('');
    setNeedsUnmutePrompt(false);
    await writeTheatreState({
      status: 'idle',
      isPlaying: false,
      anchorTimeSec: 0,
      anchorMs: getServerNowMs(),
      videoUrl: '',
      videoId: '',
      sourceType: 'youtube',
      title: 'Session Ended',
    });
    setDurationSec(0);
    setDisplayTimeSec(0);
  };

  const handleResyncNow = () => {
    const expected = getExpectedTimeSec();
    if (playerControlRef.current?.applyRemoteSync) {
      playerControlRef.current.applyRemoteSync(Boolean(session?.isPlaying), expected, true);
    }
    if (!localMuted && session?.isPlaying) {
      playerControlRef.current?.unmuteAndPlay?.();
    }
    setDisplayTimeSec(expected);
  };

  const handleToggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {}
  };

  const activeTime = isDraggingSeek ? dragSeekSec : displayTimeSec;

  const shellClasses = [
    'tt-theatre-shell',
    chatCollapsed ? 'tt-theatre-chat-collapsed' : '',
    showUsersPanel ? 'tt-theatre-users-open' : '',
    isFullscreen ? 'tt-theatre-fullscreen' : '',
    keyboardMetrics.open ? 'tt-theatre-keyboard-open' : '',
    keyboardMetrics.inChat ? 'tt-theatre-kb-in-chat' : '',
  ].filter(Boolean).join(' ');

  const shellInlineStyle = {
    '--tt-theatre-top': `${isFullscreen ? 0 : topOffsetPx}px`,
    ...(keyboardMetrics.shellHeightPx ? { '--tt-kb-height': `${keyboardMetrics.shellHeightPx}px` } : {}),
  };

  return (
    <div ref={stageRef} className={shellClasses} style={shellInlineStyle}>
      {/* Overlay backdrop on mobile / tablet / fullscreen when Connected Users is open */}
      {showUsersPanel && (
        <div
          className="tt-theatre-users-backdrop"
          onClick={() => setShowUsersPanel(false)}
          aria-hidden="true"
        />
      )}

      {/* Theatre Connected Users Sidebar (Desktop >= 1200px) / Overlay Drawer (< 1200px & Fullscreen) */}
      {showUsersPanel && (
        <aside className="tt-theatre-users-drawer" aria-label="Theatre Connected Users">
          <div className="tt-theatre-users-header">
            <div className="tt-theatre-users-title-group">
              <span className="tt-theatre-users-icon-wrap" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" fill="none" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" fill="none" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" fill="none" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" fill="none" />
                </svg>
              </span>
              <span className="tt-theatre-users-heading">Connected Users</span>
              <span className="tt-theatre-users-count-pill">{effectiveViewerCount}</span>
            </div>
            <button
              type="button"
              className="tt-theatre-icon-btn tt-theatre-users-close"
              onClick={() => setShowUsersPanel(false)}
              title="Close Connected Users"
              aria-label="Close Connected Users"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" />
              </svg>
            </button>
          </div>

          <div className="tt-theatre-users-summary">
            {roleSummary.hasHost && (
              <span className="tt-theatre-summary-chip is-host">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 18h18v2H3v-2zm0-2l2-9 4.5 4L12 5l2.5 6L19 7l2 9H3z" fill="currentColor" />
                </svg>
                <span>Host Live</span>
              </span>
            )}
            {roleSummary.owners > 0 && (
              <span className="tt-theatre-summary-chip is-owner">
                <span>{roleSummary.owners} Owner</span>
              </span>
            )}
            {roleSummary.admins > 0 && (
              <span className="tt-theatre-summary-chip is-admin">
                <span>{roleSummary.admins} Admin</span>
              </span>
            )}
            {roleSummary.mods > 0 && (
              <span className="tt-theatre-summary-chip is-mod">
                <span>{roleSummary.mods} Mod</span>
              </span>
            )}
          </div>

          {enrichedUsers.length > 5 && (
            <div className="tt-theatre-users-search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" stroke="currentColor" fill="none" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" />
              </svg>
              <input
                type="text"
                className="tt-theatre-users-search"
                value={usersSearchQuery}
                onChange={(e) => setUsersSearchQuery(e.target.value)}
                placeholder="Filter by name or role..."
                aria-label="Filter connected users"
              />
            </div>
          )}

          <div className="tt-theatre-users-list">
            {filteredUsers.length === 0 ? (
              <div className="tt-theatre-users-empty">
                {usersSearchQuery.trim()
                  ? 'No connected users match your search.'
                  : 'No visible users connected right now.'}
              </div>
            ) : (
              filteredUsers.map(({ user, meta, isSelf }) => (
                <div
                  key={user.uid}
                  className={`tt-theatre-user-row${meta.isHost ? ' is-host-row' : ''}${typeof onViewUser === 'function' ? ' is-clickable' : ''}`}
                  onClick={() => {
                    if (typeof onViewUser === 'function') {
                      onViewUser(user);
                    }
                  }}
                  role={typeof onViewUser === 'function' ? 'button' : undefined}
                  tabIndex={typeof onViewUser === 'function' ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (typeof onViewUser === 'function' && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onViewUser(user);
                    }
                  }}
                >
                  <div className="tt-theatre-user-avatar-wrap">
                    <LiveAvatarImg
                      uid={user.uid}
                      gender={user.gender}
                      isGuest={meta.isGuest}
                      fallbackPhotoURL={user.photoURL}
                      className="tt-theatre-user-avatar"
                      alt={user.displayName || 'User'}
                    />
                    <span className="tt-theatre-user-online-dot" aria-hidden="true" />
                  </div>

                  <div className="tt-theatre-user-main">
                    <div className="tt-theatre-user-name-line">
                      <span className="tt-theatre-user-name">
                        <TheatreLiveName uid={user.uid} fallback={user.displayName} />
                      </span>
                      {renderUserBadge(user, 13)}
                      {isSelf && <span className="tt-theatre-you-tag">You</span>}
                    </div>

                    <div className="tt-theatre-user-badges">
                      {meta.isHost && (
                        <span className="tt-theatre-role-pill role-host">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M3 18h18v2H3v-2zm0-2l2-9 4.5 4L12 5l2.5 6L19 7l2 9H3z" fill="currentColor" />
                          </svg>
                          <span>Host</span>
                        </span>
                      )}

                      <span className={`tt-theatre-role-pill role-${meta.roleTone}`}>
                        {(meta.normRole === 'owner' || meta.normRole === 'admin' || meta.normRole === 'moderator') && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="currentColor" />
                          </svg>
                        )}
                        <span>{meta.roleLabel}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* Main Cinema Stage */}
      <section className="tt-theatre-stage" aria-label={`${roomName || 'Theatre'} Watch Stage`}>
        <div className="tt-theatre-topbar">
          <div className="tt-theatre-topbar-primary">
            <div className="tt-theatre-now-playing">
              <span className={`tt-theatre-live-pill${isActive ? (session?.isPlaying ? '' : ' paused') : ' idle'}`}>
                <span className="tt-theatre-live-dot" />
                <span>{isActive ? (session?.isPlaying ? 'Live' : 'Paused') : 'Standby'}</span>
              </span>
              <div className="tt-theatre-title-meta">
                <div className="tt-theatre-video-title" title={isActive ? (session?.title || 'Theatre Feature') : 'Theatre Cinema Room'}>
                  {isActive ? (session?.title || 'Theatre Feature') : 'Theatre Cinema Room'}
                </div>
                <div className="tt-theatre-host-sub">
                  {isActive
                    ? `Host: ${session?.hostName || 'Staff'} • ${effectiveViewerCount} watching`
                    : `${effectiveViewerCount} in Theatre${canControl ? ' • Host Controls Active' : ''}`}
                </div>
              </div>
            </div>

            {canControl && (
              <span
                className={`tt-theatre-staff-badge is-${isStaffRole(loggedInUserProfile) ? (myNormRole || 'host') : 'host'}`}
                title="Theatre Host Controls (Theatre Host / Owner / Admin / Moderator)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="currentColor" />
                </svg>
                <span>Host</span>
              </span>
            )}
          </div>

          <div className="tt-theatre-topbar-actions">
            <button
              type="button"
              className={`tt-theatre-icon-btn tt-theatre-audience-btn${showUsersPanel ? ' is-active' : ''}`}
              onClick={() => setShowUsersPanel((v) => !v)}
              title={showUsersPanel ? 'Hide Connected Users' : 'View Connected Users'}
              aria-expanded={showUsersPanel}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" fill="none" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" fill="none" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" fill="none" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" fill="none" />
              </svg>
              <span>{effectiveViewerCount}</span>
              <span className="tt-theatre-hide-sm">Users</span>
            </button>

            {isActive && (
              <button
                type="button"
                className="tt-theatre-icon-btn"
                onClick={handleResyncNow}
                title="Re-sync playback to host timestamp"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" stroke="currentColor" fill="none" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" fill="none" />
                </svg>
                <span className="tt-theatre-hide-sm">Sync</span>
              </button>
            )}

            <button
              type="button"
              className="tt-theatre-icon-btn"
              onClick={() => setChatCollapsed((v) => !v)}
              title={chatCollapsed ? 'Show Theatre Chat' : 'Expand Cinema View'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" fill="none" />
              </svg>
              <span className="tt-theatre-hide-sm">{chatCollapsed ? 'Chat' : 'Cinema'}</span>
            </button>

            <button
              type="button"
              className="tt-theatre-icon-btn"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Cinema'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Cinema'}
            >
              {isFullscreen ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" stroke="currentColor" fill="none" />
                  <polyline points="20 10 14 10 14 4" stroke="currentColor" fill="none" />
                  <line x1="14" y1="10" x2="21" y2="3" stroke="currentColor" />
                  <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" stroke="currentColor" fill="none" />
                  <polyline points="9 21 3 21 3 15" stroke="currentColor" fill="none" />
                  <line x1="21" y1="3" x2="14" y2="10" stroke="currentColor" />
                  <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" />
                </svg>
              )}
            </button>

            {canControl && isActive && (
              <button
                type="button"
                className="tt-theatre-icon-btn danger"
                onClick={handleEndSession}
                title="End Watch Session"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" />
                </svg>
                <span>End</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Viewport */}
        <div className="tt-theatre-viewport">
          <TheatrePlayerSurface
            session={session}
            canControl={canControl}
            localMuted={localMuted}
            localVolume={localVolume}
            getExpectedTimeSec={getExpectedTimeSec}
            onDurationChange={setDurationSec}
            onCurrentTimeSample={setDisplayTimeSec}
            onHostTransportEvent={handleHostTransportEvent}
            onNeedsUnmutePrompt={setNeedsUnmutePrompt}
            onPlayerError={setPlayerError}
            playerControlRef={playerControlRef}
          />

          {playerError && isActive && (
            <div className="tt-theatre-player-error-overlay" role="alert">
              <div className="tt-theatre-player-error-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" />
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" />
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" />
                </svg>
                <p>{playerError}</p>
                <div className="tt-theatre-player-error-actions">
                  <button
                    type="button"
                    className="tt-theatre-icon-btn"
                    onClick={() => {
                      setPlayerError('');
                      handleResyncNow();
                    }}
                  >
                    Retry Sync
                  </button>
                  {session?.videoUrl && (
                    <a
                      href={session.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tt-theatre-icon-btn"
                    >
                      Open Source
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {needsUnmutePrompt && isActive && !playerError && (
            <button
              type="button"
              className="tt-theatre-unmute-pill"
              onClick={() => {
                setLocalMuted(false);
                setNeedsUnmutePrompt(false);
                playerControlRef.current?.unmuteAndPlay?.();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" fill="none" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" fill="none" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" fill="none" />
              </svg>
              <span>Tap to Enable Audio</span>
            </button>
          )}
        </div>

        {/* Synchronized Controls & Host Start Theatre Bar */}
        {(isActive || canControl) && (
          <div className="tt-theatre-controls">
            {isActive && (
              <>
                <div className="tt-theatre-scrubber-row">
                  <span className="tt-theatre-time-label">{formatTheatreClock(activeTime)}</span>
                  <input
                    type="range"
                    className="tt-theatre-range"
                    min={0}
                    max={Math.max(1, Math.floor(durationSec || activeTime || 100))}
                    value={Math.min(Math.floor(activeTime), Math.max(1, Math.floor(durationSec || activeTime || 100)))}
                    disabled={!canControl}
                    onChange={(e) => {
                      setIsDraggingSeek(true);
                      setDragSeekSec(Number(e.target.value));
                    }}
                    onMouseUp={(e) => {
                      setIsDraggingSeek(false);
                      handleSeekCommit(Number(e.currentTarget.value));
                    }}
                    onTouchEnd={(e) => {
                      setIsDraggingSeek(false);
                      handleSeekCommit(Number(e.currentTarget.value));
                    }}
                    aria-label="Synchronized video progress"
                  />
                  <span className="tt-theatre-time-label" style={{ textAlign: 'right' }}>
                    {durationSec > 0 ? formatTheatreClock(durationSec) : '--:--'}
                  </span>
                </div>

                <div className="tt-theatre-transport-row">
                  <div className="tt-theatre-transport-left">
                    {canControl ? (
                      <>
                        <button
                          type="button"
                          className="tt-theatre-icon-btn"
                          onClick={() => handleSeekCommit(activeTime - 10)}
                          title="Rewind 10 seconds for all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 19 2 12 11 5 11 19" stroke="currentColor" fill="none" />
                            <polygon points="22 19 13 12 22 5 22 19" stroke="currentColor" fill="none" />
                          </svg>
                          <span>10s</span>
                        </button>

                        <button
                          type="button"
                          className="tt-theatre-play-btn"
                          onClick={handleTogglePlayPause}
                          title={session?.isPlaying ? 'Pause for all' : 'Play for all'}
                        >
                          {session?.isPlaying ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
                              <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="6,4 20,12 6,20" fill="currentColor" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          className="tt-theatre-icon-btn"
                          onClick={() => handleSeekCommit(activeTime + 10)}
                          title="Forward 10 seconds for all"
                        >
                          <span>10s</span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 19 22 12 13 5 13 19" stroke="currentColor" fill="none" />
                            <polygon points="2 19 11 12 2 5 2 19" stroke="currentColor" fill="none" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className="tt-theatre-viewer-sync-note">
                        Synced with {session?.hostName || 'Host'}
                      </span>
                    )}
                  </div>

                  <div className="tt-theatre-transport-right">
                    <div className="tt-theatre-vol-wrap">
                      <button
                        type="button"
                        className="tt-theatre-icon-btn"
                        style={{ padding: '0 8px' }}
                        onClick={() => {
                          const nextMuted = !localMuted;
                          setLocalMuted(nextMuted);
                          setNeedsUnmutePrompt(false);
                          if (!nextMuted) {
                            playerControlRef.current?.unmuteAndPlay?.();
                          }
                        }}
                        title={localMuted ? 'Unmute local audio' : 'Mute local audio'}
                      >
                        {localMuted || localVolume === 0 ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" fill="none" />
                            <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" />
                            <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" fill="none" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" fill="none" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        className="tt-theatre-vol-slider"
                        min={0}
                        max={100}
                        value={localMuted ? 0 : localVolume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLocalVolume(v);
                          setLocalMuted(v === 0);
                          setNeedsUnmutePrompt(false);
                        }}
                        aria-label="Local volume"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {canControl && (
              <form className="tt-theatre-source-form" onSubmit={handleLoadUrl}>
                <div className="tt-theatre-url-field">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" fill="none" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" fill="none" />
                  </svg>
                  <input
                    type="text"
                    inputMode="url"
                    className="tt-theatre-url-input"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlError) setUrlError('');
                    }}
                    placeholder="Paste YouTube, Music, Shorts or .mp4 URL..."
                    aria-label="Theatre media URL"
                  />
                </div>
                <button type="submit" className="tt-theatre-load-btn" disabled={isSaving || !urlInput.trim()}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="6,4 20,12 6,20" fill="currentColor" />
                  </svg>
                  <span>
                    {isSaving ? 'Starting...' : (
                      <>
                        {isActive ? 'Switch' : 'Start'}
                        <span className="tt-theatre-hide-xs">{isActive ? ' Video' : ' Theatre'}</span>
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

            {urlError && <div className="tt-theatre-error-bar">{urlError}</div>}
          </div>
        )}
      </section>

      {/* Right/Bottom Integrated Theatre Live Chat */}
      {!chatCollapsed && (
        <aside className="tt-theatre-chat-rail" aria-label="Theatre Live Chat">
          <div className="tt-theatre-chat-rail-header">
            <span className="tt-theatre-chat-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" fill="none" />
              </svg>
              <span>Theatre Chat</span>
            </span>
            <button
              type="button"
              className="tt-theatre-chat-active-pill"
              onClick={() => setShowUsersPanel((v) => !v)}
              title="Toggle Connected Users"
            >
              {effectiveViewerCount} active
            </button>
          </div>
          <div className="tt-theatre-chat-rail-body">
            {chatPanel}
          </div>
        </aside>
      )}
    </div>
  );
};

export default TheatreCinema;
