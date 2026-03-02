
import React, { useState, useRef } from 'react';
import './StylishAudioUpload.css';

const StylishAudioUpload = ({ 
    isOpen, 
    onClose, 
    onUpload, 
    selectedAudio,
    setSelectedAudio,
    audioPreview,
    setAudioPreview,
    recordedBlob,
    setRecordedBlob,
    isRecording,
    setIsRecording,
    mediaRecorder,
    setMediaRecorder,
    audioTab,
    setAudioTab,
    audioInputRef,
    handleAudioSelect,
    startRecording,
    stopRecording
}) => {
    if (!isOpen) return null;

    const handleUpload = () => {
        if (selectedAudio || recordedBlob) {
            // Pass the audio data to the parent component
            const audioToUpload = selectedAudio || recordedBlob;
            onUpload(audioToUpload);
        }
    };

    const resetAudio = () => {
        setSelectedAudio(null);
        setRecordedBlob(null);
        setAudioPreview(null);
        if (audioInputRef.current) {
            audioInputRef.current.value = '';
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            e.stopPropagation();
            resetAudio();
            onClose();
        }
    };

    return (
        <div className="stylish-audio-overlay" onClick={handleOverlayClick}>
            <div className="stylish-audio-upload" onClick={(e) => e.stopPropagation()}>
                <div className="audio-upload-header">
                    <div className="header-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                        </svg>
                    </div>
                    <h3 className="header-title">Upload Audio</h3>
                    <button className="close-btn" onClick={() => { resetAudio(); onClose(); }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="audio-tabs">
                    <button 
                        className={`tab-btn ${audioTab === 'upload' ? 'active' : ''}`}
                        onClick={() => {
                            setAudioTab('upload');
                            setIsRecording(false);
                            setRecordedBlob(null);
                            if (mediaRecorder && isRecording) {
                                mediaRecorder.stop();
                            }
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        Upload File
                    </button>
                    <button 
                        className={`tab-btn ${audioTab === 'record' ? 'active' : ''}`}
                        onClick={() => {
                            setAudioTab('record');
                            setSelectedAudio(null);
                            setAudioPreview(null);
                            if (audioInputRef.current) {
                                audioInputRef.current.value = '';
                            }
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <circle cx="12" cy="12" r="8" fill="currentColor"/>
                        </svg>
                        Record
                    </button>
                </div>

                <div className="audio-content">
                    <input
                        type="file"
                        ref={audioInputRef}
                        onChange={handleAudioSelect}
                        accept="audio/*"
                        style={{ display: 'none' }}
                    />

                    {audioTab === 'upload' ? (
                        <div className="upload-section">
                            {!audioPreview ? (
                                <div 
                                    className="drop-zone"
                                    onClick={() => audioInputRef.current?.click()}
                                >
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                                    </svg>
                                    <p>Click to select audio</p>
                                    <span>MP3, WAV, M4A (max 10MB)</span>
                                </div>
                            ) : (
                                <div className="audio-preview">
                                    <audio controls src={audioPreview} />
                                    <p>{selectedAudio ? selectedAudio.name : 'Audio file'}</p>
                                    <button className="reset-btn" onClick={resetAudio}>Remove</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="record-section">
                            {!audioPreview ? (
                                <div className="record-controls">
                                    <button 
                                        className={`record-btn ${isRecording ? 'recording' : ''}`}
                                        onClick={isRecording ? stopRecording : startRecording}
                                        disabled={!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia}
                                    >
                                        {isRecording ? (
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                                <rect x="6" y="6" width="12" height="12" rx="2"/>
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                                <circle cx="12" cy="12" r="8"/>
                                            </svg>
                                        )}
                                    </button>
                                    <p>
                                        {!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia 
                                            ? 'Recording not supported' 
                                            : isRecording 
                                                ? 'Recording... Click to stop' 
                                                : 'Click to record'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="audio-preview">
                                    <audio controls src={audioPreview} />
                                    <p>Recorded Audio</p>
                                    <button className="reset-btn" onClick={resetAudio}>Re-record</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {audioPreview && (
                    <div className="upload-actions">
                        <button className="upload-btn" onClick={handleUpload}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                            </svg>
                            Send
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StylishAudioUpload;
