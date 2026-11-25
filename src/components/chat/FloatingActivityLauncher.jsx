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
  ShuffleSparkIcon,
  LibraryDeckIcon,
  SearchLensIcon,
  BackArrowIcon,
  SendPaperPlaneIcon,
} from '../icons/LuxuryModuleIcons';
import './FloatingActivityLauncher.css';

const PREVIEW_WHEEL_COLORS = [
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

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

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

const polarXY = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx, cy, r, startA, endA) => {
  const s = polarXY(cx, cy, r, endA);
  const e = polarXY(cx, cy, r, startA);
  const large = endA - startA <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
};

const PICKER_ITEMS = [
  {
    id: 'poll',
    title: 'Live Quick Poll',
    subtitle: 'Real-time vote bars & voter names',
    badge: '52 Presets',
    accent: '#c084fc',
    Icon: PollBarsIcon,
  },
  {
    id: 'trivia',
    title: 'Rapid Trivia',
    subtitle: 'Speed buzzer & points leaderboard',
    badge: '55 Presets',
    accent: '#22d3ee',
    Icon: TriviaBuzzerIcon,
  },
  {
    id: 'wheel',
    title: 'Lucky Wheel',
    subtitle: 'Silky casino roulette & spin points',
    badge: '52 Presets',
    accent: '#f472b6',
    Icon: SpinWheelIcon,
  },
  {
    id: 'atlas',
    title: 'Atlas Chain',
    subtitle: 'Live geography letter chain & scores',
    badge: '52 Presets',
    accent: '#34d399',
    Icon: AtlasGlobeIcon,
  },
  {
    id: 'word',
    title: 'Word Challenge',
    subtitle: 'Scramble tiles or high-speed word chain',
    badge: '56 Presets',
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
  const [activeCreator, setActiveCreator] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Preset drawer state
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [wordLibraryFilter, setWordLibraryFilter] = useState('all'); // 'all' | 'scramble' | 'chain'

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
  const [wordMode, setWordMode] = useState('scramble');
  const [wordTitle, setWordTitle] = useState('');
  const [wordTarget, setWordTarget] = useState('');
  const [wordHint, setWordHint] = useState('');

  const resetFormFields = () => {
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
    setLibraryOpen(false);
    setLibrarySearch('');
    setWordLibraryFilter('all');
  };

  const resetCreator = () => {
    setActiveCreator(null);
    resetFormFields();
  };

  const applyPresetForType = (type, preset) => {
    if (!preset) return;
    if (type === 'poll') {
      setQuestion(preset.title);
      setOptions([...preset.options]);
      setDurationSec(preset.durationSec ?? 60);
    } else if (type === 'trivia') {
      setQuestion(preset.title);
      setOptions([...preset.options]);
      setCorrectIndex(preset.correctIndex ?? 0);
      setDurationSec(preset.durationSec ?? 25);
    } else if (type === 'wheel') {
      setWheelTitle(preset.title);
      setWheelEntriesRaw((preset.entries || []).join(', '));
    } else if (type === 'atlas') {
      setAtlasTitle(preset.title);
      setAtlasSeed(preset.seedPlace || 'Mumbai');
      setDurationSec(preset.durationSec ?? 60);
    } else if (type === 'word') {
      setWordMode(preset.mode || 'scramble');
      setWordTitle(preset.title);
      setWordTarget(preset.targetWord || '');
      setWordHint(preset.hint || '');
      setDurationSec(preset.durationSec ?? 45);
    }
  };

  const openCreator = (type) => {
    if (onClosePicker) onClosePicker();
    if (isMuted) {
      pt.error('You are currently muted and cannot launch room activities.');
      return;
    }
    resetFormFields();
    const list = GAME_EXAMPLES[type] || [];
    if (type === 'poll') setDurationSec(60);
    if (type === 'trivia') setDurationSec(25);
    if (type === 'atlas') setDurationSec(60);
    if (type === 'word') setDurationSec(45);
    // Pre-fill cleanly with the first curated preset so host can send in 1 tap or edit immediately
    if (list.length > 0) {
      applyPresetForType(type, list[0]);
    }
    setActiveCreator(type);
  };

  const handleBackToPicker = () => {
    resetCreator();
    // Returning cleanly lets user re-open picker if desired via chat bar, or keep compact
  };

  const handleShufflePreset = () => {
    if (!activeCreator) return;
    const pool = GAME_EXAMPLES[activeCreator] || [];
    if (!pool.length) return;
    const filtered =
      activeCreator === 'word' && wordLibraryFilter !== 'all'
        ? pool.filter((p) => p.mode === wordLibraryFilter)
        : pool;
    const source = filtered.length ? filtered : pool;
    const pick = source[Math.floor(Math.random() * source.length)];
    applyPresetForType(activeCreator, pick);
  };

  const wheelEntriesList = useMemo(
    () =>
      wheelEntriesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
    [wheelEntriesRaw]
  );

  const previewScrambleTiles = useMemo(() => {
    const clean = wordTarget.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 18);
    if (clean.length < 2) return [];
    return clean.split('');
  }, [wordTarget]);

  const activeExamples = useMemo(
    () => (activeCreator ? GAME_EXAMPLES[activeCreator] || [] : []),
    [activeCreator]
  );

  const filteredLibraryExamples = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return activeExamples.filter((ex) => {
      if (activeCreator === 'word' && wordLibraryFilter !== 'all' && ex.mode !== wordLibraryFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        ex.label,
        ex.title,
        ex.seedPlace,
        ex.targetWord,
        ex.hint,
        ...(ex.options || []),
        ...(ex.entries || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activeExamples, activeCreator, librarySearch, wordLibraryFilter]);

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

  const activeAccent =
    activeCreator === 'trivia'
      ? '#22d3ee'
      : activeCreator === 'wheel'
        ? '#f472b6'
        : activeCreator === 'atlas'
          ? '#34d399'
          : activeCreator === 'word'
            ? '#fbbf24'
            : '#c084fc';

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
                <div className="hp-act-hdr-title-wrap">
                  <span className="hp-act-hdr-badge">
                    <ActivitySparkIcon size={15} color="#ffffff" />
                  </span>
                  <div>
                    <h4>Mini-Games &amp; Polls</h4>
                    <span className="hp-act-hdr-sub">265+ live presets · points &amp; boards</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="hp-act-close-x"
                  onClick={() => onClosePicker && onClosePicker()}
                  aria-label="Close"
                >
                  <ExitWatchIcon size={13} />
                </button>
              </div>

              <div className="hp-act-picker-grid">
                {PICKER_ITEMS.map((item) => {
                  const IconComp = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`hp-activity-card-btn${item.id === 'word' ? ' is-featured' : ''}`}
                      style={{ '--item-accent': item.accent }}
                      onClick={() => openCreator(item.id)}
                    >
                      <span className="hp-activity-pop-icon">
                        <IconComp size={17} color={item.accent} />
                      </span>
                      <span className="hp-activity-pop-label">
                        <span className="hp-activity-title-row">
                          <strong>{item.title}</strong>
                          <span className="hp-activity-count-meta">{item.badge}</span>
                        </span>
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
              className="hp-act-modal hp-act-creator-modal"
              style={{ '--creator-accent': activeAccent }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleLaunch}
            >
              <div className="hp-act-modal-hdr">
                <div className="hp-act-hdr-title-wrap">
                  <button
                    type="button"
                    className="hp-act-back-btn"
                    onClick={handleBackToPicker}
                    aria-label="Back"
                    title="Close"
                  >
                    <BackArrowIcon size={13} />
                  </button>
                  <span className="hp-act-hdr-badge" style={{ background: activeAccent }}>
                    {activeCreator === 'poll' && <PollBarsIcon size={15} color="#0f172a" />}
                    {activeCreator === 'trivia' && <TriviaBuzzerIcon size={15} color="#0f172a" />}
                    {activeCreator === 'wheel' && <SpinWheelIcon size={15} color="#0f172a" />}
                    {activeCreator === 'atlas' && <AtlasGlobeIcon size={15} color="#0f172a" />}
                    {activeCreator === 'word' && <WordTilesIcon size={15} color="#0f172a" />}
                  </span>
                  <div>
                    <h4>
                      {activeCreator === 'poll' && 'Live Quick Poll'}
                      {activeCreator === 'trivia' && 'Rapid Trivia Buzzer'}
                      {activeCreator === 'wheel' && 'Spin the Wheel'}
                      {activeCreator === 'atlas' && 'Atlas Place Chain'}
                      {activeCreator === 'word' && 'Word Challenge'}
                    </h4>
                    <span className="hp-act-hdr-sub">{activeExamples.length} curated presets ready</span>
                  </div>
                </div>
                <button type="button" className="hp-act-close-x" onClick={resetCreator} aria-label="Close">
                  <ExitWatchIcon size={13} />
                </button>
              </div>

              {/* Compact Preset Toolbar: Shuffle + Browse 50+ Library */}
              {activeExamples.length > 0 && (
                <div className="hp-act-examples-bar">
                  <div className="hp-act-examples-top">
                    <span className="hp-act-examples-lbl">
                      <ExampleMagicIcon size={12} color={activeAccent} />
                      <span>Presets ({activeExamples.length})</span>
                    </span>
                    <div className="hp-act-examples-actions">
                      <button
                        type="button"
                        className="hp-act-mini-action"
                        onClick={handleShufflePreset}
                      >
                        <ShuffleSparkIcon size={12} color="currentColor" />
                        <span>Shuffle</span>
                      </button>
                      <button
                        type="button"
                        className={`hp-act-mini-action${libraryOpen ? ' is-active' : ''}`}
                        onClick={() => setLibraryOpen((v) => !v)}
                      >
                        <LibraryDeckIcon size={12} color="currentColor" />
                        <span>{libraryOpen ? 'Hide List' : 'Browse All'}</span>
                      </button>
                    </div>
                  </div>

                  {!libraryOpen && (
                    <div className="hp-act-examples-chips">
                      {activeExamples.slice(0, 6).map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          className="hp-act-example-chip"
                          onClick={() => applyPresetForType(activeCreator, ex)}
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {libraryOpen && (
                    <div className="hp-act-lib-drawer">
                      <div className="hp-act-lib-search-row">
                        <SearchLensIcon size={13} color="currentColor" />
                        <input
                          type="text"
                          className="hp-act-lib-search-input"
                          placeholder={`Search all ${activeExamples.length} presets...`}
                          value={librarySearch}
                          onChange={(e) => setLibrarySearch(e.target.value)}
                        />
                      </div>

                      {activeCreator === 'word' && (
                        <div className="hp-act-lib-subtabs">
                          {['all', 'scramble', 'chain'].map((f) => (
                            <button
                              key={f}
                              type="button"
                              className={`hp-act-lib-subtab${wordLibraryFilter === f ? ' active' : ''}`}
                              onClick={() => setWordLibraryFilter(f)}
                            >
                              {f === 'all' ? 'All (56)' : f === 'scramble' ? 'Scramble (28)' : 'Chain (28)'}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="hp-act-lib-list">
                        {filteredLibraryExamples.length === 0 ? (
                          <div className="hp-act-lib-empty">No matching presets found.</div>
                        ) : (
                          filteredLibraryExamples.map((ex, idx) => (
                            <button
                              key={`${ex.label}-${idx}`}
                              type="button"
                              className="hp-act-lib-item"
                              onClick={() => {
                                applyPresetForType(activeCreator, ex);
                                setLibraryOpen(false);
                              }}
                            >
                              <span className="hp-act-lib-idx">#{idx + 1}</span>
                              <span className="hp-act-lib-body">
                                <strong>{ex.label}</strong>
                                <small>{ex.title}</small>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
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
                      Choices ({options.length}/4)
                      {activeCreator === 'trivia' ? ' — Select Correct Answer' : ''}
                    </label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="hp-act-opt-row">
                        <span className="hp-act-opt-letter">{OPTION_LETTERS[idx] || idx + 1}</span>
                        <input
                          type="text"
                          maxLength={64}
                          className="hp-act-input"
                          placeholder={`Choice ${OPTION_LETTERS[idx] || idx + 1}`}
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
                              <span className="hp-act-btn-inner">
                                <CheckTickIcon size={11} color="currentColor" /> Correct
                              </span>
                            ) : (
                              'Mark'
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                    {options.length < 4 && (
                      <button
                        type="button"
                        className="hp-act-btn-secondary hp-act-add-opt-btn"
                        onClick={() => setOptions((prev) => [...prev, ''])}
                      >
                        + Add Choice
                      </button>
                    )}
                  </div>

                  <div className="hp-act-field">
                    <label>
                      <span className="hp-act-lbl-inline">
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
                  <div className="hp-act-wheel-compose-row">
                    <div className="hp-act-field" style={{ flex: 1, marginBottom: 0 }}>
                      <label>Slices ({wheelEntriesList.length}/12 comma-separated)</label>
                      <textarea
                        rows={4}
                        className="hp-act-textarea"
                        placeholder="Truth, Dare, Sing Song, Wildcard"
                        value={wheelEntriesRaw}
                        onChange={(e) => setWheelEntriesRaw(e.target.value)}
                        required
                      />
                    </div>
                    <div className="hp-act-wheel-mini-preview" aria-hidden="true">
                      <svg width="86" height="86" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="47" fill="#0f172a" stroke="#fde68a" strokeWidth="2.5" />
                        {(wheelEntriesList.length >= 2 ? wheelEntriesList : ['A', 'B', 'C', 'D']).map((entry, idx, arr) => {
                          const step = 360 / arr.length;
                          const start = idx * step;
                          return (
                            <path
                              key={`${entry}-${idx}`}
                              d={arcPath(50, 50, 44, start, start + step)}
                              fill={PREVIEW_WHEEL_COLORS[idx % PREVIEW_WHEEL_COLORS.length]}
                              stroke="rgba(255,255,255,0.28)"
                              strokeWidth="0.9"
                            />
                          );
                        })}
                        <circle cx="50" cy="50" r="8.5" fill="#0f172a" stroke="#fde68a" strokeWidth="1.8" />
                        <circle cx="50" cy="50" r="2.8" fill="#fde68a" />
                      </svg>
                      <span>Live Preview</span>
                    </div>
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
                    <div className="hp-act-atlas-seed-row">
                      <input
                        type="text"
                        maxLength={40}
                        className="hp-act-input"
                        placeholder="Mumbai"
                        value={atlasSeed}
                        onChange={(e) => setAtlasSeed(e.target.value)}
                        required
                      />
                      <span className="hp-act-next-preview" title="First required letter">
                        Next: <strong>{getCleanLastLetter(atlasSeed || 'Mumbai')}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="hp-act-field">
                    <label>
                      <span className="hp-act-lbl-inline">
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
                    {wordMode === 'scramble' && previewScrambleTiles.length >= 3 && (
                      <div className="hp-act-tile-preview" aria-hidden="true">
                        {previewScrambleTiles.map((ch, i) => (
                          <span key={i} className="hp-act-mini-tile">{ch}</span>
                        ))}
                      </div>
                    )}
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
                      <span className="hp-act-lbl-inline">
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
                  <SendPaperPlaneIcon size={13} color="#ffffff" />
                  <span>{submitting ? 'Launching...' : 'Send to Chat'}</span>
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
