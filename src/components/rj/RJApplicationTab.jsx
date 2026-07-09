// src/components/rj/RJApplicationTab.jsx
// Main RJ Verification tab rendered inside SettingsSidebar.
// Orchestrates: intro → funny-intro recording → song recording → welcome-message
// recording → upload → submit. Mirrors BadgeApplicationTab.jsx's flow/UX exactly,
// reusing the same bv- classes from BadgeApplication.css.

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { auth } from '../../firebase/config';
import { getMyRJApplication } from '../../services/rjApplicationService';
import { uploadRJMedia, submitRJApplication } from '../../services/r2StorageService';
import RJStatusCard from './RJStatusCard';
import '../badge/BadgeApplication.css';

const RJAudioRecorder = lazy(() => import('./RJAudioRecorder'));

const STEPS = ['declaration', 'intro', 'song', 'welcome', 'confirm'];

function getStepLabel(s) {
  switch (s) {
    case 'declaration': return 'Intro';
    case 'intro':       return 'Funny Intro';
    case 'song':        return 'Song';
    case 'welcome':     return 'Welcome';
    case 'confirm':     return 'Confirm';
    default:            return s;
  }
}

// ─── Mic icon (RJ hero) ─────────────────────────────────────────────────────
const MicHeroIcon = ({ size = 30, stroke = '#fff' }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
    <rect x="9" y="2" width="6" height="12" rx="3" stroke={stroke} strokeWidth="2"/>
    <path d="M5 11a7 7 0 0 0 14 0" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 19v3M9 22h6" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CheckIcon = ({ size = 14, color = '#10b981' }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill={`${color}22`} stroke={color} strokeWidth="1.5"/>
    <path d="M7.5 12l3.5 3.5L16.5 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Welcome message script (Hindi + English) ───────────────────────────────
const WELCOME_SCRIPT_HINDI =
  'नमस्ते दोस्तों!\n\n' +
  'आप सुन रहे हैं TingleTap Radio.\n\n' +
  'मैं हूँ आपका RJ.\n\n' +
  'आप सभी का दिल से स्वागत है.\n\n' +
  'उम्मीद है आपका दिन शानदार चल रहा होगा.\n\n' +
  'चलिए, मुस्कुराइए, बातें कीजिए और इस खूबसूरत सफ़र का आनंद लीजिए.';
const WELCOME_SCRIPT_ENGLISH =
  'Hello everyone!\n\n' +
  'You\'re listening to TingleTap Radio.\n\n' +
  'I\'m your RJ.\n\n' +
  'A warm welcome to everyone.\n\n' +
  'I hope you\'re having a wonderful day.\n\n' +
  'Let\'s enjoy great conversations together.';

function DeclarationContent() {
  return (
    <>
      <h4>Become a Verified RJ</h4>
      <p>
        Share your voice and entertain our listeners! The RJ Verification process lets our team hear
        your personality, singing, and hosting style before awarding you the official RJ badge.
      </p>
      <h4>What You'll Record</h4>
      <ul>
        <li>A Funny Introduction — introduce yourself in an entertaining way</li>
        <li>A Song — sing a short song of your choice</li>
        <li>A Welcome Message — read the provided Hindi/English script</li>
      </ul>
      <h4>Data Handling</h4>
      <p>
        Your recordings are stored privately and securely. They are only accessible to the TingleTap
        review team and are permanently deleted immediately after your application is approved or rejected.
      </p>
      <h4>Your Consent</h4>
      <p>
        By proceeding, you confirm that all recordings are your own genuine voice and performance.
      </p>
      <p style={{ color: '#be123c', fontWeight: 600 }}>
        False or plagiarized submissions may result in a permanent ban from TingleTap.
      </p>
    </>
  );
}

export default function RJApplicationTab({ loggedInUserProfile }) {
  const [pageState, setPageState] = useState('loading'); // loading|idle|apply|uploading|done|status
  const [existingApp, setExistingApp] = useState(null);

  // Flow state
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [applyMode, setApplyMode] = useState(false);

  // Collected data
  const [introBlob, setIntroBlob]     = useState(null);
  const [songBlob, setSongBlob]       = useState(null);
  const [welcomeBlob, setWelcomeBlob] = useState(null);

  // Upload state
  const [uploadPhase, setUploadPhase]       = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError]       = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    (async () => {
      try {
        const app = await getMyRJApplication();
        setExistingApp(app);
        setPageState(app ? 'status' : 'idle');
      } catch (e) {
        console.error('[RJApplicationTab]', e);
        setPageState('idle');
      }
    })();
  }, []);

  const startFlow = useCallback(() => {
    setStep(0);
    setAccepted(false);
    setIntroBlob(null);
    setSongBlob(null);
    setWelcomeBlob(null);
    setSubmitError('');
    setPageState('apply');
    setApplyMode(true);
  }, []);

  const currentStepName = STEPS[step] || '';
  const goNext = useCallback(() => setStep(s => s + 1), []);
  const goBack = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  const submitInFlightRef = React.useRef(false);
  const handleSubmit = useCallback(async () => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setPageState('uploading');
    setSubmitError('');

    try {
      setUploadPhase('Uploading Funny Introduction…');
      const introKey = await uploadRJMedia(introBlob, 'intro', p => setUploadProgress(Math.round(p * 0.3)));

      setUploadPhase('Uploading Song…');
      const songKey = await uploadRJMedia(songBlob, 'song', p => setUploadProgress(30 + Math.round(p * 0.3)));

      setUploadPhase('Uploading Welcome Message…');
      const welcomeKey = await uploadRJMedia(welcomeBlob, 'welcome', p => setUploadProgress(60 + Math.round(p * 0.3)));

      setUploadPhase('Submitting application…');
      setUploadProgress(95);

      const ua = navigator.userAgent;
      const isMobile = /Mobi|Android/i.test(ua);

      await submitRJApplication({
        introKey, songKey, welcomeKey,
        username:    loggedInUserProfile?.username    || '',
        displayName: loggedInUserProfile?.displayName || '',
        email:       user?.email || '',
        gender:      loggedInUserProfile?.gender || '',
        browser:     getBrowserName(ua),
        platform:    navigator.platform || '',
        device:      isMobile ? 'Mobile' : 'Desktop',
        userAgent:   ua.substring(0, 300),
      });

      setUploadProgress(100);
      setPageState('done');
      try {
        const newApp = await getMyRJApplication();
        if (newApp) setExistingApp(newApp);
      } catch (fetchErr) {
        console.warn('[RJApplicationTab] post-submit fetch failed (non-fatal):', fetchErr);
      }
    } catch (e) {
      console.error('[RJApplicationTab] submit error:', e);
      setSubmitError(e.message || 'Submission failed. Please try again.');
      setPageState('apply');
      setStep(STEPS.length - 1);
    } finally {
      submitInFlightRef.current = false;
    }
  }, [introBlob, songBlob, welcomeBlob, loggedInUserProfile, user]);

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="bv-tab-content">
        <div className="bv-liveness-loading">
          <div className="bv-liveness-spinner" />
          <p>Loading your RJ verification status…</p>
        </div>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (pageState === 'done') {
    return (
      <div className="bv-tab-content">
        <div className="bv-success-card bv-fade-up">
          <div className="bv-success-icon">
            <svg viewBox="0 0 24 24" fill="none" width="38" height="38">
              <path d="M5 12l5 5 9-10" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="bv-success-title">RJ Application Submitted!</div>
          <div className="bv-success-sub">
            Your RJ verification application has been submitted successfully.
            Our team will review it within 48 hours. You will be notified once a decision is made.
          </div>
        </div>
      </div>
    );
  }

  // ── UPLOADING ────────────────────────────────────────────────────────────
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

  // ── EXISTING STATUS ──────────────────────────────────────────────────────
  if (pageState === 'status' && existingApp && !applyMode) {
    return (
      <div className="bv-tab-content">
        <RJStatusCard
          application={existingApp}
          onApplyAgain={['rejected','expired','resubmit_requested'].includes(existingApp.status) ? startFlow : null}
        />
      </div>
    );
  }

  // ── IDLE — no application yet ────────────────────────────────────────────
  if ((pageState === 'idle' || pageState === 'status') && !applyMode) {
    return (
      <div className="bv-tab-content bv-fade-up">
        <div className="bv-hero-card">
          <div className="bv-hero-icon">
            <MicHeroIcon size={30} stroke="#fff" />
          </div>
          <div className="bv-hero-title">Become a Verified RJ</div>
          <div className="bv-hero-sub">
            Share your voice, entertain listeners and become an official RJ of TingleTap Radio.
          </div>
        </div>

        <div className="bv-info-card">
          <div className="bv-info-title">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <circle cx="12" cy="12" r="10" stroke="#6d28d9" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            What You'll Record
          </div>
          <ul className="bv-info-list">
            <li><CheckIcon />Funny Introduction — introduce yourself naturally and let us hear your personality</li>
            <li><CheckIcon />Sing a Song — sing any song you enjoy so we can hear your voice quality</li>
            <li><CheckIcon />Welcome Message — read one of the welcome scripts below in your natural voice</li>
          </ul>
        </div>

        <button className="bv-btn bv-btn--primary" onClick={startFlow}>
          <MicHeroIcon size={18} stroke="#fff" />
          Start RJ Verification
        </button>
      </div>
    );
  }

  // ── APPLICATION FLOW ─────────────────────────────────────────────────────
  if (pageState === 'apply' || applyMode) {
    return (
      <div className="bv-tab-content bv-fade-up">

        {/* Step progress */}
        <div className="bv-steps">
          {STEPS.map((s, i) => (
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
              <h3>RJ Verification</h3>
              <p>Please read carefully before proceeding</p>
            </div>
            <div className="bv-declaration-body">
              <DeclarationContent />
            </div>
            <div className="bv-declaration-footer">
              <label className="bv-declaration-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                />
                <span>I confirm all three recordings will be my own genuine voice and performance.</span>
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

        {/* Funny Introduction */}
        {currentStepName === 'intro' && (
          <Suspense fallback={
            <div className="bv-liveness-loading">
              <div className="bv-liveness-spinner"/>
              <p>Loading microphone…</p>
            </div>
          }>
            <RJAudioRecorder
              title="Funny Introduction"
              script="Introduce yourself naturally and let us hear your personality. Tell us something interesting or fun in your own style."
              minDuration={5}
              maxDuration={60}
              onRecorded={(blob) => { setIntroBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* Song */}
        {currentStepName === 'song' && (
          <Suspense fallback={
            <div className="bv-liveness-loading">
              <div className="bv-liveness-spinner"/>
              <p>Loading microphone…</p>
            </div>
          }>
            <RJAudioRecorder
              title="Sing a Song"
              script="Sing any song you enjoy. We simply want to hear your voice quality, confidence and expression."
              minDuration={10}
              maxDuration={90}
              onRecorded={(blob) => { setSongBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* Welcome Message */}
        {currentStepName === 'welcome' && (
          <Suspense fallback={
            <div className="bv-liveness-loading">
              <div className="bv-liveness-spinner"/>
              <p>Loading microphone…</p>
            </div>
          }>
            <RJAudioRecorder
              title="Welcome Message"
              script={`Read one of the welcome scripts below in your natural voice.\n\nHindi:\n${WELCOME_SCRIPT_HINDI}\n\nEnglish:\n${WELCOME_SCRIPT_ENGLISH}`}
              minDuration={5}
              maxDuration={60}
              onRecorded={(blob) => { setWelcomeBlob(blob); goNext(); }}
              onBack={goBack}
            />
          </Suspense>
        )}

        {/* Confirm & Submit */}
        {currentStepName === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="bv-fade-up">
            <div className="bv-submit-ready-card">
              <div className="bv-submit-ready-title">
                <MicHeroIcon size={16} stroke="#6d28d9" />
                Ready to Submit
              </div>
              <div className="bv-submit-ready-row">
                <CheckIcon size={16} />
                <span>Funny Introduction recorded</span>
              </div>
              <div className="bv-submit-ready-row">
                <CheckIcon size={16} />
                <span>Song recorded</span>
              </div>
              <div className="bv-submit-ready-row">
                <CheckIcon size={16} />
                <span>Welcome Message recorded</span>
              </div>
            </div>

            <div className="bv-info-card">
              <div className="bv-info-title">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <circle cx="12" cy="12" r="10" stroke="#6d28d9" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Review Process
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Your recordings will be reviewed by our team.<br />
                Once approved, you'll receive the official RJ Badge.<br />
                The badge will automatically appear throughout TingleTap.
              </p>
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
              <MicHeroIcon size={18} stroke="#fff" />
              Submit RJ Verification
            </button>
            <button className="bv-btn bv-btn--secondary" onClick={goBack}>
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path d="M15 18l-6-6 6-6" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
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
