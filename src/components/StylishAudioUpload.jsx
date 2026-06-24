import React from 'react';
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
        const audioToUpload = selectedAudio || recordedBlob;
        if (audioToUpload) onUpload(audioToUpload);
    };

    const resetAudio = () => {
        setSelectedAudio(null);
        setRecordedBlob(null);
        setAudioPreview(null);
        if (audioInputRef?.current) audioInputRef.current.value = '';
    };

    const handleClose = () => { resetAudio(); onClose(); };
    const canSend = !!(audioPreview);

    return (
        <div className="sau-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="sau-card" onClick={e => e.stopPropagation()}>

                {/* Icon ring */}
                <div className="sau-icon-ring">
                    <svg viewBox="0 0 64 64" width="42" height="42" fill="none">
                        <defs>
                            <linearGradient id="sauG" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10b981"/>
                                <stop offset="100%" stopColor="#0891b2"/>
                            </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r="24" fill="url(#sauG)" opacity=".12"/>
                        <circle cx="32" cy="32" r="24" stroke="url(#sauG)" strokeWidth="2.2" fill="none"/>
                        {/* Microphone */}
                        <rect x="24" y="14" width="16" height="24" rx="8" fill="url(#sauG)" opacity=".7"/>
                        <path d="M18 32c0 7.73 6.27 14 14 14s14-6.27 14-14" stroke="url(#sauG)" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="32" y1="46" x2="32" y2="52" stroke="url(#sauG)" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="24" y1="52" x2="40" y2="52" stroke="url(#sauG)" strokeWidth="2.5" strokeLinecap="round"/>
                        {/* Sound waves */}
                        <path d="M14 28c0 9.9 8.1 18 18 18s18-8.1 18-18" stroke="url(#sauG)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity=".4"/>
                    </svg>
                </div>

                <div className="sau-title">Upload Audio</div>

                {/* Tabs */}
                <div className="sau-tabs">
                    <button className={`sau-tab${audioTab === 'upload' ? ' active' : ''}`}
                        onClick={() => { setAudioTab('upload'); setIsRecording(false); setRecordedBlob(null); if (mediaRecorder && isRecording) mediaRecorder.stop(); }}
                        style={{ background: audioTab === 'upload' ? 'rgba(16,185,129,.12)' : '#fafafa', color: audioTab === 'upload' ? '#065f46' : '#9ca3af', border: `1.5px solid ${audioTab === 'upload' ? '#10b981' : 'rgba(16,185,129,.2)'}` }}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <path d="M3 13V16a1 1 0 001 1h12a1 1 0 001-1v-3M10 3v9M7 6l3-3 3 3" stroke={audioTab === 'upload' ? '#065f46' : '#9ca3af'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Upload File
                    </button>
                    <button className={`sau-tab${audioTab === 'record' ? ' active' : ''}`}
                        onClick={() => { setAudioTab('record'); setSelectedAudio(null); setAudioPreview(null); if (audioInputRef?.current) audioInputRef.current.value = ''; }}
                        style={{ background: audioTab === 'record' ? 'rgba(16,185,129,.12)' : '#fafafa', color: audioTab === 'record' ? '#065f46' : '#9ca3af', border: `1.5px solid ${audioTab === 'record' ? '#10b981' : 'rgba(16,185,129,.2)'}` }}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <rect x="7" y="2" width="6" height="11" rx="3" stroke={audioTab === 'record' ? '#065f46' : '#9ca3af'} strokeWidth="1.5" fill="none"/>
                            <path d="M4 10c0 4.42 8 4.42 8 0" stroke={audioTab === 'record' ? '#065f46' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                            <line x1="8" y1="17" x2="8" y2="19" stroke={audioTab === 'record' ? '#065f46' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Record
                    </button>
                </div>

                <input type="file" ref={audioInputRef} onChange={handleAudioSelect} accept="audio/*" style={{ display: 'none' }}/>

                {/* Content */}
                <div className="sau-content">
                    {audioTab === 'upload' ? (
                        !audioPreview ? (
                            <div className="sau-drop-zone" onClick={() => audioInputRef?.current?.click()}>
                                <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
                                    <rect x="4" y="8" width="40" height="32" rx="4" fill="rgba(16,185,129,.1)" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3"/>
                                    {/* Waveform */}
                                    <line x1="12" y1="24" x2="12" y2="24" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    <line x1="17" y1="20" x2="17" y2="28" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    <line x1="22" y1="16" x2="22" y2="32" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    <line x1="27" y1="19" x2="27" y2="29" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    <line x1="32" y1="22" x2="32" y2="26" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    <line x1="37" y1="24" x2="37" y2="24" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    <path d="M24 10v-6M21 7l3-3 3 3" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <p className="sau-drop-text">Click to select audio</p>
                                <span className="sau-drop-hint">MP3, WAV, M4A · Max 10MB</span>
                            </div>
                        ) : (
                            <div className="sau-audio-preview">
                                <div className="sau-wave-icon">
                                    <svg viewBox="0 0 40 24" width="60" height="36" fill="none">
                                        <line x1="2" y1="12" x2="2" y2="12" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="8" y1="6" x2="8" y2="18" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="14" y1="2" x2="14" y2="22" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="20" y1="8" x2="20" y2="16" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="26" y1="4" x2="26" y2="20" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="32" y1="9" x2="32" y2="15" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="38" y1="12" x2="38" y2="12" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <audio controls src={audioPreview} className="sau-audio-player"/>
                                <p className="sau-file-name">{selectedAudio ? selectedAudio.name : 'Audio file'}</p>
                                <button className="sau-reset-btn" onClick={resetAudio}>
                                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                                        <path d="M2 8a6 6 0 116 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                        <path d="M2 11V8h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Remove
                                </button>
                            </div>
                        )
                    ) : (
                        !audioPreview ? (
                            <div className="sau-record-section">
                                <button
                                    className={`sau-record-btn${isRecording ? ' recording' : ''}`}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={!navigator.mediaDevices?.getUserMedia}
                                    style={{
                                        background: isRecording
                                            ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                                            : 'linear-gradient(135deg,#10b981,#0891b2)',
                                        border: 'none',
                                    }}
                                >
                                    {isRecording ? (
                                        <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff">
                                            <rect x="6" y="6" width="12" height="12" rx="2"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                                            <rect x="8" y="3" width="8" height="14" rx="4" fill="#fff"/>
                                            <path d="M5 11c0 6.627 14 6.627 14 0" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                                            <line x1="12" y1="19" x2="12" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                                            <line x1="9" y1="22" x2="15" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    )}
                                </button>
                                <p className="sau-record-hint">
                                    {!navigator.mediaDevices?.getUserMedia
                                        ? 'Recording not supported'
                                        : isRecording ? 'Recording… tap to stop' : 'Tap to record'}
                                </p>
                                {isRecording && (
                                    <div className="sau-recording-pulse">
                                        <span/><span/><span/>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="sau-audio-preview">
                                <audio controls src={audioPreview} className="sau-audio-player"/>
                                <p className="sau-file-name">Recorded Audio</p>
                                <button className="sau-reset-btn" onClick={resetAudio}>Re-record</button>
                            </div>
                        )
                    )}
                </div>

                {/* Actions */}
                <div className="sau-actions">
                    <button className="sau-btn-cancel" onClick={handleClose}
                        style={{ background: '#fff', border: '1.5px solid #e5e7eb', color: '#6b7280' }}>
                        Cancel
                    </button>
                    <button className="sau-btn-send" disabled={!canSend}
                        onClick={handleUpload}
                        style={{
                            opacity: canSend ? 1 : 0.45,
                            cursor: canSend ? 'pointer' : 'not-allowed',
                            background: 'linear-gradient(135deg,#10b981,#0891b2)',
                            color: '#fff',
                            WebkitTextFillColor: '#fff',
                            border: 'none',
                        }}>
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                            <path d="M18 2L9.5 10.5M18 2l-6 16-2.5-5.5L4 10l14-8z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ color: '#fff', fontWeight: 700 }}>Send Audio</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StylishAudioUpload;
