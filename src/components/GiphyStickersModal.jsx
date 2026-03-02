
import React, { useState, useEffect } from 'react';
import './GiphyStickersModal.css';

// Premium SVG Icons
const GiphyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="giphy_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00ff99" />
        <stop offset="50%" stopColor="#00ccff" />
        <stop offset="100%" stopColor="#9933ff" />
      </linearGradient>
      <filter id="giphy_shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(153,51,255,0.4)"/>
      </filter>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#giphy_gradient)" filter="url(#giphy_shadow)" />
    <rect x="4" y="4" width="16" height="16" rx="2" fill="white" />
    <path d="M8 8h8v2H8zm0 4h6v2H8zm0 4h4v2H8z" fill="url(#giphy_gradient)" />
    <circle cx="17" cy="13" r="1.5" fill="url(#giphy_gradient)" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="close_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="search_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f8fafc" />
      </linearGradient>
    </defs>
    <circle cx="11" cy="11" r="8" stroke="url(#search_gradient)" strokeWidth="2"/>
    <path d="m21 21-4.35-4.35" stroke="url(#search_gradient)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const GiphyStickersModal = ({ isOpen, onClose, onSelectGif }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';

  // Fetch trending GIFs on component mount
  useEffect(() => {
    if (isOpen) {
      fetchTrendingGifs();
    }
  }, [isOpen]);

  const fetchTrendingGifs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12&rating=pg-13`
      );
      const data = await response.json();
      if (data.data) {
        setGifs(data.data);
      }
    } catch (err) {
      setError('Failed to load GIFs');
      console.error('Error fetching trending GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async () => {
    if (!searchTerm.trim()) {
      fetchTrendingGifs();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=12&rating=pg-13`
      );
      const data = await response.json();
      if (data.data) {
        setGifs(data.data);
      }
    } catch (err) {
      setError('Failed to search GIFs');
      console.error('Error searching GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGifSelect = (gif) => {
    console.log("🎬 GIF selected:", gif);
    try {
      if (onSelectGif && typeof onSelectGif === 'function') {
        onSelectGif(gif);
        onClose();
      } else {
        console.error("onSelectGif prop is not a function:", onSelectGif);
      }
    } catch (error) {
      console.error("Error in handleGifSelect:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchGifs();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="giphy-modal-overlay" onClick={onClose}>
      <div className="giphy-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="giphy-modal-header">
          <h3 className="giphy-modal-title">
            <GiphyIcon />
            GIFs
          </h3>
          <button className="giphy-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Search Section */}
        <div className="giphy-search-section">
          <div className="giphy-search-container">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for GIFs..."
              className="giphy-search-input"
            />
            <button onClick={searchGifs} className="giphy-search-btn">
              <SearchIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="giphy-content">
          {loading && (
            <div className="giphy-loading">
              <div className="loading-spinner"></div>
              <p>Loading GIFs...</p>
            </div>
          )}

          {error && (
            <div className="giphy-error">
              <p>{error}</p>
              <button onClick={fetchTrendingGifs} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && gifs.length === 0 && (
            <div className="giphy-empty">
              <div className="empty-icon">🎭</div>
              <p>No GIFs found</p>
              <small>Try a different search term</small>
            </div>
          )}

          {!loading && !error && gifs.length > 0 && (
            <div className="giphy-grid">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="gif-item"
                  onClick={() => handleGifSelect(gif)}
                >
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    loading="lazy"
                  />
                  <div className="gif-overlay">
                    <span className="gif-title">{gif.title}</span>
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
