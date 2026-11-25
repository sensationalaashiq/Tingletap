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
  AtlasGlobeIcon,
  WordTilesIcon,
  TimerClockIcon,
  TrophyCrestIcon,
  CrownRoyalIcon,
  SendPaperPlaneIcon,
  IdentityEmblem,
} from '../icons/LuxuryModuleIcons';
import './ChatActivityCard.css';

const WHEEL_SLICE_COLORS = [
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#4f46e5',
  '#d97706',
  '#059669',
  '#be185d',
  '#2563eb',
  '#9333ea',
  '#ea580c',
  '#0d9488',
  '#6366f1',
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

const getCleanLastLetter = (str) => {
  const clean = String(str || '').trim().replace(/[^a-zA-Z]/g, '');
  return clean ? clean[clean.length - 1].toUpperCase() : 'A';
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
  const [entryInput, setEntryInput] = useState('');
  const [wordStatusMsg, setWordStatusMsg] = useState('');

  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid || null;
  const myName = loggedInUserProfile?.displayName || 'Member';
  const myIdentity = getIdentityKey(loggedInUserProfile);

  // Keep synced with room-level listener snapshot
  useEffect(() => {
    if (initialSnapshot) {
      setActivity(initialSnapshot);
    }
  }, [initialSnapshot]);

  // Listen to user's own single vote document for poll & trivia
  useEffect(() => {
    if (!roomId || !activityId || !myUid) return;
    if (activity?.type && activity.type !== 'poll' && activity.type !== 'trivia') return;
    const voteRef = doc(db, 'rooms', roomId, 'activities', activityId, 'votes', myUid);
    const unsub = onSnapshot(
      voteRef,
      (snap) => {
        setMyVote(snap.exists() ? snap.data() : null);
      },
      () => {}
    );
    return () => unsub();
  }, [roomId, activityId, myUid, activity?.type]);

  // Live countdown tick while timer or spin animation is active
  const needsTick = Boolean(
    activity &&
      ((activity.endsAtMs && nowMs < activity.endsAtMs + 1000) ||
        (activity.type === 'wheel' && activity.spinStartedAtMs && nowMs - activity.spinStartedAtMs < 4400))
  );

  useEffect(() => {
    if (!needsTick) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [needsTick]);

  // Atomic poll vote handler
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
        const targetSliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
        const jitter = (Math.random() - 0.5) * sliceAngle * 0.45;
        const desiredMod = (360 - targetSliceCenter + jitter + 360) % 360;
        const prevAngle = typeof data.targetAngle === 'number' ? data.targetAngle : 0;
        const baseRotations = Math.floor(prevAngle / 360) * 360 + 6 * 360;
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

  // Atomic Atlas Place Chain submit handler
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
        const prevScores = { ...(data.scores || {}) };
        const prevEntry = prevScores[myUid] || { name: myName, pts: 0 };
        prevScores[myUid] = { name: myName, pts: (prevEntry.pts || 0) + 10 };

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

  // Atomic Word Challenge submit handler (Scramble or Word Chain)
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
          const prevScores = { ...(data.scores || {}) };
          const prevUser = prevScores[myUid] || { name: myName, pts: 0 };
          prevScores[myUid] = { name: myName, pts: (prevUser.pts || 0) + 10 };
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
          // Scramble mode
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
          if (!solvedBy.some((s) => s.uid === myUid)) {
            solvedBy.push({ uid: myUid, name: myName, solvedAtMs: Date.now() });
          }

          const updates = {
            attemptCount: nextAttempt,
            solvedBy,
            updatedAt: serverTimestamp(),
          };
          if (!data.winnerLocked && !data.firstCorrectUid) {
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
            {activity.endsAtMs ? (
              <span className={`tt-trivia-timer${isTimeUp ? ' is-ended' : ''}`}>
                <TimerClockIcon size={11} color="currentColor" />
                {isTimeUp ? 'Closed' : `${secondsLeft}s`}
              </span>
            ) : (
              <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
            )}
          </span>
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
                disabled={busy || activity.status === 'ended' || isTimeUp}
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
          <span>{totalVotes} votes · {myVote ? 'Recorded' : 'Tap to vote'}</span>
        </div>
      </div>
    );
  }

  // ── 2. RAPID TRIVIA / BUZZER ────────────────────────────────────────────
  if (activity.type === 'trivia') {
    const options = Array.isArray(activity.options) ? activity.options : [];
    const showReveal = Boolean(myVote || isTimeUp || activity.firstCorrectUid);

    return (
      <div className="tt-act-card" data-activity-type="trivia">
        <div className="tt-act-head">
          <span className="tt-act-type-badge">
            <TriviaBuzzerIcon size={13} color="#22d3ee" />
            Rapid Trivia
          </span>
          <span className={`tt-trivia-timer${isTimeUp ? ' is-ended' : ''}`}>
            <TimerClockIcon size={11} color="currentColor" />
            {isTimeUp ? 'Closed' : `${secondsLeft}s`}
          </span>
        </div>

        {activity.endsAtMs && (
          <div className="tt-timer-track">
            <span className="tt-timer-fill" style={{ width: `${timerPct}%` }} />
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
                className={`tt-poll-opt${stateClass}`}
              >
                <span className="tt-poll-opt-inner">
                  <span className="tt-poll-opt-label">{optLabel}</span>
                  {showReveal && isCorrectOpt && (
                    <span className="tt-poll-opt-pct tt-pct-ok">Correct</span>
                  )}
                  {isSelected && !isCorrectOpt && (
                    <span className="tt-poll-opt-pct tt-pct-bad">Locked</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {activity.firstCorrectUid && (
          <div className="tt-trivia-winner">
            <CrownRoyalIcon size={15} color="#fbbf24" />
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

  // ── 3. ATLAS PLACE CHAIN ────────────────────────────────────────────────
  if (activity.type === 'atlas') {
    const entries = Array.isArray(activity.entries) ? activity.entries : [];
    const scoreRows = Object.entries(activity.scores || {})
      .map(([uid, info]) => ({ uid, ...(info || {}) }))
      .sort((a, b) => (b.pts || 0) - (a.pts || 0))
      .slice(0, 4);

    return (
      <div className="tt-act-card" data-activity-type="atlas">
        <div className="tt-act-head">
          <span className="tt-act-type-badge">
            <AtlasGlobeIcon size={13} color="#34d399" />
            Atlas Chain
          </span>
          <span className={`tt-trivia-timer${isTimeUp ? ' is-ended' : ''}`}>
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

        <div className="tt-chain-banner">
          <div className="tt-chain-current">
            <small>Current Place</small>
            <strong>{activity.currentPlace || activity.seedPlace}</strong>
          </div>
          <div className="tt-chain-letter">
            <small>Next Starts With</small>
            <span className="tt-letter-pill">{activity.requiredLetter || 'A'}</span>
          </div>
        </div>

        <div className="tt-chain-history">
          {entries.slice(-7).map((item, idx) => (
            <span key={`${item.word}-${idx}`} className="tt-chain-chip">
              {item.word}
            </span>
          ))}
        </div>

        {scoreRows.length > 0 && (
          <div className="tt-score-strip">
            {scoreRows.map((row) => (
              <span key={row.uid} className="tt-score-pill">
                <TrophyCrestIcon size={11} color="#fbbf24" />
                {row.name}: {row.pts}
              </span>
            ))}
          </div>
        )}

        {!isTimeUp && (
          <form className="tt-inline-form" onSubmit={handleAtlasSubmit}>
            <input
              type="text"
              className="tt-inline-input"
              maxLength={36}
              placeholder={`Place starting with "${activity.requiredLetter || 'A'}"...`}
              value={entryInput}
              onChange={(e) => setEntryInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="tt-inline-submit" disabled={busy || !entryInput.trim()}>
              <SendPaperPlaneIcon size={13} color="#ffffff" />
            </button>
          </form>
        )}

        <div className="tt-act-foot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            By {activity.creatorName || 'Member'}
          </span>
          <span>{entries.length} places chained</span>
        </div>
      </div>
    );
  }

  // ── 4. WORD CHALLENGE (SCRAMBLE OR CHAIN) ───────────────────────────────
  if (activity.type === 'word') {
    const isChain = activity.mode === 'chain';
    if (isChain) {
      const entries = Array.isArray(activity.entries) ? activity.entries : [];
      const scoreRows = Object.entries(activity.scores || {})
        .map(([uid, info]) => ({ uid, ...(info || {}) }))
        .sort((a, b) => (b.pts || 0) - (a.pts || 0))
        .slice(0, 4);

      return (
        <div className="tt-act-card" data-activity-type="word">
          <div className="tt-act-head">
            <span className="tt-act-type-badge">
              <WordTilesIcon size={13} color="#fbbf24" />
              Word Chain
            </span>
            <span className={`tt-trivia-timer${isTimeUp ? ' is-ended' : ''}`}>
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

          <div className="tt-chain-banner">
            <div className="tt-chain-current">
              <small>Last Word</small>
              <strong>{activity.currentWord}</strong>
            </div>
            <div className="tt-chain-letter">
              <small>Starts With</small>
              <span className="tt-letter-pill tt-letter-pill--amber">{activity.requiredLetter}</span>
            </div>
          </div>

          <div className="tt-chain-history">
            {entries.slice(-7).map((item, idx) => (
              <span key={`${item.word}-${idx}`} className="tt-chain-chip">
                {item.word}
              </span>
            ))}
          </div>

          {scoreRows.length > 0 && (
            <div className="tt-score-strip">
              {scoreRows.map((row) => (
                <span key={row.uid} className="tt-score-pill">
                  <TrophyCrestIcon size={11} color="#fbbf24" />
                  {row.name}: {row.pts}
                </span>
              ))}
            </div>
          )}

          {!isTimeUp && (
            <form className="tt-inline-form" onSubmit={handleWordSubmit}>
              <input
                type="text"
                className="tt-inline-input"
                maxLength={22}
                placeholder={`Word starting with "${activity.requiredLetter}"...`}
                value={entryInput}
                onChange={(e) => setEntryInput(e.target.value)}
                disabled={busy}
              />
              <button type="submit" className="tt-inline-submit" disabled={busy || !entryInput.trim()}>
                <SendPaperPlaneIcon size={13} color="#ffffff" />
              </button>
            </form>
          )}

          <div className="tt-act-foot">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IdentityEmblem identity={activity.creatorIdentity} size={13} />
              By {activity.creatorName || 'Member'}
            </span>
            <span>{entries.length} words linked</span>
          </div>
        </div>
      );
    }

    // Word Scramble mode
    const tiles = Array.isArray(activity.scrambledLetters) ? activity.scrambledLetters : [];
    const solvedBy = Array.isArray(activity.solvedBy) ? activity.solvedBy : [];
    const iSolved = Boolean(myUid && solvedBy.some((s) => s.uid === myUid));

    return (
      <div className="tt-act-card" data-activity-type="word">
        <div className="tt-act-head">
          <span className="tt-act-type-badge">
            <WordTilesIcon size={13} color="#fbbf24" />
            Word Scramble
          </span>
          <span className={`tt-trivia-timer${isTimeUp ? ' is-ended' : ''}`}>
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
          <div className="tt-word-hint">Hint: {activity.hint}</div>
        )}

        {(isTimeUp || iSolved) && activity.answerWord && (
          <div className="tt-trivia-winner">
            <CrownRoyalIcon size={14} color="#fbbf24" />
            <span>Word: <strong>{activity.answerWord}</strong></span>
          </div>
        )}

        {activity.firstCorrectUid && (
          <div className="tt-trivia-winner" style={{ marginTop: 6 }}>
            <TrophyCrestIcon size={14} color="#fbbf24" />
            <span>
              Fastest Solver: <strong>{activity.firstCorrectName}</strong> ({solvedBy.length} solved)
            </span>
          </div>
        )}

        {!isTimeUp && !iSolved && (
          <form className="tt-inline-form" onSubmit={handleWordSubmit}>
            <input
              type="text"
              className="tt-inline-input"
              maxLength={22}
              placeholder={`Type ${activity.wordLength || tiles.length}-letter guess...`}
              value={entryInput}
              onChange={(e) => {
                setEntryInput(e.target.value);
                if (wordStatusMsg) setWordStatusMsg('');
              }}
              disabled={busy}
            />
            <button type="submit" className="tt-inline-submit" disabled={busy || !entryInput.trim()}>
              <SendPaperPlaneIcon size={13} color="#ffffff" />
            </button>
          </form>
        )}

        {wordStatusMsg && <div className="tt-word-feedback">{wordStatusMsg}</div>}

        <div className="tt-act-foot">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IdentityEmblem identity={activity.creatorIdentity} size={13} />
            By {activity.creatorName || 'Member'}
          </span>
          <span>{activity.attemptCount || 0} attempts</span>
        </div>
      </div>
    );
  }

  // ── 5. SPIN-THE-WHEEL / LUCKY PICK ──────────────────────────────────────
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
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M12 21L5.5 5.5h13L12 21Z" fill="#fde68a" stroke="#1e1b4b" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>

          <svg
            className="tt-wheel-svg"
            viewBox="0 0 200 200"
            style={{ transform: `rotate(${activity.targetAngle || 0}deg)` }}
            aria-label="Spin the wheel"
          >
            <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(253,230,138,0.55)" strokeWidth="2.5" />
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
                    d={describeSlicePath(100, 100, 95, startA, endA)}
                    fill={fill}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1.2"
                  />
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fill="#ffffff"
                    fontSize={sliceCount > 8 ? '8.2' : '9.8'}
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
            <CrownRoyalIcon size={15} color="#fde68a" />
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
