import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { pt } from '../../utils/premiumToast';
import { getIdentityKey, getIdentityLabel } from '../../utils/roomModulesConfig';
import {
  PollBarsIcon,
  TriviaBuzzerIcon,
  SpinWheelIcon,
  AtlasGlobeIcon,
  WordTilesIcon,
  TimerClockIcon,
  TrophyCrestIcon,
  CrownRoyalIcon,
  SendPaperPlaneIcon,
  IdentityEmblem,
  CheckTickIcon,
  CrossXIcon,
  ArrowChainIcon,
  PlayersRosterIcon,
  ChevronToggleIcon,
  RankMedalIcon,
} from '../icons/LuxuryModuleIcons';
import './ChatActivityCard.css';

const WHEEL_SLICE_PAIRS = [
  ['#7c3aed', '#5b21b6'],
  ['#db2777', '#9d174d'],
  ['#0891b2', '#155e75'],
  ['#4f46e5', '#3730a3'],
  ['#d97706', '#92400e'],
  ['#059669', '#065f46'],
  ['#be185d', '#831843'],
  ['#2563eb', '#1e40af'],
  ['#9333ea', '#6b21a8'],
  ['#ea580c', '#9a3412'],
  ['#0d9488', '#115e59'],
  ['#6366f1', '#4338ca'],
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const RIM_STUDS = Array.from({ length: 24 }, (_, i) => i * 15);

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

const describeSlicePath = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArc, 0, end.x, end.y,
    'Z',
  ].join(' ');
};

const getCleanLastLetter = (str) => {
  const clean = String(str || '').trim().replace(/[^a-zA-Z]/g, '');
  return clean ? clean[clean.length - 1].toUpperCase() : 'A';
};

