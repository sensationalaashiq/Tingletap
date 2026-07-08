// src/hooks/useLivenessDetection.js
// Lazy-loads MediaPipe FaceLandmarker from CDN.
// Runs liveness challenges: blink, turnLeft, turnRight, smile.
// Uses blendshapes — never classifies gender or identity.

import { useState, useEffect, useRef, useCallback } from 'react';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const WASM_PATH     = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL     = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Blendshape indices (from MediaPipe docs)
const BS = {
  eyeBlinkLeft:    9,
  eyeBlinkRight:   10,
  mouthSmileLeft:  44,
  mouthSmileRight: 45,
};

const CHALLENGES = ['blink', 'turnLeft', 'turnRight', 'smile'];

// Thresholds
const BLINK_THRESH  = 0.45;
const SMILE_THRESH  = 0.40;
const YAW_THRESH    = 0.08; // face landmark yaw proxy
const MOVEMENT_SAMPLES = 8; // number of frames to detect motion (anti-photo)
const SPOOF_VAR_MIN    = 0.0002; // min nose-tip variance to prove motion

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useLivenessDetection() {
  const [status, setStatus]           = useState('idle'); // idle|loading|ready|running|passed|failed|error
  const [currentChallenge, setChallengeIdx] = useState(0);
  const [challenges, setChallenges]   = useState([]);
  const [completed, setCompleted]     = useState([]);
  const [instruction, setInstruction] = useState('');
  const [error, setError]             = useState('');
  const [faceDetected, setFaceDetected] = useState(false);

  const landmarkerRef    = useRef(null);
  const videoRef         = useRef(null);
  const rafRef           = useRef(null);
  const lastStampRef     = useRef(-1);
  const movementBuf      = useRef([]); // nose-tip x/y samples for anti-spoof
  const challengeDoneRef = useRef(false); // debounce per challenge
  const mountedRef       = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close().catch(() => {});
    };
  }, []);

  // Load MediaPipe lazily
  const loadMediaPipe = useCallback(async () => {
    if (landmarkerRef.current) return;
    setStatus('loading');
    try {
      const { FaceLandmarker, FilesetResolver } = await import(/* @vite-ignore */ MEDIAPIPE_CDN);
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const lm = await FaceLandmarker.createFromOptions(vision, {
        baseOptions:       { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode:       'VIDEO',
        numFaces:          1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      landmarkerRef.current = lm;
      if (mountedRef.current) setStatus('ready');
    } catch (e) {
      console.error('[useLivenessDetection] Load error:', e);
      if (mountedRef.current) { setError('Failed to load face detection. Check your internet connection.'); setStatus('error'); }
    }
  }, []);

  const startDetection = useCallback(async (videoElement) => {
    videoRef.current = videoElement;
    await loadMediaPipe();
    if (!landmarkerRef.current || !mountedRef.current) return;

    // Randomize 3 challenges
    const selected = shuffleArray(CHALLENGES).slice(0, 3);
    setChallenges(selected);
    setCompleted([]);
    setChallengeIdx(0);
    challengeDoneRef.current = false;
    movementBuf.current = [];
    setInstruction(getChallengeInstruction(selected[0]));
    setStatus('running');
    setFaceDetected(false);

    const detect = () => {
      if (!mountedRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const now = performance.now();
      if (now === lastStampRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      lastStampRef.current = now;

      try {
        const result = landmarkerRef.current.detectForVideo(videoRef.current, now);
        processFrame(result, selected);
      } catch (e) {
        console.warn('[livenessDetect] frame error', e.message);
      }
      rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);
  }, [loadMediaPipe]);

  const stopDetection = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStatus(s => s === 'running' ? 'idle' : s);
  }, []);

  // Process a single frame
  const processFrame = useCallback((result, challengeList) => {
    const lms       = result?.faceLandmarks?.[0];
    const blendshapes = result?.faceBlendshapes?.[0]?.categories;
    const matrices  = result?.facialTransformationMatrixes?.[0]?.data;

    if (!lms || !blendshapes) {
      setFaceDetected(false);
      return;
    }
    setFaceDetected(true);

    // Track nose-tip for anti-spoof motion check
    const nose = lms[1]; // landmark 1 is nose tip
    if (nose) {
      movementBuf.current.push({ x: nose.x, y: nose.y });
      if (movementBuf.current.length > MOVEMENT_SAMPLES * 3) movementBuf.current.shift();
    }

    // Get current challenge
    const ci = currentChallengeRef.current;
    if (ci >= challengeList.length) return;
    if (challengeDoneRef.current) return;

    const challenge = challengeList[ci];
    let passed = false;

    switch (challenge) {
      case 'blink': {
        const blinkL = blendshapes[BS.eyeBlinkLeft]?.score  ?? 0;
        const blinkR = blendshapes[BS.eyeBlinkRight]?.score ?? 0;
        passed = blinkL > BLINK_THRESH && blinkR > BLINK_THRESH;
        break;
      }
      case 'turnLeft': {
        // Head turned left: nose landmark moves to the right in normalized coords
        // Use face transformation matrix yaw if available
        if (matrices && matrices.length >= 16) {
          // Extract yaw from rotation matrix
          const yaw = Math.atan2(matrices[8], matrices[10]);
          passed = yaw > 0.35; // ~20 degrees
        } else if (lms[234] && lms[454]) {
          // Fallback: compare distances from nose to left/right cheek landmarks
          const noseTip  = lms[1];
          const leftCheek  = lms[234];
          const rightCheek = lms[454];
          const dLeft  = Math.abs(noseTip.x - leftCheek.x);
          const dRight = Math.abs(noseTip.x - rightCheek.x);
          passed = dLeft > dRight * 1.5;
        }
        break;
      }
      case 'turnRight': {
        if (matrices && matrices.length >= 16) {
          const yaw = Math.atan2(matrices[8], matrices[10]);
          passed = yaw < -0.35;
        } else if (lms[234] && lms[454]) {
          const noseTip    = lms[1];
          const leftCheek  = lms[234];
          const rightCheek = lms[454];
          const dLeft  = Math.abs(noseTip.x - leftCheek.x);
          const dRight = Math.abs(noseTip.x - rightCheek.x);
          passed = dRight > dLeft * 1.5;
        }
        break;
      }
      case 'smile': {
        const smileL = blendshapes[BS.mouthSmileLeft]?.score  ?? 0;
        const smileR = blendshapes[BS.mouthSmileRight]?.score ?? 0;
        passed = smileL > SMILE_THRESH && smileR > SMILE_THRESH;
        break;
      }
    }

    if (passed) {
      challengeDoneRef.current = true;
      const newCompleted = [...completedRef.current, challenge];
      completedRef.current = newCompleted;
      setCompleted(newCompleted);

      const nextCi = ci + 1;
      currentChallengeRef.current = nextCi;
      setChallengeIdx(nextCi);
      challengeDoneRef.current = false;

      if (nextCi >= challengeList.length) {
        // All challenges done — check for motion (anti-spoof)
        const motionDetected = checkMotion();
        if (motionDetected) {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          setStatus('passed');
        } else {
          setStatus('failed');
          setError('Static image detected. Please use a live camera.');
        }
      } else {
        setInstruction(getChallengeInstruction(challengeList[nextCi]));
      }
    }
  }, []);

  // Refs to avoid stale closure in requestAnimationFrame
  const currentChallengeRef = useRef(0);
  const completedRef        = useRef([]);

  // Sync refs with state
  useEffect(() => { currentChallengeRef.current = currentChallenge; }, [currentChallenge]);
  useEffect(() => { completedRef.current = completed; }, [completed]);

  function checkMotion() {
    const buf = movementBuf.current;
    if (buf.length < MOVEMENT_SAMPLES) return true; // not enough data to reject
    const xs = buf.map(p => p.x);
    const ys = buf.map(p => p.y);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const varX  = xs.reduce((a, b) => a + (b - meanX) ** 2, 0) / xs.length;
    const varY  = ys.reduce((a, b) => a + (b - meanY) ** 2, 0) / ys.length;
    return (varX + varY) > SPOOF_VAR_MIN;
  }

  function getChallengeInstruction(challenge) {
    switch (challenge) {
      case 'blink':     return 'Blink both eyes';
      case 'turnLeft':  return 'Turn your head to the left';
      case 'turnRight': return 'Turn your head to the right';
      case 'smile':     return 'Smile naturally';
      default:          return 'Follow the instruction';
    }
  }

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentChallengeRef.current = 0;
    completedRef.current = [];
    challengeDoneRef.current = false;
    movementBuf.current = [];
    setChallengeIdx(0);
    setChallenges([]);
    setCompleted([]);
    setInstruction('');
    setError('');
    setFaceDetected(false);
    setStatus('idle');
  }, []);

  return {
    status,
    challenges,
    currentChallenge,
    completed,
    instruction,
    faceDetected,
    error,
    startDetection,
    stopDetection,
    loadMediaPipe,
    reset,
  };
}
