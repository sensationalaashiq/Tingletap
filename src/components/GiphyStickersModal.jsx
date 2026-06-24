import React, { useState, useEffect } from 'react';
import './GiphyStickersModal.css';

const GiphyStickersModal = ({ isOpen, onClose, onSelectGif }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';

    useEffect(() => {
        if (isOpen) fetchTrendingGifs();
    }, [isOpen]);

    const fetchTrendingGifs = async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=18&rating=pg-13`);
            const data = await res.json();
            if (data.data) setGifs(data.data);
        } catch { setError('Failed to load GIFs'); }
        finally { setLoading(false); }
    };

    const searchGifs = async () => {
        if (!searchTerm.trim()) { fetchTrendingGifs(); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=18&rating=pg-13`);
            const data = await res.json();
            if (data.data) setGifs(data.data);
        } catch { setError('Failed to search GIFs'); }
        finally { setLoading(false); }
    };

    const handleGifSelect = (gif) => {
        if (onSelectGif) { onSelectGif(gif); onClose(); }
    };

    if (!isOpen) return null;

    return (
        <div className="gsm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="gsm-card" onClick={e => e.stopPropagation()}>

                {/* Header with icon */}
                <div className="gsm-header">
                    <div className="gsm-icon-ring">
                        <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
                            <defs>
                                <linearGradient id="gsmG1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ec4899"/>
                                    <stop offset="33%" stopColor="#f97316"/>
                                    <stop offset="66%" stopColor="#22c55e"/>
                                    <stop offset="100%" stopColor="#6366f1"/>
                                </linearGradient>
                            </defs>
                            <rect x="4" y="4" width="40" height="40" rx="10" fill="url(#gsmG1)" opacity=".18"/>
                            <rect x="4" y="4" width="40" height="40" rx="10" stroke="url(#gsmG1)" strokeWidth="2.2" fill="none"/>
                            {/* G-I-F letters */}
                            <text x="8" y="30" fontSize="16" fontWeight="900" fontFamily="Arial, sans-serif" fill="url(#gsmG1)">GIF</text>
                        </svg>
                    </div>
                    <div className="gsm-title-wrap">
                        <span className="gsm-title">GIF & Stickers</span>
                        <span className="gsm-subtitle">Trending & Search</span>
                    </div>
                    <button className="gsm-close" onClick={onClose}>
                        <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                            <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="gsm-search-wrap">
                    <div className="gsm-search-box">
                        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className="gsm-search-icon">
                            <circle cx="9" cy="9" r="6" stroke="#9ca3af" strokeWidth="1.8"/>
                            <path d="m16 16-3.5-3.5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && searchGifs()}
                            placeholder="Search GIFs..."
                            className="gsm-search-input"
                        />
                        {searchTerm && (
                            <button className="gsm-search-clear" onClick={() => { setSearchTerm(''); fetchTrendingGifs(); }}>
                                <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                                    <path d="M12 4L4 12M4 4l8 8" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                            </button>
                        )}
                        <button className="gsm-search-btn" onClick={searchGifs}>
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                                <circle cx="9" cy="9" r="6" stroke="#fff" strokeWidth="1.8"/>
                                <path d="m16 16-3.5-3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Section label */}
                <div className="gsm-section-label">
                    {searchTerm ? `Results for "${searchTerm}"` : '🔥 Trending'}
                </div>

                {/* GIF grid */}
                <div className="gsm-content">
                    {loading && (
                        <div className="gsm-loading">
                            <div className="gsm-spinner"/>
                            <p>Loading GIFs…</p>
                        </div>
                    )}
                    {error && (
                        <div className="gsm-error">
                            <svg viewBox="0 0 20 20" width="32" height="32" fill="none">
                                <path d="M10 2L2 17h16L10 2z" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round"/>
                                <line x1="10" y1="9" x2="10" y2="13" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
                                <circle cx="10" cy="15.5" r="0.8" fill="#f97316"/>
                            </svg>
                            <p>{error}</p>
                            <button className="gsm-retry" onClick={fetchTrendingGifs}>Try Again</button>
                        </div>
                    )}
                    {!loading && !error && gifs.length === 0 && (
                        <div className="gsm-empty">
                            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
                                <rect x="6" y="6" width="36" height="36" rx="8" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4 3"/>
                                <path d="M18 28l4-4 4 4 4-6" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <p>No GIFs found</p>
                            <small>Try a different search term</small>
                        </div>
                    )}
                    {!loading && !error && gifs.length > 0 && (
                        <div className="gsm-grid">
                            {gifs.map(gif => (
                                <div key={gif.id} className="gsm-gif-item" onClick={() => handleGifSelect(gif)}>
                                    <img src={gif.images.fixed_height_small.url} alt={gif.title} loading="lazy"/>
                                    <div className="gsm-gif-overlay">
                                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                                            <circle cx="8" cy="8" r="6" fill="rgba(255,255,255,.9)"/>
                                            <path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="#6366f1"/>
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GiphyStickersModal;
