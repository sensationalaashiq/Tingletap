// src/components/badge/BadgeLivenessChecker.jsx
// Google MediaPipe Face Landmarker liveness detection.
// Challenges: blink, turnLeft, turnRight, smile.
// Anti-spoofing: nose-tip motion variance check.
// IMPORTANT: Never determines gender — only verifies a live person.

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLivenessDetection } from '../../hooks/useLivenessDetection';

const ChallengeIcons = {
  blink: (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 9v6M9 10.5l1.5 1.5M15 10.5l-1.5 1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2.5" stroke="#fff" strokeWidth="2"/>
    </svg>
  ),
  turnLeft: (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M11 5l-7 7 7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 12h14a4 4 0 0 1 0 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  turnRight: (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M13 5l7 7-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 12H6a4 4 0 0 0 0 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  smile: (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2"/>
      <path d="M8.5 14.5s1 2 3.5 2 3.5-2 3.5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="9.5"  cy="10" r="1" fill="#fff"/>
      <circle cx="14.5" cy="10" r="1" fill="#fff"/>
    </svg>
  ),
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
    <path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function BadgeLivenessChecker({ onPassed, onFailed, onBack }) {
  const videoRef = useRef(null);
  const {
    status, challenges, currentChallenge, completed,
    instruction, faceDetected, error,
    startDetection, stopDetection, loadMediaPipe, reset,
  } = useLivenessDetection();

  // Start as soon as component mounts
  useEffect(() => {
    let stream = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        await startDetection(videoRef.current);
      } catch (e) {
        console.error('[BadgeLivenessChecker]', e);
        // Surface camera or permission errors to the UI via onFailed
        const msg = e?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : e?.name === 'NotFoundError'
          ? 'No camera found. Please connect a camera and try again.'
          : `Camera error: ${e?.message || 'Unknown error'}`;
        onFailed?.(msg);
      }
    })();

    return () => {
      stopDetection();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'passed') {
      setTimeout(() => onPassed?.({ challenges, completed }), 600);
    } else if (status === 'failed') {
      setTimeout(() => onFailed?.(error), 1500);
    }
  }, [status]);

  const circumference = 2 * Math.PI * 56;

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="bv-liveness-loading">
        <div className="bv-liveness-spinner" />
        <p>Initialising face detection…</p>
        <p style={{ fontSize: 11, opacity: 0.7 }}>Loading model (~5 MB) on first use</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 20 }}>
        <div className="bv-error-card">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="#f43f5e" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p>{error || 'Face detection failed to initialise.'}</p>
        </div>
        <button className="bv-btn bv-btn--secondary" style={{ marginTop: 14 }} onClick={() => { reset(); }}>
          Retry
        </button>
        <button className="bv-btn bv-btn--secondary" style={{ marginTop: 8 }} onClick={onBack}>
          Go back
        </button>
      </div>
    );
  }

  const isPassed = status === 'passed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Camera feed */}
      <div className="bv-liveness" style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <video
          ref={videoRef}
          className="bv-liveness-video"
          playsInline muted autoPlay
          style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
        />

        {/* Face guide oval */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 150, height: 190,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            border: `3px solid ${faceDetected ? 'rgba(16,185,129,0.85)' : 'rgba(255,255,255,0.5)'}`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.38)',
            transition: 'border-color 0.3s',
          }} />
        </div>

        {/* No-face warning */}
        {status === 'running' && !faceDetected && (
          <div className="bv-liveness-no-face">
            Position your face inside the oval
          </div>
        )}

        {/* Challenge pill */}
        {status === 'running' && faceDetected && instruction && (
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
            color: '#fff', padding: '8px 18px', borderRadius: 99,
            fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap',
          }}>
            {ChallengeIcons[challenges[currentChallenge]]}
            {instruction}
          </div>
        )}

        {/* Passed overlay */}
        {isPassed && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(16,185,129,0.72)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg viewBox="0 0 24 24" fill="none" width="56" height="56">
              <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="2"/>
              <path d="M7 12l4 4 6-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Liveness Verified</span>
          </div>
        )}
      </div>

      {/* Progress dots */}
      {challenges.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {challenges.map((ch, i) => {
            const isDone   = i < currentChallenge || isPassed;
            const isActive = i === currentChallenge && !isPassed;
            return (
              <div key={ch} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: `2.5px solid ${isDone ? '#10b981' : isActive ? '#7c3aed' : '#ddd6fe'}`,
                  background: isDone ? '#10b981' : isActive ? '#7c3aed' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                  color: isDone || isActive ? '#fff' : '#a78bfa',
                }}>
                  {isDone
                    ? <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span style={{ fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDone ? '#10b981' : isActive ? '#7c3aed' : '#a78bfa' }}>
                  {ch === 'turnLeft' ? 'Left' : ch === 'turnRight' ? 'Right' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div style={{
        background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: 10, padding: '10px 14px',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="1.8"/>
          <path d="M12 8v4M12 16h.01" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Face detection only verifies a live person completed the challenge. No identity or gender information is captured or stored.
        </p>
      </div>

      <button className="bv-btn bv-btn--secondary" onClick={onBack} style={{ marginTop: 2 }}>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
    </div>
  );
}
