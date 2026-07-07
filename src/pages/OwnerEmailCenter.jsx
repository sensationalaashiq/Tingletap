import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
  onSnapshot, orderBy, limit, doc, getDoc,
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import './OwnerEmailCenter.css';

// Owner sender mapping (UI display only — enforcement is server-side)
const OWNER_SENDER = {
  'VyomAI': 'support@tingletap.com',
  'Blurry': 'admin@tingletap.com',
};

const Spinner = ({ size = 20 }) => (
  <div className="oec-spin" style={{ width: size, height: size }} />
);

const StatusBadge = ({ status }) => (
  <span className={`oec-badge oec-badge--${status}`}>{status}</span>
);

const OwnerEmailCenter = () => {
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [activeTab, setActiveTab] = useState('compose');

  const [recipientQuery, setRecipientQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const searchTimerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auth guard
  useEffect(() => {
    const verify = async () => {
      const user = auth.currentUser;
      if (!user) { navigate('/login'); return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data() || {};
        if (data.role !== 'owner') { navigate('/welcome'); return; }
        setOwnerName(data.displayName || user.displayName || '');
        setIsOwner(true);
      } catch {
        navigate('/welcome');
      }
      setAuthLoading(false);
    };
    verify();
  }, [navigate]);

  // Email history listener
  useEffect(() => {
    if (!isOwner) return;
    const q = query(
      collection(db, 'emailHistory'),
      orderBy('sentAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHistoryLoading(false);
    }, () => setHistoryLoading(false));
    return unsub;
  }, [isOwner]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // User search
  const searchUsers = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setSearchResults([]); setDropdownOpen(false); return; }
    setSearching(true);
    try {
      const seen = new Set();
      const results = [];
      const add = (id, data) => { if (!seen.has(id)) { seen.add(id); results.push({ uid: id, ...data }); } };

      const nameSnap = await getDocs(query(collection(db, 'users'),
        where('displayName', '>=', trimmed),
        where('displayName', '<=', trimmed + '\uf8ff'),
        limit(6)));
      nameSnap.docs.forEach(d => add(d.id, d.data()));

      if (trimmed.includes('@')) {
        const emailSnap = await getDocs(query(collection(db, 'users'),
          where('email', '==', trimmed), limit(3)));
        emailSnap.docs.forEach(d => add(d.id, d.data()));
      }

      if (trimmed.length >= 20 && !trimmed.includes('@')) {
        try {
          const userSnap = await getDoc(doc(db, 'users', trimmed));
          if (userSnap.exists()) add(trimmed, userSnap.data());
        } catch { /* invalid UID */ }
      }

      setSearchResults(results.slice(0, 8));
      setDropdownOpen(results.length > 0);
    } catch (err) {
      console.error('[OEC] search error', err);
    }
    setSearching(false);
  }, []);

  const handleRecipientInput = (e) => {
    const v = e.target.value;
    setRecipientQuery(v);
    setSelectedRecipient(null);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(v), 380);
  };

  const selectRecipient = (u) => {
    setSelectedRecipient(u);
    setRecipientQuery(u.displayName || u.email || u.uid);
    setSearchResults([]);
    setDropdownOpen(false);
  };

  // Send email
  const handleSend = async () => {
    if (!selectedRecipient) { toast.error('Please select a recipient'); return; }
    if (!selectedRecipient.email) { toast.error('This user has no email address on record'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!message.trim()) { toast.error('Message body is required'); return; }

    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientEmail: selectedRecipient.email,
          recipientName: selectedRecipient.displayName || '',
          recipientUid: selectedRecipient.uid || '',
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();

      const historyEntry = {
        sentAt: serverTimestamp(),
        senderName: ownerName,
        senderEmail: OWNER_SENDER[ownerName] || '',
        recipientEmail: selectedRecipient.email,
        recipientName: selectedRecipient.displayName || '',
        recipientUid: selectedRecipient.uid || '',
        subject: subject.trim(),
        messagePreview: message.trim().slice(0, 120),
      };

      if (data.ok) {
        await addDoc(collection(db, 'emailHistory'), {
          ...historyEntry, status: 'sent', messageId: data.messageId || '',
        });
        toast.success('✓ Email delivered successfully');
        setSubject('');
        setMessage('');
        setSelectedRecipient(null);
        setRecipientQuery('');
        setShowPreview(false);
      } else {
        await addDoc(collection(db, 'emailHistory'), {
          ...historyEntry, status: 'failed', error: data.error || 'Unknown',
        }).catch(() => {});
        toast.error(data.error || 'Email delivery failed');
      }
    } catch (err) {
      toast.error('Network error: ' + err.message);
    }
    setSending(false);
  };

  const senderEmail = OWNER_SENDER[ownerName] || 'support@tingletap.com';
  const canSend = !!selectedRecipient?.email && subject.trim() && message.trim();

  if (authLoading) return (
    <div className="oec-fullscreen-center">
      <Spinner size={32} />
      <span className="oec-loading-text">Authenticating…</span>
    </div>
  );
  if (!isOwner) return null;

  return (
    <div className="oec-root">
      <div className="oec-orb oec-orb-1" aria-hidden="true" />
      <div className="oec-orb oec-orb-2" aria-hidden="true" />

      {/* Header */}
      <header className="oec-header">
        <div className="oec-header-inner">
          <button className="oec-back-btn" onClick={() => navigate('/welcome')} aria-label="Back">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>

          <div className="oec-header-title">
            <div className="oec-header-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.8"/>
                <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="oec-header-name">Email Center</div>
              <div className="oec-header-sub">Owner Communications · TingleTap™</div>
            </div>
          </div>

          <div className="oec-header-from">
            <span className="oec-from-label">Sending as</span>
            <span className="oec-from-chip">
              <span className="oec-from-dot" />
              {senderEmail}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="oec-main">

        {/* Tabs */}
        <div className="oec-tabs" role="tablist">
          <button
            className={`oec-tab${activeTab === 'compose' ? ' oec-tab--active' : ''}`}
            onClick={() => setActiveTab('compose')}
            role="tab" aria-selected={activeTab === 'compose'}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Compose Email
          </button>
          <button
            className={`oec-tab${activeTab === 'history' ? ' oec-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
            role="tab" aria-selected={activeTab === 'history'}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Sent History
            {history.length > 0 && (
              <span className="oec-tab-count">{history.length}</span>
            )}
          </button>
        </div>

        {/* Compose tab */}
        {activeTab === 'compose' && (
          <div className="oec-compose-card" role="tabpanel">

            {/* From */}
            <div className="oec-field">
              <label className="oec-label">From</label>
              <div className="oec-from-display">
                <span className="oec-from-name">{ownerName}</span>
                <span className="oec-from-sep">·</span>
                <span className="oec-from-email">{senderEmail}</span>
                <span className="oec-auto-badge">Auto</span>
              </div>
            </div>

            {/* To */}
            <div className="oec-field" ref={dropdownRef}>
              <label className="oec-label" htmlFor="oec-recipient-input">To</label>
              <div className="oec-search-wrap">
                <div className="oec-search-input-row">
                  {selectedRecipient && (
                    <span className="oec-recipient-chip">
                      <span className="oec-recipient-chip-av">
                        {(selectedRecipient.displayName || '?')[0].toUpperCase()}
                      </span>
                      {selectedRecipient.displayName || selectedRecipient.email}
                      <button
                        className="oec-recipient-chip-x"
                        onClick={() => { setSelectedRecipient(null); setRecipientQuery(''); }}
                        aria-label="Remove recipient"
                      >×</button>
                    </span>
                  )}
                  <input
                    id="oec-recipient-input"
                    className="oec-input oec-search-input"
                    type="text"
                    placeholder={selectedRecipient ? '' : 'Search by name, email, or UID…'}
                    value={recipientQuery}
                    onChange={handleRecipientInput}
                    onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                    autoComplete="off"
                    style={selectedRecipient ? { width: 0, padding: 0, border: 'none' } : {}}
                  />
                  {searching && <Spinner size={16} />}
                </div>

                {dropdownOpen && searchResults.length > 0 && (
                  <div className="oec-dropdown" role="listbox">
                    {searchResults.map(u => (
                      <button
                        key={u.uid}
                        className="oec-dropdown-item"
                        role="option"
                        onClick={() => selectRecipient(u)}
                      >
                        <div className="oec-dd-av">
                          {u.photoURL
                            ? <img src={u.photoURL} alt="" className="oec-dd-av-img" />
                            : <span className="oec-dd-av-init">
                                {(u.displayName || '?')[0].toUpperCase()}
                              </span>
                          }
                        </div>
                        <div className="oec-dd-info">
                          <span className="oec-dd-name">{u.displayName || '—'}</span>
                          <span className="oec-dd-email">{u.email || 'No email'}</span>
                        </div>
                        <span className={`oec-dd-role oec-dd-role--${u.role || 'user'}`}>
                          {u.role || 'user'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedRecipient && selectedRecipient.email && (
                <div className="oec-recipient-confirm">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="M5 12l5 5 9-10" stroke="#10b981" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Will be delivered to: <strong>{selectedRecipient.email}</strong>
                </div>
              )}
              {selectedRecipient && !selectedRecipient.email && (
                <div className="oec-recipient-warn">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="M12 9v4M12 17h.01" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                          stroke="#f59e0b" strokeWidth="1.8"/>
                  </svg>
                  This user has no registered email address
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="oec-field">
              <label className="oec-label" htmlFor="oec-subject">Subject</label>
              <input
                id="oec-subject"
                className="oec-input"
                type="text"
                placeholder="Email subject…"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                maxLength={255}
              />
              <div className="oec-char-count">{subject.length}/255</div>
            </div>

            {/* Message */}
            <div className="oec-field">
              <label className="oec-label" htmlFor="oec-message">Message</label>
              <textarea
                id="oec-message"
                className="oec-textarea"
                placeholder="Write your message here…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={8}
                maxLength={10000}
              />
              <div className="oec-char-count">{message.length.toLocaleString()}/10,000</div>
            </div>

            {/* Actions */}
            <div className="oec-actions">
              <button
                className="oec-btn oec-btn--ghost"
                onClick={() => setShowPreview(p => !p)}
                disabled={!subject.trim() && !message.trim()}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {showPreview ? 'Hide Preview' : 'Preview Email'}
              </button>

              <button
                className="oec-btn oec-btn--clear"
                onClick={() => {
                  setSubject(''); setMessage('');
                  setSelectedRecipient(null); setRecipientQuery('');
                  setShowPreview(false);
                }}
              >Clear</button>

              <button
                className="oec-btn oec-btn--send"
                onClick={handleSend}
                disabled={!canSend || sending}
              >
                {sending ? (
                  <><Spinner size={15} /> Sending…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Send Email
                  </>
                )}
              </button>
            </div>

            {/* Preview panel */}
            {showPreview && (
              <div className="oec-preview-wrap">
                <div className="oec-preview-header">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Email Preview
                </div>
                <div className="oec-preview-body">
                  <div className="oec-preview-meta">
                    <span><b>From:</b> {ownerName} &lt;{senderEmail}&gt;</span>
                    <span>
                      <b>To:</b>{' '}
                      {selectedRecipient
                        ? `${selectedRecipient.displayName || ''} <${selectedRecipient.email || 'No email'}>`
                        : '—'}
                    </span>
                    <span><b>Subject:</b> {subject || '—'}</span>
                  </div>
                  <div className="oec-preview-divider" />
                  <div className="oec-preview-message">
                    {message || <em style={{ color: '#9ca3af' }}>No message</em>}
                  </div>
                  <div className="oec-preview-sig">
                    <div>Regards,</div>
                    <div><b>{ownerName}</b></div>
                    <div style={{ color: '#7c3aed', fontSize: 12 }}>Owner · Godfather · TingleTap™</div>
                    <div style={{ color: '#a855f7', fontSize: 12 }}>{senderEmail}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="oec-history-card" role="tabpanel">
            {historyLoading ? (
              <div className="oec-history-loading">
                <Spinner size={24} /><span>Loading history…</span>
              </div>
            ) : history.length === 0 ? (
              <div className="oec-history-empty">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="#d1d5db" strokeWidth="1.5"/>
                  <path d="M2 8l10 6 10-6" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p>No emails sent yet</p>
              </div>
            ) : (
              <div className="oec-history-table-wrap">
                <table className="oec-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>To</th>
                      <th>Subject</th>
                      <th>Sender</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => {
                      const ts = item.sentAt?.toDate?.()
                        || (item.sentAt?.seconds ? new Date(item.sentAt.seconds * 1000) : null);
                      return (
                        <tr key={item.id}>
                          <td className="oec-td-date">
                            {ts
                              ? ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                            <div className="oec-td-time">
                              {ts ? ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>
                          <td>
                            <div className="oec-td-name">{item.recipientName || '—'}</div>
                            <div className="oec-td-email">{item.recipientEmail}</div>
                          </td>
                          <td className="oec-td-subject" title={item.subject}>{item.subject}</td>
                          <td className="oec-td-sender">{item.senderName}</td>
                          <td><StatusBadge status={item.status || 'unknown'} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerEmailCenter;
