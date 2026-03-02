import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import './RadioPlayer.css';

const RadioPlayer = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const audioRef = useRef(null);

  const getStationIcon = (stationId) => {
    switch(stationId) {
      case 1: // AIR Vividh Bharati
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
          </svg>
        );
      case 2: // Radio Mirchi Dubai
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V10.5C3,11.33 3.67,12 4.5,12C5.33,12 6,11.33 6,10.5V8H8V16H6V15.5C6,14.67 5.33,14 4.5,14C3.67,14 3,14.67 3,15.5V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V15.5C17,14.67 16.33,14 15.5,14C14.67,14 14,14.67 14,15.5V16H12V8H14V10.5C14,11.33 14.67,12 15.5,12C16.33,12 17,11.33 17,10.5M20,6V18A1,1 0 0,1 19,19H18V5H19A1,1 0 0,1 20,6Z"/>
          </svg>
        );
      case 3: // Big FM Dubai
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
          </svg>
        );
      case 4: // Radio City Hindi
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12,2C17.5,2 22,6.5 22,12C22,17.5 17.5,22 12,22C6.5,22 2,17.5 2,12C2,6.5 6.5,2 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
          </svg>
        );
      case 5: // Fever FM
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M20,6C20.58,6 21.05,6.2 21.42,6.59C21.8,7 22,7.45 22,8V16C22,16.55 21.8,17 21.42,17.41C21.05,17.8 20.58,18 20,18H4C3.42,18 2.95,17.8 2.58,17.41C2.2,17 2,16.55 2,16V8C2,7.45 2.2,7 2.58,6.59C2.95,6.2 3.42,6 4,6H7.5L9.5,4L10.5,5.5L9.5,6.5H20M4,8V16H20V8H4M8,10A2,2 0 0,1 10,12A2,2 0 0,1 8,14A2,2 0 0,1 6,12A2,2 0 0,1 8,10M8,11A1,1 0 0,0 7,12A1,1 0 0,0 8,13A1,1 0 0,0 9,12A1,1 0 0,0 8,11Z"/>
          </svg>
        );
      case 6: // Hits of Bollywood
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M15,6H3V8H15V6M15,10H3V12H15V10M3,16H11V14H3V16M17,6V14.18C16.69,14.07 16.35,14 16,14A3,3 0 0,0 13,17A3,3 0 0,0 16,20A3,3 0 0,0 19,17V8H22V6H17Z"/>
          </svg>
        );
      case 7: // American Music Radio
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16M12,2A1,1 0 0,1 13,3V5A1,1 0 0,1 12,6A1,1 0 0,1 11,5V3A1,1 0 0,1 12,2M12,19A1,1 0 0,1 13,20V22A1,1 0 0,1 12,23A1,1 0 0,1 11,22V20A1,1 0 0,1 12,19Z"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A4,4 0 0,0 6,17A4,4 0 0,0 10,21A4,4 0 0,0 14,17V7H18V3H12Z"/>
          </svg>
        );
    }
  };

  const radioStations = [
    {
      id: 1,
      name: "AIR Vividh Bharati",
      url: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
      genre: "Bollywood & Popular Music",
      country: "India", 
      description: "All India Radio - Your Favorite Station"
    },
    {
      id: 2,
      name: "Radio Mirchi Dubai",
      url: "https://eu8.fastcast4u.com/proxy/clyedupq?mp=/1",
      genre: "Bollywood & Entertainment",
      country: "UAE",
      description: "Popular Bollywood Music from Dubai"
    },
    {
      id: 3,
      name: "Big FM Dubai",
      url: "https://funasia.streamguys1.com/live4",
      genre: "Bollywood & Popular Music",
      country: "UAE",
      description: "Big FM Dubai - Your Favorite Bollywood Hits"
    },
    {
      id: 4,
      name: "Radio City Hindi",
      url: "https://stream-147.zeno.fm/pxc55r5uyc9uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJweGM1NXI1dXljOXV2IiwiaG9zdCI6InN0cmVhbS0xNDcuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6ImdvOEVRMDBnUmVTZWZaMzFadW81ZFEiLCJpYXQiOjE3NTI0MTY4NjUsImV4cCI6MTc1MjQxNjkyNX0.ZD6NoOFIEwb8lUXyV8EnZFIZ2Wlubh1-rOqp15YSlys",
      genre: "Hindi Music",
      country: "India",
      description: "Radio City Hindi - Best Hindi Music"
    },
    {
      id: 5,
      name: "Fever FM",
      url: "https://radio.canstream.co.uk:8115/live.mp3",
      genre: "Asian Music",
      country: "UK",
      description: "Fever FM - Asian Music & Entertainment"
    },
    {
      id: 6,
      name: "Hits of Bollywood",
      url: "https://stream-171.zeno.fm/8ty8szwpwfeuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI4dHk4c3p3cHdmZXV2IiwiaG9zdCI6InN0cmVhbS0xNzEuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6Im9FTWdMVnJTVHRpVWxGRzFTZHBYSmciLCJpYXQiOjE3NTI0MTcwODMsImV4cCI6MTc1MjQxNzE0M30.I_ALFdeucggXjaJpUyXc2AzrMRatOveFoIj7tPx_pCw",
      genre: "Bollywood Hits",
      country: "International",
      description: "Hits of Bollywood - Top Bollywood Songs"
    },
    {
      id: 7,
      name: "98.7 FM",
      url: "https://28323.live.streamtheworld.com/987FM.mp3",
      genre: "Top 40 Hits",
      country: "Singapore",
      description: "98.7 FM Singapore - Your Hit Music Station"
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

        // Add timeout for loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Loading timeout')), 10000)
        );

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await Promise.race([playPromise, timeoutPromise]);
          setIsPlaying(true);

          console.log(`Now playing: ${station.name}`);
        }
      }
    } catch (error) {
      console.error(`Error playing radio station:`, error);
      setIsPlaying(false);
      console.error(`Unable to play ${station.name}. Please try another station.`);
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

  const handleClose = () => {
    // Keep audio playing in background when closing popup
    // Audio element stays in DOM and continues playing
    onClose();
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    // Audio continues playing when minimized
  };

  // Always render audio element for continuous playback
  return (
    <>
      {isOpen && (
        <div className="radio-popup-container">
      <div className="radio-popup">
        {/* Header */}
        <div className="radio-header">
          <div className="radio-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3.24,6.15C2.51,6.43 2,7.17 2,8V16C2,16.83 2.51,17.57 3.24,17.85L4,18.11V5.89L3.24,6.15M8,5A3,3 0 0,0 5,8V16A3,3 0 0,0 8,19H9V5H8M10,8.5V11.5H12V8.5H10M14,5V19H15A3,3 0 0,0 18,16V8A3,3 0 0,0 15,5H14M19,8V16C19,17.11 19.89,18 21,18V6C19.89,6 19,6.89 19,8Z"/>
            </svg>
            <span>Radio Player</span>
          </div>
          <div className="radio-header-controls">
            <button 
              className="minimize-btn" 
              onClick={handleMinimize}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d={isMinimized ? "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" : "M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"}/>
              </svg>
            </button>
            <button className="close-btn" onClick={handleClose} title="Close">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
              </svg>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="radio-content">
            {/* Station List */}
            <div className="stations-section">
              <div className="stations-list">
                {radioStations.map((station) => (
                  <div
                    key={station.id}
                    className={`station-item ${currentStation?.id === station.id ? 'active' : ''}`}
                    onClick={() => playStation(station)}
                  >
                    <div className="station-content">
                      <div className="station-icon">
                        {getStationIcon(station.id)}
                      </div>
                      <div className="station-info">
                        <div className="station-name">{station.name}</div>
                        <div className="station-genre">{station.genre}</div>
                      </div>
                      <div className="station-action">
                        {isLoading && currentStation?.id === station.id ? (
                          <div className="loading">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                                <animateTransform 
                                  attributeName="transform" 
                                  type="rotate" 
                                  from="0 12 12" 
                                  to="360 12 12" 
                                  dur="1s" 
                                  repeatCount="indefinite"
                                />
                              </path>
                            </svg>
                          </div>
                        ) : currentStation?.id === station.id && isPlaying ? (
                          <div className="playing-indicator">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M6,19H8V5H6M14,5V19L21,12"/>
                            </svg>
                          </div>
                        ) : (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Playing Controls */}
            {currentStation && (
              <div className="now-playing">
                <div className="station-info">
                  <div className="station-details">
                    <div className="station-name">{currentStation.name}</div>
                    <div className="station-desc">{currentStation.description}</div>
                  </div>
                  <div className="playback-status">
                    {isLoading ? (
                      <div className="loading">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                            <animateTransform 
                              attributeName="transform" 
                              type="rotate" 
                              from="0 12 12" 
                              to="360 12 12" 
                              dur="1s" 
                              repeatCount="indefinite"
                            />
                          </path>
                        </svg>
                      </div>
                    ) : isPlaying ? (
                      <div className="playing-bars">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
                      </svg>
                    )}
                  </div>
                </div>

                <div className="controls">
                  <button
                    className="control-btn"
                    onClick={() => playStation(currentStation)}
                    disabled={isLoading}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                      </svg>
                    )}
                  </button>
                  <button className="control-btn" onClick={stopRadio}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M18,18H6V6H18V18Z"/>
                    </svg>
                  </button>
                  <div className="volume-control">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        </div>
      
      </div>
      )}
      
      {/* Audio Element - Always present for continuous playback, outside popup container */}
      <audio
        ref={audioRef}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsLoading(false);
          setIsPlaying(false);
          setCurrentStation(null);
          toast.error(`Station unavailable. Please try another station.`, {
            position: "top-center",
            autoClose: 3000,
            theme: "colored"
          });
        }}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
    </>
  );
};

export default RadioPlayer;