// src/components/badge/BadgeAudioRecorder.jsx
// 5–15 second spoken declaration recording with animated waveform.

import React, { useState, useEffect } from 'react';
import { useAudioRecorder } from '../../hooks/useMediaRecorder';

const DECLARATION_SCRIPT =
  '"I confirm that the information submitted for badge verification is truthful, ' +
  'and I am the person shown in the video recording."';

const BAR_COUNT = 24;

function WaveformDisplay({ analyserData, isRecording }) {
  return (
    <div className="bv-audio-waveform">
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        let h = 4;
        if (analyserData && isRecording) {
          const sample = analyserData[Math.floor((i / BAR_COUNT) * analyserData.length)] ?? 0;
          h = Math.max(4, Math.min(44, 4 + Math.abs(sample) * 320));
        }
        return (
          <div
            key={i}
            className="bv-audio-bar"
            style={{
              height: h,
              opacity: isRecording ? 0.8 + Math.random() * 0.2 : 0.35,
              background: isRecording ? 'linear-gradient(180deg, #7c3aed, #a855f7)' : '#ddd6fe',
            }}
          />
        );
      })}
    </div>
  );
}

export default function BadgeAudioRecorder({ onRecorded, onBack }) {
  const {
    status, blob, elapsed, error, analyserData,
    isMinDurationMet,
    requestMic, startRecording, stopRecording, reset,
  } = useAudioRecorder({ minDuration: 5, maxDuration: 15 });

  // Stable blob URL — created once when blob is set, revoked on change/unmount.
  // Creating URL.createObjectURL inside the render body causes a new URL on
  // every re-render which resets the <audio> element mid-playback.
  const [audioPlayUrl, setAudioPlayUrl] = useState('');
  useEffect(() => {
    if (!blob) { setAudioPlayUrl(''); return; }
    const url = URL.createObjectURL(blob);
    setAudioPlayUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    requestMic();
  }, []);

  if (status === 'requesting') {
    return (
      <div className="bv-liveness-loading">
        <div className="bv-liveness-spinner" />
        <p>Opening microphone…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="bv-error-card">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="#f43f5e" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p>{error}</p>
        </div>
        <button className="bv-btn bv-btn--secondary" onClick={() => { reset(); requestMic(); }}>
          Retry
        </button>
        <button className="bv-btn bv-btn--secondary" onClick={onBack}>Back</button>
      </div>
    );
  }

  if (status === 'stopped' && blob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Review your recording
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
            Duration: {elapsed}s &nbsp;·&nbsp; {(blob.size / 1024).toFixed(0)} KB
          </p>
        </div>

        {/* Audio player — uses stable audioPlayUrl from useEffect, not inline createObjectURL */}
        <div className="bv-audio-recorder" style={{ padding: '18px 16px' }}>
          <div className="bv-audio-mic-icon" style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {audioPlayUrl
            ? <audio controls src={audioPlayUrl} style={{ width: '100%', marginTop: 12, borderRadius: 8 }} />
            : <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center' }}>Preparing audio…</p>
          }
        </div>

        <div className="bv-btn-row">
          <button className="bv-btn bv-btn--secondary" onClick={() => { reset(); requestMic(); }}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Re-record
          </button>
          <button className="bv-btn bv-btn--primary" onClick={() => onRecorded?.(blob)}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Use this audio
          </button>
        </div>
        <button className="bv-btn bv-btn--secondary" onClick={onBack}>Back</button>
      </div>
    );
  }

  const isRecording = status === 'recording';
  const progressPct = (elapsed / 15) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="bv-audio-recorder">
        {/* Mic icon */}
        <div className={`bv-audio-mic-icon${isRecording ? ' bv-audio-mic-icon--recording' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="#fff" strokeWidth="2"/>
            <path d="M5 11a7 7 0 0 0 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 19v3M9 22h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Timer */}
        <div className="bv-audio-timer">{String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')}</div>
        <div className="bv-audio-duration-range">5 – 15 seconds</div>

        {/* Waveform */}
        <WaveformDisplay analyserData={analyserData} isRecording={isRecording} />

        {/* Script */}
        <div className="bv-audio-script">
          <strong>Say aloud:</strong>
          <p>{DECLARATION_SCRIPT}</p>
        </div>

        {/* Progress bar */}
        {isRecording && (
          <div className="bv-audio-progress" style={{ width: '100%' }}>
            <div className="bv-audio-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* Controls */}
        {(status === 'ready') && (
          <button className="bv-btn bv-btn--primary" onClick={startRecording} style={{ marginTop: 4 }}>
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="#fff"/>
            </svg>
            Start Recording
          </button>
        )}
        {isRecording && (
          <button
            className="bv-btn bv-btn--danger"
            onClick={stopRecording}
            disabled={!isMinDurationMet}
            style={{ marginTop: 4 }}
          >
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/>
            </svg>
            Stop {!isMinDurationMet ? `(${5 - elapsed}s)` : ''}
          </button>
        )}
      </div>

      {status !== 'recording' && (
        <button className="bv-btn bv-btn--secondary" onClick={onBack}>Back</button>
      )}
    </div>
  );
}