// Isolated memoized roulette SVG so 250ms timer ticks never disturb GPU wheel spin transitions
const LuxuryRouletteRotor = React.memo(({ entries, targetAngle, isSpinning, uidSuffix }) => {
  const sliceCount = Math.max(2, entries.length);
  const sliceAngle = 360 / sliceCount;
  const gradPrefix = `ttWheel-${uidSuffix}`;

  return (
    <div className="tt-wheel-wrap">
      <svg
        className={`tt-wheel-needle${isSpinning ? ' is-spinning' : ''}`}
        width="26"
        height="26"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${gradPrefix}-needle`} x1="14" y1="2" x2="14" y2="25" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path
          d="M14 26L5.5 6.5C5.1 5.4 5.9 4 7.1 4h13.8c1.2 0 2 1.4 1.6 2.5L14 26Z"
          fill={`url(#${gradPrefix}-needle)`}
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="9" r="2.1" fill="#0f172a" />
      </svg>

      <div
        className="tt-wheel-rotor"
        style={{ transform: `rotate(${targetAngle || 0}deg)` }}
      >
        <svg className="tt-wheel-svg" viewBox="0 0 220 220" aria-label="Spin the wheel">
          <defs>
            <linearGradient id={`${gradPrefix}-bezel`} x1="0" y1="0" x2="220" y2="220" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#d97706" />
              <stop offset="70%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <radialGradient id={`${gradPrefix}-sheen`} cx="50%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="65%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.34" />
            </radialGradient>
            <radialGradient id={`${gradPrefix}-hub`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#090d1a" />
            </radialGradient>
            {WHEEL_SLICE_PAIRS.map(([c1, c2], idx) => (
              <radialGradient key={idx} id={`${gradPrefix}-s${idx}`} cx="50%" cy="50%" r="55%">
                <stop offset="15%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </radialGradient>
            ))}
          </defs>

          {/* Brushed Gold Outer Bezel */}
          <circle cx="110" cy="110" r="108" fill="#090d1a" stroke={`url(#${gradPrefix}-bezel)`} strokeWidth="3.5" />
          <circle cx="110" cy="110" r="102" fill="#0f172a" />

          {/* Slices */}
          {entries.map((entry, idx) => {
            const startA = idx * sliceAngle;
            const endA = startA + sliceAngle;
            const midA = startA + sliceAngle / 2;
            const labelRadius = sliceCount > 8 ? 64 : 66;
            const textPos = polarToCartesian(110, 110, labelRadius, midA);
            const cleanText = String(entry).slice(0, sliceCount > 8 ? 11 : 14);
            const colorIdx = idx % WHEEL_SLICE_PAIRS.length;

            return (
              <g key={`${entry}-${idx}`}>
                <path
                  d={describeSlicePath(110, 110, 97, startA, endA)}
                  fill={`url(#${gradPrefix}-s${colorIdx})`}
                  stroke="rgba(255,255,255,0.34)"
                  strokeWidth="1.15"
                />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  fill="#ffffff"
                  fontSize={sliceCount > 8 ? '8.2' : sliceCount > 6 ? '9.2' : '10.2'}
                  fontWeight="800"
                  letterSpacing="0.02em"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
                  transform={`rotate(${midA - 90}, ${textPos.x}, ${textPos.y})`}
                >
                  {cleanText}
                </text>
              </g>
            );
          })}

          {/* 3D Lighting Sheen Overlay */}
          <circle cx="110" cy="110" r="97" fill={`url(#${gradPrefix}-sheen)`} pointerEvents="none" />
          <circle cx="110" cy="110" r="97" fill="none" stroke="rgba(254,240,138,0.45)" strokeWidth="1.2" />

          {/* Perimeter Metallic Studs */}
          {RIM_STUDS.map((deg, i) => {
            const pos = polarToCartesian(110, 110, 102.2, deg);
            return (
              <circle
                key={deg}
                cx={pos.x}
                cy={pos.y}
                r={i % 2 === 0 ? '2' : '1.4'}
                fill={i % 2 === 0 ? '#fef08a' : '#f59e0b'}
                opacity={i % 2 === 0 ? '0.96' : '0.78'}
              />
            );
          })}

          {/* Luxury Center Gemstone Hub */}
          <circle cx="110" cy="110" r="20" fill={`url(#${gradPrefix}-hub)`} stroke={`url(#${gradPrefix}-bezel)`} strokeWidth="2.8" />
          <circle cx="110" cy="110" r="13.5" fill="none" stroke="rgba(254,240,138,0.35)" strokeWidth="1" />
          <path d="M110 101.5L114.5 110L110 118.5L105.5 110Z" fill="#fde68a" />
        </svg>
      </div>
    </div>
  );
});

const ChatActivityCard = ({
  roomId,
  activityId,
  initialSnapshot,
  loggedInUserProfile,
}) => {
  const [activity, setActivity] = useState(initialSnapshot || null);
  const [votesList, setVotesList] = useState([]);
  const [rosterExpanded, setRosterExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [entryInput, setEntryInput] = useState('');
  const [wordStatusMsg, setWordStatusMsg] = useState('');

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || null;
  const myName = loggedInUserProfile?.displayName || 'Member';
  const myIdentity = getIdentityKey(loggedInUserProfile);

  useEffect(() => {
    if (initialSnapshot) {
      setActivity(initialSnapshot);
    }
  }, [initialSnapshot]);

  // Subscribe to ALL participants' votes / answers / wheel spins so everyone sees names, picks & points
  useEffect(() => {
    if (!roomId || !activityId) return;
    if (activity?.type && !['poll', 'trivia', 'wheel'].includes(activity.type)) return;
    const votesColRef = collection(db, 'rooms', roomId, 'activities', activityId, 'votes');
    const unsub = onSnapshot(
      votesColRef,
      (snap) => {
        const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const ptDiff = (b.pts || 0) - (a.pts || 0);
          if (ptDiff !== 0) return ptDiff;
          return (a.respondedAtMs || 0) - (b.respondedAtMs || 0);
        });
        setVotesList(rows);
      },
      () => {}
    );
    return () => unsub();
  }, [roomId, activityId, activity?.type]);

  const myVote = useMemo(
    () => (myUid ? votesList.find((v) => v.uid === myUid) || null : null),
    [votesList, myUid]
  );

  const needsTick = Boolean(
    activity &&
      ((activity.endsAtMs && nowMs < activity.endsAtMs + 1000) ||
        (activity.type === 'wheel' && activity.spinStartedAtMs && nowMs - activity.spinStartedAtMs < 4600))
  );

  useEffect(() => {
    if (!needsTick) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [needsTick]);

  const handlePollVote = async (optionIdx) => {
    if (!roomId || !activityId || !myUid || busy) return;
    if (activity?.status === 'ended') return;
    if (activity?.endsAtMs && Date.now() >= activity.endsAtMs) {
      pt.info('Voting time has closed for this poll.');
      return;
    }
    setBusy(true);
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      const voteRef = doc(db, 'rooms', roomId, 'activities', activityId, 'votes', myUid);

      await runTransaction(db, async (tx) => {
        const [actSnap, voteSnap] = await Promise.all([tx.get(actRef), tx.get(voteRef)]);
        if (!actSnap.exists()) throw new Error('Activity no longer exists.');
        const data = actSnap.data();
        if (data.status === 'ended' || (data.endsAtMs && Date.now() >= data.endsAtMs)) {
          throw new Error('This poll has closed.');
        }

        const options = Array.isArray(data.options) ? data.options.map((o) => ({ ...o })) : [];
        if (optionIdx < 0 || optionIdx >= options.length) return;

        const prevIdx = voteSnap.exists() ? voteSnap.data().optionIndex : null;
        if (prevIdx === optionIdx) return;

        let nextTotal = typeof data.totalVotes === 'number' ? data.totalVotes : 0;
        if (prevIdx !== null && prevIdx >= 0 && prevIdx < options.length) {
          options[prevIdx].count = Math.max(0, (options[prevIdx].count || 0) - 1);
        } else {
          nextTotal += 1;
        }
        options[optionIdx].count = (options[optionIdx].count || 0) + 1;

        tx.update(actRef, {
          options,
          totalVotes: nextTotal,
          updatedAt: serverTimestamp(),
        });
        tx.set(voteRef, {
          uid: myUid,
          displayName: myName,
          identity: myIdentity,
          optionIndex: optionIdx,
          isCorrect: false,
          pts: 5,
          respondedAtMs: Date.now(),
          createdAt: serverTimestamp(),
        });
      });
    } catch (err) {
      pt.error(err?.message || 'Unable to submit vote right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleTriviaAnswer = async (optionIdx) => {
    if (!roomId || !activityId || !myUid || busy) return;
    if (myVote) return;
    if (activity?.endsAtMs && Date.now() > activity.endsAtMs) {
      pt.info('Time expired for this trivia round.');
      return;
    }
    setBusy(true);
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      const voteRef = doc(db, 'rooms', roomId, 'activities', activityId, 'votes', myUid);

      await runTransaction(db, async (tx) => {
        const [actSnap, voteSnap] = await Promise.all([tx.get(actRef), tx.get(voteRef)]);
        if (!actSnap.exists()) throw new Error('Trivia card not found.');
        if (voteSnap.exists()) return;

        const data = actSnap.data();
        const isCorrect = optionIdx === data.correctIndex;
        const clickMs = Date.now();
        const isFirstWinner = isCorrect && !data.winnerLocked && !data.firstCorrectUid;
        const earnedPts = isFirstWinner ? 50 : isCorrect ? 25 : 0;

        tx.set(voteRef, {
          uid: myUid,
          displayName: myName,
          identity: myIdentity,
          optionIndex: optionIdx,
          isCorrect,
          pts: earnedPts,
          respondedAtMs: clickMs,
          createdAt: serverTimestamp(),
        });

        const updates = {
          attemptCount: (typeof data.attemptCount === 'number' ? data.attemptCount : 0) + 1,
          updatedAt: serverTimestamp(),
        };

        if (isFirstWinner) {
          updates.firstCorrectUid = myUid;
          updates.firstCorrectName = myName;
          updates.firstCorrectIdentity = myIdentity;
          updates.firstCorrectAtMs = clickMs;
          updates.winnerLocked = true;
        }
        tx.update(actRef, updates);
      });
    } catch (err) {
      pt.error(err?.message || 'Could not record buzzer response.');
    } finally {
      setBusy(false);
    }
  };

  const handleSpinWheel = async () => {
    if (!roomId || !activityId || !myUid || busy) return;
    const entries = Array.isArray(activity?.entries) ? activity.entries : [];
    if (entries.length < 2) return;
    if (activity?.spinStartedAtMs && Date.now() - activity.spinStartedAtMs < 4250) return;

    setBusy(true);
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      const voteRef = doc(db, 'rooms', roomId, 'activities', activityId, 'votes', myUid);

      await runTransaction(db, async (tx) => {
        const [snap, voteSnap] = await Promise.all([tx.get(actRef), tx.get(voteRef)]);
        if (!snap.exists()) return;
        const data = snap.data();
        const list = Array.isArray(data.entries) ? data.entries : [];
        if (list.length < 2) return;

        const winnerIdx = Math.floor(Math.random() * list.length);
        const nextSeq = (typeof data.spinSeq === 'number' ? data.spinSeq : 0) + 1;
        const sliceAngle = 360 / list.length;
        const targetSliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
        const jitter = (Math.random() - 0.5) * sliceAngle * 0.42;
        const desiredMod = (360 - targetSliceCenter + jitter + 360) % 360;
        const prevAngle = typeof data.targetAngle === 'number' ? data.targetAngle : 0;
        const baseRotations = Math.floor(prevAngle / 360) * 360 + 7 * 360;
        const nextAngle = baseRotations + desiredMod;

        tx.update(actRef, {
          spinSeq: nextSeq,
          winnerIndex: winnerIdx,
          winnerLabel: list[winnerIdx],
          spinStartedAtMs: Date.now(),
          targetAngle: nextAngle,
          status: 'spinning',
          updatedAt: serverTimestamp(),
        });

        const prevData = voteSnap.exists() ? voteSnap.data() : {};
        tx.set(voteRef, {
          uid: myUid,
          displayName: myName,
          identity: myIdentity,
          optionIndex: Math.max(0, Math.min(11, winnerIdx)),
          lastResult: list[winnerIdx],
          spinCount: (prevData.spinCount || 0) + 1,
          pts: (prevData.pts || 0) + 15,
          respondedAtMs: Date.now(),
          createdAt: prevData.createdAt || serverTimestamp(),
        });
      });
    } catch (err) {
      pt.error(err?.message || 'Unable to spin right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleAtlasSubmit = async (e) => {
    e.preventDefault();
    if (!roomId || !activityId || !myUid || busy) return;
    const raw = entryInput.trim().replace(/\s+/g, ' ');
    const alphaOnly = raw.replace(/[^a-zA-Z]/g, '');
    if (alphaOnly.length < 2) {
      pt.warning('Enter a valid place name (at least 2 letters).');
      return;
    }
    if (activity?.endsAtMs && Date.now() >= activity.endsAtMs) {
      pt.info('Time expired for this Atlas round.');
      return;
    }

    setBusy(true);
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(actRef);
        if (!snap.exists()) throw new Error('Atlas game no longer exists.');
        const data = snap.data();
        if (data.endsAtMs && Date.now() >= data.endsAtMs) {
          throw new Error('Time is up for this Atlas round.');
        }

        const expectedLetter = String(data.requiredLetter || 'A').toUpperCase();
        const firstChar = alphaOnly[0].toUpperCase();
        if (firstChar !== expectedLetter) {
          throw new Error(`Place must start with "${expectedLetter}".`);
        }

        const normalizedKey = alphaOnly.toLowerCase();
        const usedKeys = Array.isArray(data.usedKeys) ? data.usedKeys : [];
        if (usedKeys.includes(normalizedKey)) {
          throw new Error(`"${raw}" has already been played.`);
        }

        const formattedPlace = raw
          .split(' ')
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
          .join(' ')
          .slice(0, 36);
        const nextRequired = getCleanLastLetter(alphaOnly);
        const prevEntries = Array.isArray(data.entries) ? data.entries : [];
        const nextEntries = [...prevEntries.slice(-24), { word: formattedPlace, uid: myUid, name: myName }];
        const nextUsed = [...usedKeys.slice(-80), normalizedKey];
        const lengthBonus = alphaOnly.length >= 9 ? 5 : alphaOnly.length >= 6 ? 2 : 0;
        const prevScores = { ...(data.scores || {}) };
        const prevEntry = prevScores[myUid] || { name: myName, pts: 0, wordsCount: 0 };
        prevScores[myUid] = {
          name: myName,
          identity: myIdentity,
          pts: (prevEntry.pts || 0) + 10 + lengthBonus,
          wordsCount: (prevEntry.wordsCount || 0) + 1,
          lastWord: formattedPlace,
        };

        const roundDurMs = (Number(data.durationSec) || 60) * 1000;
        const nextEndsAtMs = Math.max(Date.now() + Math.min(roundDurMs, 30000), data.endsAtMs || 0);

        tx.update(actRef, {
          entries: nextEntries,
          usedKeys: nextUsed,
          currentPlace: formattedPlace,
          requiredLetter: nextRequired,
          lastPlayerUid: myUid,
          lastPlayerName: myName,
          scores: prevScores,
          round: (typeof data.round === 'number' ? data.round : 1) + 1,
          endsAtMs: nextEndsAtMs,
          updatedAt: serverTimestamp(),
        });
      });
      setEntryInput('');
    } catch (err) {
      pt.warning(err?.message || 'Could not submit place.');
    } finally {
      setBusy(false);
    }
  };

  const handleWordSubmit = async (e) => {
    e.preventDefault();
    if (!roomId || !activityId || !myUid || busy) return;
    const raw = entryInput.trim().replace(/[^a-zA-Z]/g, '');
    if (raw.length < 2) {
      pt.warning('Enter a valid word.');
      return;
    }
    if (activity?.endsAtMs && Date.now() >= activity.endsAtMs) {
      pt.info('Time expired for this Word Challenge.');
      return;
    }

    setBusy(true);
    setWordStatusMsg('');
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(actRef);
        if (!snap.exists()) throw new Error('Word Challenge not found.');
        const data = snap.data();
        if (data.endsAtMs && Date.now() >= data.endsAtMs) {
          throw new Error('Time is up for this challenge.');
        }

        if (data.mode === 'chain') {
          if (raw.length < 3) throw new Error('Word Chain entries need at least 3 letters.');
          const expectedLetter = String(data.requiredLetter || 'A').toUpperCase();
          if (raw[0].toUpperCase() !== expectedLetter) {
            throw new Error(`Word must start with "${expectedLetter}".`);
          }
          const key = raw.toLowerCase();
          const usedKeys = Array.isArray(data.usedKeys) ? data.usedKeys : [];
          if (usedKeys.includes(key)) {
            throw new Error(`"${raw.toUpperCase()}" was already used.`);
          }
          const upper = raw.toUpperCase().slice(0, 22);
          const nextReq = getCleanLastLetter(upper);
          const prevEntries = Array.isArray(data.entries) ? data.entries : [];
          const lengthBonus = upper.length >= 8 ? 5 : upper.length >= 6 ? 2 : 0;
          const prevScores = { ...(data.scores || {}) };
          const prevUser = prevScores[myUid] || { name: myName, pts: 0, wordsCount: 0 };
          prevScores[myUid] = {
            name: myName,
            identity: myIdentity,
            pts: (prevUser.pts || 0) + 10 + lengthBonus,
            wordsCount: (prevUser.wordsCount || 0) + 1,
            lastWord: upper,
          };
          const roundDurMs = (Number(data.durationSec) || 60) * 1000;

          tx.update(actRef, {
            currentWord: upper,
            requiredLetter: nextReq,
            entries: [...prevEntries.slice(-24), { word: upper, uid: myUid, name: myName }],
            usedKeys: [...usedKeys.slice(-80), key],
            scores: prevScores,
            round: (typeof data.round === 'number' ? data.round : 1) + 1,
            endsAtMs: Math.max(Date.now() + Math.min(roundDurMs, 25000), data.endsAtMs || 0),
            updatedAt: serverTimestamp(),
          });
        } else {
          const guessUpper = raw.toUpperCase();
          const target = String(data.answerWord || '').toUpperCase();
          const nextAttempt = (typeof data.attemptCount === 'number' ? data.attemptCount : 0) + 1;
          if (guessUpper !== target) {
            tx.update(actRef, {
              attemptCount: nextAttempt,
              updatedAt: serverTimestamp(),
            });
            setWordStatusMsg('Not a match. Try rearranging the tiles.');
            return;
          }

          const solvedBy = Array.isArray(data.solvedBy) ? [...data.solvedBy] : [];
          const isFirst = !data.winnerLocked && !data.firstCorrectUid;
          if (!solvedBy.some((s) => s.uid === myUid)) {
            solvedBy.push({
              uid: myUid,
              name: myName,
              identity: myIdentity,
              pts: isFirst ? 50 : 25,
              solvedAtMs: Date.now(),
            });
          }

          const updates = {
            attemptCount: nextAttempt,
            solvedBy,
            updatedAt: serverTimestamp(),
          };
          if (isFirst) {
            updates.firstCorrectUid = myUid;
            updates.firstCorrectName = myName;
            updates.firstCorrectIdentity = myIdentity;
            updates.firstCorrectAtMs = Date.now();
            updates.winnerLocked = true;
          }
          tx.update(actRef, updates);
          setWordStatusMsg('Solved.');
        }
      });
      setEntryInput('');
    } catch (err) {
      pt.warning(err?.message || 'Could not submit word.');
    } finally {
      setBusy(false);
    }
  };

  const wheelEntries = useMemo(
    () => (Array.isArray(activity?.entries) ? activity.entries : []),
    [activity?.entries]
  );

  if (!activity) return null;

  const totalDurMs = Math.max(1000, (Number(activity.durationSec) || 30) * 1000);
  const remainingMs = activity.endsAtMs ? Math.max(0, activity.endsAtMs - nowMs) : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const isTimeUp = Boolean(activity.endsAtMs && nowMs >= activity.endsAtMs);
  const timerPct = activity.endsAtMs ? Math.max(0, Math.min(100, (remainingMs / totalDurMs) * 100)) : 0;
  const isUrgent = Boolean(activity.endsAtMs && !isTimeUp && secondsLeft <= 8);

  const visibleRosterCap = rosterExpanded ? 50 : 4;

  // ── 1. LIVE QUICK POLL ──────────────────────────────────────────────────
  if (activity.type === 'poll') {
    const options = Array.isArray(activity.options) ? activity.options : [];
    const totalVotes = typeof activity.totalVotes === 'number'
      ? activity.totalVotes
      : options.reduce((acc, o) => acc + (o.count || 0), 0);
    const closed = activity.status === 'ended' || isTimeUp;
    const shownVoters = votesList.slice(0, visibleRosterCap);

    return (
      <div className="tt-act-card" data-activity-type="poll">
        <div className="tt-act-head">
          <span className="tt-act-kicker tt-kicker--poll">
            <PollBarsIcon size={13} color="currentColor" />
            <span>Live Poll</span>
            {!closed && <span className="tt-live-pulse-dot" />}
          </span>
          {activity.endsAtMs ? (
            <span className={`tt-act-timer${isTimeUp ? ' is-ended' : isUrgent ? ' is-urgent' : ''}`}>
              <TimerClockIcon size={11} color="currentColor" />
              {isTimeUp ? 'Closed' : `${secondsLeft}s`}
            </span>
          ) : (
            <span className="tt-act-meta-right">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          )}
        </div>

        {activity.endsAtMs && (
          <div className="tt-timer-track">
            <span className="tt-timer-fill" style={{ width: `${timerPct}%` }} />
          </div>
        )}

        <h5 className="tt-act-title">{activity.title}</h5>

        <div className="tt-poll-list">
          {options.map((opt, idx) => {
            const count = opt.count || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = myVote?.optionIndex === idx;
            return (
              <button
                key={opt.id || idx}
                type="button"
                disabled={busy || closed}
                onClick={() => handlePollVote(idx)}
                className={`tt-poll-opt${isSelected ? ' is-selected' : ''}`}
              >
                <span className="tt-poll-bar" style={{ width: `${pct}%` }} />
                <span className="tt-poll-opt-inner">
                  <span className="tt-poll-opt-left">
                    <span className={`tt-poll-radio${isSelected ? ' is-checked' : ''}`}>
                      {isSelected && <CheckTickIcon size={10} color="#ffffff" />}
                    </span>
                    <span className="tt-opt-keycap tt-opt-keycap--sm">{OPTION_LETTERS[idx] || idx + 1}</span>
                    <span className="tt-poll-opt-label">{opt.label}</span>
                  </span>
                  <span className="tt-poll-opt-pct">
                    {pct}%<span className="tt-poll-opt-cnt"> · {count}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {votesList.length > 0 && (
          <div className="tt-roster-box">
            <div className="tt-roster-hdr">
              <span className="tt-roster-title">
                <PlayersRosterIcon size={12} color="currentColor" />
                <span>Voters ({votesList.length})</span>
              </span>
              {votesList.length > 4 && (
                <button
                  type="button"
                  className="tt-roster-toggle"
                  onClick={() => setRosterExpanded((v) => !v)}
                >
                  <span>{rosterExpanded ? 'Less' : `+${votesList.length - 4} more`}</span>
                  <ChevronToggleIcon size={11} rotated={rosterExpanded} />
                </button>
              )}
            </div>
            <div className="tt-roster-list">
              {shownVoters.map((v) => {
                const pickedOpt = options[v.optionIndex];
                return (
                  <div key={v.uid} className={`tt-roster-row${v.uid === myUid ? ' is-me' : ''}`}>
                    <span className="tt-roster-player">
                      <IdentityEmblem identity={v.identity} size={12} />
                      <span className="tt-roster-name">{v.displayName || 'Member'}</span>
                    </span>
                    <span className="tt-roster-right">
                      <span className="tt-roster-choice">
                        {OPTION_LETTERS[v.optionIndex] || '?'} · {pickedOpt?.label || 'Vote'}
                      </span>
                      <span className="tt-roster-pts">+{v.pts || 5} pts</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="tt-act-foot">
          <span className="tt-foot-creator">
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            <span>{activity.creatorName || 'Member'}</span>
          </span>
          <span className="tt-foot-meta">{totalVotes} votes · {myVote ? 'Voted (+5 pts)' : closed ? 'Closed' : 'Tap to vote'}</span>
        </div>
      </div>
    );
  }

  // ── 2. RAPID TRIVIA / BUZZER ────────────────────────────────────────────
  if (activity.type === 'trivia') {
    const options = Array.isArray(activity.options) ? activity.options : [];
    const showReveal = Boolean(myVote || isTimeUp || activity.firstCorrectUid);
    const shownRespondents = votesList.slice(0, visibleRosterCap);

    return (
      <div className="tt-act-card" data-activity-type="trivia">
        <div className="tt-act-head">
          <span className="tt-act-kicker tt-kicker--trivia">
            <TriviaBuzzerIcon size={13} color="currentColor" />
            <span>Rapid Trivia</span>
            {!isTimeUp && <span className="tt-live-pulse-dot" />}
          </span>
          <span className={`tt-act-timer${isTimeUp ? ' is-ended' : isUrgent ? ' is-urgent' : ''}`}>
            <TimerClockIcon size={11} color="currentColor" />
            {isTimeUp ? 'Closed' : `${secondsLeft}s`}
          </span>
        </div>

        {activity.endsAtMs && (
          <div className="tt-timer-track">
            <span className="tt-timer-fill tt-timer-fill--cyan" style={{ width: `${timerPct}%` }} />
          </div>
        )}

        <h5 className="tt-act-title">{activity.title}</h5>

        <div className="tt-poll-list">
          {options.map((optLabel, idx) => {
            const isSelected = myVote?.optionIndex === idx;
            const isCorrectOpt = idx === activity.correctIndex;
            let stateClass = '';
            if (showReveal && isCorrectOpt) stateClass = ' is-correct';
            else if (isSelected && !isCorrectOpt) stateClass = ' is-wrong';
            else if (isSelected) stateClass = ' is-selected';

            return (
              <button
                key={idx}
                type="button"
                disabled={busy || Boolean(myVote) || isTimeUp}
                onClick={() => handleTriviaAnswer(idx)}
                className={`tt-poll-opt tt-trivia-opt${stateClass}`}
              >
                <span className="tt-poll-opt-inner">
                  <span className="tt-poll-opt-left">
                    <span className="tt-opt-keycap">{OPTION_LETTERS[idx] || idx + 1}</span>
                    <span className="tt-poll-opt-label">{optLabel}</span>
                  </span>
                  {showReveal && isCorrectOpt && (
                    <span className="tt-state-tag tt-state-ok">
                      <CheckTickIcon size={11} color="currentColor" />
                      <span>Correct</span>
                    </span>
                  )}
                  {isSelected && !isCorrectOpt && (
                    <span className="tt-state-tag tt-state-bad">
                      <CrossXIcon size={10} color="currentColor" />
                      <span>Wrong</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {activity.firstCorrectUid && (
          <div className="tt-winner-strip">
            <CrownRoyalIcon size={14} color="#fbbf24" />
            <span>
              Fastest: <strong>{activity.firstCorrectName}</strong> · {getIdentityLabel(activity.firstCorrectIdentity)} · <strong>+50 pts</strong>
            </span>
          </div>
        )}

        {votesList.length > 0 && (
          <div className="tt-roster-box">
            <div className="tt-roster-hdr">
              <span className="tt-roster-title">
                <TrophyCrestIcon size={12} color="#fbbf24" />
                <span>Answers &amp; Points ({votesList.length})</span>
              </span>
              {votesList.length > 4 && (
                <button
                  type="button"
                  className="tt-roster-toggle"
                  onClick={() => setRosterExpanded((v) => !v)}
                >
                  <span>{rosterExpanded ? 'Less' : `+${votesList.length - 4} more`}</span>
                  <ChevronToggleIcon size={11} rotated={rosterExpanded} />
                </button>
              )}
            </div>
            <div className="tt-roster-list">
              {shownRespondents.map((v, idx) => (
                <div key={v.uid} className={`tt-roster-row${v.uid === myUid ? ' is-me' : ''}`}>
                  <span className="tt-roster-player">
                    {idx < 3 && (v.pts || 0) > 0 ? (
                      <RankMedalIcon rank={idx + 1} size={12} />
                    ) : (
                      <IdentityEmblem identity={v.identity} size={12} />
                    )}
                    <span className="tt-roster-name">{v.displayName || 'Member'}</span>
                  </span>
                  <span className="tt-roster-right">
                    <span className={`tt-roster-ans${v.isCorrect ? ' is-ok' : ' is-bad'}`}>
                      {v.isCorrect ? <CheckTickIcon size={10} color="currentColor" /> : <CrossXIcon size={9} color="currentColor" />}
                      <span>{OPTION_LETTERS[v.optionIndex] || '?'}</span>
                    </span>
                    <span className={`tt-roster-pts${(v.pts || 0) > 0 ? ' is-earned' : ''}`}>
                      +{v.pts || 0} pts
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tt-act-foot">
          <span className="tt-foot-creator">
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            <span>{activity.creatorName || 'Member'}</span>
          </span>
          <span className="tt-foot-meta">
            {votesList.length || activity.attemptCount || 0} answers · +50/+25 pts
          </span>
        </div>
      </div>
    );
  }

  // ── 3. ATLAS PLACE CHAIN ────────────────────────────────────────────────
  if (activity.type === 'atlas') {
    const entries = Array.isArray(activity.entries) ? activity.entries : [];
    const trail = entries.slice(-5);
    const allScoreRows = Object.entries(activity.scores || {})
      .map(([uid, info]) => ({ uid, ...(info || {}) }))
      .sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const shownScores = allScoreRows.slice(0, rosterExpanded ? 50 : 5);

    return (
      <div className="tt-act-card" data-activity-type="atlas">
        <div className="tt-act-head">
          <span className="tt-act-kicker tt-kicker--atlas">
            <AtlasGlobeIcon size={13} color="currentColor" />
            <span>Atlas Chain</span>
            {!isTimeUp && <span className="tt-live-pulse-dot" />}
          </span>
          <span className={`tt-act-timer${isTimeUp ? ' is-ended' : isUrgent ? ' is-urgent' : ''}`}>
            <TimerClockIcon size={11} color="currentColor" />
            {isTimeUp ? 'Time Up' : `${secondsLeft}s`}
          </span>
        </div>

        {activity.endsAtMs && (
          <div className="tt-timer-track">
            <span className="tt-timer-fill tt-timer-fill--emerald" style={{ width: `${timerPct}%` }} />
          </div>
        )}

        <h5 className="tt-act-title">{activity.title}</h5>

        <div className="tt-chain-arena">
          <div className="tt-chain-current">
            <span className="tt-arena-label">
              Current Place{activity.lastPlayerName ? ` · by ${activity.lastPlayerName}` : ''}
            </span>
            <strong className="tt-arena-word">{activity.currentPlace || activity.seedPlace}</strong>
          </div>
          <div className="tt-chain-next">
            <span className="tt-arena-label">Next Starts</span>
            <span className="tt-keycap-letter">{activity.requiredLetter || 'A'}</span>
          </div>
        </div>

        {trail.length > 0 && (
          <div className="tt-trail-row" aria-label="Recent places">
            {trail.map((item, idx) => (
              <React.Fragment key={`${item.word}-${idx}`}>
                {idx > 0 && <ArrowChainIcon size={10} color="currentColor" />}
                <span className="tt-trail-word" title={item.name ? `Played by ${item.name}` : undefined}>
                  {item.word}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {allScoreRows.length > 0 && (
          <div className="tt-roster-box">
            <div className="tt-roster-hdr">
              <span className="tt-roster-title">
                <TrophyCrestIcon size={12} color="#fbbf24" />
                <span>Players &amp; Points ({allScoreRows.length})</span>
              </span>
              {allScoreRows.length > 5 && (
                <button
                  type="button"
                  className="tt-roster-toggle"
                  onClick={() => setRosterExpanded((v) => !v)}
                >
                  <span>{rosterExpanded ? 'Less' : `+${allScoreRows.length - 5} more`}</span>
                  <ChevronToggleIcon size={11} rotated={rosterExpanded} />
                </button>
              )}
            </div>
            <div className="tt-roster-list">
              {shownScores.map((row, idx) => (
                <div key={row.uid} className={`tt-roster-row${row.uid === myUid ? ' is-me' : ''}`}>
                  <span className="tt-roster-player">
                    {idx < 3 ? <RankMedalIcon rank={idx + 1} size={12} /> : <span className="tt-roster-rank">#{idx + 1}</span>}
                    <span className="tt-roster-name">{row.name}</span>
                  </span>
                  <span className="tt-roster-right">
                    {row.lastWord && <span className="tt-roster-choice">{row.lastWord}</span>}
                    <span className="tt-roster-pts is-earned">{row.pts || 0} pts</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isTimeUp && (
          <form className="tt-inline-form" onSubmit={handleAtlasSubmit}>
            <input
              type="text"
              className="tt-inline-input"
              maxLength={36}
              placeholder={`Place starting with ${activity.requiredLetter || 'A'}...`}
              value={entryInput}
              onChange={(e) => setEntryInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="tt-inline-submit" disabled={busy || !entryInput.trim()} aria-label="Submit place">
              <SendPaperPlaneIcon size={13} color="#ffffff" />
            </button>
          </form>
        )}

        <div className="tt-act-foot">
          <span className="tt-foot-creator">
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            <span>{activity.creatorName || 'Member'}</span>
          </span>
          <span className="tt-foot-meta">{entries.length} places · +10/+15 pts</span>
        </div>
      </div>
    );
  }

  // ── 4. WORD CHALLENGE (SCRAMBLE OR CHAIN) ───────────────────────────────
  if (activity.type === 'word') {
    const isChain = activity.mode === 'chain';
    if (isChain) {
      const entries = Array.isArray(activity.entries) ? activity.entries : [];
      const trail = entries.slice(-5);
      const allScoreRows = Object.entries(activity.scores || {})
        .map(([uid, info]) => ({ uid, ...(info || {}) }))
        .sort((a, b) => (b.pts || 0) - (a.pts || 0));
      const shownScores = allScoreRows.slice(0, rosterExpanded ? 50 : 5);

      return (
        <div className="tt-act-card" data-activity-type="word">
          <div className="tt-act-head">
            <span className="tt-act-kicker tt-kicker--word">
              <WordTilesIcon size={13} color="currentColor" />
              <span>Word Chain</span>
              {!isTimeUp && <span className="tt-live-pulse-dot" />}
            </span>
            <span className={`tt-act-timer${isTimeUp ? ' is-ended' : isUrgent ? ' is-urgent' : ''}`}>
              <TimerClockIcon size={11} color="currentColor" />
              {isTimeUp ? 'Time Up' : `${secondsLeft}s`}
            </span>
          </div>

          {activity.endsAtMs && (
            <div className="tt-timer-track">
              <span className="tt-timer-fill tt-timer-fill--amber" style={{ width: `${timerPct}%` }} />
            </div>
          )}

          <h5 className="tt-act-title">{activity.title}</h5>

          <div className="tt-chain-arena">
            <div className="tt-chain-current">
              <span className="tt-arena-label">Last Word</span>
              <strong className="tt-arena-word">{activity.currentWord}</strong>
            </div>
            <div className="tt-chain-next">
              <span className="tt-arena-label">Starts With</span>
              <span className="tt-keycap-letter tt-keycap-letter--amber">{activity.requiredLetter}</span>
            </div>
          </div>

          {trail.length > 0 && (
            <div className="tt-trail-row" aria-label="Recent words">
              {trail.map((item, idx) => (
                <React.Fragment key={`${item.word}-${idx}`}>
                  {idx > 0 && <ArrowChainIcon size={10} color="currentColor" />}
                  <span className="tt-trail-word" title={item.name ? `Played by ${item.name}` : undefined}>
                    {item.word}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {allScoreRows.length > 0 && (
            <div className="tt-roster-box">
              <div className="tt-roster-hdr">
                <span className="tt-roster-title">
                  <TrophyCrestIcon size={12} color="#fbbf24" />
                  <span>Players &amp; Points ({allScoreRows.length})</span>
                </span>
                {allScoreRows.length > 5 && (
                  <button
                    type="button"
                    className="tt-roster-toggle"
                    onClick={() => setRosterExpanded((v) => !v)}
                  >
                    <span>{rosterExpanded ? 'Less' : `+${allScoreRows.length - 5} more`}</span>
                    <ChevronToggleIcon size={11} rotated={rosterExpanded} />
                  </button>
                )}
              </div>
              <div className="tt-roster-list">
                {shownScores.map((row, idx) => (
                  <div key={row.uid} className={`tt-roster-row${row.uid === myUid ? ' is-me' : ''}`}>
                    <span className="tt-roster-player">
                      {idx < 3 ? <RankMedalIcon rank={idx + 1} size={12} /> : <span className="tt-roster-rank">#{idx + 1}</span>}
                      <span className="tt-roster-name">{row.name}</span>
                    </span>
                    <span className="tt-roster-right">
                      {row.lastWord && <span className="tt-roster-choice">{row.lastWord}</span>}
                      <span className="tt-roster-pts is-earned">{row.pts || 0} pts</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isTimeUp && (
            <form className="tt-inline-form" onSubmit={handleWordSubmit}>
              <input
                type="text"
                className="tt-inline-input"
                maxLength={22}
                placeholder={`Word starting with ${activity.requiredLetter}...`}
                value={entryInput}
                onChange={(e) => setEntryInput(e.target.value)}
                disabled={busy}
              />
              <button type="submit" className="tt-inline-submit" disabled={busy || !entryInput.trim()} aria-label="Submit word">
                <SendPaperPlaneIcon size={13} color="#ffffff" />
              </button>
            </form>
          )}

          <div className="tt-act-foot">
            <span className="tt-foot-creator">
              <IdentityEmblem identity={activity.creatorIdentity} size={13} />
              <span>{activity.creatorName || 'Member'}</span>
            </span>
            <span className="tt-foot-meta">{entries.length} linked · +10/+15 pts</span>
          </div>
        </div>
      );
    }

    const tiles = Array.isArray(activity.scrambledLetters) ? activity.scrambledLetters : [];
    const solvedBy = Array.isArray(activity.solvedBy) ? activity.solvedBy : [];
    const iSolved = Boolean(myUid && solvedBy.some((s) => s.uid === myUid));
    const shownSolvers = solvedBy.slice(0, visibleRosterCap);

    return (
      <div className="tt-act-card" data-activity-type="word">
        <div className="tt-act-head">
          <span className="tt-act-kicker tt-kicker--word">
            <WordTilesIcon size={13} color="currentColor" />
            <span>Word Scramble</span>
            {!isTimeUp && <span className="tt-live-pulse-dot" />}
          </span>
          <span className={`tt-act-timer${isTimeUp ? ' is-ended' : isUrgent ? ' is-urgent' : ''}`}>
            <TimerClockIcon size={11} color="currentColor" />
            {isTimeUp ? 'Closed' : `${secondsLeft}s`}
          </span>
        </div>

        {activity.endsAtMs && (
          <div className="tt-timer-track">
            <span className="tt-timer-fill tt-timer-fill--amber" style={{ width: `${timerPct}%` }} />
          </div>
        )}

        <h5 className="tt-act-title">{activity.title}</h5>

        <div className="tt-scramble-tiles" aria-label="Scrambled letters">
          {tiles.map((ch, idx) => (
            <span key={idx} className="tt-scramble-tile">
              {ch}
            </span>
          ))}
        </div>

        {activity.hint && (
          <div className="tt-word-hint">Hint · {activity.hint}</div>
        )}

        {(isTimeUp || iSolved) && activity.answerWord && (
          <div className="tt-winner-strip">
            <CrownRoyalIcon size={14} color="#fbbf24" />
            <span>Answer: <strong>{activity.answerWord}</strong></span>
          </div>
        )}

        {solvedBy.length > 0 && (
          <div className="tt-roster-box">
            <div className="tt-roster-hdr">
              <span className="tt-roster-title">
                <TrophyCrestIcon size={12} color="#fbbf24" />
                <span>Solvers &amp; Points ({solvedBy.length})</span>
              </span>
              {solvedBy.length > 4 && (
                <button
                  type="button"
                  className="tt-roster-toggle"
                  onClick={() => setRosterExpanded((v) => !v)}
                >
                  <span>{rosterExpanded ? 'Less' : `+${solvedBy.length - 4} more`}</span>
                  <ChevronToggleIcon size={11} rotated={rosterExpanded} />
                </button>
              )}
            </div>
            <div className="tt-roster-list">
              {shownSolvers.map((s, idx) => (
                <div key={s.uid} className={`tt-roster-row${s.uid === myUid ? ' is-me' : ''}`}>
                  <span className="tt-roster-player">
                    {idx < 3 ? <RankMedalIcon rank={idx + 1} size={12} /> : <span className="tt-roster-rank">#{idx + 1}</span>}
                    <span className="tt-roster-name">{s.name}</span>
                  </span>
                  <span className="tt-roster-right">
                    <span className="tt-roster-ans is-ok">
                      <CheckTickIcon size={10} color="currentColor" />
                      <span>Solved</span>
                    </span>
                    <span className="tt-roster-pts is-earned">+{s.pts || (idx === 0 ? 50 : 25)} pts</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isTimeUp && !iSolved && (
          <form className="tt-inline-form" onSubmit={handleWordSubmit}>
            <input
              type="text"
              className="tt-inline-input"
              maxLength={22}
              placeholder={`Unscramble ${activity.wordLength || tiles.length}-letter word...`}
              value={entryInput}
              onChange={(e) => {
                setEntryInput(e.target.value);
                if (wordStatusMsg) setWordStatusMsg('');
              }}
              disabled={busy}
            />
            <button type="submit" className="tt-inline-submit" disabled={busy || !entryInput.trim()} aria-label="Submit guess">
              <SendPaperPlaneIcon size={13} color="#ffffff" />
            </button>
          </form>
        )}

        {wordStatusMsg && <div className="tt-word-feedback">{wordStatusMsg}</div>}

        <div className="tt-act-foot">
          <span className="tt-foot-creator">
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            <span>{activity.creatorName || 'Member'}</span>
          </span>
          <span className="tt-foot-meta">{activity.attemptCount || 0} tries · +50/+25 pts</span>
        </div>
      </div>
    );
  }

  // ── 5. SPIN-THE-WHEEL / LUCKY PICK ──────────────────────────────────────
  const isSpinning = Boolean(
    activity.spinStartedAtMs && nowMs - activity.spinStartedAtMs < 4250
  );
  const showWinner = Boolean(activity.winnerLabel && !isSpinning);
  const shownSpinners = votesList.slice(0, visibleRosterCap);

  return (
    <div className="tt-act-card" data-activity-type="wheel">
      <div className="tt-act-head">
        <span className="tt-act-kicker tt-kicker--wheel">
          <SpinWheelIcon size={13} color="currentColor" />
          <span>Lucky Wheel</span>
          {isSpinning && <span className="tt-live-pulse-dot" />}
        </span>
        <span className="tt-act-meta-right">{wheelEntries.length} slices · Spin #{activity.spinSeq || 0}</span>
      </div>

      <h5 className="tt-act-title">{activity.title}</h5>

      <div className="tt-wheel-stage">
        <LuxuryRouletteRotor
          entries={wheelEntries}
          targetAngle={activity.targetAngle || 0}
          isSpinning={isSpinning}
          uidSuffix={activityId}
        />

        <button
          type="button"
          className="tt-wheel-spin-btn"
          disabled={busy || isSpinning}
          onClick={handleSpinWheel}
        >
          <SpinWheelIcon size={14} color="#ffffff" />
          <span>{isSpinning ? 'Spinning...' : activity.spinSeq > 0 ? 'Spin Again (+15 pts)' : 'Spin Wheel (+15 pts)'}</span>
        </button>

        {showWinner && (
          <div className="tt-wheel-result">
            <CrownRoyalIcon size={14} color="#fbbf24" />
            <span>Landed: <strong>{activity.winnerLabel}</strong></span>
          </div>
        )}
      </div>

      {votesList.length > 0 && (
        <div className="tt-roster-box">
          <div className="tt-roster-hdr">
            <span className="tt-roster-title">
              <PlayersRosterIcon size={12} color="currentColor" />
              <span>Spinners &amp; Results ({votesList.length})</span>
            </span>
            {votesList.length > 4 && (
              <button
                type="button"
                className="tt-roster-toggle"
                onClick={() => setRosterExpanded((v) => !v)}
              >
                <span>{rosterExpanded ? 'Less' : `+${votesList.length - 4} more`}</span>
                <ChevronToggleIcon size={11} rotated={rosterExpanded} />
              </button>
            )}
          </div>
          <div className="tt-roster-list">
            {shownSpinners.map((s) => (
              <div key={s.uid} className={`tt-roster-row${s.uid === myUid ? ' is-me' : ''}`}>
                <span className="tt-roster-player">
                  <IdentityEmblem identity={s.identity} size={12} />
                  <span className="tt-roster-name">{s.displayName || 'Member'}</span>
                </span>
                <span className="tt-roster-right">
                  <span className="tt-roster-choice">{s.lastResult || wheelEntries[s.optionIndex] || 'Spin'}</span>
                  <span className="tt-roster-pts is-earned">+{s.pts || 15} pts</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tt-act-foot">
        <span className="tt-foot-creator">
          <IdentityEmblem identity={activity.creatorIdentity} size={13} />
          <span>{activity.creatorName || 'Member'}</span>
        </span>
        <span className="tt-foot-meta">{votesList.length} players · +15 pts/spin</span>
      </div>
    </div>
  );
};

export default React.memo(ChatActivityCard);
