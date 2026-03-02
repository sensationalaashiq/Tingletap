import React, { useState, useRef, useEffect } from 'react';
import './CustomAudioPlayer.css';

const CustomAudioPlayer = ({ audioUrl, audioFileName, isYouTubeMusic = false, youtubeVideoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [audioData, setAudioData] = useState(new Array(20).fill(0));
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);

  // Audio visualization animation
  const animateVisualization = () => {
    if (isPlaying) {
      setAudioData(prev => prev.map(() => Math.random() * 100));
      animationRef.current = setTimeout(animateVisualization, 100);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    } else {
      setDuration(0);
    }
  };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // YouTube Music time tracking
  useEffect(() => {
    if (isYouTubeMusic && isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          return newTime > duration ? duration : newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isYouTubeMusic, isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animateVisualization();
    } else {
      clearTimeout(animationRef.current);
      setAudioData(new Array(20).fill(0));
    }

    return () => clearTimeout(animationRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      const iframe = youtubePlayerRef.current;
      try {
        if (isPlaying) {
          // Try to pause the YouTube video
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          setIsPlaying(false);
        } else {
          // Try to play the YouTube video
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        }
      } catch (error) {
        console.log('YouTube player control error:', error);
        // Fallback: reload iframe to restart
        if (!isPlaying) {
          const currentSrc = iframe.src;
          iframe.src = currentSrc.replace('autoplay=0', 'autoplay=1');
          setIsPlaying(true);
        }
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + (currentTime + 10) + ', true]}', '*');
      } catch (error) {
        console.log('YouTube seek error:', error);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 10, duration);
  };

  const skipBackward = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + Math.max(currentTime - 10, 0) + ', true]}', '*');
      } catch (error) {
        console.log('YouTube seek error:', error);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  const replay = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
        if (!isPlaying) {
          youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        }
      } catch (error) {
        console.log('YouTube replay error:', error);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={isYouTubeMusic ? "youtube-music-player" : "compact-audio-player"}>
      {/* Audio Visualization */}
      <div className="audio-visualizer">
        {audioData.map((height, index) => (
          <div
            key={index}
            className="visualizer-bar"
            style={{ height: `${Math.max(height, 10)}%` }}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div 
        className="compact-progress-bar"
        ref={progressRef}
        onClick={handleProgressClick}
      >
        <div 
          className="compact-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls Section */}
      <div className="compact-controls">
        {/* Left Side - Play Controls */}
        <div className="left-controls">
          <button
            className="compact-btn replay-btn"
            onClick={replay}
            title="Replay"
          >
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
              <path d="M12,5V1L7,6L12,11V7A6,6 0 0,1 18,13A6,6 0 0,1 12,19A6,6 0 0,1 6,13H4A8,8 0 0,0 12,21A8,8 0 0,0 20,13A8,8 0 0,0 12,5Z"/>
            </svg>
          </button>

          <button
            className="compact-btn backward-btn"
            onClick={skipBackward}
            title="Backward 10s"
          >
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
              <path d="M11.5,12L20,18V6M11,18V6L2.5,12L11,18Z"/>
            </svg>
          </button>

          <button
            className="compact-btn play-btn"
            onClick={togglePlay}
            disabled={isLoading}
          >
            {isLoading ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
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
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
              </svg>
            )}
          </button>

          <button
            className="compact-btn forward-btn"
            onClick={skipForward}
            title="Forward 10s"
          >
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
              <path d="M13,6V18L21.5,12M4,18L12.5,12L4,6V18Z"/>
            </svg>
          </button>
        </div>

        {/* Center - Time Display */}
        <div className="time-info">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Right Side - Volume Control */}
        <div className="volume-section">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
            <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="compact-volume-slider"
          />
        </div>
      </div>

      {/* Audio/YouTube Element */}
      {isYouTubeMusic ? (
        <iframe
          ref={youtubePlayerRef}
          src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&loop=1&playlist=${youtubeVideoId}&origin=${window.location.origin}`}
          style={{ 
            width: '1px', 
            height: '1px',
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
            opacity: 0,
            pointerEvents: 'none'
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="YouTube Music Player"
          onLoad={() => {
            setIsLoading(false);
            // Set dummy duration for YouTube music
            setDuration(180); // 3 minutes default
          }}
        />
      ) : (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onError={(e) => {
            console.error('Audio error:', e);
            setIsLoading(false);
            setIsPlaying(false);
          }}
        />
      )}
    </div>
  );
};

export default CustomAudioPlayer;