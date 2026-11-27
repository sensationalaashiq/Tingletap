import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  limitToLast,
  onDisconnect,
  onValue,
  push,
  query as rtdbQuery,
  ref as rtdbRef,
  remove as rtdbRemove,
  runTransaction,
  serverTimestamp as rtdbServerTimestamp,
  set as rtdbSet,
  update as rtdbUpdate,
} from 'firebase/database';
import { auth, rtdb } from '../../firebase/config';
import { pt } from '../../utils/premiumToast';
import { getIdentityKey, getIdentityColors } from '../../utils/roomModulesConfig';
import {
  getDefaultAvatarUrl,
  getStoredGuestGender,
  isGuestUser,
  isRealAvatarUpload,
} from '../../utils/roleUtils';
import LiveAvatarImg from '../LiveAvatar';
import {
  normalizeScribbleWord,
  hashScribbleWord,
  getWordPattern,
  pickWordChoices,
} from '../../data/scribbleWords';
import {
  PaletteCanvasIcon,
  BrushNibIcon,
  EraserToolIcon,
  UndoStrokeIcon,
  TrashClearIcon,
  HintBulbIcon,
  TimerClockIcon,
  TrophyCrestIcon,
  ShuffleSparkIcon,
  SendPaperPlaneIcon,
  ExitWatchIcon,
  CheckTickIcon,
  CrownRoyalIcon,
  PlayersRosterIcon,
} from '../icons/LuxuryModuleIcons';
import './ScribbleCanvasGame.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const BRUSH_COLORS = [
  '#0f172a',
  '#475569',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#2563eb',
  '#7c3aed',
  '#ec4899',
  '#92400e',
  '#ffffff',
];

const BRUSH_SIZES = [
  { id: 'sm', label: 'Fine', px: 3 },
  { id: 'md', label: 'Medium', px: 6 },
  { id: 'lg', label: 'Bold', px: 12 },
  { id: 'xl', label: 'Wide', px: 22 },
];

const ROUND_DURATIONS = [60, 90, 120];

const drawSmoothStroke = (ctx, stroke, width, height) => {
  const pts = Array.isArray(stroke?.points) ? stroke.points : [];
  if (!pts.length) return;
  const isEraser = stroke.tool === 'eraser' || stroke.color === '#ffffff';
  const strokeColor = isEraser ? '#ffffff' : (stroke.color || '#0f172a');
  const lineWidth = Math.max(1.5, ((Number(stroke.size) || 6) / CANVAS_WIDTH) * width);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = lineWidth;

  if (pts.length === 1) {
    const p = pts[0];
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, lineWidth * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x * width, pts[0].y * height);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const midX = ((pts[i].x + pts[i + 1].x) * 0.5) * width;
    const midY = ((pts[i].y + pts[i + 1].y) * 0.5) * height;
    ctx.quadraticCurveTo(pts[i].x * width, pts[i].y * height, midX, midY);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x * width, last.y * height);
  ctx.stroke();
  ctx.restore();
};

