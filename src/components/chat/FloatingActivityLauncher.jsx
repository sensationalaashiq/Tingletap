import React, { useState, useMemo } from 'react';
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
import { getIdentityKey, GAME_EXAMPLES } from '../../utils/roomModulesConfig';
import { getStoredGuestGender, getDefaultAvatarUrl, isRealAvatarUpload, isGuestUser } from '../../utils/roleUtils';
import {
  ActivitySparkIcon,
  PollBarsIcon,
  TriviaBuzzerIcon,
  SpinWheelIcon,
  AtlasGlobeIcon,
  WordTilesIcon,
  ExampleMagicIcon,
  TimerClockIcon,
  CheckTickIcon,
  ExitWatchIcon,
} from '../icons/LuxuryModuleIcons';
import './FloatingActivityLauncher.css';

const scrambleLetters = (word) => {
  const letters = String(word || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('');
  if (letters.length < 2) return letters;
  const copy = [...letters];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (copy.join('') === letters.join('')) {
    copy.push(copy.shift());
  }
  return copy;
};

const getCleanLastLetter = (str) => {
  const clean = String(str || '').trim().replace(/[^a-zA-Z]/g, '');
  if (!clean) return 'A';
  return clean[clean.length - 1].toUpperCase();
};

const PICKER_ITEMS = [
  {
    id: 'poll',
    title: 'Live Quick Poll',
    subtitle: '2 to 4 choices with optional timer',
    accent: '#c084fc',
    Icon: PollBarsIcon,
  },
  {
    id: 'trivia',
    title: 'Rapid Trivia Buzzer',
    subtitle: 'Timed speed buzzer & fastest winner',
    accent: '#22d3ee',
    Icon: TriviaBuzzerIcon,
  },
  {
    id: 'wheel',
    title: 'Spin the Wheel',
    subtitle: 'Smooth animated lucky roulette',
    accent: '#f472b6',
    Icon: SpinWheelIcon,
  },
  {
    id: 'atlas',
    title: 'Atlas Place Chain',
    subtitle: 'Live city & country letter chain',
    accent: '#34d399',
    Icon: AtlasGlobeIcon,
  },
  {
    id: 'word',
    title: 'Word Challenge',
    subtitle: 'Word Scramble or Live Word Chain',
    accent: '#fbbf24',
    Icon: WordTilesIcon,
  },
];

const FloatingActivityLauncher = ({
  roomId,
  loggedInUserProfile,
  isMuted = false,
  pickerOpen = false,
  onClosePicker,
}) => {
  const [activeCreator, setActiveCreator] = useState(null); // null | 'poll' | 'trivia' | 'wheel' | 'atlas' | 'word'
  const [submitting, setSubmitting] = useState(false);

  // Poll / Trivia state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [durationSec, setDurationSec] = useState(30);

  // Wheel state
  const [wheelTitle, setWheelTitle] = useState('');
  const [wheelEntriesRaw, setWheelEntriesRaw] = useState('');

  // Atlas state
  const [atlasTitle, setAtlasTitle] = useState('');
  const [atlasSeed, setAtlasSeed] = useState('');

  // Word Challenge state
  const [wordMode, setWordMode] = useState('scramble'); // 'scramble' | 'chain'
  const [wordTitle, setWordTitle] = useState('');
  const [wordTarget, setWordTarget] = useState('');
  const [wordHint, setWordHint] = useState('');

  const resetCreator = () => {
    setActiveCreator(null);
    setQuestion('');
    setOptions(['', '']);
    setCorrectIndex(0);
    setDurationSec(30);
    setWheelTitle('');
    setWheelEntriesRaw('');
    setAtlasTitle('');
    setAtlasSeed('');
    setWordMode('scramble');
    setWordTitle('');
    setWordTarget('');
    setWordHint('');
  };

  const openCreator = (type) => {
    if (onClosePicker) onClosePicker();
    if (isMuted) {
      pt.error('You are currently muted and cannot launch room activities.');
      return;
    }
    resetCreator();
    if (type === 'poll') setDurationSec(60);
    if (type === 'trivia') setDurationSec(25);
    if (type === 'atlas') setDurationSec(60);
    if (type === 'word') setDurationSec(45);
    setActiveCreator(type);
  };

  const applyExample = (preset) => {
    if (!preset) return;
    if (activeCreator === 'poll') {
      setQuestion(preset.title);
      setOptions([...preset.options]);
      setDurationSec(preset.durationSec ?? 60);
    } else if (activeCreator === 'trivia') {
      setQuestion(preset.title);
      setOptions([...preset.options]);
      setCorrectIndex(preset.correctIndex ?? 0);
      setDurationSec(preset.durationSec ?? 25);
    } else if (activeCreator === 'wheel') {
      setWheelTitle(preset.title);
      setWheelEntriesRaw((preset.entries || []).join(', '));
    } else if (activeCreator === 'atlas') {
      setAtlasTitle(preset.title);
      setAtlasSeed(preset.seedPlace || 'Mumbai');
      setDurationSec(preset.durationSec ?? 60);
    } else if (activeCreator === 'word') {
      setWordMode(preset.mode || 'scramble');
      setWordTitle(preset.title);
      setWordTarget(preset.targetWord || '');
      setWordHint(preset.hint || '');
      setDurationSec(preset.durationSec ?? 45);
    }
  };

  const wheelCount = useMemo(
    () =>
      wheelEntriesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean).length,
    [wheelEntriesRaw]
  );

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
      const dur = Number(durationSec) || 0;
      messageLabel = `Live Poll: ${qClean}`;
      activityPayload = {
        type: 'poll',
        roomId,
        title: qClean,
        creatorUid: myUid,
        creatorName: myName,
        creatorIdentity: myIdentity,
        status: 'active',
        durationSec: dur,
        endsAtMs: dur > 0 ? Date.now() + dur * 1000 : null,
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
      const dur = Math.max(15, Math.min(90, Number(durationSec) || 25));
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
    } else if (activeCreator === 'atlas') {
      const tClean = (atlasTitle.trim() || 'Atlas Place Chain').slice(0, 140);
      const seedClean = (atlasSeed.trim() || 'Mumbai').replace(/[^a-zA-Z\s-]/g, '').trim().slice(0, 40);
      if (seedClean.replace(/[^a-zA-Z]/g, '').length < 2) {
        pt.error('Enter a valid starting place name (minimum 2 letters).');
        return;
      }
      const dur = Math.max(20, Math.min(120, Number(durationSec) || 60));
      const reqLetter = getCleanLastLetter(seedClean);
      const seedKey = seedClean.toLowerCase().replace(/[^a-z]/g, '');
      messageLabel = `Atlas Chain: ${tClean}`;
      activityPayload = {
        type: 'atlas',
        roomId,
        title: tClean,
        creatorUid: myUid,
        creatorName: myName,
        creatorIdentity: myIdentity,
        status: 'active',
        seedPlace: seedClean,
        currentPlace: seedClean,
        requiredLetter: reqLetter,
        entries: [{ word: seedClean, uid: myUid, name: myName, isSeed: true }],
        usedKeys: [seedKey],
        lastPlayerUid: myUid,
        lastPlayerName: myName,
        scores: {},
        round: 1,
        durationSec: dur,
        endsAtMs: Date.now() + dur * 1000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    } else if (activeCreator === 'word') {
      const tClean = (wordTitle.trim() || (wordMode === 'scramble' ? 'Word Scramble Challenge' : 'Live Word Chain')).slice(0, 140);
      const cleanWord = wordTarget.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 18);
      if (cleanWord.length < 3) {
        pt.error('Enter a target/starting word with at least 3 letters.');
        return;
      }
      const dur = Math.max(20, Math.min(120, Number(durationSec) || 45));
      messageLabel = `${wordMode === 'scramble' ? 'Word Scramble' : 'Word Chain'}: ${tClean}`;
      if (wordMode === 'scramble') {
        activityPayload = {
          type: 'word',
          mode: 'scramble',
          roomId,
          title: tClean,
          creatorUid: myUid,
          creatorName: myName,
          creatorIdentity: myIdentity,
          status: 'active',
          answerWord: cleanWord,
          scrambledLetters: scrambleLetters(cleanWord),
          wordLength: cleanWord.length,
          hint: wordHint.trim().slice(0, 90),
          durationSec: dur,
          endsAtMs: Date.now() + dur * 1000,
          attemptCount: 0,
          solvedBy: [],
          firstCorrectUid: null,
          firstCorrectName: null,
          firstCorrectIdentity: null,
          firstCorrectAtMs: null,
          winnerLocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      } else {
        const reqLetter = getCleanLastLetter(cleanWord);
        activityPayload = {
          type: 'word',
          mode: 'chain',
          roomId,
          title: tClean,
          creatorUid: myUid,
          creatorName: myName,
          creatorIdentity: myIdentity,
          status: 'active',
          currentWord: cleanWord,
          requiredLetter: reqLetter,
          hint: wordHint.trim().slice(0, 90),
          entries: [{ word: cleanWord, uid: myUid, name: myName, isSeed: true }],
          usedKeys: [cleanWord.toLowerCase()],
          scores: {},
          round: 1,
          durationSec: dur,
          endsAtMs: Date.now() + dur * 1000,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }
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

  const activeExamples = activeCreator ? (GAME_EXAMPLES[activeCreator] || []) : [];

  return (
    <>
      {pickerOpen &&
        createPortal(
          <div className="hp-act-modal-overlay" onClick={() => onClosePicker && onClosePicker()}>
            <div
              className="hp-act-modal hp-act-picker-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Room Mini-Games and Polls"
            >
              <div className="hp-act-modal-hdr">
                <h4>
                  <ActivitySparkIcon size={16} color="var(--accent-color, #8b5cf6)" />
                  Mini-Games &amp; Polls
                </h4>
                <button
                  type="button"
                  className="hp-act-close-x"
                  onClick={() => onClosePicker && onClosePicker()}
                  aria-label="Close"
                >
                  <ExitWatchIcon size={14} />
                </button>
              </div>

              <div className="hp-act-picker-list">
                {PICKER_ITEMS.map((item) => {
                  const IconComp = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="hp-activity-pop-btn"
                      onClick={() => openCreator(item.id)}
                    >
                      <span className="hp-activity-pop-icon" style={{ borderColor: `${item.accent}44` }}>
                        <IconComp size={16} color={item.accent} />
                      </span>
                      <span className="hp-activity-pop-label">
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

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
                  {activeCreator === 'poll' && <><PollBarsIcon size={16} color="#c084fc" /> Live Quick Poll</>}
                  {activeCreator === 'trivia' && <><TriviaBuzzerIcon size={16} color="#22d3ee" /> Rapid Trivia Buzzer</>}
                  {activeCreator === 'wheel' && <><SpinWheelIcon size={16} color="#f472b6" /> Spin the Wheel</>}
                  {activeCreator === 'atlas' && <><AtlasGlobeIcon size={16} color="#34d399" /> Atlas Place Chain</>}
                  {activeCreator === 'word' && <><WordTilesIcon size={16} color="#fbbf24" /> Word Challenge</>}
                </h4>
                <button type="button" className="hp-act-close-x" onClick={resetCreator} aria-label="Close">
                  <ExitWatchIcon size={14} />
                </button>
              </div>

              {/* Quick One-Click Examples */}
              {activeExamples.length > 0 && (
                <div className="hp-act-examples-bar">
                  <span className="hp-act-examples-lbl">
                    <ExampleMagicIcon size={12} color="var(--accent-color, #a78bfa)" />
                    Quick Examples
                  </span>
                  <div className="hp-act-examples-chips">
                    {activeExamples.map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        className="hp-act-example-chip"
                        onClick={() => applyExample(ex)}
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                          ? 'Ask the room a quick question...'
                          : 'Enter a rapid trivia question...'
                      }
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="hp-act-field">
                    <label>
                      Options ({options.length}/4)
                      {activeCreator === 'trivia' ? ' - Select Correct Answer' : ''}
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
                            {correctIndex === idx ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <CheckTickIcon size={11} color="currentColor" /> Answer
                              </span>
                            ) : 'Mark'}
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

                  <div className="hp-act-field">
                    <label>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <TimerClockIcon size={12} color="currentColor" />
                        Countdown Timer
                      </span>
                    </label>
                    <div className="hp-act-timer-pills">
                      {(activeCreator === 'poll' ? [0, 30, 60, 120] : [15, 25, 40, 60]).map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          className={`hp-act-timer-pill${durationSec === sec ? ' active' : ''}`}
                          onClick={() => setDurationSec(sec)}
                        >
                          {sec === 0 ? 'No Limit' : `${sec}s`}
                        </button>
                      ))}
                    </div>
                  </div>
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
                      placeholder="Who leads the next game or challenge?"
                      value={wheelTitle}
                      onChange={(e) => setWheelTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>Slices ({Math.min(12, wheelCount)}/12 comma-separated)</label>
                    <textarea
                      rows={3}
                      className="hp-act-textarea"
                      placeholder="Truth, Dare, Sing Song, Wildcard"
                      value={wheelEntriesRaw}
                      onChange={(e) => setWheelEntriesRaw(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {activeCreator === 'atlas' && (
                <>
                  <div className="hp-act-field">
                    <label>Atlas Theme / Title</label>
                    <input
                      type="text"
                      maxLength={140}
                      className="hp-act-input"
                      placeholder="World Cities & Countries Atlas"
                      value={atlasTitle}
                      onChange={(e) => setAtlasTitle(e.target.value)}
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>Starting Place</label>
                    <input
                      type="text"
                      maxLength={40}
                      className="hp-act-input"
                      placeholder="Mumbai (next player starts with I)"
                      value={atlasSeed}
                      onChange={(e) => setAtlasSeed(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <TimerClockIcon size={12} color="currentColor" />
                        Round Timer
                      </span>
                    </label>
                    <div className="hp-act-timer-pills">
                      {[30, 45, 60, 90].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          className={`hp-act-timer-pill${durationSec === sec ? ' active' : ''}`}
                          onClick={() => setDurationSec(sec)}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeCreator === 'word' && (
                <>
                  <div className="hp-act-field">
                    <label>Challenge Mode</label>
                    <div className="hp-act-mode-switch">
                      <button
                        type="button"
                        className={`hp-act-mode-btn${wordMode === 'scramble' ? ' active' : ''}`}
                        onClick={() => setWordMode('scramble')}
                      >
                        Word Scramble
                      </button>
                      <button
                        type="button"
                        className={`hp-act-mode-btn${wordMode === 'chain' ? ' active' : ''}`}
                        onClick={() => setWordMode('chain')}
                      >
                        Word Chain
                      </button>
                    </div>
                  </div>
                  <div className="hp-act-field">
                    <label>Challenge Title</label>
                    <input
                      type="text"
                      maxLength={140}
                      className="hp-act-input"
                      placeholder={wordMode === 'scramble' ? 'Unscramble the Secret Word' : 'Fast English Word Chain'}
                      value={wordTitle}
                      onChange={(e) => setWordTitle(e.target.value)}
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>{wordMode === 'scramble' ? 'Secret Word (letters only)' : 'Starting Word'}</label>
                    <input
                      type="text"
                      maxLength={18}
                      className="hp-act-input"
                      placeholder={wordMode === 'scramble' ? 'AURORA' : 'STARLIGHT'}
                      value={wordTarget}
                      onChange={(e) => setWordTarget(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>Hint (optional)</label>
                    <input
                      type="text"
                      maxLength={90}
                      className="hp-act-input"
                      placeholder="Short clue shown on the card..."
                      value={wordHint}
                      onChange={(e) => setWordHint(e.target.value)}
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <TimerClockIcon size={12} color="currentColor" />
                        Countdown Timer
                      </span>
                    </label>
                    <div className="hp-act-timer-pills">
                      {[30, 45, 60, 90].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          className={`hp-act-timer-pill${durationSec === sec ? ' active' : ''}`}
                          onClick={() => setDurationSec(sec)}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="hp-act-footer-btns">
                <button type="button" className="hp-act-btn-secondary" onClick={resetCreator}>
                  Cancel
                </button>
                <button type="submit" className="hp-act-btn-primary" disabled={submitting}>
                  {submitting ? 'Launching...' : 'Send to Chat'}
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
