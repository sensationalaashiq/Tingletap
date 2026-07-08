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
    case 'upload':      return 'Submit';
    default:            return s;
  }
}

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
      <h4>Liveness Detection</h4>
      {gender === 'female' && (
        <p>
          The liveness check uses on-device face analysis only to confirm a live person completed the challenge.
          No identity, gender, or biometric information is captured, processed, or stored.
        </p>
      )}
      <h4>Your Consent</h4>
      <p>
        By proceeding, you confirm that all information submitted is accurate and truthful,
        and that you have read and understood this declaration.
      </p>
      <p>
        False submissions may result in a permanent ban from TingleTap.
      </p>
    </>
  );
}

// ─── Male Countdown Card ──────────────────────────────────────────────────────
function MaleCountdownCard({ remainingMs }) {
  const totalMs    = 60 * 24 * 60 * 60 * 1000;
  const elapsed    = totalMs - remainingMs;
  const pct        = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
  const daysLeft   = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const radius     = 56;
  const circ       = 2 * Math.PI * radius;
  const dash       = circ * (1 - pct / 100);

  return (
    <div className="bv-countdown-card">
      <div className="bv-countdown-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" className="bv-countdown-ring-track" strokeWidth="8"/>
          <circle
            cx="60" cy="60" r={radius} fill="none"
            className="bv-countdown-ring-fill"
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
          />
        </svg>
        <div className="bv-countdown-center">
          <div className="bv-countdown-days">{daysLeft}</div>
          <div className="bv-countdown-label">days left</div>
        </div>
      </div>

      <div className="bv-countdown-title">Account too new</div>
      <div className="bv-countdown-sub">
        Male applicants must have an account that is at least 60 days old to apply for a badge.
      </div>

      <div className="bv-countdown-progress">
        <div className="bv-countdown-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="bv-countdown-detail">
        Come back in <strong>{formatRemainingTime(remainingMs)}</strong>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BadgeApplicationTab({ loggedInUserProfile }) {
  const [pageState, setPageState]       = useState('loading'); // loading|status|apply|uploading|done
  const [existingApp, setExistingApp]   = useState(null);
  const [gender, setGender]             = useState(null);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [remainingMs, setRemainingMs]   = useState(0);
  const [canApply, setCanApply]         = useState(false);

  // Flow state
  const [step, setStep]       = useState(0);   // index into steps array
  const [steps, setSteps]     = useState([]);
  const [accepted, setAccepted] = useState(false);

  // Collected data
  const [livenessResult, setLivenessResult] = useState(null);
  const [videoBlob, setVideoBlob]           = useState(null);
  const [audioBlob, setAudioBlob]           = useState(null);

  // Upload state
  const [uploadPhase, setUploadPhase]       = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError]       = useState('');
  const [applyMode, setApplyMode]           = useState(false); // force show apply form

  const user = auth.currentUser;

  useEffect(() => {
    (async () => {
      try {
        const app = await getMyApplication();
        setExistingApp(app);

        const g = loggedInUserProfile?.gender || user?.gender || 'male';
        setGender(g);

        const meta = user?.metadata;
        const days = getAccountAgeDays(meta?.creationTime);
        setAccountAgeDays(days);

        const ms = msUntil60Days(meta?.creationTime);
        setRemainingMs(ms);

        const eligible = g !== 'male' || days >= 60;
        setCanApply(eligible);

        if (!app || ['rejected', 'expired', 'resubmit_requested'].includes(app.status)) {
          setPageState(app ? 'status' : 'idle');
        } else if (app.status === 'approved') {
          setPageState('status');
        } else {
          setPageState('status'); // pending
        }
      } catch (e) {
        console.error('[BadgeApplicationTab]', e);
        setPageState('idle');
      }
    })();
  }, []);

  const startFlow = useCallback(() => {
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
  }, [gender, loggedInUserProfile]);

  const currentStepName = steps[step] || '';

  const goNext = useCallback(() => setStep(s => s + 1), []);
  const goBack = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  // ── Upload & Submit ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
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
      const platform = navigator.platform || '';
      const isMobile = /Mobi|Android/i.test(ua);

      await submitBadgeApplication({
        gender: gender || loggedInUserProfile?.gender || 'male',
        videoKey,
        audioKey,
        livenessPassed: livenessResult !== null,
        challengeResults: livenessResult?.challenges || [],
        username:    loggedInUserProfile?.username    || '',
        displayName: loggedInUserProfile?.displayName || '',
        email:       user?.email || '',
        accountAge:  accountAgeDays,
        browser:     getBrowserName(ua),
        platform:    platform,
        device:      isMobile ? 'Mobile' : 'Desktop',
        userAgent:   ua.substring(0, 300),
      });

      setUploadProgress(100);
      setPageState('done');
      // Refresh application state
      const newApp = await getMyApplication();
      setExistingApp(newApp);
    } catch (e) {
      console.error('[BadgeApplicationTab] submit error:', e);
      setSubmitError(e.message || 'Submission failed. Please try again.');
      setPageState('apply');
    }
  }, [videoBlob, audioBlob, livenessResult, gender, loggedInUserProfile, accountAgeDays, user]);

  // Auto-submit when all steps for current flow are done
  useEffect(() => {
    if (steps.length === 0) return;
    if (step === steps.length) {
      // last step was reached — auto-submit
      handleSubmit();
    }
  }, [step, steps.length]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="bv-tab-content">
        <div className="bv-liveness-loading">
          <div className="bv-liveness-spinner" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (pageState === 'done') {
    return (
      <div className="bv-tab-content">
        <div className="bv-success-card">
          <div className="bv-success-icon">
            <svg viewBox="0 0 24 24" fill="none" width="40" height="40">
              <circle cx="12" cy="12" r="11" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="2"/>
              <path d="M7 12l4 4 6-7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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

  if (pageState === 'uploading') {
    return (
      <div className="bv-tab-content">
        <div className="bv-upload-card">
          <div className="bv-upload-spinner" />
          <div className="bv-upload-title">{uploadPhase || 'Processing…'}</div>
          <div className="bv-upload-sub">Please wait. Do not close this window.</div>
          <div className="bv-upload-bar" style={{ width: '100%' }}>
            <div className="bv-upload-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="bv-upload-pct">{uploadProgress}%</div>
        </div>
      </div>
    );
  }

  // Show existing status
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

  // Idle — no application yet
  if ((pageState === 'idle' || pageState === 'status') && !applyMode) {
    const g = gender || loggedInUserProfile?.gender || 'male';
    const maleBlocked = g === 'male' && remainingMs > 0;

    return (
      <div className="bv-tab-content">
        {/* Hero */}
        <div className="bv-hero-card">
          <div className="bv-hero-icon">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 2L2 7l1 5a9 9 0 0 0 9 7 9 9 0 0 0 9-7l1-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="bv-hero-title">Apply for Verified Badge</div>
          <div className="bv-hero-sub">
            Get a badge that shows others you are a genuine, verified TingleTap member.
          </div>
        </div>

        {maleBlocked ? (
          <MaleCountdownCard remainingMs={remainingMs} />
        ) : (
          <>
            <div className="bv-info-card">
              <div className="bv-info-title">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Requirements
              </div>
              <ul className="bv-info-list">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                    <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Registered account (not guest)
                </li>
                {g === 'male' && (
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                      <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Account must be at least 60 days old (you qualify)
                  </li>
                )}
                {g === 'female' && (
                  <>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                        <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Real-time liveness verification (face challenges)
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                        <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      10–15 second selfie video recording
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                        <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      5–15 second spoken declaration
                    </li>
                  </>
                )}
              </ul>
            </div>

            <button className="bv-btn bv-btn--primary" onClick={startFlow}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2L2 7l1 5a9 9 0 0 0 9 7 9 9 0 0 0 9-7l1-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Start Application
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Application flow ─────────────────────────────────────────────────────────
  if (pageState === 'apply' || applyMode) {
    const totalSteps = steps.length;

    return (
      <div className="bv-tab-content">
        {/* Step progress */}
        <div className="bv-steps">
          {steps.map((s, i) => (
            <div key={s} className={`bv-step ${i < step ? 'bv-step--done' : ''} ${i === step ? 'bv-step--active' : ''}`}>
              <div className="bv-step-dot">
                {i < step
                  ? <svg viewBox="0 0 24 24" fill="none" width="12" height="12"><path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : i + 1
                }
              </div>
              <div className="bv-step-label">{getStepLabel(s)}</div>
            </div>
          ))}
        </div>

        {/* Step content */}
        {currentStepName === 'declaration' && (
          <div className="bv-declaration">
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
                <span>I have read and understood the declaration above, and I confirm all information I submit will be truthful and accurate.</span>
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

        {currentStepName === 'liveness' && (
          <Suspense fallback={<div className="bv-liveness-loading"><div className="bv-liveness-spinner"/><p>Loading face detection…</p></div>}>
            <BadgeLivenessChecker
              onPassed={(result) => { setLivenessResult(result); goNext(); }}
              onFailed={(err) => { setSubmitError(err || 'Liveness check failed. Please try again.'); setStep(1); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {currentStepName === 'video' && (
          <Suspense fallback={<div className="bv-liveness-loading"><div className="bv-liveness-spinner"/><p>Loading camera…</p></div>}>
            <BadgeVideoRecorder
              onRecorded={(blob) => { setVideoBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {currentStepName === 'audio' && (
          <Suspense fallback={<div className="bv-liveness-loading"><div className="bv-liveness-spinner"/><p>Loading microphone…</p></div>}>
            <BadgeAudioRecorder
              onRecorded={(blob) => { setAudioBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* For male: confirmation step before submit */}
        {currentStepName === 'upload' && gender !== 'female' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="bv-info-card">
              <div className="bv-info-title">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Ready to submit
              </div>
              <ul className="bv-info-list">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                    <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Declaration accepted
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                    <path d="M5 12l5 5 9-9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Account age verified ({accountAgeDays} days)
                </li>
              </ul>
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
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2L2 7l1 5a9 9 0 0 0 9 7 9 9 0 0 0 9-7l1-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Submit Application
            </button>
            <button className="bv-btn bv-btn--secondary" onClick={goBack}>Back</button>
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
