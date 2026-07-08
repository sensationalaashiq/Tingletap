// src/components/badge/BadgeApplicationTab.jsx
// Main badge application tab rendered inside SettingsSidebar.
// Orchestrates: status check → declaration → [female: liveness → video → audio] → upload → submit.

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { auth } from '../../firebase/config';
import {
  getMyApplication,
  getAccountAgeDays,
  msUntil60Days,
  formatRemainingTime,
} from '../../services/badgeApplicationService';
import { uploadMedia, submitBadgeApplication } from '../../services/r2StorageService';
import BadgeStatusCard from './BadgeStatusCard';
import './BadgeApplication.css';

// Lazy-load the heavy components
const BadgeLivenessChecker = lazy(() => import('./BadgeLivenessChecker'));
const BadgeVideoRecorder   = lazy(() => import('./BadgeVideoRecorder'));
const BadgeAudioRecorder   = lazy(() => import('./BadgeAudioRecorder'));

// Female flow auto-submits after audio; no separate 'upload' step needed.
const STEPS_FEMALE = ['declaration', 'liveness', 'video', 'audio'];
const STEPS_MALE   = ['declaration', 'upload'];

function getStepLabel(s) {
  switch (s) {
    case 'declaration': return 'Declaration';
    case 'liveness':    return 'Liveness';
    case 'video':       return 'Video';
    case 'audio':       return 'Audio';
    case 'upload':      return 'Confirm';
    default:            return s;
  }
}

