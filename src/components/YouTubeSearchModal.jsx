import React, { useState } from 'react';
import './YouTubeSearchModal.css';

/* ── Premium SVG Icons (no emoji, no grey) ── */
const IconYouTube = () => (
    <svg viewBox="0 0 64 64" width="42" height="42" fill="none">
        <defs>
            <linearGradient id="ytmG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4e42"/>
                <stop offset="100%" stopColor="#c4162a"/>
            </linearGradient>
        </defs>
        <rect x="6" y="14" width="52" height="36" rx="8" fill="url(#ytmG)" opacity=".14"/>
        <rect x="6" y="14" width="52" height="36" rx="8" stroke="url(#ytmG)" strokeWidth="2.5" fill="none"/>
        <path d="M26 22l18 10-18 10V22z" fill="url(#ytmG)" opacity=".85"/>
        <circle cx="48" cy="16" r="5" fill="#fbbf24" opacity=".7"/>
        <path d="M46 14l2 2-2 2M48 16h-4" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
);

const IconLink = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#ff4e42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#ff4e42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const IconMusic = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M9 18V5l12-2v13" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke="#a855f7" strokeWidth="2"/>
        <circle cx="18" cy="16" r="3" stroke="#a855f7" strokeWidth="2"/>
    </svg>
);

const IconSearch = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#f59e0b" strokeWidth="2"/>
        <path d="M21 21l-4.35-4.35" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

const IconClose = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
);

const IconSend = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const IconPlay = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="rgba(255,78,66,0.85)"/>
        <path d="M10 8l6 4-6 4V8z" fill="white"/>
    </svg>
);

const IconSearchBig = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.2"/>
        <path d="M21 21l-4.35-4.35" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
);

const IconSpinner = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="ytm-spin">
        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
);

const IconError = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="2"/>
        <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

const IconEmptySearch = () => (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
        <defs>
            <linearGradient id="ytmEmptyG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4e42"/>
                <stop offset="100%" stopColor="#f59e0b"/>
            </linearGradient>
        </defs>
        <circle cx="28" cy="28" r="18" stroke="url(#ytmEmptyG)" strokeWidth="2.5" fill="none" opacity=".4"/>
        <path d="M42 42l8 8" stroke="url(#ytmEmptyG)" strokeWidth="2.5" strokeLinecap="round" opacity=".4"/>
        <path d="M22 26h12M22 32h8" stroke="url(#ytmEmptyG)" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
    </svg>
);

const IconVideoUrl = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <defs>
            <linearGradient id="ytmVG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4e42"/>
                <stop offset="100%" stopColor="#c4162a"/>
            </linearGradient>
        </defs>
        <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#ytmVG)" opacity=".12"/>
        <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#ytmVG)" strokeWidth="1.5" fill="none"/>
        <path d="M9 8.5l6 3.5-6 3.5V8.5z" fill="url(#ytmVG)"/>
    </svg>
);

const IconMusicUrl = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <defs>
            <linearGradient id="ytmMG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7"/>
                <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9" stroke="url(#ytmMG)" strokeWidth="1.5" fill="url(#ytmMG)" fillOpacity=".08"/>
        <path d="M10 8.5v7l5.5-3.5L10 8.5z" fill="url(#ytmMG)"/>
        <path d="M12 16v2" stroke="url(#ytmMG)" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
);

/* ── Mock fallback results ── */
const MOCK_RESULTS = [
    { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Rick Astley — Never Gonna Give You Up (Official Video)', channelTitle: 'Rick Astley', publishedAt: '2009-10-25', thumbnails: { default: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' }, medium: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' } } } },
];

