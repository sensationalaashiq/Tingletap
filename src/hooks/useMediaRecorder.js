// src/hooks/useMediaRecorder.js
// Reusable hook for recording video and audio via MediaRecorder API.
// Handles compression (low-bitrate), preview, countdown, and blob output.

import { useState, useRef, useCallback, useEffect } from 'react';

const VIDEO_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];
const AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function getSupportedMime(types) {
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

export function useVideoRecorder({ minDuration = 10, maxDuration = 15 }) {
  const [status, setStatus]     = useState('idle'); // idle|requesting|preview|recording|stopped|error
  const [blob, setBlob]         = useState(null);
  const [elapsed, setElapsed]   = useState(0);
  const [error, setError]       = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const streamRef    = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const requestCamera = useCallback(async (videoPreviewEl) => {
    setStatus('requesting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoPreviewEl) {
        videoPreviewEl.srcObject = stream;
        await videoPreviewEl.play().catch(() => {});
      }
      if (mountedRef.current) setStatus('preview');
    } catch (e) {
      if (mountedRef.current) {
        setError(e.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow access and try again.'
          : 'Camera unavailable. Please check your device settings.');
        setStatus('error');
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getSupportedMime(VIDEO_MIME_TYPES);
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 600_000, // ~600kbps for compression
      audioBitsPerSecond: 64_000,
    });
    recorderRef.current = recorder;
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const finalBlob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      if (mountedRef.current) { setBlob(finalBlob); setStatus('stopped'); }
    };
    recorder.start(500); // collect chunks every 500ms
    setElapsed(0);
    setStatus('recording');

    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setElapsed(e => {
        const next = e + 1;
        if (next >= maxDuration) stopRecording();
        return next;
      });
    }, 1000);
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setBlob(null);
    setElapsed(0);
    setError('');
    setPreviewUrl('');
    chunksRef.current = [];
  }, [cleanup]);

  const isMinDurationMet = elapsed >= minDuration;

  return {
    status, blob, elapsed, error, previewUrl,
    stream: streamRef.current,
    isMinDurationMet,
    requestCamera, startRecording, stopRecording, reset,
  };
}

export function useAudioRecorder({ minDuration = 5, maxDuration = 15 }) {
  const [status, setStatus]     = useState('idle');
  const [blob, setBlob]         = useState(null);
  const [elapsed, setElapsed]   = useState(0);
  const [error, setError]       = useState('');
  const [analyserData, setAnalyserData] = useState(null); // Float32Array for waveform

  const streamRef    = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);
  const rafRef       = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const requestMic = useCallback(async () => {
    setStatus('requesting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Set up analyser for waveform visualization
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      if (mountedRef.current) setStatus('ready');
    } catch (e) {
      if (mountedRef.current) {
        setError(e.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow access and try again.'
          : 'Microphone unavailable. Please check your device settings.');
        setStatus('error');
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getSupportedMime(AUDIO_MIME_TYPES);
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: mimeType || undefined,
      audioBitsPerSecond: 48_000,
    });
    recorderRef.current = recorder;
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const finalBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      if (mountedRef.current) { setBlob(finalBlob); setStatus('stopped'); }
    };
    recorder.start(500);
    setElapsed(0);
    setStatus('recording');

    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setElapsed(e => {
        const next = e + 1;
        if (next >= maxDuration) stopRecording();
        return next;
      });
    }, 1000);

    // Waveform animation
    const tick = () => {
      if (!analyserRef.current || !mountedRef.current) return;
      const data = new Float32Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getFloatTimeDomainData(data);
      setAnalyserData(new Float32Array(data));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setBlob(null);
    setElapsed(0);
    setError('');
    setAnalyserData(null);
    chunksRef.current = [];
  }, [cleanup]);

  const isMinDurationMet = elapsed >= minDuration;

  return {
    status, blob, elapsed, error, analyserData,
    isMinDurationMet,
    requestMic, startRecording, stopRecording, reset,
  };
}
