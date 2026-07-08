// src/components/badge/BadgeVideoRecorder.jsx
// 10–15 second selfie video recording with preview, countdown, and camera mirroring.

import React, { useRef, useEffect } from 'react';
import { useVideoRecorder } from '../../hooks/useMediaRecorder';

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function BadgeVideoRecorder({ onRecorded, onBack }) {
  const videoRef = useRef(null);
  const {
    status, blob, elapsed, error,
    isMinDurationMet,
    requestCamera, startRecording, stopRecording, reset,
    stream,
  } = useVideoRecorder({ minDuration: 10, maxDuration: 15 });

  useEffect(() => {
    requestCamera(videoRef.current);
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Once we have the blob, attach it to the video element for preview
  useEffect(() => {
    if (blob && videoRef.current) {
      const url = URL.createObjectURL(blob);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.muted = false;
      videoRef.current.loop  = true;
      videoRef.current.play().catch(() => {});
      return () => URL.revokeObjectURL(url);
    }
  }, [blob]);

  // Sync live stream to video element when in preview mode
  useEffect(() => {
    if (status === 'preview' && videoRef.current && !blob) {
      // Handled by requestCamera
    }
  }, [status, blob]);

  if (status === 'requesting') {
    return (
      <div className="bv-liveness-loading">
        <div className="bv-liveness-spinner" />
        <p>Opening camera…</p>
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
        <button className="bv-btn bv-btn--secondary" onClick={() => { reset(); requestCamera(videoRef.current); }}>
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
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Review your video
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Duration: {elapsed}s &nbsp;·&nbsp; {(blob.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>

        <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000', position: 'relative' }}>
          <video
            ref={videoRef}
            playsInline
            controls
            style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
          />
        </div>

        <div className="bv-btn-row">
          <button className="bv-btn bv-btn--secondary" onClick={() => { reset(); requestCamera(videoRef.current); }}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retake
          </button>
          <button className="bv-btn bv-btn--primary" onClick={() => onRecorded?.(blob)}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Use this video
          </button>
        </div>
        <button className="bv-btn bv-btn--secondary" onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Instruction */}
      <div className="bv-info-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              Record a 10–15 second selfie video
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Look directly at the camera. Speak naturally or move slightly to confirm liveness. Good lighting recommended.
            </p>
          </div>
        </div>
      </div>

      {/* Camera view */}
      <div className="bv-recorder" style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          playsInline muted autoPlay
          style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
        />

        {/* Recording indicator */}
        {status === 'recording' && (
          <>
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e', animation: 'bv-blink 1s ease-in-out infinite' }} />
              <div style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                {formatTime(elapsed)}
              </div>
            </div>
            {/* Min duration progress bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)' }}>
              <div style={{
                height: '100%',
                background: isMinDurationMet ? '#10b981' : '#a78bfa',
                width: `${(elapsed / 15) * 100}%`,
                transition: 'width 1s linear, background 0.3s',
              }} />
            </div>
          </>
        )}

        {/* Bottom hint */}
        {(status === 'preview' || status === 'recording') && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
            padding: '20px 14px 12px',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
              color: '#fff', padding: '7px 12px', borderRadius: 10,
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
                <path d="M12 8v4M12 16h.01" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {status === 'recording'
                ? isMinDurationMet ? 'You may stop recording now' : `Keep recording — ${10 - elapsed}s min remaining`
                : 'Ensure your face is clearly visible'}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {status === 'preview' && (
        <button className="bv-btn bv-btn--primary" onClick={startRecording}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
            <circle cx="12" cy="12" r="4" fill="#fff"/>
          </svg>
          Start Recording
        </button>
      )}
      {status === 'recording' && (
        <button
          className="bv-btn bv-btn--danger"
          onClick={stopRecording}
          disabled={!isMinDurationMet}
          title={isMinDurationMet ? 'Stop recording' : 'Minimum 10 seconds required'}
        >
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/>
          </svg>
          Stop Recording {!isMinDurationMet ? `(${10 - elapsed}s)` : ''}
        </button>
      )}
      {status === 'preview' && (
        <button className="bv-btn bv-btn--secondary" onClick={onBack}>Back</button>
      )}
    </div>
  );
}
