import React, { useState, useEffect } from 'react';
import './YouTubeSearchModal.css';

// Premium SVG Icons
const YouTubeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="youtube_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF0000" />
                <stop offset="50%" stopColor="#FF4444" />
                <stop offset="100%" stopColor="#CC0000" />
            </linearGradient>
            <filter id="youtube_shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(255,0,0,0.4)"/>
            </filter>
        </defs>
        <rect x="1" y="4" width="22" height="16" rx="3" fill="url(#youtube_gradient)" filter="url(#youtube_shadow)" />
        <path d="M9.5 8.5L15.5 12L9.5 15.5V8.5Z" fill="white" />
        <circle cx="19" cy="6" r="2" fill="#00FF00" opacity="0.8" />
    </svg>
);

const LinkIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3B82F6">
        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
    </svg>
);

const MusicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="white"/>
    </svg>
);

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="search_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="50%" stopColor="#764ba2" />
                <stop offset="100%" stopColor="#f093fb" />
            </linearGradient>
            <filter id="search_shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(102,126,234,0.4)"/>
            </filter>
        </defs>
        <circle cx="10" cy="10" r="7" fill="none" stroke="url(#search_gradient)" strokeWidth="3" filter="url(#search_shadow)" />
        <path d="M21 21L16.65 16.65" stroke="url(#search_gradient)" strokeWidth="3" strokeLinecap="round" filter="url(#search_shadow)" />
        <circle cx="10" cy="10" r="3" fill="url(#search_gradient)" opacity="0.3" />
        <circle cx="18" cy="6" r="2" fill="#00FFFF" opacity="0.8" />
    </svg>
);

const LoadingIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6" className="animate-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
);

const AlertIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444">
        <path d="M12 2L1 21h22L12 2zm-1 8h2v6h-2v-6zm1 9.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67-1.5-1.5-1.5z"/>
    </svg>
);

const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
        <path d="M8 5.14v14.66c0 .41.47.66.85.42l11.05-7.33c.32-.21.32-.63 0-.84L8.85 4.72c-.38-.25-.85.01-.85.42z"/>
    </svg>
);

const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

// Mock YouTube search results for fallback
const mockYouTubeResults = [
  {
    id: { videoId: 'dQw4w9WgXcQ' },
    snippet: {
      title: 'Rick Astley - Never Gonna Give You Up',
      channelTitle: 'Rick Astley',
      description: 'The official video for Rick Astley - Never Gonna Give You Up',
      thumbnails: {
        default: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' }
      }
    }
  },
];

