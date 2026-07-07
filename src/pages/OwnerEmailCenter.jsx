import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import {
  collection, query, where, orderBy, limit, onSnapshot,
  doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, startAfter,
} from 'firebase/firestore';
import { pt } from '../utils/premiumToast';
import './OwnerEmailCenter.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const OWNER_SENDER = {
  'VyomAI': 'support@tingletap.com',
  'Blurry':  'admin@tingletap.com',
};

const PAGE_SIZE = 30;

// ── Tiny helpers ───────────────────────────────────────────────────────────────
const initials = str => (str || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmtDate = ts => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000)
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtFull = ts => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
};
const preview = body => (body || '').replace(/\s+/g, ' ').trim().slice(0, 100);

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const Ic = {
  Inbox:   () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M22 12h-6l-2 3H10l-2-3H2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Sent:    () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Draft:   () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Archive: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><polyline points="21 8 21 21 3 21 3 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="3" width="22" height="5" rx="1" stroke="currentColor" strokeWidth="1.9"/><line x1="10" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  Trash:   () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Compose: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M12 20h9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Reply:   () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><polyline points="15 14 19 18 23 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 18v-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  Forward: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><polyline points="15 17 20 12 15 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 18v-2a4 4 0 0 1 4-4h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Star:    (filled) => <svg viewBox="0 0 24 24" width="15" height="15" fill={filled?"#f59e0b":"none"} stroke={filled?"#f59e0b":"currentColor"} strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Search:  () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.9"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  Close:   () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Send:    () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Archive2:() => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><polyline points="21 8 21 21 3 21 3 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="3" width="22" height="5" rx="1" stroke="currentColor" strokeWidth="1.9"/></svg>,
  Delete:  () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  MailOpen:() => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  MenuLeft:() => <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Back:    () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Restore: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><polyline points="3 3 3 8 8 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const Spinner = ({ size = 22 }) => (
  <div className="ec-spinner" style={{ width: size, height: size }} />
);

