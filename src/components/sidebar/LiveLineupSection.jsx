import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { pt } from '../../utils/premiumToast';
import { isStaffRole, isRjRole } from '../../utils/roleUtils';
import {
  classifyShowStatus,
  formatTimeRange12h,
  getIdentityLabel,
  parseTimeToMinutes,
  SHOW_REMINDERS_STORAGE_KEY,
} from '../../utils/roomModulesConfig';
import {
  LiveSignalIcon,
  ScheduleCalendarIcon,
  IdentityEmblem,
  BellReminderIcon,
  JumpRoomIcon,
  ExitWatchIcon,
} from '../icons/LuxuryModuleIcons';
import './LiveLineupSection.css';

const readSavedReminders = () => {
  try {
    const raw = localStorage.getItem(SHOW_REMINDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const LiveLineupSection = ({
  loggedInUserProfile,
  currentRoomId,
  onJumpToRoom,
}) => {
  const [lineupTab, setLineupTab] = useState('onair'); // 'onair' | 'upnext' | 'all'
  const [shows, setShows] = useState([]);
  const [remindedIds, setRemindedIds] = useState(() => readSavedReminders());
  const [nowTick, setNowTick] = useState(() => new Date());

  // Admin / RJ schedule editor drawer
  const [managerOpen, setManagerOpen] = useState(false);
  const [roomsList, setRoomsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formHostName, setFormHostName] = useState('');
  const [formHostIdentity, setFormHostIdentity] = useState('purush');
  const [formRoomId, setFormRoomId] = useState(currentRoomId || '');
  const [formStartTime, setFormStartTime] = useState('20:00');
  const [formDuration, setFormDuration] = useState(60);
  const [formStatusOverride, setFormStatusOverride] = useState('auto');

  const canManageLineup = isStaffRole(loggedInUserProfile) || isRjRole(loggedInUserProfile);

  // Single lightweight listener on schedules/dailyLineup
  useEffect(() => {
    const ref = doc(db, 'schedules', 'dailyLineup');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const list = Array.isArray(data.shows) ? data.shows : [];
          setShows(list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        } else {
          setShows([]);
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // Re-evaluate show slots every 30s locally without touching Firestore
  useEffect(() => {
    const id = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Load room options on demand when manager modal opens
  useEffect(() => {
    if (!managerOpen) return;
    getDocs(query(collection(db, 'rooms'), limit(50)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.id,
        }));
        setRoomsList(list);
        if (!formRoomId && list.length > 0) {
          setFormRoomId(currentRoomId || list[0].id);
        }
      })
      .catch(() => {});
  }, [managerOpen, currentRoomId, formRoomId]);

  const toggleReminder = (show) => {
    const exists = remindedIds.includes(show.id);
    const next = exists
      ? remindedIds.filter((id) => id !== show.id)
      : [...remindedIds, show.id];
    setRemindedIds(next);
    try {
      localStorage.setItem(SHOW_REMINDERS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('tlRemindersUpdated', { detail: next }));
    } catch {}

    if (!exists) {
      pt.info(`Reminder set for ${show.title}`);
    }
  };

  const classified = useMemo(() => {
    const onAir = [];
    const upNext = [];
    const todayAll = [];

    shows.forEach((s) => {
      const status = classifyShowStatus(s, nowTick);
      const item = { ...s, computedStatus: status };
      todayAll.push(item);
      if (status === 'live') onAir.push(item);
      else if (status === 'upnext' || status === 'later') upNext.push(item);
    });

    upNext.sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));
    return { onAir, upNext, todayAll };
  }, [shows, nowTick]);

  const visibleShows =
    lineupTab === 'onair'
      ? classified.onAir
      : lineupTab === 'upnext'
      ? classified.upNext
      : classified.todayAll;

  const persistShows = async (nextShows) => {
    const uid = auth.currentUser?.uid || loggedInUserProfile?.uid || '';
    if (!uid) return;
    setSaving(true);
    try {
      const normalized = nextShows.map((s, idx) => ({ ...s, order: idx }));
      await setDoc(doc(db, 'schedules', 'dailyLineup'), {
        shows: normalized,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      pt.error(err?.message || 'Unable to update schedule lineup.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormHostName(loggedInUserProfile?.displayName || '');
    setFormHostIdentity('purush');
    setFormRoomId(currentRoomId || roomsList[0]?.id || '');
    setFormStartTime('20:00');
    setFormDuration(60);
    setFormStatusOverride('auto');
  };

  const handleSaveShow = async (e) => {
    e.preventDefault();
    const titleClean = formTitle.trim().slice(0, 80);
    const hostClean = formHostName.trim().slice(0, 48);
    if (!titleClean || !hostClean || !formRoomId) {
      pt.error('Enter show title, host name, and target room.');
      return;
    }

    const selectedRoom = roomsList.find((r) => r.id === formRoomId);
    const entry = {
      id: editingId || `show_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: titleClean,
      hostName: hostClean,
      hostUid: auth.currentUser?.uid || '',
      hostIdentity: formHostIdentity,
      roomId: formRoomId,
      roomName: selectedRoom?.name || formRoomId,
      startTime: formStartTime,
      startMinutes: parseTimeToMinutes(formStartTime),
      durationMinutes: Math.max(15, Math.min(480, Number(formDuration) || 60)),
      statusOverride: formStatusOverride,
      order: shows.length,
    };

    const nextList = editingId
      ? shows.map((s) => (s.id === editingId ? entry : s))
      : [...shows, entry];

    await persistShows(nextList);
    resetForm();
  };

  const handleDeleteShow = async (showId) => {
    await persistShows(shows.filter((s) => s.id !== showId));
  };

  const handleMoveShow = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= shows.length) return;
    const copy = [...shows];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    await persistShows(copy);
  };

  const startEdit = (show) => {
    setEditingId(show.id);
    setFormTitle(show.title || '');
    setFormHostName(show.hostName || '');
    setFormHostIdentity(show.hostIdentity || 'purush');
    setFormRoomId(show.roomId || currentRoomId || '');
    setFormStartTime(show.startTime || '20:00');
    setFormDuration(show.durationMinutes || 60);
    setFormStatusOverride(show.statusOverride || 'auto');
  };

  return (
    <div className="tl-lineup-wrap">
      <div className="tl-lineup-head-row">
        <span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.78 }}>
          Live Broadcasts &amp; Upcoming RJ Sessions
        </span>
        {canManageLineup && (
          <button
            type="button"
            className="tl-lineup-manage-btn"
            onClick={() => setManagerOpen(true)}
          >
            <ScheduleCalendarIcon size={13} color="currentColor" />
            Manage
          </button>
        )}
      </div>

      <div className="tl-lineup-tabs" role="tablist" aria-label="Broadcast Schedule Views">
        <button
          type="button"
          role="tab"
          aria-selected={lineupTab === 'onair'}
          className={`tl-lineup-tab${lineupTab === 'onair' ? ' is-active' : ''}`}
          onClick={() => setLineupTab('onair')}
        >
          <LiveSignalIcon
            size={12}
            color={lineupTab === 'onair' ? '#ffffff' : '#e11d48'}
            pulse={classified.onAir.length > 0}
          />
          On Air ({classified.onAir.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={lineupTab === 'upnext'}
          className={`tl-lineup-tab${lineupTab === 'upnext' ? ' is-active' : ''}`}
          onClick={() => setLineupTab('upnext')}
        >
          Up Next ({classified.upNext.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={lineupTab === 'all'}
          className={`tl-lineup-tab${lineupTab === 'all' ? ' is-active' : ''}`}
          onClick={() => setLineupTab('all')}
        >
          Today ({classified.todayAll.length})
        </button>
      </div>

      <div className="tl-lineup-list">
        {visibleShows.length === 0 ? (
          <div className="tl-lineup-empty">
            {lineupTab === 'onair'
              ? 'No broadcast show currently on air.'
              : lineupTab === 'upnext'
              ? 'No upcoming shows queued right now.'
              : 'Today lineup has no scheduled broadcasts yet.'}
          </div>
        ) : (
          visibleShows.map((show) => {
            const isLive = show.computedStatus === 'live';
            const isReminded = remindedIds.includes(show.id);
            const startMin =
              typeof show.startMinutes === 'number'
                ? show.startMinutes
                : parseTimeToMinutes(show.startTime || '00:00');
            return (
              <div key={show.id} className={`tl-show-card${isLive ? ' is-live' : ''}`}>
                <div className="tl-show-top">
                  <h5 className="tl-show-title">{show.title}</h5>
                  <span className="tl-show-slot">
                    {formatTimeRange12h(startMin, show.durationMinutes)}
                  </span>
                </div>

                <div className="tl-show-host-row">
                  <span className="tl-show-host-chip">
                    <IdentityEmblem identity={show.hostIdentity} size={14} />
                    <span>{show.hostName}</span>
                    <span style={{ opacity: 0.65, fontWeight: 600 }}>
                      ({getIdentityLabel(show.hostIdentity)})
                    </span>
                  </span>
                  <span className="tl-show-room-tag">{show.roomName || show.roomId}</span>
                </div>

                <div className="tl-show-actions">
                  {isLive ? (
                    <>
                      <span className="tl-show-status-label">
                        <LiveSignalIcon size={13} color="#e11d48" pulse />
                        On Air Now
                      </span>
                      <button
                        type="button"
                        className="tl-show-action-btn"
                        onClick={() => onJumpToRoom && onJumpToRoom(show.roomId)}
                      >
                        <JumpRoomIcon size={12} color="#ffffff" />
                        Jump to Room
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`tl-show-remind-btn${isReminded ? ' is-reminded' : ''}`}
                        onClick={() => toggleReminder(show)}
                      >
                        <BellReminderIcon active={isReminded} size={13} color="currentColor" />
                        {isReminded ? 'Reminder On' : 'Remind Me'}
                      </button>
                      <button
                        type="button"
                        className="tl-show-action-btn"
                        onClick={() => onJumpToRoom && onJumpToRoom(show.roomId)}
                      >
                        <JumpRoomIcon size={12} color="#ffffff" />
                        Visit Room
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {managerOpen &&
        canManageLineup &&
        createPortal(
          <div className="tl-sched-modal-overlay" onClick={() => setManagerOpen(false)}>
            <div className="tl-sched-modal" onClick={(e) => e.stopPropagation()}>
              <div className="hp-act-modal-hdr">
                <h4>
                  <ScheduleCalendarIcon size={17} color="#c084fc" />
                  Manage Daily Broadcast Lineup
                </h4>
                <button
                  type="button"
                  className="hp-act-close-x"
                  onClick={() => setManagerOpen(false)}
                  aria-label="Close"
                >
                  <ExitWatchIcon size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveShow} style={{ marginBottom: 14 }}>
                <div className="hp-act-field">
                  <label>Show Title</label>
                  <input
                    type="text"
                    maxLength={80}
                    className="hp-act-input"
                    placeholder="Late Night Mehfil Acoustic"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="hp-act-field">
                    <label>Host Name</label>
                    <input
                      type="text"
                      maxLength={48}
                      className="hp-act-input"
                      placeholder="RJ Name"
                      value={formHostName}
                      onChange={(e) => setFormHostName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>Host Identity</label>
                    <select
                      className="hp-act-input"
                      value={formHostIdentity}
                      onChange={(e) => setFormHostIdentity(e.target.value)}
                    >
                      <option value="purush">Purush</option>
                      <option value="stree">Stree</option>
                      <option value="navrang">Navrang</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 8 }}>
                  <div className="hp-act-field">
                    <label>Target Room</label>
                    <select
                      className="hp-act-input"
                      value={formRoomId}
                      onChange={(e) => setFormRoomId(e.target.value)}
                      required
                    >
                      {roomsList.length === 0 && (
                        <option value={currentRoomId || 'general'}>
                          {currentRoomId || 'General Room'}
                        </option>
                      )}
                      {roomsList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="hp-act-field">
                    <label>Live Override</label>
                    <select
                      className="hp-act-input"
                      value={formStatusOverride}
                      onChange={(e) => setFormStatusOverride(e.target.value)}
                    >
                      <option value="auto">Auto Time</option>
                      <option value="live">Force On Air</option>
                      <option value="ended">Mark Ended</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="hp-act-field">
                    <label>Start Time (24h)</label>
                    <input
                      type="time"
                      className="hp-act-input"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="hp-act-field">
                    <label>Duration (Mins)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      className="hp-act-input"
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="hp-act-footer-btns" style={{ marginTop: 8 }}>
                  {editingId && (
                    <button type="button" className="hp-act-btn-secondary" onClick={resetForm}>
                      Clear Edit
                    </button>
                  )}
                  <button type="submit" className="hp-act-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Update Show' : 'Add Show'}
                  </button>
                </div>
              </form>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#c4b5fd', marginBottom: 8, textTransform: 'uppercase' }}>
                  Scheduled Order ({shows.length})
                </div>
                {shows.map((show, idx) => (
                  <div key={show.id} className="tl-sched-row-card">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {show.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        {show.hostName} · {show.startTime} ({show.durationMinutes}m)
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button type="button" className="tl-sched-mini-btn" disabled={idx === 0 || saving} onClick={() => handleMoveShow(idx, -1)}>
                        Up
                      </button>
                      <button type="button" className="tl-sched-mini-btn" disabled={idx === shows.length - 1 || saving} onClick={() => handleMoveShow(idx, 1)}>
                        Down
                      </button>
                      <button type="button" className="tl-sched-mini-btn" onClick={() => startEdit(show)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="tl-sched-mini-btn"
                        style={{ borderColor: 'rgba(248,113,113,0.45)', color: '#fca5a5' }}
                        disabled={saving}
                        onClick={() => handleDeleteShow(show.id)}
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default LiveLineupSection;
