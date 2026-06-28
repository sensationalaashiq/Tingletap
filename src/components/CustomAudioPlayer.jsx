import React, { useState, useRef, useEffect } from 'react';
import './CustomAudioPlayer.css';

const CustomAudioPlayer = ({ audioUrl, audioFileName, isYouTubeMusic = false, youtubeVideoId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [audioData, setAudioData] = useState(new Array(16).fill(0));
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);

  const animateVisualization = () => {
    if (isPlaying) {
      setAudioData(prev => prev.map(() => Math.random() * 100));
      animationRef.current = setTimeout(animateVisualization, 120);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
      else setDuration(0);
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
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

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
      setAudioData(new Array(16).fill(0));
    }
    return () => clearTimeout(animationRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      const iframe = youtubePlayerRef.current;
      try {
        if (isPlaying) {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          setIsPlaying(false);
        } else {
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        }
      } catch (error) {
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
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
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
      try { youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + (currentTime + 10) + ', true]}', '*'); } catch (e) {}
      return;
    }
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(audio.currentTime + 10, duration);
  };

  const skipBackward = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      try { youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[' + Math.max(currentTime - 10, 0) + ', true]}', '*'); } catch (e) {}
      return;
    }
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  const replay = () => {
    if (isYouTubeMusic && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
        if (!isPlaying) { youtubePlayerRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*'); setIsPlaying(true); }
      } catch (e) {}
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    if (!isPlaying) { audio.play(); setIsPlaying(true); }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={isYouTubeMusic ? "youtube-music-player" : "compact-audio-player"}>

      {/* YouTube Music In-Player Header */}
      {isYouTubeMusic && (
        <div className="yt-player-header">
          <svg viewBox="0 0 24 24" width="16" height="16" style={{flexShrink:0}}>
            <rect width="24" height="24" rx="4" fill="#FF0000"/>
            <path d="M9.5 7.5l8 4.5-8 4.5z" fill="white"/>
          </svg>
          <span className="yt-player-title">YouTube Music</span>
        </div>
      )}

      {/* Visualizer */}
      <div className="audio-visualizer">
        {audioData.map((height, index) => (
          <div
            key={index}
            className="visualizer-bar"
            style={{ height: `${Math.max(height, 8)}%` }}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="compact-progress-bar" ref={progressRef} onClick={handleProgressClick}>
        <div className="compact-progress-fill" style={{ width: `${progressPercent}%` }} />
        <div className="progress-thumb" style={{ left: `${progressPercent}%` }} />
      </div>

      {/* Controls */}
      <div className="compact-controls">

        {/* Replay */}
        <button className="compact-btn icon-btn" onClick={replay} title="Replay">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>

        {/* Skip Back */}
        <button className="compact-btn icon-btn" onClick={skipBackward} title="-10s">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button className="compact-btn play-btn" onClick={togglePlay} disabled={isLoading}>
          {isLoading ? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>
              </path>
            </svg>
          ) : isPlaying ? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Skip Forward */}
        <button className="compact-btn icon-btn" onClick={skipForward} title="+10s">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
          </svg>
        </button>

        {/* Time */}
        <div className="time-info">
          <span>{formatTime(currentTime)}</span>
          <span className="time-sep">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Volume */}
        <div className="volume-section">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="compact-volume-slider"
          />
        </div>

      </div>

      {/* Hidden audio/iframe element */}
      {isYouTubeMusic ? (
        <iframe
          ref={youtubePlayerRef}
          src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&loop=1&playlist=${youtubeVideoId}&origin=${window.location.origin}`}
          style={{ width:'1px', height:'1px', position:'absolute', top:'-9999px', left:'-9999px', opacity:0, pointerEvents:'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="YouTube Music Player"
          onLoad={() => { setIsLoading(false); setDuration(180); }}
        />
      ) : (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onError={() => { setIsLoading(false); setIsPlaying(false); }}
        />
      )}
    </div>
  );
};

export default CustomAudioPlayer;
