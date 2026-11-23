import React, { useEffect, useMemo, useState } from 'react';
import {
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
  TrophyCrestIcon,
  IdentityEmblem,
} from '../icons/LuxuryModuleIcons';
import './ChatActivityCard.css';

const WHEEL_SLICE_COLORS = [
  '#6d28d9',
  '#db2777',
  '#0891b2',
  '#4f46e5',
  '#d97706',
  '#059669',
  '#be185d',
  '#2563eb',
  '#7c3aed',
  '#ea580c',
  '#0d9488',
  '#9333ea',
];

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

const ChatActivityCard = ({
  roomId,
  activityId,
  initialSnapshot,
  loggedInUserProfile,
}) => {
  const [activity, setActivity] = useState(initialSnapshot || null);
  const [myVote, setMyVote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || null;
  const myName = loggedInUserProfile?.displayName || 'Member';
  const myIdentity = getIdentityKey(loggedInUserProfile);

  // Sync live activity updates if passed from room-level listener
  useEffect(() => {
    if (initialSnapshot) {
      setActivity(initialSnapshot);
    }
  }, [initialSnapshot]);

  // Listen to user's own single vote document ONLY (tiny 1-doc listener per user card)
  useEffect(() => {
    if (!roomId || !activityId || !myUid) return;
    const voteRef = doc(db, 'rooms', roomId, 'activities', activityId, 'votes', myUid);
    const unsub = onSnapshot(
      voteRef,
      (snap) => {
        setMyVote(snap.exists() ? snap.data() : null);
      },
      () => {}
    );
    return () => unsub();
  }, [roomId, activityId, myUid]);

  // Countdown tick ONLY while trivia/wheel animation is running
  const needsTick = Boolean(
    activity &&
      ((activity.type === 'trivia' && activity.endsAtMs && nowMs < activity.endsAtMs + 1000) ||
        (activity.type === 'wheel' && activity.spinStartedAtMs && nowMs - activity.spinStartedAtMs < 4400))
  );

  useEffect(() => {
    if (!needsTick) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 300);
    return () => clearInterval(timer);
  }, [needsTick]);

  // Atomic poll vote handler
  const handlePollVote = async (optionIdx) => {
    if (!roomId || !activityId || !myUid || busy) return;
    if (activity?.status === 'ended') return;
    setBusy(true);
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      const voteRef = doc(db, 'rooms', roomId, 'activities', activityId, 'votes', myUid);

      await runTransaction(db, async (tx) => {
        const [actSnap, voteSnap] = await Promise.all([tx.get(actRef), tx.get(voteRef)]);
        if (!actSnap.exists()) throw new Error('Activity no longer exists.');
        const data = actSnap.data();
        if (data.status === 'ended') throw new Error('This poll has closed.');

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

  // Atomic trivia buzzer handler
  const handleTriviaAnswer = async (optionIdx) => {
    if (!roomId || !activityId || !myUid || busy) return;
    if (myVote) return; // Lock after first answer
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
        if (voteSnap.exists()) return; // Already answered

        const data = actSnap.data();
        const isCorrect = optionIdx === data.correctIndex;
        const clickMs = Date.now();

        tx.set(voteRef, {
          uid: myUid,
          displayName: myName,
          identity: myIdentity,
          optionIndex: optionIdx,
          isCorrect,
          respondedAtMs: clickMs,
          createdAt: serverTimestamp(),
        });

        const updates = {
          attemptCount: (typeof data.attemptCount === 'number' ? data.attemptCount : 0) + 1,
          updatedAt: serverTimestamp(),
        };

        if (isCorrect && !data.winnerLocked && !data.firstCorrectUid) {
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

  // Atomic synchronized wheel spin handler
  const handleSpinWheel = async () => {
    if (!roomId || !activityId || !myUid || busy) return;
    const entries = Array.isArray(activity?.entries) ? activity.entries : [];
    if (entries.length < 2) return;
    if (activity?.spinStartedAtMs && Date.now() - activity.spinStartedAtMs < 4000) return;

    setBusy(true);
    try {
      const actRef = doc(db, 'rooms', roomId, 'activities', activityId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(actRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const list = Array.isArray(data.entries) ? data.entries : [];
        if (list.length < 2) return;

        const winnerIdx = Math.floor(Math.random() * list.length);
        const nextSeq = (typeof data.spinSeq === 'number' ? data.spinSeq : 0) + 1;
        const sliceAngle = 360 / list.length;
        // Center slice winnerIdx at 0 deg (top needle)
        const targetSliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
        const jitter = (Math.random() - 0.5) * sliceAngle * 0.45;
        const desiredMod = (360 - targetSliceCenter + jitter + 360) % 360;
        const prevAngle = typeof data.targetAngle === 'number' ? data.targetAngle : 0;
        const baseRotations = Math.floor(prevAngle / 360) * 360 + 5 * 360;
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
      });
    } catch (err) {
      pt.error(err?.message || 'Unable to spin right now.');
    } finally {
      setBusy(false);
    }
  };

  const wheelEntries = useMemo(
    () => (Array.isArray(activity?.entries) ? activity.entries : []),
    [activity?.entries]
  );

  if (!activity) return null;

  // ── 1. LIVE QUICK POLL ──────────────────────────────────────────────────
  if (activity.type === 'poll') {
    const options = Array.isArray(activity.options) ? activity.options : [];
    const totalVotes = typeof activity.totalVotes === 'number'
      ? activity.totalVotes
      : options.reduce((acc, o) => acc + (o.count || 0), 0);

    return (
      <div className="tt-act-card" data-activity-type="poll">
        <div className="tt-act-head">
          <span className="tt-act-type-badge">
            <PollBarsIcon size={13} color="#c084fc" />
            Live Poll
          </span>
          <span className="tt-act-meta-right">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </div>

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
                disabled={busy || activity.status === 'ended'}
                onClick={() => handlePollVote(idx)}
                className={`tt-poll-opt${isSelected ? ' is-selected' : ''}`}
              >
                <span className="tt-poll-bar" style={{ width: `${pct}%` }} />
                <span className="tt-poll-opt-inner">
                  <span className="tt-poll-opt-label">{opt.label}</span>
                  <span className="tt-poll-opt-pct">
                    {pct}% ({count})
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="tt-act-foot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            By {activity.creatorName || 'Member'}
          </span>
          <span>{myVote ? 'Vote recorded' : 'Tap an option to vote'}</span>
        </div>
      </div>
    );
  }

  // ── 2. RAPID TRIVIA / BUZZER ────────────────────────────────────────────
  if (activity.type === 'trivia') {
    const options = Array.isArray(activity.options) ? activity.options : [];
    const secondsLeft = activity.endsAtMs
      ? Math.max(0, Math.ceil((activity.endsAtMs - nowMs) / 1000))
      : 0;
    const isTimeUp = activity.endsAtMs ? nowMs >= activity.endsAtMs : false;
    const showReveal = Boolean(myVote || isTimeUp || activity.firstCorrectUid);

    return (
      <div className="tt-act-card" data-activity-type="trivia">
        <div className="tt-act-head">
          <span className="tt-act-type-badge">
            <TriviaBuzzerIcon size={13} color="#22d3ee" />
            Rapid Trivia
          </span>
          <span className={`tt-trivia-timer${isTimeUp ? ' is-ended' : ''}`}>
            {isTimeUp ? 'Closed' : `${secondsLeft}s`}
          </span>
        </div>

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
                className={`tt-poll-opt${stateClass}`}
              >
                <span className="tt-poll-opt-inner">
                  <span className="tt-poll-opt-label">{optLabel}</span>
                  {showReveal && isCorrectOpt && (
                    <span className="tt-poll-opt-pct" style={{ color: '#6ee7b7' }}>
                      Correct
                    </span>
                  )}
                  {isSelected && !isCorrectOpt && (
                    <span className="tt-poll-opt-pct" style={{ color: '#fca5a5' }}>
                      Locked
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {activity.firstCorrectUid && (
          <div className="tt-trivia-winner">
            <TrophyCrestIcon size={16} color="#fbbf24" />
            <span>
              Fastest: <strong>{activity.firstCorrectName}</strong> ({getIdentityLabel(activity.firstCorrectIdentity)})
            </span>
          </div>
        )}

        <div className="tt-act-foot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            By {activity.creatorName || 'Member'}
          </span>
          <span>
            {typeof activity.attemptCount === 'number' ? activity.attemptCount : 0} responses
          </span>
        </div>
      </div>
    );
  }

  // ── 3. SPIN-THE-WHEEL / LUCKY PICK ──────────────────────────────────────
  const sliceCount = Math.max(2, wheelEntries.length);
  const sliceAngle = 360 / sliceCount;
  const isSpinning = Boolean(
    activity.spinStartedAtMs && nowMs - activity.spinStartedAtMs < 4050
  );
  const showWinner = Boolean(activity.winnerLabel && !isSpinning);

  return (
    <div className="tt-act-card" data-activity-type="wheel">
      <div className="tt-act-head">
        <span className="tt-act-type-badge">
          <SpinWheelIcon size={13} color="#f472b6" />
          Lucky Wheel
        </span>
        <span className="tt-act-meta-right">
          {wheelEntries.length} slices
        </span>
      </div>

      <h5 className="tt-act-title">{activity.title}</h5>

      <div className="tt-wheel-stage">
        <div className="tt-wheel-wrap">
          <svg
            className="tt-wheel-needle"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M12 20L6 6h12l-6 14Z" fill="#fde68a" stroke="#1e1b4b" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>

          <svg
            className="tt-wheel-svg"
            viewBox="0 0 200 200"
            style={{ transform: `rotate(${activity.targetAngle || 0}deg)` }}
            aria-label="Spin the wheel"
          >
            {wheelEntries.map((entry, idx) => {
              const startA = idx * sliceAngle;
              const endA = startA + sliceAngle;
              const midA = startA + sliceAngle / 2;
              const textPos = polarToCartesian(100, 100, 62, midA);
              const fill = WHEEL_SLICE_COLORS[idx % WHEEL_SLICE_COLORS.length];
              const cleanText = String(entry).slice(0, 11);
              return (
                <g key={`${entry}-${idx}`}>
                  <path
                    d={describeSlicePath(100, 100, 96, startA, endA)}
                    fill={fill}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth="1.2"
                  />
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fill="#ffffff"
                    fontSize={sliceCount > 8 ? '8.5' : '10'}
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midA - 90}, ${textPos.x}, ${textPos.y})`}
                  >
                    {cleanText}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="16" fill="#0f172a" stroke="#fde68a" strokeWidth="2.4" />
            <circle cx="100" cy="100" r="5" fill="#fde68a" />
          </svg>
        </div>

        <button
          type="button"
          className="tt-wheel-spin-btn"
          disabled={busy || isSpinning}
          onClick={handleSpinWheel}
        >
          <SpinWheelIcon size={14} color="#ffffff" />
          {isSpinning ? 'Spinning...' : activity.spinSeq > 0 ? 'Spin Again' : 'Spin Wheel'}
        </button>

        {showWinner && (
          <div className="tt-wheel-result">
            <TrophyCrestIcon size={15} color="#fde68a" />
            <span>Picked: {activity.winnerLabel}</span>
          </div>
        )}
      </div>

      <div className="tt-act-foot">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <IdentityEmblem identity={activity.creatorIdentity} size={13} />
          By {activity.creatorName || 'Member'}
        </span>
        <span>Spin #{activity.spinSeq || 0}</span>
      </div>
    </div>
  );
};

export default React.memo(ChatActivityCard);
