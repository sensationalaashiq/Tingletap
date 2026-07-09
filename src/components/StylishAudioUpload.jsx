import React from 'react';
import './StylishAudioUpload.css';

/* ── Reusable locked-feature card shown inside a locked tab ─────────────── */
const LockedTabCard = ({ message }) => (
    <div style={{
        padding: '24px 16px', textAlign: 'center',
        background: 'linear-gradient(135deg,rgba(239,68,68,.06),rgba(220,38,38,.04))',
        border: '1px solid rgba(239,68,68,.2)', borderRadius: '12px',
        color: '#dc2626', margin: '4px 0',
    }}>
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" style={{ marginBottom: 8, opacity: .75 }}>
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Premium Feature</div>
        <div style={{ fontSize: 11, opacity: .85, lineHeight: 1.45 }}>{message}</div>
    </div>
);

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
    stopRecording,
    // Badge tier: 'guest' | 'member' | 'tier1' | 'tier2' | 'tier3' | 'staff'
    badgeTier = 'member',
}) => {
    if (!isOpen) return null;

    /* ── Access rules ─────────────────────────────────────────────────── */
    // Record tab: everyone
    // Upload File tab: member+ (guest sees it locked)
    // Audio by URL tab: tier3 / staff only
    const canUploadFile = badgeTier !== 'guest';
    const canUseUrl     = badgeTier === 'tier3' || badgeTier === 'staff';

    const handleUpload = () => {
        const audioToUpload = selectedAudio || recordedBlob;
        if (audioToUpload) { handleClose(); onUpload(audioToUpload); }
    };

    const handleUrlSend = (url) => {
        if (url?.trim()) { handleClose(); onUpload({ url: url.trim(), isUrl: true }); }
    };

    const resetAudio = () => {
        setSelectedAudio(null);
        setRecordedBlob(null);
        setAudioPreview(null);
        if (audioInputRef?.current) audioInputRef.current.value = '';
    };

    const handleClose = () => { resetAudio(); onClose(); };
    const canSend = !!(audioPreview);

    /* ── Tab active colour helper ─────────────────────────────────────── */
    const tabStyle = (id) => ({
        background: audioTab === id ? 'rgba(16,185,129,.12)' : '#fafafa',
        color:      audioTab === id ? '#065f46'              : '#9ca3af',
        border:     `1.5px solid ${audioTab === id ? '#10b981' : 'rgba(16,185,129,.2)'}`,
    });
    const lockedTabStyle = {
        background: '#fafafa', color: '#c4b5fd',
        border: '1.5px solid rgba(139,92,246,.25)', opacity: .7, position: 'relative',
    };

    return (
        <div className="sau-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="sau-card" onClick={e => e.stopPropagation()}>

                {/* Icon ring */}
                <div className="sau-icon-ring">
                    <svg viewBox="0 0 64 64" width="42" height="42" fill="none">
                        <defs>
                            <linearGradient id="sauG" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#0891b2"/>
                            </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r="24" fill="url(#sauG)" opacity=".12"/>
                        <circle cx="32" cy="32" r="24" stroke="url(#sauG)" strokeWidth="2.2" fill="none"/>
                        <rect x="24" y="14" width="16" height="24" rx="8" fill="url(#sauG)" opacity=".7"/>
                        <path d="M18 32c0 7.73 6.27 14 14 14s14-6.27 14-14" stroke="url(#sauG)" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="32" y1="46" x2="32" y2="52" stroke="url(#sauG)" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="24" y1="52" x2="40" y2="52" stroke="url(#sauG)" strokeWidth="2.5" strokeLinecap="round"/>
                        <path d="M14 28c0 9.9 8.1 18 18 18s18-8.1 18-18" stroke="url(#sauG)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity=".4"/>
                    </svg>
                </div>

                <div className="sau-title">Upload Audio</div>

                {/* ── Tabs ───────────────────────────────────────────── */}
                <div className="sau-tabs">
                    {/* Record — always visible */}
                    <button className={`sau-tab${audioTab === 'record' ? ' active' : ''}`}
                        onClick={() => { setAudioTab('record'); setSelectedAudio(null); setAudioPreview(null); if (audioInputRef?.current) audioInputRef.current.value = ''; }}
                        style={tabStyle('record')}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <rect x="7" y="2" width="6" height="11" rx="3" stroke={audioTab === 'record' ? '#065f46' : '#9ca3af'} strokeWidth="1.5" fill="none"/>
                            <path d="M4 10c0 4.42 8 4.42 8 0" stroke={audioTab === 'record' ? '#065f46' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                            <line x1="8" y1="17" x2="8" y2="19" stroke={audioTab === 'record' ? '#065f46' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Record
                    </button>

                    {/* Upload File — locked for guest */}
                    <button className={`sau-tab${audioTab === 'upload' ? ' active' : ''}`}
                        onClick={() => {
                            if (!canUploadFile) { setAudioTab('upload'); return; }
                            setAudioTab('upload'); setIsRecording(false); setRecordedBlob(null);
                            if (mediaRecorder && isRecording) mediaRecorder.stop();
                        }}
                        style={canUploadFile ? tabStyle('upload') : lockedTabStyle}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <path d="M3 13V16a1 1 0 001 1h12a1 1 0 001-1v-3M10 3v9M7 6l3-3 3 3"
                                stroke={canUploadFile ? (audioTab === 'upload' ? '#065f46' : '#9ca3af') : '#c4b5fd'}
                                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Upload File
                        {!canUploadFile && (
                            <span style={{ position:'absolute', top:-4, right:-4, width:13, height:13, background:'#ef4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid #fff' }}>
                                <svg viewBox="0 0 24 24" width="7" height="7" fill="white"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                            </span>
                        )}
                    </button>

                    {/* Audio by URL — locked for < tier3 */}
                    <button className={`sau-tab${audioTab === 'url' ? ' active' : ''}`}
                        onClick={() => { setAudioTab('url'); }}
                        style={canUseUrl ? tabStyle('url') : lockedTabStyle}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <path d="M7.5 10a2.5 2.5 0 003.536 3.536l2.5-2.5a2.5 2.5 0 00-3.536-3.536l-1.25 1.25"
                                stroke={canUseUrl ? (audioTab === 'url' ? '#065f46' : '#9ca3af') : '#c4b5fd'}
                                strokeWidth="1.7" strokeLinecap="round"/>
                            <path d="M12.5 10a2.5 2.5 0 00-3.536-3.536l-2.5 2.5a2.5 2.5 0 003.536 3.536l1.25-1.25"
                                stroke={canUseUrl ? (audioTab === 'url' ? '#065f46' : '#9ca3af') : '#c4b5fd'}
                                strokeWidth="1.7" strokeLinecap="round"/>
                        </svg>
                        Audio URL
                        {!canUseUrl && (
                            <span style={{ position:'absolute', top:-4, right:-4, width:13, height:13, background:'#ef4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid #fff' }}>
                                <svg viewBox="0 0 24 24" width="7" height="7" fill="white"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                            </span>
                        )}
                    </button>
                </div>

                <input type="file" ref={audioInputRef} onChange={handleAudioSelect} accept="audio/*" style={{ display: 'none' }}/>

                {/* ── Content area ───────────────────────────────────── */}
                <div className="sau-content">
                    {/* RECORD tab */}
                    {audioTab === 'record' && (
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
                                        <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
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
                                {isRecording && <div className="sau-recording-pulse"><span/><span/><span/></div>}
                            </div>
                        ) : (
                            <div className="sau-audio-preview">
                                <audio controls src={audioPreview} className="sau-audio-player"/>
                                <p className="sau-file-name">Recorded Audio</p>
                                <button className="sau-reset-btn" onClick={resetAudio}>Re-record</button>
                            </div>
                        )
                    )}

                    {/* UPLOAD FILE tab */}
                    {audioTab === 'upload' && (
                        !canUploadFile ? (
                            <LockedTabCard message="Register to upload audio files. Guests can only record audio." />
                        ) : !audioPreview ? (
                            <div className="sau-drop-zone" onClick={() => audioInputRef?.current?.click()}>
                                <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
                                    <rect x="4" y="8" width="40" height="32" rx="4" fill="rgba(16,185,129,.1)" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3"/>
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
                    )}

                    {/* AUDIO URL tab */}
                    {audioTab === 'url' && (
                        !canUseUrl ? (
                            <LockedTabCard message="Upgrade to Diamond King, Sapphire Goddess or RJ badge to share audio by URL." />
                        ) : (
                            <AudioUrlTab onSend={handleUrlSend} />
                        )
                    )}
                </div>

                {/* ── Actions ────────────────────────────────────────── */}
                <div className="sau-actions">
                    <button className="sau-btn-cancel" onClick={handleClose}
                        style={{ background: '#fff', border: '1.5px solid #e5e7eb', color: '#6b7280' }}>
                        Cancel
                    </button>
                    {audioTab !== 'url' && (
                        <button className="sau-btn-send"
                            disabled={!canSend || (audioTab === 'upload' && !canUploadFile)}
                            onClick={handleUpload}
                            style={{
                                opacity: (canSend && !(audioTab === 'upload' && !canUploadFile)) ? 1 : 0.45,
                                cursor:  (canSend && !(audioTab === 'upload' && !canUploadFile)) ? 'pointer' : 'not-allowed',
                                background: 'linear-gradient(135deg,#10b981,#0891b2)',
                                color: '#fff', WebkitTextFillColor: '#fff', border: 'none',
                            }}>
                            <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                                <path d="M18 2L9.5 10.5M18 2l-6 16-2.5-5.5L4 10l14-8z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span style={{ color: '#fff', fontWeight: 700 }}>Send Audio</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Audio URL input sub-component ────────────────────────────────────────── */
const AudioUrlTab = ({ onSend }) => {
    const [url, setUrl] = React.useState('');
    return (
        <div style={{ padding: '4px 0' }}>
            <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid rgba(16,185,129,.35)',
                    fontSize: 13, outline: 'none', marginBottom: 8,
                    fontFamily: 'inherit',
                }}
            />
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.45 }}>
                Paste a direct link to an MP3, WAV, or M4A file
            </p>
            <button
                disabled={!url.trim()}
                onClick={() => onSend(url)}
                style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: url.trim() ? 'linear-gradient(135deg,#10b981,#0891b2)' : '#e5e7eb',
                    border: 'none', color: '#fff', WebkitTextFillColor: '#fff',
                    fontWeight: 700, fontSize: 13, cursor: url.trim() ? 'pointer' : 'not-allowed',
                    opacity: url.trim() ? 1 : 0.55,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
            >
                <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                    <path d="M18 2L9.5 10.5M18 2l-6 16-2.5-5.5L4 10l14-8z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Send Audio
            </button>
        </div>
    );
};

export default StylishAudioUpload;
