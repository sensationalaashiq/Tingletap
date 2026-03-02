
import React, { useState, useRef, useEffect } from 'react';
import useDraggable from '../hooks/useDraggable';
import './PrivateAudioMiniPopup.css';

const PrivateAudioMiniPopup = ({
    isOpen,
    onClose,
    onSend,
    targetUser,
    position = { x: 0, y: 0 }
}) => {
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [audioPreview, setAudioPreview] = useState(null);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioStream, setAudioStream] = useState(null);
    const audioInputRef = useRef(null);
    const popupRef = useRef(null);
    const recordingTimerRef = useRef(null);

    // Enhanced draggable functionality with viewport bounds
    const {
        ref: dragRef,
        position: dragPosition,
        isDragging,
        onMouseDown,
        onTouchStart,
        style: dragStyle
    } = useDraggable({
        initialPosition: position,
        bounds: {
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        },
        handle: '.mini-audio-popup'
    });

    if (!isOpen) return null;

    // Handle click outside to close popup
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Recording timer
    useEffect(() => {
        if (isRecording) {
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    const newTime = prev + 1;
                    // Limit to 10 minutes (600 seconds)
                    if (newTime >= 600) {
                        stopRecording();
                        return 600;
                    }
                    return newTime;
                });
            }, 1000);
        } else {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            // Only reset if we don't have a recorded blob
            if (!recordedBlob && !audioPreview) {
                setRecordingTime(0);
            }
        }

        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, [isRecording, recordedBlob, audioPreview]);

    // Cleanup audio streams on unmount
    useEffect(() => {
        return () => {
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, [audioStream]);

    const formatTime = (seconds) => {
        if (!seconds || !isFinite(seconds) || isNaN(seconds)) {
            return '0:00';
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAudioSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("Audio size must be less than 10MB!");
            return;
        }

        if (!file.type.startsWith('audio/')) {
            alert("Please select a valid audio file!");
            return;
        }

        setSelectedAudio(file);
        const audioUrl = URL.createObjectURL(file);
        setAudioPreview(audioUrl);
        // Clear recording data
        setRecordedBlob(null);
        setRecordingTime(0);
        setIsRecording(false);
    };

    const startRecording = async () => {
        try {
            console.log("🎤 Starting audio recording...");
            
            // Stop any existing recording first
            if (mediaRecorder && isRecording) {
                console.log("🛑 Stopping existing recording");
                mediaRecorder.stop();
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                }
            }

            // Enhanced audio constraints for better quality
            const audioConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    sampleSize: 16,
                    channelCount: 1
                }
            };

            console.log("🎧 Requesting microphone access with constraints:", audioConstraints);
            const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
            console.log("✅ Microphone access granted, stream active:", stream.active);
            
            setAudioStream(stream);
            
            // Enhanced MIME type detection with fallbacks
            let mimeType;
            const preferredTypes = [
                'audio/webm;codecs=opus',
                'audio/webm;codecs=pcm',
                'audio/webm',
                'audio/mp4;codecs=mp4a.40.2',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                'audio/wav'
            ];
            
            for (const type of preferredTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }
            
            console.log("🔊 Selected MIME type:", mimeType);
                
            const recorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });
            
            const chunks = [];

            recorder.ondataavailable = (e) => {
                console.log("📊 Data chunk received, size:", e.data.size);
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                console.log("🛑 Recording stopped, processing", chunks.length, "chunks");
                try {
                    const blob = new Blob(chunks, { type: mimeType });
                    console.log("📦 Audio blob created, size:", blob.size, "type:", blob.type);
                    
                    setRecordedBlob(blob);
                    const audioUrl = URL.createObjectURL(blob);
                    setAudioPreview(audioUrl);
                    console.log("🎵 Audio preview URL created:", audioUrl);
                    
                    // Stop and cleanup stream
                    stream.getTracks().forEach(track => {
                        console.log("🔇 Stopping track:", track.kind, "state:", track.readyState);
                        track.stop();
                    });
                    setAudioStream(null);
                    setIsRecording(false);
                    console.log("✅ Recording completed successfully");
                } catch (error) {
                    console.error("❌ Error processing recording:", error);
                    alert("Error processing audio recording. Please try again.");
                }
            };

            recorder.onerror = (e) => {
                console.error("❌ MediaRecorder error:", e.error);
                alert("Recording error: " + (e.error?.message || "Unknown error occurred. Please try again."));
                
                // Enhanced cleanup on error
                try {
                    stream.getTracks().forEach(track => track.stop());
                } catch (cleanupError) {
                    console.error("Error during cleanup:", cleanupError);
                }
                
                setIsRecording(false);
                setAudioStream(null);
                setMediaRecorder(null);
            };

            recorder.onstart = () => {
                console.log("▶️ Recording started successfully");
            };

            setMediaRecorder(recorder);
            
            // Start recording with smaller timeslices for better responsiveness
            recorder.start(250);
            setIsRecording(true);
            setRecordingTime(0);
            
            // Clear uploaded file data
            setSelectedAudio(null);
            if (audioInputRef.current) {
                audioInputRef.current.value = '';
            }
            
            console.log("🎙️ Recording initiated successfully");
            
        } catch (error) {
            console.error("❌ Error starting recording:", error);
            
            // Enhanced error handling with specific error types
            let errorMessage = "Could not start recording. ";
            
            if (error.name === 'NotAllowedError') {
                errorMessage = "🚫 Microphone access denied. Please allow microphone permissions in your browser and try again.";
            } else if (error.name === 'NotFoundError') {
                errorMessage = "🎤 No microphone found. Please connect a microphone and try again.";
            } else if (error.name === 'NotSupportedError') {
                errorMessage = "🚫 Audio recording not supported in this browser. Please try a different browser.";
            } else if (error.name === 'NotReadableError') {
                errorMessage = "🔒 Microphone is being used by another application. Please close other apps and try again.";
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = "⚠️ Audio constraints not supported. Trying with basic settings...";
                
                // Fallback with basic constraints
                try {
                    const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    console.log("✅ Fallback recording started with basic constraints");
                    setAudioStream(basicStream);
                    // Continue with basic recording setup...
                } catch (fallbackError) {
                    errorMessage = "❌ Could not access microphone with any settings. Please check your device.";
                    alert(errorMessage);
                    return;
                }
            } else {
                errorMessage += "Please check your microphone settings and try again.";
            }
            
            alert(errorMessage);
            
            // Ensure state is properly reset on error
            setIsRecording(false);
            setAudioStream(null);
            setMediaRecorder(null);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }
    };

    const handleSend = () => {
        const audioToSend = selectedAudio || recordedBlob;
        if (audioToSend && onSend) {
            try {
                onSend(audioToSend);
                resetState();
                handleClose();
            } catch (error) {
                console.error("Error sending audio:", error);
                alert("Failed to send audio. Please try again.");
            }
        } else {
            alert("No audio to send. Please record or select an audio file.");
        }
    };

    const resetState = () => {
        setSelectedAudio(null);
        setRecordedBlob(null);
        if (audioPreview) {
            URL.revokeObjectURL(audioPreview);
        }
        setAudioPreview(null);
        setIsRecording(false);
        setRecordingTime(0);
        if (audioInputRef.current) {
            audioInputRef.current.value = '';
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleUploadClick = () => {
        audioInputRef.current?.click();
    };

    const handleDeleteAudio = () => {
        resetState();
    };

    // Premium SVG Icons
    const MicrophoneIcon = () => (
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
            <path d="m195.638 92.371a60.365 60.365 0 1 1 120.73 0v161.086a60.365 60.365 0 1 1 -120.73 0zm60.362 253.456a92.762 92.762 0 0 0 92.37-92.37v-161.086a92.363 92.363 0 0 0 -184.725 0v161.086a92.748 92.748 0 0 0 92.355 92.37zm38.269 127v7.173h-76.542v-7.17a.4.4 0 0 1 .314-.314h75.917a.388.388 0 0 1 .307.314zm112.49-219.37a16 16 0 1 0 -32 0 118.759 118.759 0 1 1 -237.518 0 16 16 0 1 0 -32 0c0 77.732 59.129 141.9 134.761 149.914v37.148h-21.96a32.348 32.348 0 0 0 -32.312 32.311v23.17a16.009 16.009 0 0 0 16 16h108.538a16.009 16.009 0 0 0 16-16v-23.17a32.339 32.339 0 0 0 -32.312-32.311h-21.956v-37.148c75.644-8.016 134.759-72.182 134.759-149.914z" fill="currentColor" fillRule="evenodd" />
        </svg>
    );

    const UploadIcon = () => (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
            <path d="M12 2L8 6h3v10h2V6h3l-4-4z" fill="currentColor" />
            <path d="M19 18H5v2h14v-2z" fill="currentColor" />
        </svg>
    );

    const StopIcon = () => (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
    );

    const SendIcon = () => (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="7" height="7">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
        </svg>
    );

    const PlayIcon = () => (
        <svg viewBox="0 0 24 24" fill="currentColor" width="8" height="8">
            <path d="M8 5v14l11-7z"/>
        </svg>
    );

    const PauseIcon = () => (
        <svg viewBox="0 0 24 24" fill="currentColor" width="8" height="8">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
    );

    const DeleteIcon = () => (
        <svg viewBox="0 0 24 24" fill="currentColor" width="8" height="8">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
    );

    const CloseIcon = () => (
        <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
            <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
    );

    // Mini Audio Player Component
    const MiniAudioPlayer = () => {
        const [isPlaying, setIsPlaying] = useState(false);
        const [duration, setDuration] = useState(0);
        const [currentTime, setCurrentTime] = useState(0);
        const audioRef = useRef(null);

        useEffect(() => {
            if (audioRef.current && audioPreview) {
                console.log("Setting up audio preview:", audioPreview);
                
                const audio = audioRef.current;
                audio.src = audioPreview;
                audio.load();
                
                // Reset playback state
                setIsPlaying(false);
                setCurrentTime(0);
                setDuration(0);

                // Set up event listeners
                const handleCanPlay = () => {
                    console.log("Audio can play, duration:", audio.duration);
                    if (audio.duration && isFinite(audio.duration)) {
                        setDuration(audio.duration);
                    }
                };

                const handleLoadedData = () => {
                    console.log("Audio data loaded");
                    if (audio.duration && isFinite(audio.duration)) {
                        setDuration(audio.duration);
                    }
                };

                audio.addEventListener('canplay', handleCanPlay);
                audio.addEventListener('loadeddata', handleLoadedData);
                audio.addEventListener('loadedmetadata', handleLoadedData);

                return () => {
                    audio.removeEventListener('canplay', handleCanPlay);
                    audio.removeEventListener('loadeddata', handleLoadedData);
                    audio.removeEventListener('loadedmetadata', handleLoadedData);
                };
            }
        }, [audioPreview]);

        const togglePlay = async () => {
            if (!audioRef.current || !audioPreview) {
                console.error("No audio element or preview available");
                return;
            }

            const audio = audioRef.current;
            
            try {
                if (isPlaying) {
                    console.log("Pausing audio");
                    audio.pause();
                    setIsPlaying(false);
                } else {
                    console.log("Starting audio playback");
                    
                    // Reset to beginning if ended
                    if (audio.ended) {
                        audio.currentTime = 0;
                    }
                    
                    // Ensure audio is properly loaded
                    if (audio.readyState < 2) {
                        console.log("Waiting for audio to load...");
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error("Audio load timeout"));
                            }, 5000);
                            
                            const onCanPlay = () => {
                                clearTimeout(timeout);
                                audio.removeEventListener('canplay', onCanPlay);
                                audio.removeEventListener('error', onError);
                                resolve();
                            };
                            
                            const onError = (e) => {
                                clearTimeout(timeout);
                                audio.removeEventListener('canplay', onCanPlay);
                                audio.removeEventListener('error', onError);
                                reject(e);
                            };
                            
                            audio.addEventListener('canplay', onCanPlay, { once: true });
                            audio.addEventListener('error', onError, { once: true });
                        });
                    }
                    
                    // Attempt to play
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        await playPromise;
                    }
                    
                    console.log("Audio started successfully");
                    setIsPlaying(true);
                }
            } catch (error) {
                console.error("Error with audio playback:", error);
                setIsPlaying(false);
                
                if (error.name === 'NotAllowedError') {
                    alert("Audio playback was blocked. Please try again after interacting with the page.");
                } else {
                    alert("Error playing audio. Please try recording again.");
                }
            }
        };

        const handleTimeUpdate = () => {
            if (audioRef.current && !isNaN(audioRef.current.currentTime)) {
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
            if (audioRef.current) {
                const audioDuration = audioRef.current.duration;
                console.log("Metadata loaded, duration:", audioDuration);
                if (audioDuration && isFinite(audioDuration)) {
                    setDuration(audioDuration);
                }
            }
        };

        const handleEnded = () => {
            console.log("Audio playback ended");
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleError = (e) => {
            console.error("Audio playback error:", e);
            setIsPlaying(false);
            alert("Audio playback error. Please try again.");
        };

        const formatTime = (time) => {
            if (!time || !isFinite(time) || isNaN(time)) {
                return '0:00';
            }
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        return (
            <div className="mini-audio-preview">
                <audio 
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onError={handleError}
                    preload="auto"
                    controls={false}
                    crossOrigin="anonymous"
                    style={{ display: 'none' }}
                />
                <div className="mini-preview-controls">
                    <button 
                        className="mini-play-btn" 
                        onClick={togglePlay}
                        disabled={!audioPreview}
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <span className="mini-time-display">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <button 
                        className="mini-delete-btn" 
                        onClick={handleDeleteAudio}
                        title="Delete Audio"
                    >
                        <DeleteIcon />
                    </button>
                </div>
                <button className="mini-send-btn" onClick={handleSend} title="Send Audio">
                    <SendIcon />
                </button>
            </div>
        );
    };

    return (
        <div
            className="mini-audio-popup"
            ref={(el) => {
                popupRef.current = el;
                dragRef.current = el;
            }}
            style={{
                ...dragStyle,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* Close button */}
            <button className="popup-close-btn" onClick={handleClose} title="Close">
                <CloseIcon />
            </button>

            {/* Arrow pointing down to audio button */}
            <div className="popup-arrow"></div>

            <div className="mini-audio-content">
                {/* Recording Timer */}
                {(isRecording || recordedBlob) && (
                    <div className="mini-timer">
                        <div className={`recording-indicator ${isRecording ? 'active' : ''}`}></div>
                        <span className="timer-text">
                            {formatTime(recordingTime)}
                        </span>
                    </div>
                )}

                {/* Audio Preview */}
                {audioPreview && <MiniAudioPlayer />}

                {/* Main Controls */}
                {!audioPreview && (
                    <div className="mini-controls">
                        {/* Record Button */}
                        <button
                            className={`mini-record-btn ${isRecording ? 'recording' : ''}`}
                            onClick={isRecording ? stopRecording : startRecording}
                            title={isRecording ? "Stop Recording" : "Start Recording"}
                        >
                            {isRecording ? <StopIcon /> : <MicrophoneIcon />}
                        </button>

                        {/* Upload Button */}
                        <button 
                            className="mini-upload-btn" 
                            onClick={handleUploadClick}
                            title="Upload Audio File"
                        >
                            <UploadIcon />
                        </button>
                    </div>
                )}

                <input
                    type="file"
                    ref={audioInputRef}
                    onChange={handleAudioSelect}
                    accept="audio/*"
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default PrivateAudioMiniPopup;
