import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { pt } from '../../utils/premiumToast';
import { getIdentityKey } from '../../utils/roomModulesConfig';
import { getStoredGuestGender, getDefaultAvatarUrl, isRealAvatarUpload, isGuestUser } from '../../utils/roleUtils';
import {
  ActivitySparkIcon,
  PollBarsIcon,
  TriviaBuzzerIcon,
  SpinWheelIcon,
  WatchPartyStageIcon,
  ExitWatchIcon,
} from '../icons/LuxuryModuleIcons';
import './FloatingActivityLauncher.css';

const FloatingActivityLauncher = ({
  roomId,
  loggedInUserProfile,
  isMuted = false,
  watchPartyOpen = false,
  onToggleWatchParty,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeCreator, setActiveCreator] = useState(null); // null | 'poll' | 'trivia' | 'wheel'
  const [submitting, setSubmitting] = useState(false);
  const wrapRef = useRef(null);

  // Poll / Trivia state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [durationSec, setDurationSec] = useState(25);

  // Wheel state
  const [wheelTitle, setWheelTitle] = useState('');
  const [wheelEntriesRaw, setWheelEntriesRaw] = useState('');

  useEffect(() => {
    if (!popoverOpen) return;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [popoverOpen]);

  const resetCreator = () => {
    setActiveCreator(null);
    setQuestion('');
    setOptions(['', '']);
    setCorrectIndex(0);
    setDurationSec(25);
    setWheelTitle('');
    setWheelEntriesRaw('');
  };

  const openCreator = (type) => {
    if (isMuted) {
      pt.error('You are currently muted and cannot launch room activities.');
      setPopoverOpen(false);
      return;
    }
    resetCreator();
    setActiveCreator(type);
    setPopoverOpen(false);
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!roomId || submitting) return;

    const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid;
    if (!myUid) {
      pt.error('Please sign in to launch an activity.');
      return;
    }

    const myName = loggedInUserProfile?.displayName || 'Member';
    const myGender = loggedInUserProfile?.gender || getStoredGuestGender() || 'male';
    const isGuest = isGuestUser(loggedInUserProfile);
    const myPhoto = isRealAvatarUpload(loggedInUserProfile?.photoURL)
      ? loggedInUserProfile.photoURL
      : getDefaultAvatarUrl(myUid, myGender, isGuest);
    const myIdentity = getIdentityKey(myGender);

    let activityPayload = null;
    let messageLabel = '';

    if (activeCreator === 'poll') {
      const qClean = question.trim().slice(0, 140);
      const cleanOpts = options.map((o) => o.trim().slice(0, 64)).filter(Boolean);
      if (!qClean || cleanOpts.length < 2) {
        pt.error('Enter a question and at least 2 options.');
        return;
      }
      messageLabel = `Live Poll: ${qClean}`;
      activityPayload = {
        type: 'poll',
        roomId,
        title: qClean,
        creatorUid: myUid,
        creatorName: myName,
        creatorIdentity: myIdentity,
        status: 'active',
        options: cleanOpts.slice(0, 4).map((label, i) => ({
          id: `opt_${i}`,
          label,
          count: 0,
        })),
        totalVotes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    } else if (activeCreator === 'trivia') {
      const qClean = question.trim().slice(0, 140);
      const cleanOpts = options.map((o) => o.trim().slice(0, 64)).filter(Boolean);
      if (!qClean || cleanOpts.length < 2) {
        pt.error('Enter a trivia question and at least 2 answer choices.');
        return;
      }
      const safeCorrect = Math.min(correctIndex, cleanOpts.length - 1);
      const dur = Math.max(15, Math.min(60, Number(durationSec) || 25));
      messageLabel = `Rapid Trivia: ${qClean}`;
      activityPayload = {
        type: 'trivia',
        roomId,
        title: qClean,
        creatorUid: myUid,
        creatorName: myName,
        creatorIdentity: myIdentity,
        status: 'active',
        options: cleanOpts.slice(0, 4),
        correctIndex: safeCorrect,
        durationSec: dur,
        endsAtMs: Date.now() + dur * 1000,
        firstCorrectUid: null,
        firstCorrectName: null,
        firstCorrectIdentity: null,
        firstCorrectAtMs: null,
        winnerLocked: false,
        attemptCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    } else if (activeCreator === 'wheel') {
      const tClean = wheelTitle.trim().slice(0, 140);
      const entries = wheelEntriesRaw
        .split(',')
        .map((s) => s.trim().slice(0, 32))
        .filter(Boolean)
        .slice(0, 12);
      if (!tClean || entries.length < 2) {
        pt.error('Enter a wheel title and at least 2 comma-separated items.');
        return;
      }
      messageLabel = `Lucky Wheel: ${tClean}`;
      activityPayload = {
        type: 'wheel',
        roomId,
        title: tClean,
        creatorUid: myUid,
        creatorName: myName,
        creatorIdentity: myIdentity,
        status: 'active',
        entries,
        spinSeq: 0,
        winnerIndex: null,
        winnerLabel: null,
        spinStartedAtMs: null,
        targetAngle: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    }

    if (!activityPayload) return;

    setSubmitting(true);
    try {
      const actDocRef = doc(collection(db, 'rooms', roomId, 'activities'));
      await setDoc(actDocRef, {
        ...activityPayload,
        id: actDocRef.id,
      });

      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: messageLabel,
        uid: myUid,
        displayName: myName,
        photoURL: myPhoto,
        gender: myGender,
        role: loggedInUserProfile?.role || (isGuest ? 'guest' : 'user'),
        badge: loggedInUserProfile?.badge || null,
        isGuest: Boolean(isGuest),
        activityId: actDocRef.id,
        activityType: activeCreator,
        createdAt: serverTimestamp(),
      });

      resetCreator();
    } catch (err) {
      pt.error(err?.message || 'Unable to launch activity in this room.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="hp-activity-fab-wrap" ref={wrapRef}>
        {popoverOpen && (
          <div className="hp-activity-popover" role="menu" aria-label="Room Activities">
            <div className="hp-activity-pop-title">Room Interactive</div>

            <button
              type="button"
              className="hp-activity-pop-btn"
              onClick={() => openCreator('poll')}
            >
              <span className="hp-activity-pop-icon">
                <PollBarsIcon size={16} color="#c084fc" />
              </span>
              <span className="hp-activity-pop-label">
                <strong>Live Quick Poll</strong>
                <small>2 to 4 instant voting choices</small>
              </span>
            </button>

            <button
              type="button"
              className="hp-activity-pop-btn"
              onClick={() => openCreator('trivia')}
            >
              <span className="hp-activity-pop-icon">
                <TriviaBuzzerIcon size={16} color="#22d3ee" />
              </span>
              <span className="hp-activity-pop-label">
                <strong>Rapid Trivia Buzzer</strong>
                <small>Timed speed answer challenge</small>
              </span>
            </button>

            <button
              type="button"
              className="hp-activity-pop-btn"
              onClick={() => openCreator('wheel')}
            >
              <span className="hp-activity-pop-icon">
                <SpinWheelIcon size={16} color="#f472b6" />
              </span>
              <span className="hp-activity-pop-label">
                <strong>Spin the Wheel</strong>
                <small>Live lucky pick or dare wheel</small>
              </span>
            </button>

            {onToggleWatchParty && (
              <button
                type="button"
                className="hp-activity-pop-btn"
                onClick={() => {
                  onToggleWatchParty();
                  setPopoverOpen(false);
                }}
              >
                <span className="hp-activity-pop-icon">
                  <WatchPartyStageIcon size={16} color="#fbbf24" />
                </span>
                <span className="hp-activity-pop-label">
                  <strong>{watchPartyOpen ? 'Exit Watch Party' : 'Sync Watch Party'}</strong>
                  <small>Co-watch theater inside room</small>
                </span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className="hp-activity-fab"
          onClick={() => setPopoverOpen((prev) => !prev)}
          title="Mini-Games, Polls & Watch Party"
          aria-label="Open Mini-Games and Polls menu"
          aria-expanded={popoverOpen}
        >
          <ActivitySparkIcon size={19} color="#ffffff" />
        </button>
      </div>

      {activeCreator &&
        createPortal(
          <div className="hp-act-modal-overlay" onClick={resetCreator}>
            <form
              className="hp-act-modal"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleLaunch}
            >
              <div className="hp-act-modal-hdr">
                <h4>
                  {activeCreator === 'poll' && (
                    <>
                      <PollBarsIcon size={17} color="#c084fc" />
                      Launch Live Quick Poll
                    </>
                  )}
                  {activeCreator === 'trivia' && (
                    <>
                      <TriviaBuzzerIcon size={17} color="#22d3ee" />
                      Launch Rapid Trivia Buzzer
                    </>
                  )}
                  {activeCreator === 'wheel' && (
                    <>
                      <SpinWheelIcon size={17} color="#f472b6" />
                      Launch Lucky Wheel
                    </>
                  )}
                </h4>
                <button type="button" className="hp-act-close-x" onClick={resetCreator} aria-label="Close">
                  <ExitWatchIcon size={14} />
                </button>
              </div>

              {(activeCreator === 'poll' || activeCreator === 'trivia') && (
                <>
                  <div className="hp-act-field">
                    <label>Question</label>
                    <input
                      type="text"
                      maxLength={140}
                      className="hp-act-input"
                      placeholder={
                        activeCreator === 'poll'
                          ? 'Ask the room a question...'
                          : 'Enter your rapid trivia question...'
                      }
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="hp-act-field">
                    <label>
                      Options ({options.length}/4)
                      {activeCreator === 'trivia' ? ' — Mark Correct' : ''}
                    </label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="hp-act-opt-row">
                        <input
                          type="text"
                          maxLength={64}
                          className="hp-act-input"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...options];
                            next[idx] = e.target.value;
                            setOptions(next);
                          }}
                          required={idx < 2}
                        />
                        {activeCreator === 'trivia' && (
                          <button
                            type="button"
                            className={`hp-act-radio-correct${correctIndex === idx ? ' active' : ''}`}
                            onClick={() => setCorrectIndex(idx)}
                          >
                            {correctIndex === idx ? 'Answer' : 'Mark'}
                          </button>
                        )}
                      </div>
                    ))}
                    {options.length < 4 && (
                      <button
                        type="button"
                        className="hp-act-btn-secondary"
                        style={{ marginTop: 4, width: '100%', padding: '6px 10px' }}
                        onClick={() => setOptions((prev) => [...prev, ''])}
                      >
                        Add Option
                      </button>
                    )}
                  </div>

                  {activeCreator === 'trivia' && (
                    <div className="hp-act-field">
                      <label>Timer Seconds</label>
                      <select
                        className="hp-act-input"
                        value={durationSec}
                        onChange={(e) => setDurationSec(Number(e.target.value))}
                      >
                        <option value={15}>15 Seconds</option>
                        <option value={25}>25 Seconds</option>
                        <option value={40}>40 Seconds</option>
                        <option value={60}>60 Seconds</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {activeCreator === 'wheel' && (
                <>
                  <div className="hp-act-field">
                    <label>Wheel Prompt</label>
                    <input
                      type="text"
                      maxLength={140}
                      className="hp-act-input"
                      placeholder="Who leads the next game or dare?"
                      value={wheelTitle}
                      onChange={(e) => setWheelTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>Entries (comma-separated, 2 to 12)</label>
                    <textarea
                      rows={3}
                      className="hp-act-textarea"
                      placeholder="Entry 1, Entry 2, Entry 3, Entry 4"
                      value={wheelEntriesRaw}
                      onChange={(e) => setWheelEntriesRaw(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="hp-act-footer-btns">
                <button type="button" className="hp-act-btn-secondary" onClick={resetCreator}>
                  Cancel
                </button>
                <button type="submit" className="hp-act-btn-primary" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Drop in Chat'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
};

export default FloatingActivityLauncher;
