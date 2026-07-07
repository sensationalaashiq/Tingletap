import React, { useState, useRef, useEffect } from 'react';
import './PremiumRelationshipCard.css';

// ─── Premium SVG icons ────────────────────────────────────────────────────────
const FriendIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.85"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BestFriendIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M12 2l2.68 7.47H22l-6.14 4.47 2.36 7.33L12 16.9l-6.22 4.37 2.36-7.33L2 9.47h7.32L12 2z"/>
  </svg>
);
const BrotherIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M12 2l9 4.2v5.8C21 17.5 17 21.8 12 23 7 21.8 3 17.5 3 12V6.2L12 2z" stroke="white" strokeWidth="1.85" strokeLinejoin="round"/>
    <path d="M8.5 12l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SisterIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.85"/>
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5" stroke="white" strokeWidth="1.85" strokeLinecap="round"/>
    <path d="M5.05 5.05l1.77 1.77M17.18 17.18l1.77 1.77M5.05 18.95l1.77-1.77M17.18 6.82l1.77-1.77" stroke="white" strokeWidth="1.85" strokeLinecap="round"/>
  </svg>
);
const PartnerIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const CrushIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M12 20.35l-1.35-1.22C5.4 14.1 2 11.12 2 7.5 2 4.5 4.4 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.6 2 22 4.5 22 7.5c0 3.62-3.4 6.6-8.65 11.63L12 20.35z" fill="white"/>
    <path d="M19 1.5l.6 1.6 1.9.7-1.9.7-.6 1.6-.6-1.6-1.9-.7 1.9-.7L19 1.5z" fill="white"/>
    <path d="M5.5 1l.5 1.3 1.5.5-1.5.5L5.5 4.8 5 3.3 3.5 2.8 5 2.3 5.5 1z" fill="white"/>
  </svg>
);
const HusbandIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <circle cx="12" cy="12" r="7.5" stroke="white" strokeWidth="1.85"/>
    <circle cx="12" cy="12" r="2.5" fill="white"/>
    <path d="M12 4.5V2M19.2 6.8l1.6-1.6M19.5 12H22M19.2 17.2l1.6 1.6M12 19.5V22M4.8 17.2l-1.6 1.6M4.5 12H2M4.8 6.8L3.2 5.2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const WifeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M12 2l2.5 3.5H18l-2.5 2.8 1 3.7L12 10l-4.5 2 1-3.7L6 5.5h3.5L12 2z" fill="white"/>
    <path d="M12 13v9" stroke="white" strokeWidth="1.85" strokeLinecap="round"/>
    <path d="M9 17.5h6" stroke="white" strokeWidth="1.85" strokeLinecap="round"/>
  </svg>
);
const SoulmateIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M7 8C5.6 8 4 9 4 11s1.6 3 3 3c1 0 2-.6 2-1.5S8 11 9 11c1 0 2 .5 2 1.5S10 14 11 14h2c1 0 2 .5 2 1.5S14 17 15 17c1.4 0 3-1 3-3s-1.6-3-3-3c-1 0-2 .6-2 1.5S14 13 13 13c-1 0-2-.5-2-1.5S12 10 11 10H9c-1 0-2-.5-2-1.5S8 7 7 8z" stroke="white" strokeWidth="1.85" fill="none" strokeLinecap="round"/>
    <path d="M12 4C10 1.5 7 1 5 2.5S2 6.5 4 8.5c.8.8 3.2 2.5 8 6 4.8-3.5 7.2-5.2 8-6 2-2 1.5-5-1-6.5S14 1.5 12 4z" fill="white" opacity=".9"/>
  </svg>
);
const FamilyIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" stroke="white" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const FavouriteIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M17 3H7L5 9l7 4 7-4-2-6zM12 13.5V22"/>
    <path d="M17 3H7l-2 6 7 4 7-4-2-6z" fill="white"/>
    <rect x="9.5" y="13.5" width="5" height="1.5" fill="white"/>
  </svg>
);

// ─── Public status icon (generic) ────────────────────────────────────────────
const PublicStatusIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