const YouTubeSearchModal = ({ isOpen, onClose, onVideoSelect, apiKey }) => {
    const [activeTab, setActiveTab] = useState('video-url');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [musicUrlInput, setMusicUrlInput] = useState('');

    const searchVideos = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');

        try {
            const API_KEY = apiKey || 'YOUR_YOUTUBE_API_KEY';
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}`;

            const response = await fetch(searchUrl);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            setSearchResults(data.items || []);

            if (!data.items || data.items.length === 0) {
                setError("No videos found for your search.");
            }

        } catch (err) {
            console.error('YouTube search error:', err);
            setError(err.message || 'Failed to search YouTube videos');
            setSearchResults(mockYouTubeResults);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        searchVideos();
    };

    const handleVideoSelect = (video) => {
        const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
        onVideoSelect(videoUrl, video.snippet);
        onClose();
    };

    const handleVideoUrlSubmit = (e) => {
        e.preventDefault();
        if (!videoUrlInput.trim()) {
            setError('Please enter a YouTube video URL');
            return;
        }

        const videoId = extractVideoId(videoUrlInput);
        if (videoId) {
            const placeholderSnippet = {
                title: 'YouTube Video',
                channelTitle: 'Unknown',
                thumbnails: { default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` } }
            };
            onVideoSelect(videoUrlInput, placeholderSnippet);
            setVideoUrlInput('');
            onClose();
        } else {
            setError('Please enter a valid YouTube video URL');
        }
    };

    const handleMusicUrlSubmit = (e) => {
        e.preventDefault();
        if (!musicUrlInput.trim()) {
            setError('Please enter a YouTube Music URL');
            return;
        }

        const videoId = extractVideoId(musicUrlInput);
        if (videoId) {
            const musicSnippet = {
                title: '',
                channelTitle: 'YouTube Music',
                description: 'Audio only - no visuals',
                thumbnails: { default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` } },
                isAudioOnly: true
            };
            onVideoSelect(`https://www.youtube.com/watch?v=${videoId}`, musicSnippet);
            setMusicUrlInput('');
            onClose();
        } else {
            setError('Please enter a valid YouTube Music URL');
        }
    };

    const extractVideoId = (url) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    if (!isOpen) return null;

    return (
        <div className="youtube-modal-overlay" onClick={onClose}>
            <div className="youtube-modal-container" onClick={e => e.stopPropagation()}>

                <div className="youtube-modal-header">
                    <h2>
                        <YouTubeIcon />
                        YouTube Media
                    </h2>
                    <button className="youtube-modal-close" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>

                <div className="youtube-modal-tabs">
                    <button 
                        className={`youtube-tab ${activeTab === 'video-url' ? 'active' : ''}`}
                        onClick={() => setActiveTab('video-url')}
                    >
                        <LinkIcon />
                        Video URL
                    </button>
                    <button 
                        className={`youtube-tab ${activeTab === 'music-url' ? 'active' : ''}`}
                        onClick={() => setActiveTab('music-url')}
                    >
                        <MusicIcon />
                        Music URL
                    </button>
                    <button 
                        className={`youtube-tab ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                    >
                        <SearchIcon />
                        Search Videos
                    </button>
                </div>

                <div className="youtube-modal-content">
                    {error && (
                        <div className="youtube-error">
                            <AlertIcon /> {error}
                        </div>
                    )}

                    {activeTab === 'video-url' && (
                        <div className="youtube-url-tab">
                            <form onSubmit={handleVideoUrlSubmit} className="youtube-url-form">
                                <div className="youtube-input-group">
                                    <input
                                        type="url"
                                        placeholder="Paste YouTube video URL here..."
                                        value={videoUrlInput}
                                        onChange={(e) => {
                                            setVideoUrlInput(e.target.value);
                                            setError('');
                                        }}
                                        className="youtube-url-input"
                                    />
                                    <button type="submit" className="youtube-url-submit">
                                        Send to Chat
                                    </button>
                                </div>
                            </form>
                            <div className="youtube-tab-description">
                                <p>📹 Paste any YouTube video URL to share it in the chat with full video player.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'music-url' && (
                        <div className="youtube-music-tab">
                            <form onSubmit={handleMusicUrlSubmit} className="youtube-url-form">
                                <div className="youtube-input-group">
                                    <input
                                        type="url"
                                        placeholder="Paste YouTube Music URL here..."
                                        value={musicUrlInput}
                                        onChange={(e) => {
                                            setMusicUrlInput(e.target.value);
                                            setError('');
                                        }}
                                        className="youtube-url-input"
                                    />
                                    <button type="submit" className="youtube-music-submit">
                                        Send Audio
                                    </button>
                                </div>
                            </form>
                            <div className="youtube-tab-description">
                                <p>🎵 Paste YouTube Music URL for audio-only playback (no video visuals).</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="youtube-search-tab">
                            <form onSubmit={handleSearch} className="youtube-search-form">
                                <div className="youtube-search-group">
                                    <input
                                        type="text"
                                        placeholder="Search for YouTube videos by keywords..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setError('');
                                        }}
                                        className="youtube-search-input"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !searchQuery.trim()}
                                        className="youtube-search-button"
                                    >
                                        {loading ? <LoadingIcon /> : <SearchIcon />}
                                    </button>
                                </div>
                            </form>

                            {loading && (
                                <div className="youtube-loading">
                                    <div className="youtube-spinner"></div>
                                    <span>Searching YouTube...</span>
                                </div>
                            )}

                            <div className="youtube-results">
                                {searchResults.map((video) => (
                                    <div 
                                        key={video.id.videoId} 
                                        className="youtube-result-item"
                                        onClick={() => handleVideoSelect(video)}
                                    >
                                        <div className="youtube-thumbnail">
                                            <img 
                                                src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url}
                                                alt={video.snippet.title}
                                            />
                                            <div className="youtube-play-overlay">
                                                <PlayIcon />
                                            </div>
                                        </div>
                                        <div className="youtube-video-info">
                                            <h4 className="youtube-video-title">
                                                {video.snippet.title}
                                            </h4>
                                            <p className="youtube-video-channel">
                                                {video.snippet.channelTitle}
                                            </p>
                                            {video.snippet.description && (
                                                <p className="youtube-video-description">
                                                    {video.snippet.description.substring(0, 100)}...
                                                </p>
                                            )}
                                            <div className="youtube-video-meta">
                                                <span className="youtube-published">
                                                    {video.snippet.publishedAt ? new Date(video.snippet.publishedAt).toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {searchResults.length === 0 && !loading && searchQuery && (
                                <div className="youtube-no-results">
                                    <p>No videos found for "{searchQuery}"</p>
                                    <p>Try different keywords or check your search terms.</p>
                                </div>
                            )}

                            {!searchQuery && !loading && (
                                <div className="youtube-no-results">
                                    <p>🔍 Enter keywords to search for YouTube videos</p>
                                    <p>Find and share videos directly in the chat!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YouTubeSearchModal;