// ─── Shield icon ──────────────────────────────────────────────────────────────
const ShieldIcon = ({ size = 32, stroke = '#fff' }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
    <path
      d="M12 2L3 6.5v5C3 17.5 7 22.5 12 24c5-1.5 9-6.5 9-12.5v-5L12 2z"
      stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M9 12l2 2 4-4" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Check circle ─────────────────────────────────────────────────────────────
const CheckIcon = ({ size = 14, color = '#10b981' }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill={`${color}22`} stroke={color} strokeWidth="1.5"/>
    <path d="M7.5 12l3.5 3.5L16.5 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Declaration text ─────────────────────────────────────────────────────────
function DeclarationContent({ gender }) {
  return (
    <>
      <h4>Purpose of Verification</h4>
      <p>
        The Badge Verification process confirms that you are a genuine, registered member of TingleTap.
        A verified badge indicates your identity has been reviewed by our moderation team.
      </p>
      <h4>What We Check</h4>
      <ul>
        <li>Account age and registration details</li>
        {gender === 'female' && <li>Real-time liveness verification (confirms a live person)</li>}
        {gender === 'female' && <li>A short selfie video (10–15 seconds)</li>}
        {gender === 'female' && <li>A brief spoken declaration (5–15 seconds)</li>}
      </ul>
      <h4>Data Handling</h4>
      <p>
        {gender === 'female'
          ? 'Your video and audio recordings are stored privately and securely. They are only accessible to the TingleTap review team and are permanently deleted immediately after your application is approved or rejected — no exceptions.'
          : 'Your application metadata is stored securely and only accessible to the TingleTap review team.'}
      </p>
      {gender === 'female' && (
        <>
          <h4>Liveness Detection</h4>
          <p>
            The liveness check uses on-device face analysis only to confirm a live person completed the challenge.
            No identity, gender, or biometric information is captured, processed, or stored.
          </p>
        </>
      )}
      <h4>Your Consent</h4>
      <p>
        By proceeding, you confirm that all information submitted is accurate and truthful,
        and that you have read and understood this declaration.
      </p>
      <p style={{ color: '#be123c', fontWeight: 600 }}>
        False submissions may result in a permanent ban from TingleTap.
      </p>
    </>
  );
}

// ─── Male Countdown Card ──────────────────────────────────────────────────────
function MaleCountdownCard({ remainingMs, accountAgeDays }) {
  const totalMs  = 60 * 24 * 60 * 60 * 1000;
  const safe     = Math.max(0, remainingMs);
  const elapsed  = totalMs - safe;
  const pct      = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
  const daysLeft = safe > 0 ? Math.ceil(safe / (24 * 60 * 60 * 1000)) : 0;
  const radius   = 56;
  const circ     = 2 * Math.PI * radius;
  const dash     = circ * (1 - pct / 100);

  // Live D / H / M / S breakdown
  const totalSec = Math.floor(safe / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="bv-countdown-card bv-fade-up">

      {/* Circular ring — shows days remaining */}
      <div className="bv-countdown-ring">
        <svg width="124" height="124" viewBox="0 0 124 124">
          <circle cx="62" cy="62" r={radius} fill="none" className="bv-countdown-ring-track" strokeWidth="8"/>
          <circle
            cx="62" cy="62" r={radius} fill="none"
            className="bv-countdown-ring-fill"
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '62px 62px' }}
          />
        </svg>
        <div className="bv-countdown-center">
          <div className="bv-countdown-days">{daysLeft}</div>
          <div className="bv-countdown-label">DAYS LEFT</div>
        </div>
      </div>

      {/* Account age pill */}
      <div className="bv-account-age-badge">
        <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
          <circle cx="12" cy="12" r="9" stroke="#7c3aed" strokeWidth="2"/>
          <path d="M12 7v5l3 3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Your account:&nbsp;<strong>{accountAgeDays} day{accountAgeDays !== 1 ? 's' : ''} old</strong>
      </div>

      <div className="bv-countdown-title">Account too new to apply</div>
      <div className="bv-countdown-sub">
        Male accounts must be at least&nbsp;<strong style={{ color: '#6d28d9' }}>60 days</strong>&nbsp;old before applying for a verified badge.
      </div>

      {/* Live D : H : M : S ticker */}
      <div className="bv-countdown-ticker">
        <div className="bv-tick-unit">
          <span className="bv-tick-num">{pad(d)}</span>
          <span className="bv-tick-lbl">Days</span>
        </div>
        <span className="bv-tick-sep">:</span>
        <div className="bv-tick-unit">
          <span className="bv-tick-num">{pad(h)}</span>
          <span className="bv-tick-lbl">Hours</span>
        </div>
        <span className="bv-tick-sep">:</span>
        <div className="bv-tick-unit">
          <span className="bv-tick-num">{pad(m)}</span>
          <span className="bv-tick-lbl">Mins</span>
        </div>
        <span className="bv-tick-sep">:</span>
        <div className="bv-tick-unit">
          <span className="bv-tick-num">{pad(s)}</span>
          <span className="bv-tick-lbl">Secs</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bv-countdown-progress">
        <div className="bv-countdown-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="bv-countdown-detail">
        Come back in&nbsp;<strong>{d > 0 ? `${d}d ` : ''}{pad(h)}h {pad(m)}m</strong>
      </div>
    </div>
  );
}