// ─── Full relationship config ─────────────────────────────────────────────────
export const FULL_RELATIONSHIP_CONFIG = [
  { value: 'friend',      label: 'Friend',      gradient: 'linear-gradient(135deg,#10b981,#059669)', accent: '#10b981', icon: <FriendIcon /> },
  { value: 'best_friend', label: 'Best Friend', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', accent: '#6366f1', icon: <BestFriendIcon /> },
  { value: 'brother',     label: 'Brother',     gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', accent: '#3b82f6', icon: <BrotherIcon /> },
  { value: 'sister',      label: 'Sister',      gradient: 'linear-gradient(135deg,#f472b6,#db2777)', accent: '#f472b6', icon: <SisterIcon /> },
  { value: 'partner',     label: 'Partner',     gradient: 'linear-gradient(135deg,#ec4899,#be185d)', accent: '#ec4899', icon: <PartnerIcon /> },
  { value: 'crush',       label: 'Crush',       gradient: 'linear-gradient(135deg,#fb7185,#e11d48)', accent: '#fb7185', icon: <CrushIcon /> },
  { value: 'husband',     label: 'Husband',     gradient: 'linear-gradient(135deg,#8b5cf6,#5b21b6)', accent: '#8b5cf6', icon: <HusbandIcon /> },
  { value: 'wife',        label: 'Wife',        gradient: 'linear-gradient(135deg,#d946ef,#7c3aed)', accent: '#d946ef', icon: <WifeIcon /> },
  { value: 'soulmate',    label: 'Soulmate',    gradient: 'linear-gradient(135deg,#f43f5e,#9333ea)', accent: '#f43f5e', icon: <SoulmateIcon /> },
  { value: 'family',      label: 'Family',      gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', accent: '#f59e0b', icon: <FamilyIcon /> },
  { value: 'favourite',   label: 'Favourite',   gradient: 'linear-gradient(135deg,#eab308,#ca8a04)', accent: '#eab308', icon: <FavouriteIcon /> },
];

// ─── Component ────────────────────────────────────────────────────────────────
const PremiumRelationshipCard = ({
  profileUser,
  loggedInUserProfile,
  isDarkMode,
  isSelf,
  isGuest,
  onMark,
  compact = false,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  const btnRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setPopoverOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  // ── Guest viewer: hide entire section ──
  if (isGuest) return null;
  if (!profileUser?.uid) return null;

  // Guest profiles (Purush / Stree / Navrang) cannot be marked and their section is hidden
  // Normalized: handles boolean true, string 'true', and any role casing
  const isTargetGuest =
    profileUser?.isGuest === true || String(profileUser?.isGuest) === 'true' ||
    (profileUser?.role || '').toLowerCase() === 'guest';

  const canMark    = !isSelf && !isGuest && !isTargetGuest;
  const viewerMark = loggedInUserProfile?.relationships?.[profileUser.uid] ?? null;
  const publicStatus = profileUser?.relationship ?? null;

  // Mutual relationship — stored on profileUser's doc, visible to ALL non-guest users
  const mutualData = profileUser?.publicMutualRelationship ?? null;
  const mutualCfg  = mutualData ? FULL_RELATIONSHIP_CONFIG.find(r => r.value === mutualData.type) : null;

  // Nothing to display and can't mark → hide (also hide if target is a guest)
  if (isTargetGuest) return null;
  if (!viewerMark && !publicStatus && !canMark && !mutualData) return null;

  const markCfg = FULL_RELATIONSHIP_CONFIG.find(r => r.value === viewerMark);

  const handleMark = (val) => {
    setPopoverOpen(false);
    onMark(profileUser.uid, val);
  };

  // ── COMPACT MODE: mutual banner (all non-guest viewers) + mark row (self only) ──
  if (compact) {
    // Nothing to show at all
    if (!canMark && !mutualData) return null;
    return (
      <div className={`prc-wrap${isDarkMode ? ' prc-dark' : ''}`}>
        <div className="prc-compact" onClick={e => e.stopPropagation()}>

          {/* ── Mutual relationship — visible to every non-guest viewer ── */}
          {mutualData && mutualCfg && (
            <div className="prc-mutual-section">
              <div className="prc-mutual-eyebrow">Mutual Relationship</div>
              <div
                className="prc-mutual-banner"
                role="status"
                aria-label={`${profileUser.displayName} and ${mutualData.displayName} are mutual ${mutualCfg.label}`}
              >
                <div className="prc-mutual-avatars" aria-hidden="true">
                  <div className="prc-mutual-avatar">
                    {profileUser.photoURL
                      ? <img src={profileUser.photoURL} alt="" onError={e => { e.currentTarget.style.display='none'; }} />
                      : (profileUser.displayName?.[0] || '?').toUpperCase()
                    }
                  </div>
                  <div className="prc-mutual-avatar">
                    {mutualData.photoURL
                      ? <img src={mutualData.photoURL} alt="" onError={e => { e.currentTarget.style.display='none'; }} />
                      : (mutualData.displayName?.[0] || '?').toUpperCase()
                    }
                  </div>
                </div>
                <div className="prc-mutual-text-wrap">
                  <div className="prc-mutual-names">
                    <strong>{profileUser.displayName || 'User'}</strong>
                    {' & '}
                    <strong>{mutualData.displayName || 'User'}</strong>
                  </div>
                  <div className="prc-mutual-sublabel">Mutual {mutualCfg.label}</div>
                </div>
                <div className="prc-mutual-chip" style={{ background: mutualCfg.gradient }} aria-hidden="true">
                  <span className="prc-mutual-chip-icon">{mutualCfg.icon}</span>
                  {mutualCfg.label}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span className="prc-mutual-public-badge">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                  </svg>
                  Visible to Everyone
                </span>
              </div>
            </div>
          )}

          {/* Divider between mutual banner and mark row */}
          {mutualData && canMark && (
            <div className="prc-section-divider" aria-hidden="true" />
          )}

          {/* ── Mark row — only shown to the viewer themselves (canMark) ── */}
          {canMark && (
            <div className="prc-compact-row">
              <span className="prc-compact-title">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Your mark:
              </span>

              {viewerMark && markCfg ? (
                <span className="prc-compact-chip" style={{ background: markCfg.gradient }}>
                  <span className="prc-compact-chip-icon" aria-hidden="true">{markCfg.icon}</span>
                  {markCfg.label}
                </span>
              ) : (
                <span className="prc-compact-empty">Not marked</span>
              )}

              <span className="prc-compact-spacer" />

              <div style={{ position: 'relative' }}>
                <button
                  ref={btnRef}
                  type="button"
                  className="prc-compact-btn"
                  onClick={(e) => { e.stopPropagation(); setPopoverOpen(p => !p); }}
                  aria-haspopup="listbox"
                  aria-expanded={popoverOpen}
                  aria-label={viewerMark ? 'Change relationship mark' : 'Mark relationship'}
                >
                  {viewerMark ? (
                    <>
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Change
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
                      </svg>
                      Mark
                    </>
                  )}
                </button>

                {popoverOpen && (
                  <div
                    ref={popoverRef}
                    className="prc-popover prc-popover--compact"
                    role="listbox"
                    aria-label="Choose relationship"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="prc-popover-label">Mark as</div>
                    {FULL_RELATIONSHIP_CONFIG.map(rc => (
                      <button
                        key={rc.value}
                        type="button"
                        role="option"
                        aria-selected={viewerMark === rc.value}
                        className={`prc-pop-item${viewerMark === rc.value ? ' prc-pop-active' : ''}`}
                        onClick={() => handleMark(rc.value)}
                      >
                        <span className="prc-pop-icon" style={{ background: rc.gradient }} aria-hidden="true">{rc.icon}</span>
                        <span className="prc-pop-label">{rc.label}</span>
                        {viewerMark === rc.value && (
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" className="prc-pop-check" aria-hidden="true">
                            <path d="M5 12l5 5 9-10" stroke="#7c3aed" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                    {viewerMark && (
                      <button type="button" className="prc-pop-item prc-pop-remove" onClick={() => handleMark(null)}>
                        <span className="prc-pop-icon prc-pop-icon--remove" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.1" strokeLinecap="round"/>
                          </svg>
                        </span>
                        <span className="prc-pop-label prc-pop-label--remove">Remove mark</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`prc-wrap${isDarkMode ? ' prc-dark' : ''}`}>
      <div className="prc-card" role="region" aria-label="Relationship Status">

        {/* ── Top shimmer bar ── */}
        <div className="prc-shimmer" aria-hidden="true" />

        {/* ── Header ── */}
        <div className="prc-header">
          <span className="prc-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </span>
          <span className="prc-header-title">Relationship Status</span>

          {canMark && (
            <div className="prc-mark-wrap">
              <button
                ref={btnRef}
                type="button"
                className="prc-mark-btn"
                onClick={(e) => { e.stopPropagation(); setPopoverOpen(p => !p); }}
                aria-haspopup="listbox"
                aria-expanded={popoverOpen}
                aria-label={viewerMark ? 'Change relationship mark' : 'Add relationship mark'}
              >
                {viewerMark ? (
                  <>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Change
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
                    </svg>
                    Mark
                  </>
                )}
              </button>

              {/* ── Popover ── */}
              {popoverOpen && (
                <div
                  ref={popoverRef}
                  className="prc-popover"
                  role="listbox"
                  aria-label="Choose relationship"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="prc-popover-label">Mark as</div>
                  {FULL_RELATIONSHIP_CONFIG.map(rc => (
                    <button
                      key={rc.value}
                      type="button"
                      role="option"
                      aria-selected={viewerMark === rc.value}
                      className={`prc-pop-item${viewerMark === rc.value ? ' prc-pop-active' : ''}`}
                      onClick={() => handleMark(rc.value)}
                    >
                      <span className="prc-pop-icon" style={{ background: rc.gradient }} aria-hidden="true">
                        {rc.icon}
                      </span>
                      <span className="prc-pop-label">{rc.label}</span>
                      {viewerMark === rc.value && (
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" className="prc-pop-check" aria-hidden="true">
                          <path d="M5 12l5 5 9-10" stroke="#7c3aed" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  {viewerMark && (
                    <button
                      type="button"
                      className="prc-pop-item prc-pop-remove"
                      onClick={() => handleMark(null)}
                    >
                      <span className="prc-pop-icon prc-pop-icon--remove" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.1" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span className="prc-pop-label prc-pop-label--remove">Remove mark</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="prc-body">

          {/* ── Mutual relationship — visible to ALL users ── */}
          {mutualData && mutualCfg && (
            <div className="prc-mutual-section">
              <div className="prc-mutual-eyebrow">Mutual Relationship</div>
              <div className="prc-mutual-banner" role="status" aria-label={`${profileUser.displayName} and ${mutualData.displayName} are mutual ${mutualCfg.label}`}>
                {/* Overlapping avatars */}
                <div className="prc-mutual-avatars" aria-hidden="true">
                  <div className="prc-mutual-avatar">
                    {profileUser.photoURL
                      ? <img src={profileUser.photoURL} alt="" onError={e => { e.currentTarget.style.display='none'; }} />
                      : (profileUser.displayName?.[0] || '?').toUpperCase()
                    }
                  </div>
                  <div className="prc-mutual-avatar">
                    {mutualData.photoURL
                      ? <img src={mutualData.photoURL} alt="" onError={e => { e.currentTarget.style.display='none'; }} />
                      : (mutualData.displayName?.[0] || '?').toUpperCase()
                    }
                  </div>
                </div>

                {/* Names + sub-label */}
                <div className="prc-mutual-text-wrap">
                  <div className="prc-mutual-names">
                    <strong>{profileUser.displayName || 'User'}</strong>
                    {' & '}
                    <strong>{mutualData.displayName || 'User'}</strong>
                  </div>
                  <div className="prc-mutual-sublabel">Mutual {mutualCfg.label}</div>
                </div>

                {/* Type chip */}
                <div className="prc-mutual-chip" style={{ background: mutualCfg.gradient }} aria-hidden="true">
                  <span className="prc-mutual-chip-icon">{mutualCfg.icon}</span>
                  {mutualCfg.label}
                </div>
              </div>

              {/* Visible-to-all badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span className="prc-mutual-public-badge">
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                  </svg>
                  Visible to Everyone
                </span>
              </div>
            </div>
          )}

          {/* Divider between mutual and private sections */}
          {mutualData && (viewerMark || canMark || publicStatus) && (
            <div className="prc-section-divider" aria-hidden="true" />
          )}

          {/* ── Viewer's private mark (only viewer sees this) ── */}
          {viewerMark && markCfg ? (
            <div className="prc-mark-display">
              <div className="prc-mark-eyebrow">You see them as</div>
              <div className="prc-chip" style={{ background: markCfg.gradient }} aria-label={`Marked as ${markCfg.label}`}>
                <span className="prc-chip-icon" aria-hidden="true">{markCfg.icon}</span>
                <span className="prc-chip-label">{markCfg.label}</span>
              </div>
              <div className="prc-private-note">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Only visible to you
              </div>
            </div>
          ) : canMark ? (
            <div className="prc-empty">
              <div className="prc-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                </svg>
              </div>
              <span className="prc-empty-text">Tap Mark to add a relationship</span>
            </div>
          ) : null}

          {/* Profile's public self-declared relationship status */}
          {publicStatus && (
            <div className={`prc-public-row${viewerMark ? ' prc-public-row--below' : ''}`}>
              <div className="prc-public-eyebrow">Their status</div>
              <div className="prc-public-chip">
                <span className="prc-public-icon" aria-hidden="true">
                  <PublicStatusIcon />
                </span>
                <span className="prc-public-text" style={{ textTransform: 'capitalize' }}>{publicStatus}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PremiumRelationshipCard;