// ── Compose Modal ──────────────────────────────────────────────────────────────
function ComposeModal({ ownerName, senderEmail, onClose, onSent }) {
  const [recipientQuery, setRecipientQuery] = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [searching, setSearching]           = useState(false);
  const [selectedRecipient, setSelected]    = useState(null);
  const [subject, setSubject]               = useState('');
  const [body, setBody]                     = useState('');
  const [sending, setSending]               = useState(false);
  const [showPreview, setShowPreview]       = useState(false);
  const [savingDraft, setSavingDraft]       = useState(false);
  const timerRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setSearchResults([]); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchUsers = async (q) => {
    const t = q.trim();
    if (t.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const seen = new Set();
      const push = (docs) => docs.forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); }
      });
      const [byName, byUid] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('displayNameLower', '>=', t.toLowerCase()), where('displayNameLower', '<=', t.toLowerCase() + '\uf8ff'), limit(10))),
        getDocs(query(collection(db, 'users'), where('uid', '==', t), limit(5))),
      ]);
      push(byName.docs); push(byUid.docs);
      const results = [...byName.docs, ...byUid.docs]
        .filter(d => d.data().email)
        .reduce((acc, d) => { if (!acc.find(x => x.id === d.id)) acc.push({ id: d.id, ...d.data() }); return acc; }, [])
        .slice(0, 8);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleQueryChange = e => {
    const v = e.target.value;
    setRecipientQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchUsers(v), 300);
  };

  const handleSelect = user => {
    setSelected(user);
    setRecipientQuery('');
    setSearchResults([]);
  };

  const saveDraft = async () => {
    if (!subject && !body) return;
    setSavingDraft(true);
    try {
      await addDoc(collection(db, 'ownerEmails'), {
        threadId:      `draft_${Date.now()}`,
        ownerInbox:    ownerName,
        folder:        'drafts',
        from:          { name: ownerName, email: senderEmail },
        to:            selectedRecipient ? [{ name: selectedRecipient.displayName, email: selectedRecipient.email }] : [],
        replyTo:       { email: senderEmail },
        subject:       subject || '(No Subject)',
        body:          body,
        htmlBody:      '',
        read:          true,
        starred:       false,
        replied:       false,
        forwarded:     false,
        source:        'compose',
        parentEmailId: null,
        createdAt:     serverTimestamp(),
        labels:        [],
        isDraft:       true,
      });
      pt.success('Draft saved');
      onClose();
    } catch { pt.error('Failed to save draft'); }
    setSavingDraft(false);
  };

  const handleSend = async () => {
    if (!selectedRecipient?.email || !subject.trim() || !body.trim()) {
      pt.error('Please fill in all fields and select a recipient');
      return;
    }
    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientEmail: selectedRecipient.email,
          recipientName:  selectedRecipient.displayName || '',
          subject,
          message: body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');

      await addDoc(collection(db, 'ownerEmails'), {
        threadId:      `sent_${Date.now()}`,
        ownerInbox:    ownerName,
        folder:        'sent',
        from:          { name: ownerName, email: senderEmail },
        to:            [{ name: selectedRecipient.displayName || '', email: selectedRecipient.email }],
        replyTo:       { email: senderEmail },
        subject,
        body,
        htmlBody:      '',
        read:          true,
        starred:       false,
        replied:       false,
        forwarded:     false,
        source:        'compose',
        parentEmailId: null,
        createdAt:     serverTimestamp(),
        labels:        [],
        messageId:     data.messageId || null,
      });

      pt.success(`Email sent to ${selectedRecipient.displayName || selectedRecipient.email}`);
      onSent?.();
      onClose();
    } catch (err) {
      pt.error(err.message || 'Failed to send email');
    }
    setSending(false);
  };

  const canSend = !!selectedRecipient?.email && subject.trim() && body.trim();

  return (
    <div className="ec-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ec-modal-card">
        <div className="ec-modal-header">
          <div className="ec-modal-title">
            <Ic.Compose />
            New Email
          </div>
          <button className="ec-modal-close" onClick={onClose}><Ic.Close /></button>
        </div>

        <div className="ec-modal-body">
          <div className="ec-field">
            <div className="ec-field-label">From</div>
            <div className="ec-from-display">
              <span className="ec-from-name">{ownerName}</span>
              <span className="ec-from-sep">·</span>
              <span className="ec-from-email">{senderEmail}</span>
              <span className="ec-auto-chip">Auto</span>
            </div>
          </div>

          <div className="ec-field">
            <div className="ec-field-label">To</div>
            <div className="ec-recipient-wrap" ref={dropRef}>
              {selectedRecipient ? (
                <div className="ec-selected-recipient">
                  <span className="ec-selected-name">{selectedRecipient.displayName}</span>
                  <span className="ec-selected-email">{selectedRecipient.email}</span>
                  <button className="ec-clear-btn" onClick={() => setSelected(null)}><Ic.Close /></button>
                </div>
              ) : (
                <input
                  className="ec-recipient-input"
                  placeholder="Search by name, email or UID…"
                  value={recipientQuery}
                  onChange={handleQueryChange}
                  autoFocus
                />
              )}
              {(searchResults.length > 0 || searching) && !selectedRecipient && (
                <div className="ec-dropdown">
                  {searching
                    ? <div className="ec-dd-no-results" style={{display:'flex',alignItems:'center',gap:8}}><Spinner size={14}/> Searching…</div>
                    : searchResults.length === 0
                      ? <div className="ec-dd-no-results">No users found</div>
                      : searchResults.map(u => (
                          <div key={u.id} className="ec-dropdown-item" onClick={() => handleSelect(u)}>
                            <div className="ec-dd-avatar">{initials(u.displayName)}</div>
                            <div>
                              <div className="ec-dd-name">{u.displayName}</div>
                              <div className="ec-dd-email">{u.email}</div>
                            </div>
                          </div>
                        ))
                  }
                </div>
              )}
            </div>
          </div>

          <div className="ec-field">
            <div className="ec-field-label">Subject</div>
            <input className="ec-input" placeholder="Email subject…" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div className="ec-field">
            <div className="ec-field-label">Message</div>
            {showPreview
              ? <div className="ec-preview-box">{body || <span style={{color:'#9ca3af'}}>No content yet…</span>}</div>
              : <textarea className="ec-textarea" placeholder="Write your message…" value={body} onChange={e => setBody(e.target.value)} />
            }
          </div>
        </div>

        <div className="ec-modal-footer">
          <button className="ec-preview-toggle-btn" onClick={() => setShowPreview(p => !p)}>
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button className="ec-draft-btn" onClick={saveDraft} disabled={savingDraft}>
            {savingDraft ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="ec-send-btn" onClick={handleSend} disabled={!canSend || sending}>
            <Ic.Send />
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Forward Modal ──────────────────────────────────────────────────────────────
function ForwardModal({ email, ownerName, senderEmail, onClose, onForwarded }) {
  const [recipientQuery, setRecipientQuery] = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [selected, setSelected]             = useState(null);
  const [body, setBody]                     = useState(`\n\n---------- Forwarded Message ----------\nFrom: ${email?.from?.email || ''}\nSubject: ${email?.subject || ''}\n\n${email?.body || ''}`);
  const [sending, setSending]               = useState(false);
  const timerRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setSearchResults([]); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchUsers = async (q) => {
    const t = q.trim();
    if (t.length < 2) { setSearchResults([]); return; }
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('displayNameLower', '>=', t.toLowerCase()), where('displayNameLower', '<=', t.toLowerCase() + '\uf8ff'), limit(8)));
      setSearchResults(snap.docs.filter(d => d.data().email).map(d => ({ id: d.id, ...d.data() })));
    } catch { setSearchResults([]); }
  };

  const handleQueryChange = e => {
    setRecipientQuery(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchUsers(e.target.value), 300);
  };

  const handleSend = async () => {
    if (!selected?.email) { pt.error('Select a recipient'); return; }
    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch('/.netlify/functions/email-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action:         'forward',
          emailId:        email.id,
          body,
          recipientEmail: selected.email,
          recipientName:  selected.displayName || '',
          subject:        `Fwd: ${email.subject || ''}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Forward failed');
      pt.success('Email forwarded');
      onForwarded?.();
      onClose();
    } catch (err) {
      pt.error(err.message || 'Failed to forward');
    }
    setSending(false);
  };

  return (
    <div className="ec-forward-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ec-modal-card">
        <div className="ec-modal-header">
          <div className="ec-modal-title"><Ic.Forward /> Forward Email</div>
          <button className="ec-modal-close" onClick={onClose}><Ic.Close /></button>
        </div>
        <div className="ec-modal-body">
          <div className="ec-field">
            <div className="ec-field-label">To</div>
            <div className="ec-recipient-wrap" ref={dropRef}>
              {selected ? (
                <div className="ec-selected-recipient">
                  <span className="ec-selected-name">{selected.displayName}</span>
                  <span className="ec-selected-email">{selected.email}</span>
                  <button className="ec-clear-btn" onClick={() => setSelected(null)}><Ic.Close /></button>
                </div>
              ) : (
                <input className="ec-recipient-input" placeholder="Search recipient…" value={recipientQuery} onChange={handleQueryChange} autoFocus />
              )}
              {searchResults.length > 0 && !selected && (
                <div className="ec-dropdown">
                  {searchResults.map(u => (
                    <div key={u.id} className="ec-dropdown-item" onClick={() => { setSelected(u); setSearchResults([]); }}>
                      <div className="ec-dd-avatar">{initials(u.displayName)}</div>
                      <div><div className="ec-dd-name">{u.displayName}</div><div className="ec-dd-email">{u.email}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="ec-field">
            <div className="ec-field-label">Message</div>
            <textarea className="ec-textarea" value={body} onChange={e => setBody(e.target.value)} />
          </div>
        </div>
        <div className="ec-modal-footer">
          <button className="ec-cancel-reply-btn" onClick={onClose}>Cancel</button>
          <button className="ec-send-btn" onClick={handleSend} disabled={!selected || sending}>
            <Ic.Send />{sending ? 'Forwarding…' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Email Detail ───────────────────────────────────────────────────────────────
function EmailDetail({ email, threads, folder, ownerName, senderEmail, onAction }) {
  const [showReply, setShowReply]   = useState(false);
  const [replyBody, setReplyBody]   = useState('');
  const [sending, setSending]       = useState(false);
  const [showForward, setShowForward] = useState(false);

  const handleReply = async () => {
    if (!replyBody.trim()) { pt.error('Reply cannot be empty'); return; }
    setSending(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch('/.netlify/functions/email-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'reply', emailId: email.id, body: replyBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reply failed');
      await updateDoc(doc(db, 'ownerEmails', email.id), { replied: true });
      pt.success('Reply sent');
      setReplyBody('');
      setShowReply(false);
      onAction?.('replied');
    } catch (err) {
      pt.error(err.message || 'Failed to send reply');
    }
    setSending(false);
  };

  const handleArchive = async () => {
    try {
      await updateDoc(doc(db, 'ownerEmails', email.id), { folder: folder === 'archived' ? 'inbox' : 'archived' });
      pt.success(folder === 'archived' ? 'Moved to inbox' : 'Archived');
      onAction?.('archived');
    } catch { pt.error('Action failed'); }
  };

  const handleDelete = async () => {
    try {
      if (folder === 'trash') {
        await deleteDoc(doc(db, 'ownerEmails', email.id));
        pt.success('Permanently deleted');
      } else {
        await updateDoc(doc(db, 'ownerEmails', email.id), { folder: 'trash' });
        pt.success('Moved to trash');
      }
      onAction?.('deleted');
    } catch { pt.error('Delete failed'); }
  };

  const handleStar = async () => {
    try {
      await updateDoc(doc(db, 'ownerEmails', email.id), { starred: !email.starred });
    } catch { pt.error('Failed'); }
  };

  const handleMarkRead = async () => {
    try {
      await updateDoc(doc(db, 'ownerEmails', email.id), { read: !email.read });
    } catch { pt.error('Failed'); }
  };

  const handleRestore = async () => {
    try {
      await updateDoc(doc(db, 'ownerEmails', email.id), { folder: 'inbox' });
      pt.success('Restored to inbox');
      onAction?.('restored');
    } catch { pt.error('Restore failed'); }
  };

  return (
    <div className="ec-detail-content">
      {showForward && (
        <ForwardModal
          email={email}
          ownerName={ownerName}
          senderEmail={senderEmail}
          onClose={() => setShowForward(false)}
          onForwarded={() => onAction?.('forwarded')}
        />
      )}

      {/* Toolbar */}
      <div className="ec-detail-toolbar">
        <button className="ec-tool-btn primary" onClick={() => setShowReply(r => !r)}>
          <span style={{ color: '#1d4ed8', display:'flex' }}><Ic.Reply /></span> Reply
        </button>
        <button className="ec-tool-btn" onClick={() => setShowForward(true)}>
          <span style={{ color: '#4f46e5', display:'flex' }}><Ic.Forward /></span> Forward
        </button>
        <div className="ec-tool-sep" />
        <button className={`ec-tool-btn ${email.starred ? 'star-active' : ''}`} onClick={handleStar}>
          <Ic.Star filled={email.starred} /> {email.starred ? 'Unstar' : 'Star'}
        </button>
        <button className="ec-tool-btn" onClick={handleMarkRead}>
          <span style={{ color: '#047857', display:'flex' }}><Ic.MailOpen /></span> {email.read ? 'Mark Unread' : 'Mark Read'}
        </button>
        <div className="ec-tool-sep" />
        <button className="ec-tool-btn" onClick={handleArchive}>
          <span style={{ color: '#047857', display:'flex' }}><Ic.Archive2 /></span> {folder === 'archived' ? 'Unarchive' : 'Archive'}
        </button>
        {folder === 'trash' && (
          <button className="ec-tool-btn" onClick={handleRestore}>
            <span style={{ color: '#1d4ed8', display:'flex' }}><Ic.Restore /></span> Restore
          </button>
        )}
        <button className="ec-tool-btn danger" onClick={handleDelete}>
          <Ic.Delete /> {folder === 'trash' ? 'Delete Forever' : 'Delete'}
        </button>
      </div>

      <div className="ec-detail-scroll">
        <div className="ec-detail-subject">{email.subject}</div>

        <div className="ec-detail-meta">
          <div className="ec-meta-row">
            <span className="ec-meta-label">From</span>
            <span className="ec-meta-val"><strong>{email.from?.name}</strong> <span className="ec-meta-email">&lt;{email.from?.email}&gt;</span></span>
          </div>
          <div className="ec-meta-row">
            <span className="ec-meta-label">To</span>
            <span className="ec-meta-val">{(email.to || []).map(t => `${t.name || ''} <${t.email}>`).join(', ')}</span>
          </div>
          {email.replyTo?.email && email.replyTo.email !== email.from?.email && (
            <div className="ec-meta-row">
              <span className="ec-meta-label">Reply</span>
              <span className="ec-meta-email">{email.replyTo.email}</span>
            </div>
          )}
          <div className="ec-meta-row">
            <span className="ec-meta-label">Date</span>
            <span className="ec-meta-val">{fmtFull(email.createdAt)}</span>
          </div>
        </div>

        {email.htmlBody
          ? <div className="ec-detail-body-html" dangerouslySetInnerHTML={{ __html: email.htmlBody.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') }} />
          : <div className="ec-detail-body">{email.body}</div>
        }

        {threads.length > 0 && (
          <>
            <div className="ec-thread-sep">{threads.length} {threads.length === 1 ? 'reply' : 'replies'} in thread</div>
            {threads.map(t => (
              <div key={t.id} className="ec-thread-item">
                <div className="ec-thread-header">
                  <div className="ec-thread-avatar">{initials(t.from?.name)}</div>
                  <div>
                    <div className="ec-thread-from">{t.from?.name} <span style={{color:'#9ca3af',fontSize:11,fontWeight:400}}>&lt;{t.from?.email}&gt;</span></div>
                  </div>
                  <div className="ec-thread-time">{fmtFull(t.createdAt)}</div>
                </div>
                <div className="ec-thread-body">{t.body}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {showReply && (
        <div className="ec-reply-area">
          <div className="ec-reply-header">
            Replying to {email.from?.name || email.from?.email} &lt;{email.replyTo?.email || email.from?.email}&gt;
          </div>
          <textarea
            className="ec-reply-textarea"
            placeholder="Write your reply…"
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            autoFocus
          />
          <div className="ec-reply-actions">
            <button className="ec-send-btn" onClick={handleReply} disabled={!replyBody.trim() || sending}>
              <Ic.Send />{sending ? 'Sending…' : 'Send Reply'}
            </button>
            <button className="ec-cancel-reply-btn" onClick={() => { setShowReply(false); setReplyBody(''); }}>
              Cancel
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
              Sending from {senderEmail}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const OwnerEmailCenter = () => {
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [isOwner, setIsOwner]         = useState(false);
  const [ownerName, setOwnerName]     = useState('');

  const [folder, setFolder]           = useState('inbox');
  const [emails, setEmails]           = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastDoc, setLastDoc]         = useState(null);
  const [hasMore, setHasMore]         = useState(false);

  const [threads, setThreads]         = useState({});
  const [selectedId, setSelectedId]   = useState(null);

  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');

  const [showCompose, setShowCompose] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen]   = useState(false);

  const senderEmail = OWNER_SENDER[ownerName] || 'support@tingletap.com';
  const selectedEmail = useMemo(() => emails.find(e => e.id === selectedId) || null, [emails, selectedId]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
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
      } catch { navigate('/welcome'); }
      setAuthLoading(false);
    };
    verify();
  }, [navigate]);

  // ── Email list listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOwner || !ownerName) return;
    setEmailsLoading(true);
    setSelectedId(null);
    setLastDoc(null);

    const q = query(
      collection(db, 'ownerEmails'),
      where('ownerInbox', '==', ownerName),
      where('folder', '==', folder),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE + 1),
    );

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.slice(0, PAGE_SIZE).map(d => ({ id: d.id, ...d.data() }));
      setEmails(docs);
      setHasMore(snap.docs.length > PAGE_SIZE);
      if (snap.docs.length > PAGE_SIZE) setLastDoc(snap.docs[PAGE_SIZE - 1]);
      setEmailsLoading(false);
    }, () => setEmailsLoading(false));

    return unsub;
  }, [isOwner, ownerName, folder]);

  // ── Unread count (inbox only) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOwner || !ownerName) return;
    const q = query(
      collection(db, 'ownerEmails'),
      where('ownerInbox', '==', ownerName),
      where('folder', '==', 'inbox'),
      where('read', '==', false),
    );
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size));
    return unsub;
  }, [isOwner, ownerName]);

  // ── Thread loader (when email selected) ───────────────────────────────────
  useEffect(() => {
    if (!selectedEmail?.threadId || !isOwner) return;
    const q = query(
      collection(db, 'ownerEmails'),
      where('threadId', '==', selectedEmail.threadId),
      where('source', 'in', ['reply', 'forward']),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      const replies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setThreads(t => ({ ...t, [selectedEmail.id]: replies }));
    });
    return unsub;
  }, [selectedEmail?.threadId, selectedEmail?.id, isOwner]);

  // ── Mark as read on select ─────────────────────────────────────────────────
  const handleSelectEmail = useCallback(async (email) => {
    setSelectedId(email.id);
    setMobileDetailOpen(true);
    if (!email.read) {
      try { await updateDoc(doc(db, 'ownerEmails', email.id), { read: true }); }
      catch {}
    }
  }, []);

  // ── Filtered / searched list ───────────────────────────────────────────────
  const displayedEmails = useMemo(() => {
    let list = emails;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.subject?.toLowerCase().includes(s) ||
        e.from?.name?.toLowerCase().includes(s) ||
        e.from?.email?.toLowerCase().includes(s) ||
        e.body?.toLowerCase().includes(s)
      );
    }
    if (filter === 'unread')   list = list.filter(e => !e.read);
    if (filter === 'starred')  list = list.filter(e => e.starred);
    if (filter === 'today')    list = list.filter(e => {
      if (!e.createdAt) return false;
      const d = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt.seconds * 1000);
      return d.toDateString() === new Date().toDateString();
    });
    if (filter === 'week') list = list.filter(e => {
      if (!e.createdAt) return false;
      const d = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt.seconds * 1000);
      return Date.now() - d.getTime() < 7 * 86400000;
    });
    if (filter === 'contact') list = list.filter(e => e.source === 'contact_form');
    return list;
  }, [emails, search, filter]);

  const FOLDERS = [
    { id: 'inbox',    label: 'Inbox',   Icon: Ic.Inbox,   badge: unreadCount, color: '#6d28d9' },
    { id: 'sent',     label: 'Sent',    Icon: Ic.Sent,    color: '#1d4ed8' },
    { id: 'drafts',   label: 'Drafts',  Icon: Ic.Draft,   color: '#b45309' },
    { id: 'archived', label: 'Archive', Icon: Ic.Archive, color: '#047857' },
    { id: 'trash',    label: 'Trash',   Icon: Ic.Trash,   color: '#b91c1c' },
  ];

  if (authLoading) return (
    <div className="ec-center">
      <Spinner size={32} />
      <p>Authenticating…</p>
    </div>
  );
  if (!isOwner) return null;

  return (
    <div className="ec-root">
      <div className="ec-orb ec-orb-1" aria-hidden />
      <div className="ec-orb ec-orb-2" aria-hidden />

      {/* Header */}
      <header className="ec-header">
        <div className="ec-header-inner">
          <button className="ec-back-btn" onClick={() => { setMobileSidebarOpen(v => !v); }}>
            <Ic.MenuLeft />
          </button>
          <button className="ec-back-btn" onClick={() => navigate('/welcome')}>
            <Ic.Back /> Dashboard
          </button>

          <div className="ec-header-title">
            <div className="ec-header-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.8"/>
                <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="ec-header-name">Email Center</div>
              <div className="ec-header-sub">Owner Communications · TingleTap™</div>
            </div>
          </div>

          <div className="ec-header-sender">
            <span className="ec-sender-dot" />
            <span className="ec-sender-email">{senderEmail}</span>
          </div>

          <button className="ec-mobile-compose-btn" onClick={() => setShowCompose(true)}>
            <Ic.Compose /> Compose
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="ec-body">
        {/* Sidebar */}
        <nav className={`ec-sidebar${mobileSidebarOpen ? ' mobile-open' : ''}`}>
          <button className="ec-compose-btn" onClick={() => setShowCompose(true)}>
            <Ic.Compose />
            Compose Email
          </button>

          <div className="ec-folder-list" role="list">
            {FOLDERS.map(f => (
              <div
                key={f.id}
                className={`ec-folder-item${folder === f.id ? ' active' : ''}`}
                role="listitem"
                onClick={() => { setFolder(f.id); setMobileSidebarOpen(false); }}
              >
                <span className="ec-folder-icon" style={{ color: f.color }}><f.Icon /></span>
                <span className="ec-folder-label">{f.label}</span>
                {f.badge > 0 && <span className="ec-folder-badge">{f.badge > 99 ? '99+' : f.badge}</span>}
              </div>
            ))}
          </div>

          <div className="ec-sidebar-sep" />
          <div className="ec-sidebar-footer">
            <div className="ec-sidebar-footer-label">Sending as</div>
            <div className="ec-sidebar-footer-email">{senderEmail}</div>
          </div>
        </nav>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            style={{ position:'absolute', inset:0, zIndex:15, background:'rgba(0,0,0,.3)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Email List */}
        <div className="ec-list-panel">
          <div className="ec-list-header">
            <div className="ec-list-title-row">
              <span className="ec-list-title">{FOLDERS.find(f => f.id === folder)?.label || folder}</span>
              <span className="ec-list-count">{displayedEmails.length} emails</span>
            </div>

            <div className="ec-search-wrap">
              <span className="ec-search-icon"><Ic.Search /></span>
              <input
                className="ec-search-input"
                placeholder="Search emails…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="ec-filter-row">
              {[
                { id: 'all',     label: 'All'     },
                { id: 'unread',  label: 'Unread'  },
                { id: 'starred', label: 'Starred' },
                { id: 'today',   label: 'Today'   },
                { id: 'week',    label: 'This Week'},
                { id: 'contact', label: 'Contact' },
              ].map(f => (
                <button
                  key={f.id}
                  className={`ec-filter-chip${filter === f.id ? ' active' : ''}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ec-email-list" role="list">
            {emailsLoading ? (
              <div className="ec-empty-state"><Spinner size={24} /><p>Loading emails…</p></div>
            ) : displayedEmails.length === 0 ? (
              <div className="ec-empty-state">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" style={{color:'#d1d5db'}}>
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p>{search ? 'No results found' : `No emails in ${folder}`}</p>
              </div>
            ) : displayedEmails.map(email => (
              <div
                key={email.id}
                className={`ec-email-item${selectedId === email.id ? ' selected' : ''}${!email.read ? ' unread' : ''}`}
                role="listitem"
                onClick={() => handleSelectEmail(email)}
              >
                {!email.read && <span className="ec-unread-dot" />}
                <div className="ec-item-row1">
                  <div className="ec-item-avatar">{initials(email.from?.name)}</div>
                  <span className="ec-item-from">{email.from?.name || email.from?.email || '—'}</span>
                  <span className="ec-item-time">{fmtDate(email.createdAt)}</span>
                </div>
                <div className="ec-item-row2">
                  <span className="ec-item-subject">{email.subject || '(No Subject)'}</span>
                </div>
                <span className="ec-item-preview">{preview(email.body)}</span>
                <div className="ec-item-indicators">
                  {email.source === 'contact_form' && <span className="ec-status-chip contact">Contact</span>}
                  {email.source === 'incoming_email' && <span className="ec-status-chip incoming">Email</span>}
                  {email.replied   && <span className="ec-status-chip replied">Replied</span>}
                  {email.forwarded && <span className="ec-status-chip forwarded">Forwarded</span>}
                </div>
                <button
                  className={`ec-item-star${email.starred ? ' starred' : ''}`}
                  onClick={async e => {
                    e.stopPropagation();
                    try { await updateDoc(doc(db, 'ownerEmails', email.id), { starred: !email.starred }); }
                    catch {}
                  }}
                  aria-label={email.starred ? 'Unstar' : 'Star'}
                >
                  <Ic.Star filled={email.starred} />
                </button>
              </div>
            ))}

            {hasMore && (
              <button className="ec-load-more-btn">
                Load more
              </button>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className={`ec-detail-panel${mobileDetailOpen ? ' mobile-open' : ''}`}>
          {mobileDetailOpen && (
            <button
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', background:'none', border:'none', borderBottom:'1px solid rgba(124,58,237,.08)', cursor:'pointer', color:'#7c3aed', fontWeight:600, fontSize:13 }}
              onClick={() => setMobileDetailOpen(false)}
            >
              <Ic.Back /> Back to list
            </button>
          )}

          {selectedEmail ? (
            <EmailDetail
              key={selectedEmail.id}
              email={selectedEmail}
              threads={threads[selectedEmail.id] || []}
              folder={folder}
              ownerName={ownerName}
              senderEmail={senderEmail}
              onAction={action => {
                if (['deleted','archived','restored'].includes(action)) {
                  setSelectedId(null);
                  setMobileDetailOpen(false);
                }
              }}
            />
          ) : (
            <div className="ec-detail-empty">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" style={{color:'#e5e7eb'}}>
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p>Select an email to read</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          ownerName={ownerName}
          senderEmail={senderEmail}
          onClose={() => setShowCompose(false)}
          onSent={() => setFolder('sent')}
        />
      )}
    </div>
  );
};

export default OwnerEmailCenter;
