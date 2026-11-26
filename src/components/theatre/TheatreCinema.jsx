// src/components/theatre/TheatreCinema.jsx
// Tingletap Synchronized Watch Cinema inside the existing Theatre room.
// Strictly Owner / Admin / Moderator host controls, pure SVG icons (zero emojis),
// reliable YouTube / YouTube Music / MP4 playback + audio recovery + sub-second drift sync.

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { auth, db, rtdb } from '../../firebase/config';
import { isStaffRole } from '../../utils/roleUtils';
import { fetchYouTubeVideoTitle, formatTheatreClock, parseTheatreMediaUrl } from '../../utils/theatreMediaParser';
import './TheatreCinema.css';

// Singleton YouTube IFrame API loader with poll safety so route transitions never hang
let ytApiLoadPromise = null;
function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      if (window.YT && window.YT.Player) {
        settled = true;
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
        resolve(window.YT);
      }
    };

    const pollTimer = setInterval(finish, 180);
    const timeoutTimer = setTimeout(() => {
      if (!settled) {
        clearInterval(pollTimer);
        ytApiLoadPromise = null;
        reject(new Error('YouTube Player API load timed out'));
      }
    }, 10000);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') {
        try { prevReady(); } catch (_) {}
      }
      finish();
    };

    if (!document.getElementById('tingletap-yt-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'tingletap-yt-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        if (!settled) {
          clearInterval(pollTimer);
          clearTimeout(timeoutTimer);
          ytApiLoadPromise = null;
          reject(new Error('Failed to load YouTube Player script'));
        }
      };
      document.head.appendChild(script);
    } else {
      finish();
    }
  });
  return ytApiLoadPromise;
}

