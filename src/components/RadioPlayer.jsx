import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import './RadioPlayer.css';

/* ── Country badge SVG (replaces emoji flags) ─────────────────── */
const CountryBadge = ({ code, colors }) => {
  const map = {
    IN: { label: 'IN', bg: 'linear-gradient(135deg,#ff9933,#138808)', text: '#fff' },
    AE: { label: 'AE', bg: 'linear-gradient(135deg,#00732f,#ff0000)', text: '#fff' },
    GB: { label: 'GB', bg: 'linear-gradient(135deg,#012169,#c8102e)', text: '#fff' },
    SG: { label: 'SG', bg: 'linear-gradient(135deg,#ef3340,#ffffff)', text: '#fff' },
    STAR: {
      node: (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="#fbbf24">
          <path d="M8 1l1.85 3.75 4.14.6-3 2.92.71 4.13L8 10.25l-3.7 1.95.71-4.13-3-2.92 4.14-.6z"/>
        </svg>
      )
    },
    FILM: {
      node: (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="#a78bfa">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="#a78bfa" strokeWidth="1" fill="none"/>
          <rect x="1" y="5" width="14" height="1" fill="#a78bfa" opacity=".5"/>
          <rect x="1" y="10" width="14" height="1" fill="#a78bfa" opacity=".5"/>
          <rect x="3" y="3" width="1.5" height="10" fill="#a78bfa" opacity=".4"/>
          <rect x="11.5" y="3" width="1.5" height="10" fill="#a78bfa" opacity=".4"/>
        </svg>
      )
    },
  };
  const info = map[code] || map.STAR;
  if (info.node) {
    return (
      <span className="rp-country-badge rp-country-badge--icon">
        {info.node}
      </span>
    );
  }
  return (
    <span className="rp-country-badge" style={{ background: info.bg, color: info.text }}>
      {info.label}
    </span>
  );
};

