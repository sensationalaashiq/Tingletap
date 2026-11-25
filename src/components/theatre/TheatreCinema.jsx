// src/components/theatre/TheatreCinema.jsx
// Tingletap Synchronized Watch Cinema inside the existing Theatre room.
// Zero emoji icons (pure SVG icons only), real server-clock drift sync, YouTube + direct MP4 adapters.

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { auth, db, rtdb } from '../../firebase/config';
import { isStaffRole } from '../../utils/roleUtils';
import { formatTheatreClock, parseTheatreMediaUrl } from '../../utils/theatreMediaParser';
import './TheatreCinema.css';

// Singleton YouTube IFrame API loader
let ytApiLoadPromise = null;
function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise((resolve) => {
    const existing = document.getElementById('tingletap-yt-iframe-api');
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') {
        try { prevReady(); } catch (_) {}
      }
      resolve(window.YT);
    };
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'tingletap-yt-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.YT && window.YT.Player) {
      resolve(window.YT);
    }
  });
  return ytApiLoadPromise;
}

// Memoized Video Surface — NEVER re-renders when live chat messages update
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
  playerControlRef,
}) => {
  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);
  const suppressBroadcastRef = useRef(false);
  const [ytReady, setYtReady] = useState(false);

  const sourceType = session?.sourceType || 'youtube';
  const videoId = session?.videoId || '';
  const videoUrl = session?.videoUrl || '';
  const isActive = session?.status === 'active' && Boolean(videoUrl);

  // Sync local volume / mute without re-initializing player
  useEffect(() => {
    if (sourceType === 'mp4' && videoRef.current) {
      videoRef.current.muted = localMuted;
      videoRef.current.volume = Math.max(0, Math.min(1, localVolume / 100));
    } else if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
      try {
        if (localMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(Math.max(0, Math.min(100, localVolume)));
      } catch (_) {}
    }
  }, [localMuted, localVolume, sourceType, ytReady]);

  // YouTube Player lifecycle (keyed strictly by videoId / active state)
  useEffect(() => {
    if (!isActive || sourceType !== 'youtube' || !videoId) {
      setYtReady(false);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !ytContainerRef.current) return;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }

      const mountEl = document.createElement('div');
      ytContainerRef.current.innerHTML = '';
      ytContainerRef.current.appendChild(mountEl);

      const startSec = Math.max(0, Math.floor(getExpectedTimeSec()));
      ytPlayerRef.current = new YT.Player(mountEl, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: session?.isPlaying ? 1 : 0,
          controls: canControl ? 1 : 0,
          disablekb: canControl ? 0 : 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          start: startSec,
        },
        events: {
          onReady: (ev) => {
            if (cancelled) return;
            setYtReady(true);
            try {
              const dur = Number(ev.target.getDuration?.() || 0);
              if (dur > 0) onDurationChange(dur);

              const targetSec = getExpectedTimeSec();
              suppressBroadcastRef.current = true;
              ev.target.seekTo(targetSec, true);

              if (localMuted) ev.target.mute();
              else {
                ev.target.unMute();
                ev.target.setVolume(localVolume);
              }

              if (session?.isPlaying) {
                ev.target.playVideo();
                // Verify playback wasn't blocked by browser unmuted autoplay policy
                setTimeout(() => {
                  if (cancelled || !ytPlayerRef.current) return;
                  try {
                    const st = ytPlayerRef.current.getPlayerState?.();
                    if (st !== window.YT?.PlayerState?.PLAYING && st !== window.YT?.PlayerState?.BUFFERING) {
                      ytPlayerRef.current.mute();
                      ytPlayerRef.current.playVideo();
                      onNeedsUnmutePrompt(true);
                    }
                  } catch (_) {}
                }, 700);
              } else {
                ev.target.pauseVideo();
              }
              setTimeout(() => { suppressBroadcastRef.current = false; }, 450);
            } catch (_) {
              suppressBroadcastRef.current = false;
            }
          },
          onStateChange: (ev) => {
            if (cancelled || suppressBroadcastRef.current) return;
            if (!canControl) return;
            const YTState = window.YT?.PlayerState;
            if (!YTState) return;
            try {
              const cur = Number(ev.target.getCurrentTime?.() || 0);
              const dur = Number(ev.target.getDuration?.() || 0);
              if (dur > 0) onDurationChange(dur);
              if (ev.data === YTState.PLAYING) {
                onHostTransportEvent(true, cur);
              } else if (ev.data === YTState.PAUSED) {
                onHostTransportEvent(false, cur);
              } else if (ev.data === YTState.ENDED) {
                onHostTransportEvent(false, dur || cur);
              }
            } catch (_) {}
          },
        },
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
      setYtReady(false);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
    };
  }, [isActive, sourceType, videoId, canControl]);

  // Expose imperative resync/seek handle to parent TheatreCinema
  useEffect(() => {
    playerControlRef.current = {
      getCurrentTime: () => {
        if (sourceType === 'mp4' && videoRef.current) return videoRef.current.currentTime || 0;
        if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
          try { return Number(ytPlayerRef.current.getCurrentTime?.() || 0); } catch { return 0; }
        }
        return 0;
      },
      applyRemoteSync: (targetPlaying, targetSec, forceSeek = false) => {
        suppressBroadcastRef.current = true;
        if (sourceType === 'mp4' && videoRef.current) {
          const el = videoRef.current;
          const diff = Math.abs((el.currentTime || 0) - targetSec);
          if (forceSeek || diff > 1.75) {
            try { el.currentTime = Math.max(0, targetSec); } catch (_) {}
          }
          if (targetPlaying && el.paused) {
            el.play().catch(() => {
              el.muted = true;
              el.play().catch(() => {});
              onNeedsUnmutePrompt(true);
            });
          } else if (!targetPlaying && !el.paused) {
            el.pause();
          }
          setTimeout(() => { suppressBroadcastRef.current = false; }, 350);
        } else if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
          try {
            const yt = ytPlayerRef.current;
            const cur = Number(yt.getCurrentTime?.() || 0);
            const st = yt.getPlayerState?.();
            const YTState = window.YT?.PlayerState;
            if (forceSeek || Math.abs(cur - targetSec) > 1.85) {
              yt.seekTo(Math.max(0, targetSec), true);
            }
            if (targetPlaying && st !== YTState?.PLAYING && st !== YTState?.BUFFERING) {
              yt.playVideo();
            } else if (!targetPlaying && st === YTState?.PLAYING) {
              yt.pauseVideo();
            }
          } catch (_) {}
          setTimeout(() => { suppressBroadcastRef.current = false; }, 350);
        } else {
          suppressBroadcastRef.current = false;
        }
      },
      unmuteAndPlay: () => {
        if (sourceType === 'mp4' && videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = Math.max(0, Math.min(1, localVolume / 100));
          videoRef.current.play().catch(() => {});
        } else if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
          try {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(localVolume);
            if (session?.isPlaying) ytPlayerRef.current.playVideo();
          } catch (_) {}
        }
      },
    };
  }, [sourceType, ytReady, localVolume, session?.isPlaying, playerControlRef, onNeedsUnmutePrompt]);

  // Sample duration & current time for UI scrubber
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      if (sourceType === 'mp4' && videoRef.current) {
        const el = videoRef.current;
        if (Number.isFinite(el.duration) && el.duration > 0) onDurationChange(el.duration);
        onCurrentTimeSample(el.currentTime || 0);
      } else if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
        try {
          const dur = Number(ytPlayerRef.current.getDuration?.() || 0);
          if (dur > 0) onDurationChange(dur);
          onCurrentTimeSample(Number(ytPlayerRef.current.getCurrentTime?.() || 0));
        } catch (_) {}
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isActive, sourceType, ytReady, onDurationChange, onCurrentTimeSample]);

  if (!isActive) {
    return (
      <div className="tt-theatre-idle-screen">
        <div className="tt-theatre-idle-badge" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2.5" />
            <path d="M8 21h8M12 18v3" />
            <polygon points="10,8.5 15.5,11 10,13.5" fill="#c4b5fd" stroke="none" />
          </svg>
        </div>
        <h3 className="tt-theatre-idle-title">Tingletap Cinema Stage</h3>
        <p className="tt-theatre-idle-sub">
          {canControl
            ? 'Paste a YouTube link or direct .mp4 stream below to start a synchronized watch session for everyone in Theatre.'
            : 'Waiting for the Theatre host or staff to start the next feature film or stream.'}
        </p>
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
          onEnded={() => {
            if (canControl && videoRef.current) {
              onHostTransportEvent(false, videoRef.current.duration || 0);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="tt-theatre-aspect-frame">
      <div ref={ytContainerRef} className="tt-theatre-player-host" />
      {!canControl && <div className="tt-theatre-viewer-shield" aria-hidden="true" />}
    </div>
  );
});

const TheatreCinema = ({
  roomId,
  roomName,
  loggedInUserProfile,
  viewerCount = 0,
  chatPanel,
}) => {
  const stageRef = useRef(null);
  const playerControlRef = useRef(null);
  const serverOffsetRef = useRef(0);

  const [session, setSession] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
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

  const currentUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
  const isStaff = isStaffRole(loggedInUserProfile);
  const canControl = useMemo(() => {
    if (isStaff) return true;
    if (!currentUid || !session) return false;
    return session.hostUid === currentUid || (Array.isArray(session.coHostUids) && session.coHostUids.includes(currentUid));
  }, [isStaff, currentUid, session]);

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
    if (!roomId) return;
    const theatreRef = doc(db, 'rooms', roomId, 'theatre', 'current');
    const unsub = onSnapshot(theatreRef, (snap) => {
      if (!snap.exists()) {
        setSession(null);
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

  // Continuous drift guard for viewers (and controllers if another staff seeks)
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const interval = setInterval(() => {
      if (isDraggingSeek) return;
      const expected = getExpectedTimeSec();
      if (playerControlRef.current?.applyRemoteSync) {
        playerControlRef.current.applyRemoteSync(Boolean(session.isPlaying), expected, false);
      }
    }, 1400);
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

  const writeTheatreState = useCallback(async (patch) => {
    if (!roomId || !currentUid) return;
    setIsSaving(true);
    try {
      const theatreRef = doc(db, 'rooms', roomId, 'theatre', 'current');
      await setDoc(theatreRef, {
        ...patch,
        updatedBy: currentUid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setUrlError('');
    } catch (_) {
      setUrlError('You do not have permission to control playback.');
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
    setDurationSec(0);
    setDisplayTimeSec(0);
    await writeTheatreState({
      videoUrl: parsed.normalizedUrl,
      sourceType: parsed.sourceType,
      videoId: parsed.videoId || '',
      title: parsed.title,
      status: 'active',
      isPlaying: true,
      anchorTimeSec: 0,
      anchorMs: getServerNowMs(),
      playbackRate: 1,
      hostUid: session?.hostUid || currentUid,
      hostName: loggedInUserProfile?.displayName || session?.hostName || 'Host',
      coHostUids: Array.isArray(session?.coHostUids) ? session.coHostUids : [],
    });
    setUrlInput('');
  };

  const handleTogglePlayPause = async () => {
    if (!canControl || !session || session.status !== 'active') return;
    const curSec = playerControlRef.current?.getCurrentTime?.() ?? getExpectedTimeSec();
    const nextPlaying = !session.isPlaying;
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
  const isActive = session?.status === 'active' && Boolean(session?.videoUrl);

  return (
    <div ref={stageRef} className={`tt-theatre-shell${chatCollapsed ? ' tt-theatre-chat-collapsed' : ''}`}>
      {/* Left/Top Cinema Stage */}
      <section className="tt-theatre-stage" aria-label={`${roomName || 'Theatre'} Watch Stage`}>
        <div className="tt-theatre-topbar">
          <div className="tt-theatre-now-playing">
            <span className={`tt-theatre-live-pill${isActive ? '' : ' idle'}`}>
              <span className="tt-theatre-live-dot" />
              {isActive ? (session?.isPlaying ? 'Synced Live' : 'Paused') : 'Standby'}
            </span>
            <div className="tt-theatre-title-meta">
              <div className="tt-theatre-video-title">
                {isActive ? (session?.title || 'Theatre Feature') : 'Theatre Cinema Room'}
              </div>
              <div className="tt-theatre-host-sub">
                {isActive
                  ? `Hosted by ${session?.hostName || 'Staff'} • ${viewerCount} watching`
                  : `${viewerCount} in Theatre`}
              </div>
            </div>
          </div>

          <div className="tt-theatre-topbar-actions">
            {isActive && (
              <button
                type="button"
                className="tt-theatre-icon-btn"
                onClick={handleResyncNow}
                title="Re-sync playback to host timestamp"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="tt-theatre-hide-sm">{chatCollapsed ? 'Show Chat' : 'Cinema Mode'}</span>
            </button>

            <button
              type="button"
              className="tt-theatre-icon-btn"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Cinema'}
            >
              {isFullscreen ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
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
                  <rect x="5" y="5" width="14" height="14" rx="2.5" />
                </svg>
                <span className="tt-theatre-hide-sm">End</span>
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
            playerControlRef={playerControlRef}
          />

          {needsUnmutePrompt && isActive && (
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
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <span>Tap to Enable Audio</span>
            </button>
          )}
        </div>

        {/* Synchronized Controls & Host Loader Bar */}
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
                            <polygon points="11 19 2 12 11 5 11 19" />
                            <polygon points="22 19 13 12 22 5 22 19" />
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
                              <rect x="6" y="4" width="4" height="16" rx="1" />
                              <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="6,4 20,12 6,20" />
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
                            <polygon points="13 19 22 12 13 5 13 19" />
                            <polygon points="2 19 11 12 2 5 2 19" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
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
                          setLocalMuted((m) => !m);
                          setNeedsUnmutePrompt(false);
                        }}
                        title={localMuted ? 'Unmute local audio' : 'Mute local audio'}
                      >
                        {localMuted || localVolume === 0 ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" />
                            <line x1="17" y1="9" x2="23" y2="15" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
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
                <input
                  type="url"
                  className="tt-theatre-url-input"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (urlError) setUrlError('');
                  }}
                  placeholder="Paste YouTube link or direct .mp4 video URL..."
                  aria-label="Theatre media URL"
                />
                <button type="submit" className="tt-theatre-load-btn" disabled={isSaving || !urlInput.trim()}>
                  {isSaving ? 'Loading...' : (isActive ? 'Switch Video' : 'Start Watch')}
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Theatre Chat</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6' }}>
              {viewerCount} active
            </span>
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