const ScribbleCanvasGame = ({
  roomId,
  isOpen = false,
  onClose,
  loggedInUserProfile,
  isMuted = false,
}) => {
  const canvasRef = useRef(null);
  const localActiveStrokeRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const liveEmitTimerRef = useRef(0);
  const guessesEndRef = useRef(null);
  const autoHintStageRef = useRef({ roundId: '', stage50: false, stage25: false });
  const roundEndingRef = useRef('');

  const [round, setRound] = useState(null);
  const [strokesMap, setStrokesMap] = useState({});
  const [liveStroke, setLiveStroke] = useState(null);
  const [guessesMap, setGuessesMap] = useState({});
  const [scoresMap, setScoresMap] = useState({});
  const [playersMap, setPlayersMap] = useState({});
  const [mySecretWord, setMySecretWord] = useState('');

  // Setup state
  const [wordChoices, setWordChoices] = useState(() => pickWordChoices(3));
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customWord, setCustomWord] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom');
  const [customHint, setCustomHint] = useState('');
  const [durationSec, setDurationSec] = useState(90);
  const [startingRound, setStartingRound] = useState(false);

  // Brush tools state
  const [brushColor, setBrushColor] = useState('#0f172a');
  const [brushSize, setBrushSize] = useState(6);
  const [toolMode, setToolMode] = useState('brush'); // 'brush' | 'eraser'
  const [localPreviewTick, setLocalPreviewTick] = useState(0);

  // Guesser input & live clock
  const [guessText, setGuessText] = useState('');
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
  const myName = loggedInUserProfile?.displayName || loggedInUserProfile?.username || 'Player';
  const myGender = loggedInUserProfile?.gender || getStoredGuestGender() || 'male';
  const myIsGuest = isGuestUser(loggedInUserProfile);
  const myIdentity = getIdentityKey(myGender);
  const myAvatar = isRealAvatarUpload(loggedInUserProfile?.photoURL)
    ? loggedInUserProfile.photoURL
    : getDefaultAvatarUrl(myUid, myGender, myIsGuest);

  const basePath = roomId ? `games/scribble/${roomId}` : '';

  // Keep server clock synchronized
  useEffect(() => {
    if (!isOpen) return undefined;
    const unsubOffset = onValue(rtdbRef(rtdb, '.info/serverTimeOffset'), (snap) => {
      const val = snap.val();
      if (typeof val === 'number' && Number.isFinite(val)) {
        setServerOffsetMs(val);
      }
    });
    const timer = setInterval(() => setNowMs(Date.now()), 500);
    return () => {
      unsubOffset();
      clearInterval(timer);
    };
  }, [isOpen]);

  // Register player presence while Scribble Canvas is open
  useEffect(() => {
    if (!isOpen || !basePath || !myUid) return undefined;
    const playerRef = rtdbRef(rtdb, `${basePath}/players/${myUid}`);
    const payload = {
      uid: myUid,
      name: myName,
      avatar: myAvatar,
      identity: myIdentity,
      joinedAt: rtdbServerTimestamp(),
      activeAt: rtdbServerTimestamp(),
    };
    rtdbSet(playerRef, payload).catch(() => {});
    const disc = onDisconnect(playerRef);
    disc.remove().catch(() => {});
    return () => {
      disc.cancel().catch(() => {});
      rtdbRemove(playerRef).catch(() => {});
    };
  }, [isOpen, basePath, myUid, myName, myAvatar, myIdentity]);

  // Subscribe to Scribble game RTDB nodes
  useEffect(() => {
    if (!isOpen || !basePath) return undefined;

    const unsubRound = onValue(rtdbRef(rtdb, `${basePath}/round`), (snap) => {
      setRound(snap.exists() ? snap.val() : null);
    });
    const unsubStrokes = onValue(rtdbRef(rtdb, `${basePath}/strokes`), (snap) => {
      setStrokesMap(snap.exists() ? (snap.val() || {}) : {});
    });
    const unsubLive = onValue(rtdbRef(rtdb, `${basePath}/liveStroke`), (snap) => {
      setLiveStroke(snap.exists() ? snap.val() : null);
    });
    const unsubGuesses = onValue(
      rtdbQuery(rtdbRef(rtdb, `${basePath}/guesses`), limitToLast(60)),
      (snap) => {
        setGuessesMap(snap.exists() ? (snap.val() || {}) : {});
      }
    );
    const unsubScores = onValue(rtdbRef(rtdb, `${basePath}/scores`), (snap) => {
      setScoresMap(snap.exists() ? (snap.val() || {}) : {});
    });
    const unsubPlayers = onValue(rtdbRef(rtdb, `${basePath}/players`), (snap) => {
      setPlayersMap(snap.exists() ? (snap.val() || {}) : {});
    });

    return () => {
      unsubRound();
      unsubStrokes();
      unsubLive();
      unsubGuesses();
      unsubScores();
      unsubPlayers();
    };
  }, [isOpen, basePath]);

  // Subscribe to drawer's private secret word ONLY for self UID
  useEffect(() => {
    if (!isOpen || !basePath || !myUid) {
      setMySecretWord('');
      return undefined;
    }
    const secretRef = rtdbRef(rtdb, `${basePath}/drawerSecret/${myUid}`);
    const unsub = onValue(secretRef, (snap) => {
      const val = snap.val();
      setMySecretWord(val?.word || '');
    }, () => setMySecretWord(''));
    return () => unsub();
  }, [isOpen, basePath, myUid]);

  const syncedNowMs = nowMs + serverOffsetMs;
  const isDrawingPhase = Boolean(round && round.status === 'drawing');
  const isDrawer = Boolean(isDrawingPhase && myUid && round?.drawerUid === myUid);
  const solvedUids = round?.solvedUids && typeof round.solvedUids === 'object' ? round.solvedUids : {};
  const hasSolved = Boolean(myUid && solvedUids[myUid]);
  const remainingSec = isDrawingPhase && round?.endsAt
    ? Math.max(0, Math.ceil((Number(round.endsAt) - syncedNowMs) / 1000))
    : 0;

  const strokesList = useMemo(() => {
    return Object.entries(strokesMap || {})
      .map(([id, st]) => ({ id, ...(st || {}) }))
      .sort((a, b) => (Number(a.seq) || Number(a.at) || 0) - (Number(b.seq) || Number(b.at) || 0));
  }, [strokesMap]);

  const guessesList = useMemo(() => {
    return Object.entries(guessesMap || {})
      .map(([id, g]) => ({ id, ...(g || {}) }))
      .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0));
  }, [guessesMap]);

  const playersRoster = useMemo(() => {
    const merged = new Map();
    Object.values(playersMap || {}).forEach((p) => {
      if (p?.uid) merged.set(p.uid, { ...p, online: true });
    });
    Object.entries(scoresMap || {}).forEach(([uidKey, s]) => {
      const existing = merged.get(uidKey);
      merged.set(uidKey, {
        uid: uidKey,
        name: existing?.name || s?.name || 'Player',
        avatar: existing?.avatar || s?.avatar || '',
        identity: existing?.identity || s?.identity || 'purush',
        score: Number(s?.points) || 0,
        online: Boolean(existing),
      });
    });
    return Array.from(merged.values()).sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      if (a.online !== b.online) return a.online ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [playersMap, scoresMap]);

  // Auto-scroll guess feed cleanly to bottom on new guesses
  useEffect(() => {
    if (!isOpen) return;
    const el = guessesEndRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [guessesList.length, isOpen]);

  // Smooth high-DPI canvas redraw via requestAnimationFrame
  useEffect(() => {
    if (!isOpen) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let rafId = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.round(CANVAS_WIDTH * dpr);
      const targetH = Math.round(CANVAS_HEIGHT * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Crisp clean sheet background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);

      strokesList.forEach((st) => drawSmoothStroke(ctx, st, targetW, targetH));

      // Draw remote live stroke (if not already drawing locally)
      if (liveStroke && liveStroke.roundId === round?.id && !localActiveStrokeRef.current) {
        drawSmoothStroke(ctx, liveStroke, targetW, targetH);
      }

      // Draw local active stroke at full 60fps zero-latency
      if (localActiveStrokeRef.current) {
        drawSmoothStroke(ctx, localActiveStrokeRef.current, targetW, targetH);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isOpen, strokesList, liveStroke, round?.id, localPreviewTick]);

  // Reveal a single unrevealed letter from drawer's secret word
  const revealNextHintLetter = useCallback(async (isAuto = false) => {
    if (!basePath || !isDrawer || !round?.id || !mySecretWord) return;
    const norm = normalizeScribbleWord(mySecretWord);
    const revealed = round.revealedMap && typeof round.revealedMap === 'object' ? round.revealedMap : {};
    const alphaIndices = [];
    for (let i = 0; i < norm.length; i += 1) {
      if (norm[i] !== ' ' && !revealed[String(i)]) {
        alphaIndices.push(i);
      }
    }
    if (!alphaIndices.length) return;
    const totalLetters = norm.replace(/\s+/g, '').length;
    const alreadyRevealedCount = Object.keys(revealed).length;
    const maxAllowed = Math.max(1, Math.floor(totalLetters * 0.6));
    if (alreadyRevealedCount >= maxAllowed) {
      if (!isAuto) pt.info('Maximum letter hints already revealed for this round!');
      return;
    }
    const pickIdx = alphaIndices[Math.floor(Math.random() * alphaIndices.length)];
    try {
      await rtdbUpdate(rtdbRef(rtdb, `${basePath}/round/revealedMap`), {
        [String(pickIdx)]: norm[pickIdx],
      });
    } catch (_) {}
  }, [basePath, isDrawer, round?.id, round?.revealedMap, mySecretWord]);

  // End current drawing round and reveal answer cleanly
  const handleEndRound = useCallback(async (reason = 'finished') => {
    if (!basePath || !round?.id || round.status === 'ended') return;
    if (roundEndingRef.current === round.id) return;
    roundEndingRef.current = round.id;

    const revealedAnswer = isDrawer && mySecretWord
      ? normalizeScribbleWord(mySecretWord)
      : (round.answerRevealed || '');

    try {
      await rtdbUpdate(rtdbRef(rtdb, `${basePath}/round`), {
        status: 'ended',
        endedReason: reason,
        endedAt: syncedNowMs,
        ...(revealedAnswer ? { answerRevealed: revealedAnswer } : {}),
      });
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/liveStroke`)).catch(() => {});
    } catch (_) {
    } finally {
      setTimeout(() => {
        roundEndingRef.current = '';
      }, 1500);
    }
  }, [basePath, round?.id, round?.status, round?.answerRevealed, isDrawer, mySecretWord, syncedNowMs]);

  // Timed automatic letter hints (50% and 25% left) & round expiry check
  useEffect(() => {
    if (!isOpen || !isDrawingPhase || !round?.id) return;
    if (autoHintStageRef.current.roundId !== round.id) {
      autoHintStageRef.current = { roundId: round.id, stage50: false, stage25: false };
    }

    const totalDur = Math.max(30, Number(round.durationSec) || 90);
    if (isDrawer && mySecretWord) {
      if (!autoHintStageRef.current.stage50 && remainingSec <= Math.floor(totalDur * 0.55) && remainingSec > 0) {
        autoHintStageRef.current.stage50 = true;
        revealNextHintLetter(true);
      }
      if (!autoHintStageRef.current.stage25 && remainingSec <= Math.floor(totalDur * 0.25) && remainingSec > 0) {
        autoHintStageRef.current.stage25 = true;
        revealNextHintLetter(true);
      }
    }

    // Check if everyone else in the game solved OR clock expired
    const otherActivePlayers = Object.keys(playersMap || {}).filter((uidKey) => uidKey !== round.drawerUid);
    const allSolved = otherActivePlayers.length > 0 && otherActivePlayers.every((uidKey) => Boolean(solvedUids[uidKey]));

    if (isDrawer && allSolved) {
      handleEndRound('all_solved');
    } else if (remainingSec <= 0 && (isDrawer || syncedNowMs > Number(round.endsAt || 0) + 2500)) {
      handleEndRound('timeout');
    }
  }, [
    isOpen,
    isDrawingPhase,
    round?.id,
    round?.durationSec,
    round?.drawerUid,
    round?.endsAt,
    isDrawer,
    mySecretWord,
    remainingSec,
    playersMap,
    solvedUids,
    syncedNowMs,
    revealNextHintLetter,
    handleEndRound,
  ]);

  const handleStartNewRound = async (e) => {
    if (e) e.preventDefault();
    if (!basePath || !myUid || startingRound) return;
    if (isMuted) {
      pt.error('You are currently muted and cannot start a Scribble round.');
      return;
    }

    const chosen = customMode
      ? {
          word: customWord,
          category: customCategory.trim() || 'Custom',
          hint: customHint.trim() || 'Visual canvas clue',
        }
      : wordChoices[selectedChoiceIdx] || wordChoices[0];

    const normalized = normalizeScribbleWord(chosen?.word || '');
    if (normalized.replace(/\s+/g, '').length < 2) {
      pt.error('Enter a drawable word with at least 2 letters.');
      return;
    }

    setStartingRound(true);
    const roundId = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const wordHash = hashScribbleWord(roundId, normalized);
    const wordPattern = getWordPattern(normalized);
    const startsAt = syncedNowMs;
    const endsAt = startsAt + durationSec * 1000;

    // Seed space positions & 0 letters initially
    const initialRevealed = {};
    for (let i = 0; i < normalized.length; i += 1) {
      if (normalized[i] === ' ') {
        initialRevealed[String(i)] = ' ';
      }
    }

    try {
      await rtdbSet(rtdbRef(rtdb, `${basePath}/drawerSecret/${myUid}`), {
        roundId,
        word: normalized,
        createdAt: startsAt,
      });
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/strokes`));
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/liveStroke`));
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/guesses`));
      await rtdbSet(rtdbRef(rtdb, `${basePath}/round`), {
        id: roundId,
        status: 'drawing',
        drawerUid: myUid,
        drawerName: myName,
        drawerIdentity: myIdentity,
        drawerAvatar: myAvatar,
        wordHash,
        wordLength: normalized.length,
        letterCount: normalized.replace(/\s+/g, '').length,
        wordPattern,
        category: String(chosen?.category || 'General').slice(0, 28),
        hint: String(chosen?.hint || 'Watch closely and guess the exact word!').slice(0, 90),
        revealedMap: initialRevealed,
        durationSec,
        startedAt: startsAt,
        endsAt,
        solvedUids: {},
        answerRevealed: '',
      });
      setCustomWord('');
      setCustomHint('');
      setWordChoices(pickWordChoices(3));
      setSelectedChoiceIdx(0);
    } catch (err) {
      pt.error(err?.message || 'Unable to start Create & Draw round.');
    } finally {
      setStartingRound(false);
    }
  };

  // Pointer drawing handlers (60fps smooth local + throttled RTDB live sync)
  const getNormalizedPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return {
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
    };
  };

  const handleCanvasPointerDown = (e) => {
    if (!isDrawer || !isDrawingPhase) return;
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const ptCoord = getNormalizedPoint(e);
    if (!ptCoord) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    isPointerDownRef.current = true;
    localActiveStrokeRef.current = {
      roundId: round?.id,
      color: toolMode === 'eraser' ? '#ffffff' : brushColor,
      size: toolMode === 'eraser' ? Math.max(14, brushSize * 1.8) : brushSize,
      tool: toolMode,
      points: [ptCoord],
    };
    setLocalPreviewTick((t) => t + 1);
  };

  const handleCanvasPointerMove = (e) => {
    if (!isPointerDownRef.current || !localActiveStrokeRef.current) return;
    e.preventDefault();
    const ptCoord = getNormalizedPoint(e);
    if (!ptCoord) return;
    const pts = localActiveStrokeRef.current.points;
    const prev = pts[pts.length - 1];
    if (prev) {
      const dist = Math.hypot(ptCoord.x - prev.x, ptCoord.y - prev.y);
      if (dist < 0.0028) return;
    }
    pts.push(ptCoord);
    setLocalPreviewTick((t) => t + 1);

    const now = Date.now();
    if (basePath && now - liveEmitTimerRef.current >= 55) {
      liveEmitTimerRef.current = now;
      const snapshot = localActiveStrokeRef.current;
      rtdbSet(rtdbRef(rtdb, `${basePath}/liveStroke`), {
        ...snapshot,
        points: snapshot.points.slice(-140),
        updatedAt: now,
      }).catch(() => {});
    }
  };

  const commitActiveStroke = async () => {
    if (!isPointerDownRef.current || !localActiveStrokeRef.current) return;
    isPointerDownRef.current = false;
    const finished = localActiveStrokeRef.current;
    localActiveStrokeRef.current = null;
    setLocalPreviewTick((t) => t + 1);

    if (!basePath || !finished?.points?.length) return;
    try {
      await push(rtdbRef(rtdb, `${basePath}/strokes`), {
        roundId: finished.roundId || round?.id || '',
        color: finished.color,
        size: finished.size,
        tool: finished.tool,
        points: finished.points,
        seq: Date.now(),
      });
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/liveStroke`)).catch(() => {});
    } catch (_) {}
  };

  const handleUndoStroke = async () => {
    if (!isDrawer || !basePath || !strokesList.length) return;
    const last = strokesList[strokesList.length - 1];
    if (!last?.id) return;
    try {
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/strokes/${last.id}`));
    } catch (_) {}
  };

  const handleClearCanvas = async () => {
    if (!isDrawer || !basePath) return;
    try {
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/strokes`));
      await rtdbRemove(rtdbRef(rtdb, `${basePath}/liveStroke`));
    } catch (_) {}
  };

  // Exact word guessing against SHA-256 hash
  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    if (!basePath || !myUid || !isDrawingPhase || isDrawer || hasSolved || submittingGuess) return;
    if (isMuted) {
      pt.error('You are muted and cannot submit guesses right now.');
      return;
    }

    const rawTrimmed = guessText.trim();
    const normGuess = normalizeScribbleWord(rawTrimmed);
    if (!normGuess) return;

    setSubmittingGuess(true);
    setGuessText('');

    try {
      const candidateHash = hashScribbleWord(round.id, normGuess);
      const isExactMatch = Boolean(round.wordHash && candidateHash === round.wordHash);

      if (isExactMatch) {
        const solverCountBefore = Object.keys(solvedUids).length;
        const earnedPts = solverCountBefore === 0 ? 100 : solverCountBefore === 1 ? 75 : 50;

        await rtdbUpdate(rtdbRef(rtdb, `${basePath}/round/solvedUids`), {
          [myUid]: {
            uid: myUid,
            name: myName,
            pts: earnedPts,
            at: Date.now(),
          },
        });

        await runTransaction(rtdbRef(rtdb, `${basePath}/scores/${myUid}`), (curr) => ({
          uid: myUid,
          name: myName,
          avatar: myAvatar,
          identity: myIdentity,
          points: (Number(curr?.points) || 0) + earnedPts,
          solvedCount: (Number(curr?.solvedCount) || 0) + 1,
        }));

        if (round.drawerUid && round.drawerUid !== myUid) {
          await runTransaction(rtdbRef(rtdb, `${basePath}/scores/${round.drawerUid}`), (curr) => ({
            uid: round.drawerUid,
            name: round.drawerName || curr?.name || 'Drawer',
            avatar: round.drawerAvatar || curr?.avatar || '',
            identity: round.drawerIdentity || curr?.identity || 'purush',
            points: (Number(curr?.points) || 0) + 25,
            solvedCount: Number(curr?.solvedCount) || 0,
          }));
        }

        await push(rtdbRef(rtdb, `${basePath}/guesses`), {
          uid: myUid,
          name: myName,
          identity: myIdentity,
          correct: true,
          pts: earnedPts,
          text: `Guessed the exact word! (+${earnedPts} pts)`,
          at: Date.now(),
        });

        pt.success(`Exact match! +${earnedPts} pts`);
      } else {
        await push(rtdbRef(rtdb, `${basePath}/guesses`), {
          uid: myUid,
          name: myName,
          identity: myIdentity,
          correct: false,
          text: rawTrimmed.slice(0, 64),
          at: Date.now(),
        });
      }
    } catch (err) {
      pt.error(err?.message || 'Unable to submit guess.');
    } finally {
      setSubmittingGuess(false);
    }
  };

  // Build masked letter-tile slots for Guessers (or full letters for Drawer)
  const letterTiles = useMemo(() => {
    if (!round) return [];
    const totalLen = Number(round.wordLength) || 0;
    const revealed = round.revealedMap && typeof round.revealedMap === 'object' ? round.revealedMap : {};
    const drawerWord = isDrawer && mySecretWord ? normalizeScribbleWord(mySecretWord) : '';
    const endedAnswer = round.status === 'ended' && round.answerRevealed ? normalizeScribbleWord(round.answerRevealed) : '';
    const visibleSource = drawerWord || endedAnswer;

    const tiles = [];
    for (let i = 0; i < totalLen; i += 1) {
      const ch = visibleSource ? (visibleSource[i] || '') : (revealed[String(i)] || '');
      const isSpace = ch === ' ' || revealed[String(i)] === ' ';
      tiles.push({
        idx: i,
        isSpace,
        char: isSpace ? ' ' : ch,
        isRevealed: Boolean(ch && !isSpace),
      });
    }
    return tiles;
  }, [round, isDrawer, mySecretWord]);

  if (!isOpen) return null;

  const canInteractRoundSetup = !isDrawingPhase;
  const activeDrawerProfile = round?.drawerUid ? playersMap?.[round.drawerUid] : null;
  const drawerStillHere = Boolean(!isDrawingPhase || activeDrawerProfile || isDrawer);

  return createPortal(
    <div className="tt-scribble-overlay" onClick={onClose}>
      <div
        className="tt-scribble-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create and Draw Scribble Game"
      >
        {/* Top Compact Header */}
        <header className="tt-scribble-hdr">
          <div className="tt-scribble-brand">
            <span className="tt-scribble-logo">
              <PaletteCanvasIcon size={18} />
            </span>
            <div className="tt-scribble-brand-text">
              <h3>Create &amp; Draw</h3>
              <span className="tt-scribble-sub">
                {isDrawingPhase ? (
                  <>
                    <strong>{round.drawerName || 'Drawer'}</strong> is sketching · {playersRoster.filter((p) => p.online).length} in game
                  </>
                ) : (
                  <>Live multiplayer canvas · exact word guess</>
                )}
              </span>
            </div>
          </div>

          <div className="tt-scribble-hdr-pills">
            {isDrawingPhase && (
              <span className={`tt-scribble-timer${remainingSec <= 15 ? ' is-urgent' : ''}`}>
                <TimerClockIcon size={13} color="currentColor" />
                <span>{remainingSec}s</span>
              </span>
            )}
            <span className="tt-scribble-players-pill" title="Active players">
              <PlayersRosterIcon size={13} color="currentColor" />
              <span>{playersRoster.filter((p) => p.online).length}</span>
            </span>
            {isDrawer && (
              <button
                type="button"
                className="tt-scribble-end-btn"
                onClick={() => handleEndRound('drawer_ended')}
              >
                End Round
              </button>
            )}
            <button
              type="button"
              className="tt-scribble-close-btn"
              onClick={onClose}
              aria-label="Close Create and Draw"
            >
              <ExitWatchIcon size={14} />
            </button>
          </div>
        </header>

        {/* Clue & Masked Letter-Tile Ribbon */}
        {round && (isDrawingPhase || round.status === 'ended') && (
          <div className={`tt-scribble-clue-bar${round.status === 'ended' ? ' is-ended' : ''}`}>
            <div className="tt-scribble-clue-meta">
              <span className="tt-scribble-cat-pill">
                <HintBulbIcon size={13} color="#f59e0b" />
                <span>{round.category || 'Clue'}</span>
              </span>
              <span className="tt-scribble-hint-text">{round.hint}</span>
            </div>

            <div className="tt-scribble-tiles-wrap" aria-label="Word letters">
              {letterTiles.map((tile) =>
                tile.isSpace ? (
                  <span key={tile.idx} className="tt-scribble-tile-gap" />
                ) : (
                  <span
                    key={tile.idx}
                    className={`tt-scribble-tile${tile.isRevealed ? ' is-revealed' : ''}${round.status === 'ended' ? ' is-final' : ''}`}
                  >
                    {tile.isRevealed ? tile.char : ''}
                  </span>
                )
              )}
              <span className="tt-scribble-len-badge">
                {Array.isArray(round.wordPattern) && round.wordPattern.length > 1
                  ? round.wordPattern.join(' + ')
                  : `${round.letterCount || 0} letters`}
              </span>
            </div>

            {isDrawer && (
              <button
                type="button"
                className="tt-scribble-reveal-btn"
                onClick={() => revealNextHintLetter(false)}
                title="Reveal one letter hint to all guessers"
              >
                <HintBulbIcon size={12} color="currentColor" />
                <span>Give Hint</span>
              </button>
            )}
          </div>
        )}

        {/* Main Responsive Split Stage */}
        <div className="tt-scribble-body">
          {/* Left: Smooth High-DPI Canvas Area OR Setup Lobby */}
          <div className="tt-scribble-stage-col">
            {canInteractRoundSetup ? (
              <form className="tt-scribble-lobby" onSubmit={handleStartNewRound}>
                {round?.status === 'ended' && (
                  <div className="tt-scribble-round-summary">
                    <div className="tt-scribble-summary-left">
                      <CrownRoyalIcon size={16} color="#f59e0b" />
                      <span>
                        Round ended! Secret word:{' '}
                        <strong>{round.answerRevealed || 'Revealed'}</strong>
                      </span>
                    </div>
                    <span className="tt-scribble-summary-solvers">
                      {Object.keys(solvedUids).length} solved
                    </span>
                  </div>
                )}

                <div className="tt-scribble-lobby-head">
                  <div>
                    <h4>Pick or Create a Word to Draw</h4>
                    <p>Everyone in this Gaming room sees your live strokes &amp; guesses the exact word.</p>
                  </div>
                  <div className="tt-scribble-mode-switch">
                    <button
                      type="button"
                      className={`tt-scribble-mode-pill${!customMode ? ' active' : ''}`}
                      onClick={() => setCustomMode(false)}
                    >
                      Curated Words
                    </button>
                    <button
                      type="button"
                      className={`tt-scribble-mode-pill${customMode ? ' active' : ''}`}
                      onClick={() => setCustomMode(true)}
                    >
                      Custom Word
                    </button>
                  </div>
                </div>

                {!customMode ? (
                  <div className="tt-scribble-choices-wrap">
                    <div className="tt-scribble-choices-grid">
                      {wordChoices.map((item, idx) => (
                        <button
                          key={`${item.word}-${idx}`}
                          type="button"
                          className={`tt-scribble-choice-card${selectedChoiceIdx === idx ? ' is-selected' : ''}`}
                          onClick={() => setSelectedChoiceIdx(idx)}
                        >
                          <span className="tt-scribble-choice-cat">{item.category}</span>
                          <strong className="tt-scribble-choice-word">{item.word}</strong>
                          <small className="tt-scribble-choice-hint">{item.hint}</small>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="tt-scribble-shuffle-btn"
                      onClick={() => {
                        setWordChoices(pickWordChoices(3));
                        setSelectedChoiceIdx(0);
                      }}
                    >
                      <ShuffleSparkIcon size={13} color="currentColor" />
                      <span>Shuffle 3 New Words</span>
                    </button>
                  </div>
                ) : (
                  <div className="tt-scribble-custom-form">
                    <div className="tt-scribble-custom-row">
                      <label>
                        Secret Word
                        <input
                          type="text"
                          maxLength={24}
                          placeholder="e.g. RAINBOW"
                          value={customWord}
                          onChange={(e) => setCustomWord(e.target.value)}
                          required={customMode}
                        />
                      </label>
                      <label>
                        Category
                        <input
                          type="text"
                          maxLength={24}
                          placeholder="Nature / Movie / Food"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      Hint for Guessers
                      <input
                        type="text"
                        maxLength={90}
                        placeholder="Short clue without spoiling the word..."
                        value={customHint}
                        onChange={(e) => setCustomHint(e.target.value)}
                      />
                    </label>
                  </div>
                )}

                <div className="tt-scribble-lobby-foot">
                  <div className="tt-scribble-dur-group">
                    <span>Timer:</span>
                    {ROUND_DURATIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className={`tt-scribble-dur-btn${durationSec === sec ? ' active' : ''}`}
                        onClick={() => setDurationSec(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="tt-scribble-start-btn"
                    disabled={startingRound || isMuted}
                  >
                    <BrushNibIcon size={15} color="#ffffff" />
                    <span>{startingRound ? 'Starting...' : 'Start Drawing'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="tt-scribble-canvas-frame">
                  <canvas
                    ref={canvasRef}
                    className={`tt-scribble-canvas${isDrawer ? ' is-drawable' : ''}`}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={commitActiveStroke}
                    onPointerCancel={commitActiveStroke}
                  />
                  {hasSolved && !isDrawer && (
                    <div className="tt-scribble-solved-toast">
                      <CheckTickIcon size={14} color="#34d399" />
                      <span>You solved it!</span>
                    </div>
                  )}
                  {!drawerStillHere && isDrawingPhase && !isDrawer && (
                    <button
                      type="button"
                      className="tt-scribble-takeover-btn"
                      onClick={() => handleEndRound('drawer_left')}
                    >
                      Drawer left · Start Next Round
                    </button>
                  )}
                </div>

                {isDrawer && (
                  <div className="tt-scribble-toolbar" role="toolbar" aria-label="Drawing tools">
                    <div className="tt-scribble-swatches">
                      {BRUSH_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className={`tt-scribble-swatch${toolMode === 'brush' && brushColor === hex ? ' active' : ''}${hex === '#ffffff' ? ' is-white' : ''}`}
                          style={{ backgroundColor: hex }}
                          onClick={() => {
                            setBrushColor(hex);
                            setToolMode('brush');
                          }}
                          aria-label={`Color ${hex}`}
                        />
                      ))}
                    </div>

                    <div className="tt-scribble-tools-right">
                      <div className="tt-scribble-sizes">
                        {BRUSH_SIZES.map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            className={`tt-scribble-size-btn${brushSize === sz.px ? ' active' : ''}`}
                            onClick={() => setBrushSize(sz.px)}
                            title={`${sz.label} brush`}
                          >
                            <span
                              className="tt-scribble-size-dot"
                              style={{
                                width: Math.max(4, Math.min(13, sz.px * 0.68)),
                                height: Math.max(4, Math.min(13, sz.px * 0.68)),
                              }}
                            />
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={`tt-scribble-tool-btn${toolMode === 'brush' ? ' active' : ''}`}
                        onClick={() => setToolMode('brush')}
                        title="Brush"
                      >
                        <BrushNibIcon size={14} color={toolMode === 'brush' ? '#ffffff' : '#8b5cf6'} />
                      </button>
                      <button
                        type="button"
                        className={`tt-scribble-tool-btn${toolMode === 'eraser' ? ' active' : ''}`}
                        onClick={() => setToolMode('eraser')}
                        title="Eraser"
                      >
                        <EraserToolIcon size={14} color={toolMode === 'eraser' ? '#ffffff' : '#f43f5e'} />
                      </button>
                      <button
                        type="button"
                        className="tt-scribble-tool-btn"
                        onClick={handleUndoStroke}
                        disabled={!strokesList.length}
                        title="Undo last stroke"
                      >
                        <UndoStrokeIcon size={14} color="#06b6d4" />
                      </button>
                      <button
                        type="button"
                        className="tt-scribble-tool-btn"
                        onClick={handleClearCanvas}
                        disabled={!strokesList.length}
                        title="Clear canvas"
                      >
                        <TrashClearIcon size={14} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Players Scoreboard & Live Exact Word Guesses */}
          <aside className="tt-scribble-side-col">
            <div className="tt-scribble-scores-box">
              <div className="tt-scribble-side-title">
                <TrophyCrestIcon size={13} color="#f59e0b" />
                <span>Players &amp; Scores</span>
              </div>
              <div className="tt-scribble-scores-list">
                {playersRoster.length === 0 ? (
                  <div className="tt-scribble-side-empty">Joining room roster...</div>
                ) : (
                  playersRoster.slice(0, 12).map((p) => {
                    const idColors = getIdentityColors(p.identity);
                    const isCurrentDrawer = Boolean(isDrawingPhase && round?.drawerUid === p.uid);
                    const isSolvedPlayer = Boolean(isDrawingPhase && solvedUids[p.uid]);
                    return (
                      <div
                        key={p.uid}
                        className={`tt-scribble-player-row${p.uid === myUid ? ' is-me' : ''}${isSolvedPlayer ? ' is-solved' : ''}`}
                      >
                        <LiveAvatarImg
                          uid={p.uid}
                          gender={p.identity === 'stree' ? 'female' : p.identity === 'navrang' ? 'other' : 'male'}
                          isGuest={false}
                          fallbackPhotoURL={p.avatar}
                          className="tt-scribble-player-av"
                          alt={p.name}
                        />
                        <div className="tt-scribble-player-info">
                          <span className="tt-scribble-player-name" style={{ color: idColors.color }}>
                            {p.name}
                          </span>
                          {isCurrentDrawer && (
                            <span className="tt-scribble-role-tag is-drawer">Drawing</span>
                          )}
                          {isSolvedPlayer && (
                            <span className="tt-scribble-role-tag is-solved">Solved</span>
                          )}
                        </div>
                        <span className="tt-scribble-player-pts">{p.score || 0}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="tt-scribble-guesses-box">
              <div className="tt-scribble-side-title">
                <PaletteCanvasIcon size={13} />
                <span>Live Guesses</span>
              </div>

              <div className="tt-scribble-guesses-feed">
                {guessesList.length === 0 ? (
                  <div className="tt-scribble-side-empty">
                    {isDrawingPhase
                      ? 'Watch the canvas and type the exact word below!'
                      : 'Start a round to draw & guess together.'}
                  </div>
                ) : (
                  guessesList.map((g) => (
                    <div
                      key={g.id}
                      className={`tt-scribble-guess-row${g.correct ? ' is-correct' : ''}`}
                    >
                      <strong style={{ color: getIdentityColors(g.identity).color }}>
                        {g.name}:
                      </strong>{' '}
                      <span>{g.text}</span>
                    </div>
                  ))
                )}
                <div ref={guessesEndRef} />
              </div>

              <form className="tt-scribble-guess-form" onSubmit={handleGuessSubmit}>
                <input
                  type="text"
                  maxLength={64}
                  className="tt-scribble-guess-input"
                  placeholder={
                    !isDrawingPhase
                      ? 'Waiting for round to start...'
                      : isDrawer
                        ? `You are drawing: ${mySecretWord || 'Word'}`
                        : hasSolved
                          ? 'Exact word solved! Wait for round end'
                          : 'Type your exact guess...'
                  }
                  value={guessText}
                  onChange={(e) => setGuessText(e.target.value)}
                  disabled={!isDrawingPhase || isDrawer || hasSolved || isMuted}
                />
                <button
                  type="submit"
                  className="tt-scribble-guess-send"
                  disabled={!isDrawingPhase || isDrawer || hasSolved || isMuted || !guessText.trim() || submittingGuess}
                  aria-label="Send guess"
                >
                  <SendPaperPlaneIcon size={14} color="#ffffff" />
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScribbleCanvasGame;