const RadioPlayer = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const audioRef = useRef(null);

  const radioStations = [
    {
      id: 1,
      name: "AIR Vividh Bharati",
      url: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
      genre: "Bollywood & Popular Music",
      country: "India",
      flag: "IN",
      color: ["#f97316", "#ea580c"],
      glow: "rgba(249,115,22,0.45)",
      description: "All India Radio — Your Favourite Station",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
        </svg>
      )
    },
    {
      id: 2,
      name: "Radio Mirchi Dubai",
      url: "https://eu8.fastcast4u.com/proxy/clyedupq?mp=/1",
      genre: "Bollywood & Entertainment",
      country: "UAE",
      flag: "AE",
      color: ["#ef4444", "#dc2626"],
      glow: "rgba(239,68,68,0.45)",
      description: "Popular Bollywood Music from Dubai",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M19.59,3H4.41C3.63,3 3,3.63 3,4.41V19.59C3,20.37 3.63,21 4.41,21H19.59C20.37,21 21,20.37 21,19.59V4.41C21,3.63 20.37,3 19.59,3M12,17.5L6.5,12L7.91,10.59L12,14.67L16.09,10.59L17.5,12L12,17.5M12,13.5L6.5,8L7.91,6.59L12,10.67L16.09,6.59L17.5,8L12,13.5Z"/>
        </svg>
      )
    },
    {
      id: 3,
      name: "Big FM Dubai",
      url: "https://funasia.streamguys1.com/live4",
      genre: "Bollywood & Popular Music",
      country: "UAE",
      flag: "AE",
      color: ["#3b82f6", "#2563eb"],
      glow: "rgba(59,130,246,0.45)",
      description: "Big FM Dubai — Top Bollywood Hits",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
        </svg>
      )
    },
    {
      id: 4,
      name: "Hindi Gold Radio",
      url: "https://azuracast.vibesounds.in:8010/radio.mp3",
      genre: "Hindi Hits & Golden Era",
      country: "India",
      flag: "STAR",
      color: ["#f59e0b", "#d97706"],
      glow: "rgba(245,158,11,0.45)",
      description: "Pure Hindi Gold — Evergreen Melodies",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2Z"/>
        </svg>
      )
    },
    {
      id: 5,
      name: "Fever FM",
      url: "https://radio.canstream.co.uk:8115/live.mp3",
      genre: "Asian Music",
      country: "UK",
      flag: "GB",
      color: ["#ec4899", "#db2777"],
      glow: "rgba(236,72,153,0.45)",
      description: "Fever FM — Asian Music & Entertainment",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M12,23A1,1 0 0,1 11,22V15H6A1,1 0 0,1 5,14C5,13.4 5.4,13 6,13H11V9A1,1 0 0,1 12,8A1,1 0 0,1 13,9V13H18C18.6,13 19,13.4 19,14A1,1 0 0,1 18,15H13V22A1,1 0 0,1 12,23M12,3A3,3 0 0,0 9,6A3,3 0 0,0 12,9A3,3 0 0,0 15,6A3,3 0 0,0 12,3Z"/>
        </svg>
      )
    },
    {
      id: 6,
      name: "Hits of Bollywood",
      url: "https://stream-171.zeno.fm/8ty8szwpwfeuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI4dHk4c3p3cHdmZXV2IiwiaG9zdCI6InN0cmVhbS0xNzEuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6Im9FTWdMVnJTVHRpVWxGRzFTZHBYSmciLCJpYXQiOjE3NTI0MTcwODMsImV4cCI6MTc1MjQxNzE0M30.I_ALFdeucggXjaJpUyXc2AzrMRatOveFoIj7tPx_pCw",
      genre: "Bollywood Hits",
      country: "Global",
      flag: "FILM",
      color: ["#8b5cf6", "#7c3aed"],
      glow: "rgba(139,92,246,0.45)",
      description: "Hits of Bollywood — Top Songs 24/7",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
        </svg>
      )
    },
    {
      id: 7,
      name: "98.7 FM",
      url: "https://28323.live.streamtheworld.com/987FM.mp3",
      genre: "Top 40 Hits",
      country: "Singapore",
      flag: "SG",
      color: ["#14b8a6", "#0d9488"],
      glow: "rgba(20,184,166,0.45)",
      description: "98.7 FM Singapore — Your Hit Music",
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff">
          <path d="M20,6C20.58,6 21.05,6.2 21.42,6.59C21.8,7 22,7.45 22,8V16C22,16.55 21.8,17 21.42,17.41C21.05,17.8 20.58,18 20,18H4C3.42,18 2.95,17.8 2.58,17.41C2.2,17 2,16.55 2,16V8C2,7.45 2.2,7 2.58,6.59C2.95,6.2 3.42,6 4,6H7.5L9.5,4L10.5,5.5L9.5,6.5H20M4,8V16H20V8H4M8,10A2,2 0 0,1 10,12A2,2 0 0,1 8,14A2,2 0 0,1 6,12A2,2 0 0,1 8,10M8,11A1,1 0 0,0 7,12A1,1 0 0,0 8,13A1,1 0 0,0 9,12A1,1 0 0,0 8,11Z"/>
        </svg>
      )
    }
  ];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playStation = async (station) => {
    if (audioRef.current && currentStation?.id === station.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setCurrentStation(station);

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = station.url;
        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.load();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Loading timeout')), 10000)
        );

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await Promise.race([playPromise, timeoutPromise]);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error(`Error playing radio station:`, error);
      setIsPlaying(false);
    }

    setIsLoading(false);
  };

  const stopRadio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentStation(null);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleClose = () => onClose();
  const handleMinimize = () => setIsMinimized(!isMinimized);

  const activeStation = currentStation
    ? radioStations.find(s => s.id === currentStation.id) || currentStation
    : null;

  return (
    <>
      {isOpen && (
        <div className="radio-popup-container">
          <div className="radio-popup">

            {/* ── Premium Header ── */}
            <div className="radio-header">
              <div className="radio-title">
                <span className="radio-title-icon">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="#ffffff">
                    <path d="M3.24,6.15C2.51,6.43 2,7.17 2,8V16C2,16.83 2.51,17.57 3.24,17.85L4,18.11V5.89L3.24,6.15M8,5A3,3 0 0,0 5,8V16A3,3 0 0,0 8,19H9V5H8M10,8.5V11.5H12V8.5H10M14,5V19H15A3,3 0 0,0 18,16V8A3,3 0 0,0 15,5H14M19,8V16C19,17.11 19.89,18 21,18V6C19.89,6 19,6.89 19,8Z"/>
                  </svg>
                </span>
                <span>Live Radio</span>
                {isPlaying && (
                  <span className="radio-live-badge">LIVE</span>
                )}
              </div>
              <div className="radio-header-controls">
                <button className="rp-minimize-btn" onClick={handleMinimize} title={isMinimized ? "Expand" : "Minimize"}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                    {isMinimized
                      ? <><polyline points="6 9 12 15 18 9"/></>
                      : <><polyline points="18 15 12 9 6 15"/></>
                    }
                  </svg>
                </button>
                <button className="rp-close-btn" onClick={handleClose} title="Close">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Currently Playing Mini-Bar (always visible when playing) ── */}
            {isPlaying && activeStation && isMinimized && (
              <div className="radio-mini-now-playing" style={{ '--station-glow': activeStation.glow }}>
                <span className="radio-mini-flag"><CountryBadge code={activeStation.flag} /></span>
                <span className="radio-mini-name">{activeStation.name}</span>
                <div className="radio-mini-bars">
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                  <span style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})` }}/>
                </div>
                <button className="radio-mini-stop" onClick={stopRadio} title="Stop">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="#ef4444"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              </div>
            )}

            {!isMinimized && (
              <div className="radio-content">

                {/* ── Station List ── */}
                <div className="rp-stations-list">
                  {radioStations.map((station) => {
                    const isActive = currentStation?.id === station.id;
                    const isThisLoading = isLoading && isActive;
                    const isThisPlaying = isActive && isPlaying;
                    return (
                      <div
                        key={station.id}
                        className={`rp-station-item ${isActive ? 'active' : ''}`}
                        onClick={() => playStation(station)}
                        style={isActive ? {
                          '--s-c1': station.color[0],
                          '--s-c2': station.color[1],
                          '--s-glow': station.glow,
                        } : {}}
                      >
                        {/* Colored Icon Badge */}
                        <div
                          className="rp-station-icon"
                          style={{ background: `linear-gradient(135deg, ${station.color[0]}, ${station.color[1]})`, boxShadow: isActive ? `0 3px 10px ${station.glow}` : 'none' }}
                        >
                          {station.icon}
                        </div>

                        {/* Station Info */}
                        <div className="rp-station-info">
                          <div className="rp-station-name">{station.name}</div>
                          <div className="rp-station-meta">
                            <CountryBadge code={station.flag} />
                            <span className="rp-station-genre">{station.genre}</span>
                          </div>
                        </div>

                        {/* Play State Indicator */}
                        <div className="rp-station-state">
                          {isThisLoading ? (
                            <svg viewBox="0 0 24 24" width="14" height="14" style={{ animation: 'rp-spin 1s linear infinite' }}>
                              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" fill={station.color[0]}/>
                            </svg>
                          ) : isThisPlaying ? (
                            <div className="rp-eq-bars">
                              {[0,1,2,3].map(i => (
                                <span key={i} style={{ background: `linear-gradient(to top, ${station.color[0]}, ${station.color[1]})`, animationDelay: `${i * 0.15}s` }}/>
                              ))}
                            </div>
                          ) : (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill={isActive ? station.color[0] : '#9ca3af'}>
                              <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Now Playing Card ── */}
                {activeStation && (
                  <div
                    className="rp-now-playing"
                    style={{
                      '--np-c1': activeStation.color[0],
                      '--np-c2': activeStation.color[1],
                      '--np-glow': activeStation.glow,
                    }}
                  >
                    <div className="rp-np-top">
                      <div
                        className="rp-np-icon"
                        style={{ background: `linear-gradient(135deg, ${activeStation.color[0]}, ${activeStation.color[1]})`, boxShadow: `0 4px 14px ${activeStation.glow}` }}
                      >
                        {React.cloneElement(activeStation.icon, { width: 20, height: 20 })}
                      </div>
                      <div className="rp-np-info">
                        <div className="rp-np-name">{activeStation.name}</div>
                        <div className="rp-np-desc">{activeStation.description}</div>
                      </div>
                      {isPlaying && (
                        <div className="rp-np-eq">
                          {[0,1,2,3,4].map(i => (
                            <span key={i} style={{ background: `linear-gradient(to top, ${activeStation.color[0]}, ${activeStation.color[1]})`, animationDelay: `${i * 0.12}s` }}/>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rp-np-controls">
                      {/* Play / Pause */}
                      <button
                        className="rp-play-btn"
                        onClick={() => playStation(activeStation)}
                        disabled={isLoading}
                        style={{ background: `linear-gradient(135deg, ${activeStation.color[0]}, ${activeStation.color[1]})`, boxShadow: `0 4px 16px ${activeStation.glow}` }}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isLoading ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" style={{ animation: 'rp-spin 1s linear infinite' }}>
                            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" fill="#fff"/>
                          </svg>
                        ) : isPlaying ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                            <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                            <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                          </svg>
                        )}
                      </button>

                      {/* Stop */}
                      <button className="rp-stop-btn" onClick={stopRadio} title="Stop">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                      </button>

                      {/* Volume */}
                      <div className="rp-volume">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill={activeStation.color[0]}>
                          <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
                        </svg>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="rp-volume-slider"
                          style={{ '--vol-color': activeStation.color[0] }}
                        />
                        <span className="rp-vol-pct">{Math.round(volume * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsLoading(false);
          setIsPlaying(false);
          setCurrentStation(null);
          toast.error(
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Station unavailable. Try another!
            </span>,
            { style: { background: 'linear-gradient(135deg,#1a0a2e,#2d1b69)', color: '#fff', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px' }, icon: false, autoClose: 3000 }
          );
        }}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
    </>
  );
};

export default RadioPlayer;