// ─── Account Age Timeline (shown on idle/qualify screen) ─────────────────────
function AccountAgeTimeline({ accountAgeDays, gender }) {
  const isMale    = gender === 'male';
  const required  = 60;
  const pct       = isMale ? Math.min(100, Math.round((accountAgeDays / required) * 100)) : 100;
  const radius    = 44;
  const circ      = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - pct / 100);

  return (
    <div className="bv-age-timeline bv-fade-up">
      {/* Circular progress ring */}
      <div className="bv-age-ring">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#ede9fe" strokeWidth="7"/>
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={pct >= 100 ? '#10b981' : '#a855f7'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="bv-age-ring-center">
          <span className="bv-age-ring-num">{accountAgeDays}</span>
          <span className="bv-age-ring-unit">days</span>
        </div>
      </div>

      <div className="bv-age-info">
        <div className="bv-age-label">
          {isMale
            ? (pct >= 100 ? '✓ Account age requirement met' : `${required - accountAgeDays} days remaining`)
            : '✓ No age requirement for you'}
        </div>

        {/* Progress bar */}
        {isMale && (
          <div className="bv-age-bar-wrap">
            <div className="bv-age-bar">
              <div
                className="bv-age-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#a78bfa,#7c3aed)',
                }}
              />
            </div>
            <span className="bv-age-bar-cap">{required}d</span>
          </div>
        )}

        <div className="bv-age-milestones">
          <span className={`bv-age-ms ${accountAgeDays >= 1  ? 'done' : ''}`}>Day 1</span>
          {isMale && <span className={`bv-age-ms ${accountAgeDays >= 30 ? 'done' : ''}`}>30d</span>}
          {isMale && <span className={`bv-age-ms ${accountAgeDays >= 60 ? 'done' : ''}`}>60d ✓</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BadgeApplicationTab({ loggedInUserProfile }) {
  // Compute gender / age data synchronously from already-loaded auth metadata
  // so male users blocked by the 60-day rule see the countdown card instantly
  // (no Firestore round-trip needed to know they can't apply yet).
  const [gender, setGender]                 = useState(
    () => loggedInUserProfile?.gender || 'male'
  );
  const [accountAgeDays, setAccountAgeDays] = useState(
    () => getAccountAgeDays(auth.currentUser?.metadata?.creationTime)
  );
  const [remainingMs, setRemainingMs]       = useState(
    () => msUntil60Days(auth.currentUser?.metadata?.creationTime)
  );
  const [pageState, setPageState]           = useState(() => {
    const g  = loggedInUserProfile?.gender || 'male';
    const ms = msUntil60Days(auth.currentUser?.metadata?.creationTime);
    // Skip loading spinner for male users who definitely can't apply yet
    return (g === 'male' && ms > 0) ? 'idle' : 'loading';
  });
  const [existingApp, setExistingApp]       = useState(null);

  // Flow state
  const [step, setStep]         = useState(0);
  const [steps, setSteps]       = useState([]);
  const [accepted, setAccepted] = useState(false);

  // Collected data
  const [livenessResult, setLivenessResult] = useState(null);
  const [videoBlob, setVideoBlob]           = useState(null);
  const [audioBlob, setAudioBlob]           = useState(null);

  // Upload state
  const [uploadPhase, setUploadPhase]       = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError]       = useState('');
  const [applyMode, setApplyMode]           = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    (async () => {
      try {
        const app = await getMyApplication();
        setExistingApp(app);

        const g = loggedInUserProfile?.gender || 'male';
        setGender(g);

        const meta = auth.currentUser?.metadata;
        const days = getAccountAgeDays(meta?.creationTime);
        setAccountAgeDays(days);

        const ms = msUntil60Days(meta?.creationTime);
        setRemainingMs(ms);

        if (!app || ['rejected', 'expired', 'resubmit_requested'].includes(app.status)) {
          setPageState(app ? 'status' : 'idle');
        } else {
          setPageState('status');
        }
      } catch (e) {
        console.error('[BadgeApplicationTab]', e);
        setPageState('idle');
      }
    })();
  }, []);

  // Live countdown: re-calculate remainingMs every second so D/H/M/S ticker is smooth
  useEffect(() => {
    const meta = auth.currentUser?.metadata;
    if (!meta?.creationTime) return;
    const tick = () => {
      const ms = msUntil60Days(meta.creationTime);
      setRemainingMs(ms);
      // Only update accountAgeDays when it actually changes (once per day)
      setAccountAgeDays(prev => {
        const next = getAccountAgeDays(meta.creationTime);
        return next !== prev ? next : prev;
      });
    };
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  // ── Age eligibility check (re-evaluated at call time, not just at mount) ───
  const isEligibleToApply = useCallback(() => {
    const g   = gender || loggedInUserProfile?.gender || 'male';
    const meta = auth.currentUser?.metadata;
    const ms  = msUntil60Days(meta?.creationTime);
    // Males need 60-day-old account; females and trans have no age restriction
    if (g === 'male' && ms > 0) return false;
    return true;
  }, [gender, loggedInUserProfile]);

  const startFlow = useCallback(() => {
    // Hard guard — re-check at click time, not just at render time
    if (!isEligibleToApply()) return;

    const g = gender || loggedInUserProfile?.gender || 'male';
    const s = g === 'female' ? STEPS_FEMALE : STEPS_MALE;
    setSteps(s);
    setStep(0);
    setAccepted(false);
    setLivenessResult(null);
    setVideoBlob(null);
    setAudioBlob(null);
    setSubmitError('');
    setPageState('apply');
    setApplyMode(true);
  }, [gender, loggedInUserProfile, isEligibleToApply]);

  const currentStepName = steps[step] || '';
  const goNext = useCallback(() => setStep(s => s + 1), []);
  const goBack = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  // ── Upload & Submit ─────────────────────────────────────────────────────────
  const submitInFlightRef = React.useRef(false);
  const handleSubmit = useCallback(async () => {
    // Guard against duplicate concurrent submissions (e.g. rapid Retry taps
    // before the pageState re-render lands) creating duplicate applications
    // or duplicate media uploads.
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setPageState('uploading');
    setSubmitError('');

    let videoKey = null;
    let audioKey = null;

    try {
      if (videoBlob) {
        setUploadPhase('Uploading video…');
        videoKey = await uploadMedia(videoBlob, 'video', p => setUploadProgress(Math.round(p * 0.6)));
      }
      if (audioBlob) {
        setUploadPhase('Uploading audio…');
        audioKey = await uploadMedia(audioBlob, 'audio', p => setUploadProgress(60 + Math.round(p * 0.3)));
      }

      setUploadPhase('Submitting application…');
      setUploadProgress(95);

      const ua = navigator.userAgent;
      const isMobile = /Mobi|Android/i.test(ua);

      await submitBadgeApplication({
        gender:          gender || loggedInUserProfile?.gender || 'male',
        videoKey,
        audioKey,
        livenessPassed:  livenessResult !== null,
        challengeResults: livenessResult?.challenges || [],
        username:         loggedInUserProfile?.username    || '',
        displayName:      loggedInUserProfile?.displayName || '',
        email:            user?.email || '',
        accountAge:       accountAgeDays,
        browser:          getBrowserName(ua),
        platform:         navigator.platform || '',
        device:           isMobile ? 'Mobile' : 'Desktop',
        userAgent:        ua.substring(0, 300),
      });

      setUploadProgress(100);
      setPageState('done');
      // getMyApplication is best-effort — if it fails (e.g. Firestore
      // rules not yet updated, or network hiccup) we still show the
      // success screen. The application was already submitted above.
      try {
        const newApp = await getMyApplication();
        if (newApp) setExistingApp(newApp);
      } catch (fetchErr) {
        console.warn('[BadgeApplicationTab] post-submit fetch failed (non-fatal):', fetchErr);
      }
    } catch (e) {
      console.error('[BadgeApplicationTab] submit error:', e);
      setSubmitError(e.message || 'Submission failed. Please try again.');
      setPageState('apply');
    } finally {
      submitInFlightRef.current = false;
    }
  }, [videoBlob, audioBlob, livenessResult, gender, loggedInUserProfile, accountAgeDays, user]);

  // Auto-submit when all steps are done (female flow: audio is last step)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (steps.length === 0) return;
    if (step === steps.length) handleSubmit();
  }, [step, steps.length]); // handleSubmit intentionally excluded — batched state update guarantees blobs are current

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="bv-tab-content">
        <div className="bv-liveness-loading">
          <div className="bv-liveness-spinner" />
          <p>Loading your verification status…</p>
        </div>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (pageState === 'done') {
    return (
      <div className="bv-tab-content">
        <div className="bv-success-card bv-fade-up">
          <div className="bv-success-icon">
            <svg viewBox="0 0 24 24" fill="none" width="38" height="38">
              <path d="M5 12l5 5 9-10" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="bv-success-title">Application Submitted!</div>
          <div className="bv-success-sub">
            Your badge verification application has been submitted successfully.
            Our team will review it within 48 hours. You will be notified once a decision is made.
          </div>
        </div>
      </div>
    );
  }

  // ── UPLOADING ────────────────────────────────────────────────────────────────
  if (pageState === 'uploading') {
    return (
      <div className="bv-tab-content">
        <div className="bv-upload-card bv-fade-up">
          <div className="bv-upload-spinner" />
          <div className="bv-upload-title">{uploadPhase || 'Processing…'}</div>
          <div className="bv-upload-sub">Please wait — do not close this window</div>
          <div className="bv-upload-bar">
            <div className="bv-upload-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="bv-upload-pct">{uploadProgress}%</div>
        </div>
      </div>
    );
  }

  // ── EXISTING STATUS ──────────────────────────────────────────────────────────
  if (pageState === 'status' && existingApp && !applyMode) {
    return (
      <div className="bv-tab-content">
        <BadgeStatusCard
          application={existingApp}
          onApplyAgain={['rejected','expired','resubmit_requested'].includes(existingApp.status) ? startFlow : null}
        />
      </div>
    );
  }

  // ── IDLE — no application yet ────────────────────────────────────────────────
  if ((pageState === 'idle' || pageState === 'status') && !applyMode) {
    const g = gender || loggedInUserProfile?.gender || 'male';
    const maleBlocked = g === 'male' && remainingMs > 0;

    return (
      <div className="bv-tab-content bv-fade-up">

        {/* Hero */}
        <div className="bv-hero-card">
          <div className="bv-hero-icon">
            <ShieldIcon size={30} stroke="#fff" />
          </div>
          <div className="bv-hero-title">Get Verified</div>
          <div className="bv-hero-sub">
            Earn a badge that proves you're a genuine TingleTap member — trusted by the community.
          </div>
        </div>

        {maleBlocked ? (
          <MaleCountdownCard remainingMs={remainingMs} accountAgeDays={accountAgeDays} />
        ) : (
          <>
            {/* Account Age Timeline — shown immediately on idle/qualify screen */}
            <AccountAgeTimeline accountAgeDays={accountAgeDays} gender={g} />

            <div className="bv-info-card">
              <div className="bv-info-title">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <circle cx="12" cy="12" r="10" stroke="#6d28d9" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Requirements
              </div>
              <ul className="bv-info-list">
                <li>
                  <CheckIcon />
                  Registered account (not guest)
                </li>
                {g === 'male' && (
                  <li>
                    <CheckIcon />
                    Account at least 60 days old — <strong style={{ color: '#10b981' }}>you qualify ({accountAgeDays} day{accountAgeDays !== 1 ? 's' : ''})</strong>
                  </li>
                )}
                {g === 'female' && (
                  <>
                    <li><CheckIcon />Real-time liveness verification (face challenges)</li>
                    <li><CheckIcon />10–15 second selfie video</li>
                    <li><CheckIcon />5–15 second spoken declaration</li>
                  </>
                )}
              </ul>
            </div>

            <button className="bv-btn bv-btn--primary" onClick={startFlow}>
              <ShieldIcon size={18} stroke="#fff" />
              Start Verification
            </button>
          </>
        )}
      </div>
    );
  }

  // ── APPLICATION FLOW ─────────────────────────────────────────────────────────
  if (pageState === 'apply' || applyMode) {
    return (
      <div className="bv-tab-content bv-fade-up">

        {/* Step progress */}
        <div className="bv-steps">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`bv-step ${i < step ? 'bv-step--done' : ''} ${i === step ? 'bv-step--active' : ''}`}
            >
              <div className="bv-step-dot">
                {i < step
                  ? <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                      <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  : i + 1
                }
              </div>
              <div className="bv-step-label">{getStepLabel(s)}</div>
            </div>
          ))}
        </div>

        {/* Declaration */}
        {currentStepName === 'declaration' && (
          <div className="bv-declaration bv-fade-up">
            <div className="bv-declaration-header">
              <h3>Verification Declaration</h3>
              <p>Please read carefully before proceeding</p>
            </div>
            <div className="bv-declaration-body">
              <DeclarationContent gender={gender || loggedInUserProfile?.gender || 'male'} />
            </div>
            <div className="bv-declaration-footer">
              <label className="bv-declaration-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                />
                <span>I have read and understood the declaration above, and confirm all information I submit will be truthful and accurate.</span>
              </label>
              <button className="bv-btn bv-btn--primary" disabled={!accepted} onClick={goNext}>
                Continue
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                  <path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Liveness */}
        {currentStepName === 'liveness' && (
          <Suspense fallback={
            <div className="bv-liveness-loading">
              <div className="bv-liveness-spinner"/>
              <p>Loading face detection…</p>
            </div>
          }>
            <BadgeLivenessChecker
              onPassed={(result) => { setLivenessResult(result); goNext(); }}
              onFailed={(err) => { setSubmitError(err || 'Liveness check failed. Please try again.'); setStep(1); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* Video */}
        {currentStepName === 'video' && (
          <Suspense fallback={
            <div className="bv-liveness-loading">
              <div className="bv-liveness-spinner"/>
              <p>Loading camera…</p>
            </div>
          }>
            <BadgeVideoRecorder
              onRecorded={(blob) => { setVideoBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* Audio */}
        {currentStepName === 'audio' && (
          <Suspense fallback={
            <div className="bv-liveness-loading">
              <div className="bv-liveness-spinner"/>
              <p>Loading microphone…</p>
            </div>
          }>
            <BadgeAudioRecorder
              onRecorded={(blob) => { setAudioBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* Male: confirmation step before submit */}
        {currentStepName === 'upload' && gender !== 'female' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="bv-fade-up">
            <div className="bv-submit-ready-card">
              <div className="bv-submit-ready-title">
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                  <path d="M9 12l2 2 4-4" stroke="#6d28d9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2L3 6.5v5C3 18 7 23.2 12 24.5c5-1.3 9-6.5 9-13v-5L12 2z" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Ready to Submit
              </div>
              <div className="bv-submit-ready-row">
                <CheckIcon size={16} />
                <span>Declaration accepted</span>
              </div>
              <div className="bv-submit-ready-row">
                <CheckIcon size={16} />
                <span>Account age verified — <strong>{accountAgeDays} days old</strong> (60+ required)</span>
              </div>
            </div>

            {submitError && (
              <div className="bv-error-card">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#f43f5e" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>{submitError}</p>
              </div>
            )}

            <button className="bv-btn bv-btn--primary" onClick={handleSubmit}>
              <ShieldIcon size={18} stroke="#fff" />
              Submit Application
            </button>
            <button className="bv-btn bv-btn--secondary" onClick={goBack}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M15 18l-6-6 6-6" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>
        )}

        {/* Fallback: step index has advanced past the last known step (e.g. female
            flow right after audio). handleSubmit() is triggered by the effect below;
            this covers the brief window before it flips pageState, and — critically —
            surfaces submitError with a retry button if the upload/submit call failed,
            instead of leaving the panel blank forever. */}
        {!currentStepName && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="bv-fade-up">
            {submitError ? (
              <>
                <div className="bv-error-card">
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="#f43f5e" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p>{submitError}</p>
                </div>
                <button className="bv-btn bv-btn--primary" onClick={handleSubmit}>
                  <ShieldIcon size={18} stroke="#fff" />
                  Retry Submission
                </button>
                <button className="bv-btn bv-btn--secondary" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                    <path d="M15 18l-6-6 6-6" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
              </>
            ) : (
              <div className="bv-liveness-loading">
                <div className="bv-liveness-spinner" />
                <p>Preparing submission…</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function getBrowserName(ua) {
  if (/Edg\//.test(ua))     return 'Edge';
  if (/Chrome\//.test(ua))  return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua))  return 'Safari';
  if (/Opera\//.test(ua))   return 'Opera';
  return 'Unknown';
}