function mapYouTubeErrorMessage(code) {
  switch (Number(code)) {
    case 2:
      return 'Invalid YouTube video ID. Check the link and try again.';
    case 5:
      return 'Playback failed inside the embedded player. Click Sync or try another video.';
    case 100:
      return 'This YouTube video was removed or marked private.';
    case 101:
    case 150:
      return 'The video owner blocked external embedding (Error 150). Try another YouTube link or direct .mp4 URL.';
    default:
      return 'Unable to play this video right now. Try another YouTube link or direct .mp4 stream.';
  }
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
  onPlayerError,
  playerControlRef,
}) => {
  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);
  const suppressBroadcastRef = useRef(false);
  const autoplayTimerRef = useRef(null);
  const [ytReady, setYtReady] = useState(false);

  // Keep latest props in refs so YT.Player never tears down when staff profile/volume updates
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

  // YouTube Player lifecycle (strictly keyed on active + videoId — never rebuilt on permission or chat updates)
  useEffect(() => {
    if (!isActive || sourceType !== 'youtube' || !videoId) {
      setYtReady(false);
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    latestRef.current.onPlayerError?.('');

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !ytContainerRef.current) return;
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.destroy(); } catch (_) {}
          ytPlayerRef.current = null;
        }

        const mountEl = document.createElement('div');
        ytContainerRef.current.innerHTML = '';
        ytContainerRef.current.appendChild(mountEl);

        const initialSession = latestRef.current.session;
        const staffControls = Boolean(latestRef.current.canControl);

        ytPlayerRef.current = new YT.Player(mountEl, {
          videoId,
          width: '100%',
          height: '100%',
          host: 'https://www.youtube.com',
          playerVars: {
            autoplay: initialSession?.isPlaying ? 1 : 0,
            controls: staffControls ? 1 : 0,
            disablekb: staffControls ? 0 : 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (ev) => {
              if (cancelled) return;
              setYtReady(true);
              try {
                const {
                  session: curSession,
                  localMuted: curMuted,
                  localVolume: curVol,
                  getExpectedTimeSec: getExp,
                  onDurationChange: onDur,
                  onNeedsUnmutePrompt: onPrompt,
                } = latestRef.current;

                const dur = Number(ev.target.getDuration?.() || 0);
                if (dur > 0) onDur?.(dur);

                const targetSec = getExp();
                suppressBroadcastRef.current = true;
                if (targetSec > 1.2) {
                  ev.target.seekTo(targetSec, true);
                }

                if (curMuted) {
                  ev.target.mute();
                } else {
                  ev.target.unMute();
                  ev.target.setVolume(Math.max(0, Math.min(100, curVol)));
                }

                if (curSession?.isPlaying) {
                  ev.target.playVideo();
                  autoplayTimerRef.current = setTimeout(() => {
                    if (cancelled || !ytPlayerRef.current) return;
                    try {
                      const st = ytPlayerRef.current.getPlayerState?.();
                      const YTState = window.YT?.PlayerState;
                      if (st !== YTState?.PLAYING && st !== YTState?.BUFFERING) {
                        // Browser blocked unmuted autoplay -> start muted immediately so video plays, then show tap-for-sound
                        ytPlayerRef.current.mute();
                        ytPlayerRef.current.playVideo();
                        onPrompt?.(true);
                      } else if (ytPlayerRef.current.isMuted?.() && !latestRef.current.localMuted) {
                        ytPlayerRef.current.unMute();
                        ytPlayerRef.current.setVolume(latestRef.current.localVolume);
                      }
                    } catch (_) {}
                  }, 750);
                } else {
                  ev.target.pauseVideo();
                }

                setTimeout(() => { suppressBroadcastRef.current = false; }, 550);
              } catch (_) {
                suppressBroadcastRef.current = false;
              }
            },
            onStateChange: (ev) => {
              if (cancelled) return;
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;
              try {
                const cur = Number(ev.target.getCurrentTime?.() || 0);
                const dur = Number(ev.target.getDuration?.() || 0);
                if (dur > 0) latestRef.current.onDurationChange?.(dur);

                if (ev.data === YTState.PLAYING) {
                  latestRef.current.onPlayerError?.('');
                  if (!latestRef.current.localMuted && ev.target.isMuted?.()) {
                    latestRef.current.onNeedsUnmutePrompt?.(true);
                  } else {
                    latestRef.current.onNeedsUnmutePrompt?.(false);
                  }
                }

                if (suppressBroadcastRef.current || !latestRef.current.canControl) return;

                if (ev.data === YTState.PLAYING) {
                  latestRef.current.onHostTransportEvent?.(true, cur);
                } else if (ev.data === YTState.PAUSED) {
                  latestRef.current.onHostTransportEvent?.(false, cur);
                } else if (ev.data === YTState.ENDED) {
                  latestRef.current.onHostTransportEvent?.(false, dur || cur);
                }
              } catch (_) {}
            },
            onError: (ev) => {
              if (cancelled) return;
              latestRef.current.onPlayerError?.(mapYouTubeErrorMessage(ev?.data));
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          latestRef.current.onPlayerError?.('Could not initialize YouTube player. Check connection or disable script blockers.');
        }
      });

    return () => {
      cancelled = true;
      setYtReady(false);
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
    };
  }, [isActive, sourceType, videoId]);

  // Expose imperative resync/seek/unmute handle to parent TheatreCinema
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
        } else if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
          try {
            const yt = ytPlayerRef.current;
            const cur = Number(yt.getCurrentTime?.() || 0);
            const st = yt.getPlayerState?.();
            const YTState = window.YT?.PlayerState;

            if (forceSeek || Math.abs(cur - targetSec) > 2.2) {
              yt.seekTo(Math.max(0, targetSec), true);
            }

            if (targetPlaying && st !== YTState?.PLAYING && st !== YTState?.BUFFERING) {
              if (!latestRef.current.localMuted) {
                yt.unMute();
                yt.setVolume(Math.max(0, Math.min(100, latestRef.current.localVolume)));
              }
              yt.playVideo();
              setTimeout(() => {
                if (!ytPlayerRef.current) return;
                try {
                  const nextSt = ytPlayerRef.current.getPlayerState?.();
                  if (nextSt !== YTState?.PLAYING && nextSt !== YTState?.BUFFERING) {
                    ytPlayerRef.current.mute();
                    ytPlayerRef.current.playVideo();
                    latestRef.current.onNeedsUnmutePrompt?.(true);
                  }
                } catch (_) {}
              }, 650);
            } else if (!targetPlaying && (st === YTState?.PLAYING || st === YTState?.BUFFERING)) {
              yt.pauseVideo();
            }
          } catch (_) {}
          setTimeout(() => { suppressBroadcastRef.current = false; }, 450);
        } else {
          suppressBroadcastRef.current = false;
        }
      },
      unmuteAndPlay: () => {
        if (sourceType === 'mp4' && videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = Math.max(0, Math.min(1, latestRef.current.localVolume / 100));
          videoRef.current.play().catch(() => {});
        } else if (sourceType === 'youtube' && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(Math.max(0, Math.min(100, latestRef.current.localVolume)));
            if (latestRef.current.session?.isPlaying !== false) {
              ytPlayerRef.current.playVideo();
            }
          } catch (_) {}
        }
      },
    };
  }, [sourceType, ytReady, playerControlRef]);

  // Sample duration & current time for UI scrubber
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      if (sourceType === 'mp4' && videoRef.current) {
        const el = videoRef.current;
        if (Number.isFinite(el.duration) && el.duration > 0) latestRef.current.onDurationChange?.(el.duration);
        latestRef.current.onCurrentTimeSample?.(el.currentTime || 0);
      } else if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
        try {
          const dur = Number(ytPlayerRef.current.getDuration?.() || 0);
          if (dur > 0) latestRef.current.onDurationChange?.(dur);
          latestRef.current.onCurrentTimeSample?.(Number(ytPlayerRef.current.getCurrentTime?.() || 0));
        } catch (_) {}
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isActive, sourceType, ytReady]);

  if (!isActive) {
    return (
      <div className="tt-theatre-idle-screen">
        <div className="tt-theatre-idle-badge" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2.5" />
            <path d="M8 21h8M12 18v3" />
            <polygon points="10,8.5 15.5,11 10,13.5" fill="#c4b5fd" stroke="none" />
          </svg>
        </div>
        <h3 className="tt-theatre-idle-title">Tingletap Cinema Stage</h3>
        <p className="tt-theatre-idle-sub">
          {canControl
            ? 'Paste any YouTube, Shorts, YouTube Music, or .mp4 link below and tap Start Theatre to begin synced playback.'
            : 'Waiting for an Owner, Admin, or Moderator to start the next Theatre watch session.'}
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
  onOpenMembers,
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

  const currentUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
  // Theatre Host Controls belong exclusively to Owner, Admin, and Moderator
  const canControl = isStaffRole(loggedInUserProfile);

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
    if (!session || session.status !== 'active') return;
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
      setUrlError('Only Owners, Admins, and Moderators can control Theatre playback.');
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
  const isActive = session?.status === 'active' && Boolean(session?.videoUrl);

  return (
    <div
      ref={stageRef}
      className={`tt-theatre-shell${chatCollapsed ? ' tt-theatre-chat-collapsed' : ''}${isFullscreen ? ' tt-theatre-fullscreen' : ''}`}
    >
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
                  : `${viewerCount} in Theatre${canControl ? ' • Host Controls Ready' : ''}`}
              </div>
            </div>
          </div>

          <div className="tt-theatre-topbar-actions">
            {canControl && (
              <span className="tt-theatre-staff-badge" title="Exclusive Theatre Host Controls (Owner / Admin / Moderator)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                <span>Host</span>
              </span>
            )}

            {canControl && typeof onOpenMembers === 'function' && (
              <button
                type="button"
                className="tt-theatre-icon-btn"
                onClick={onOpenMembers}
                title="Room Members & Kick / Moderation Controls"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="tt-theatre-hide-sm">Members & Kick</span>
              </button>
            )}

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
              <span className="tt-theatre-hide-sm">{chatCollapsed ? 'Show Chat' : 'Cinema'}</span>
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
            onPlayerError={setPlayerError}
            playerControlRef={playerControlRef}
          />

          {playerError && isActive && (
            <div className="tt-theatre-player-error-overlay" role="alert">
              <div className="tt-theatre-player-error-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>{playerError}</p>
                {session?.videoUrl && (
                  <a
                    href={session.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tt-theatre-icon-btn"
                  >
                    Open Source Link
                  </a>
                )}
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
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
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
                  type="text"
                  inputMode="url"
                  className="tt-theatre-url-input"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (urlError) setUrlError('');
                  }}
                  placeholder="Paste YouTube, YouTube Music, Shorts or .mp4 URL..."
                  aria-label="Theatre media URL"
                />
                <button type="submit" className="tt-theatre-load-btn" disabled={isSaving || !urlInput.trim()}>
                  {isSaving ? 'Starting...' : (isActive ? 'Switch Video' : 'Start Theatre')}
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