const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?/\s]{11})/;
    const m = url.match(regex);
    return m ? m[1] : null;
};

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
const YouTubeSearchModal = ({ isOpen, onClose, onVideoSelect, apiKey }) => {
    const [tab, setTab] = useState('video');
    const [videoUrl, setVideoUrl]   = useState('');
    const [musicUrl, setMusicUrl]   = useState('');
    const [query, setQuery]         = useState('');
    const [results, setResults]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');

    if (!isOpen) return null;

    const clearError = () => setError('');

    /* ── Video URL submit ── */
    const handleVideoUrl = (e) => {
        e.preventDefault();
        if (!videoUrl.trim()) { setError('Please paste a YouTube video URL.'); return; }
        const id = extractVideoId(videoUrl.trim());
        if (!id) { setError('That doesn\'t look like a valid YouTube URL.'); return; }
        onVideoSelect(videoUrl.trim(), { title: 'YouTube Video', channelTitle: 'YouTube', thumbnails: { default: { url: `https://i.ytimg.com/vi/${id}/default.jpg` } } });
        setVideoUrl('');
        onClose();
    };

    /* ── Music URL submit ── */
    const handleMusicUrl = (e) => {
        e.preventDefault();
        if (!musicUrl.trim()) { setError('Please paste a YouTube Music URL.'); return; }
        const id = extractVideoId(musicUrl.trim());
        if (!id) { setError('That doesn\'t look like a valid YouTube Music URL.'); return; }
        onVideoSelect(`https://www.youtube.com/watch?v=${id}`, { title: '', channelTitle: 'YouTube Music', isAudioOnly: true, thumbnails: { default: { url: `https://i.ytimg.com/vi/${id}/default.jpg` } } });
        setMusicUrl('');
        onClose();
    };

    /* ── Search ── */
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError('');
        try {
            const key = apiKey || '';
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${key}`;
            const res = await fetch(url);
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error?.message || `Error ${res.status}`);
            }
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setResults(data.items || []);
            if (!data.items?.length) setError('No videos found. Try different keywords.');
        } catch (err) {
            setError(err.message || 'Search failed. Check your API key.');
            setResults(MOCK_RESULTS);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoSelect = (video) => {
        onVideoSelect(`https://www.youtube.com/watch?v=${video.id.videoId}`, video.snippet);
        onClose();
    };

    const handleClose = () => {
        setVideoUrl(''); setMusicUrl(''); setQuery(''); setResults([]); setError('');
        onClose();
    };

    return (
        <div className="ytm-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="ytm-card" onClick={e => e.stopPropagation()}>

                {/* Close */}
                <button className="ytm-close" onClick={handleClose} aria-label="Close">
                    <IconClose />
                </button>

                {/* Icon ring */}
                <div className="ytm-icon-ring">
                    <IconYouTube />
                </div>

                <div className="ytm-title">YouTube Media</div>
                <div className="ytm-subtitle">Share videos or music directly in chat</div>

                {/* Error banner */}
                {error && (
                    <div className="ytm-error-banner">
                        <IconError />
                        <span>{error}</span>
                        <button className="ytm-error-dismiss" onClick={clearError}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="ytm-tabs">
                    <button className={`ytm-tab${tab === 'video' ? ' ytm-tab--active' : ''}`} onClick={() => { setTab('video'); clearError(); }}>
                        <IconLink /> Video URL
                    </button>
                    <button className={`ytm-tab${tab === 'music' ? ' ytm-tab--active ytm-tab--music' : ''}`} onClick={() => { setTab('music'); clearError(); }}>
                        <IconMusic /> Music URL
                    </button>
                    <button className={`ytm-tab${tab === 'search' ? ' ytm-tab--active ytm-tab--search' : ''}`} onClick={() => { setTab('search'); clearError(); }}>
                        <IconSearch /> Search
                    </button>
                </div>

                {/* ── VIDEO URL TAB ── */}
                {tab === 'video' && (
                    <div className="ytm-content">
                        <div className="ytm-hint-box ytm-hint-box--red">
                            <IconVideoUrl />
                            <div>
                                <p className="ytm-hint-title">Share a YouTube video</p>
                                <p className="ytm-hint-body">Paste any YouTube link — it will appear as a full embedded player in chat.</p>
                            </div>
                        </div>
                        <form onSubmit={handleVideoUrl} className="ytm-form">
                            <div className="ytm-input-wrap">
                                <span className="ytm-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                        <rect x="2" y="4" width="20" height="16" rx="3" stroke="#ff4e42" strokeWidth="1.8"/>
                                        <path d="M9 8.5l6 3.5-6 3.5V8.5z" fill="#ff4e42"/>
                                    </svg>
                                </span>
                                <input
                                    className="ytm-input"
                                    type="url"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={videoUrl}
                                    onChange={e => { setVideoUrl(e.target.value); clearError(); }}
                                    autoFocus
                                />
                            </div>
                            <div className="ytm-actions">
                                <button type="button" className="ytm-btn ytm-btn--cancel" onClick={handleClose}>Cancel</button>
                                <button type="submit" className="ytm-btn ytm-btn--red" disabled={!videoUrl.trim()}>
                                    <IconSend /> Send to Chat
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── MUSIC URL TAB ── */}
                {tab === 'music' && (
                    <div className="ytm-content">
                        <div className="ytm-hint-box ytm-hint-box--purple">
                            <IconMusicUrl />
                            <div>
                                <p className="ytm-hint-title">Share audio only</p>
                                <p className="ytm-hint-body">Paste a YouTube Music link for audio-only playback — no video visuals.</p>
                            </div>
                        </div>
                        <form onSubmit={handleMusicUrl} className="ytm-form">
                            <div className="ytm-input-wrap">
                                <span className="ytm-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 18V5l12-2v13" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        <circle cx="6" cy="18" r="3" stroke="#a855f7" strokeWidth="1.8"/>
                                        <circle cx="18" cy="16" r="3" stroke="#a855f7" strokeWidth="1.8"/>
                                    </svg>
                                </span>
                                <input
                                    className="ytm-input ytm-input--purple"
                                    type="url"
                                    placeholder="https://music.youtube.com/watch?v=..."
                                    value={musicUrl}
                                    onChange={e => { setMusicUrl(e.target.value); clearError(); }}
                                    autoFocus
                                />
                            </div>
                            <div className="ytm-actions">
                                <button type="button" className="ytm-btn ytm-btn--cancel" onClick={handleClose}>Cancel</button>
                                <button type="submit" className="ytm-btn ytm-btn--purple" disabled={!musicUrl.trim()}>
                                    <IconSend /> Send Audio
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── SEARCH TAB ── */}
                {tab === 'search' && (
                    <div className="ytm-content ytm-content--search">
                        <form onSubmit={handleSearch} className="ytm-search-form">
                            <div className="ytm-search-wrap">
                                <span className="ytm-search-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                        <circle cx="11" cy="11" r="7" stroke="#f59e0b" strokeWidth="2"/>
                                        <path d="M21 21l-4.35-4.35" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </span>
                                <input
                                    className="ytm-search-input"
                                    type="text"
                                    placeholder="Search YouTube videos..."
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); clearError(); }}
                                    autoFocus
                                />
                                <button type="submit" className="ytm-search-btn" disabled={loading || !query.trim()}>
                                    {loading ? <IconSpinner /> : <IconSearchBig />}
                                </button>
                            </div>
                        </form>

                        {/* Results */}
                        <div className="ytm-results">
                            {loading && (
                                <div className="ytm-loading">
                                    <div className="ytm-loading-ring"/>
                                    <span>Searching YouTube…</span>
                                </div>
                            )}

                            {!loading && results.length === 0 && (
                                <div className="ytm-empty">
                                    <IconEmptySearch />
                                    <p className="ytm-empty-title">
                                        {query ? 'No results found' : 'Search for videos'}
                                    </p>
                                    <p className="ytm-empty-body">
                                        {query ? `Try different keywords for "${query}"` : 'Type keywords above and press Search'}
                                    </p>
                                </div>
                            )}

                            {!loading && results.map(video => (
                                <button
                                    key={video.id.videoId}
                                    className="ytm-result"
                                    onClick={() => handleVideoSelect(video)}
                                >
                                    <div className="ytm-thumb">
                                        <img
                                            src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url}
                                            alt={video.snippet.title}
                                        />
                                        <div className="ytm-thumb-overlay">
                                            <IconPlay />
                                        </div>
                                    </div>
                                    <div className="ytm-result-info">
                                        <p className="ytm-result-title">{video.snippet.title}</p>
                                        <p className="ytm-result-channel">{video.snippet.channelTitle}</p>
                                        {video.snippet.publishedAt && (
                                            <p className="ytm-result-date">{new Date(video.snippet.publishedAt).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                    <div className="ytm-result-arrow">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 12h14M12 5l7 7-7 7" stroke="#ff4e42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YouTubeSearchModal;
