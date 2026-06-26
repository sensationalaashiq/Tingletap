import React, { useState, useRef, useEffect } from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import { motion, AnimatePresence } from 'framer-motion';
import useDraggable from '../hooks/useDraggable';
import CustomAudioPlayer from './CustomAudioPlayer';
import { auth } from '../firebase/config';
import './LuxuryPrivateMessageWindow.css';

const LuxuryPrivateMessageWindow = ({
  isOpen,
  privateMessageTarget,
  privateMessages,
  privateMessage,
  setPrivateMessage,
  onSendMessage,
  onMinimize,
  onClose,
  isPrivateAttachOpen,
  setIsPrivateAttachOpen,
  handlePrivateAudioButtonClick,
  handlePrivateAudioMiniSend,
  privateFileInputRef,
  loggedInUserProfile,
  getUserStatus,
  getPrivateMessageAvatarUrl
}) => {
  const chatAreaRef = useRef(null);
  const attachmentDropdownRef = useRef(null);
  const audioPopupRef = useRef(null);
  const windowRef = useRef(null);
  
  // Inline audio popup state
  const [isInlineAudioOpen, setIsInlineAudioOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState(null);
  const audioInputRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Ultra-smooth dragging with dynamic viewport bounds
  const {
    ref: dragRef,
    position,
    isDragging,
    onMouseDown,
    onTouchStart,
    style: dragStyle
  } = useDraggable({
    initialPosition: {
      x: Math.max(10, (window.innerWidth - 280) / 2),
      y: Math.max(10, (window.innerHeight - 280) / 2)
    },
    bounds: {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    },
    handle: '.ultra-pm-header',
    onDrag: () => {
      // Update bounds dynamically for responsive dragging
      return {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight
      };
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [privateMessages]);

  // Audio popup functions
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        setAudioPreview(URL.createObjectURL(blob));
      };

      setAudioStream(stream);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recorder.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    }
  };

  const handleInlineAudioClick = () => {
    setIsInlineAudioOpen(prev => !prev);
    if (!isInlineAudioOpen) {
      setIsPrivateAttachOpen(false); // Close attachment dropdown when opening audio
    }
  };

  const handleAudioSend = async () => {
    if (recordedBlob || selectedAudio) {
      try {
        const audioFile = recordedBlob || selectedAudio;
        console.log('🎤 Sending audio from inline popup:', {
          hasBlob: !!audioFile,
          blobType: audioFile?.type,
          blobSize: audioFile?.size
        });
        
        // Call the parent's private audio mini send handler directly
        if (window.handlePrivateAudioMiniSend) {
          await window.handlePrivateAudioMiniSend(audioFile);
        } else if (handlePrivateAudioMiniSend) {
          await handlePrivateAudioMiniSend(audioFile);
        } else {
          console.error('❌ No audio send handler available');
          return;
        }
        
        // Reset state after successful send
        setSelectedAudio(null);
        setAudioPreview(null);
        setRecordedBlob(null);
        setRecordingTime(0);
        setIsInlineAudioOpen(false);
        
        console.log('✅ Audio sent successfully from inline popup');
      } catch (error) {
        console.error('❌ Error sending audio from inline popup:', error);
      }
    } else {
      console.warn('⚠️ No audio to send');
    }
  };

  const handleAudioFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedAudio(file);
      setAudioPreview(URL.createObjectURL(file));
      setRecordedBlob(null); // Clear recorded audio if file is selected
    }
  };

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 600) { // 10 minute limit
            stopRecording();
            return 600;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentDropdownRef.current && !attachmentDropdownRef.current.contains(event.target)) {
        setIsPrivateAttachOpen(false);
      }
    };

    if (isPrivateAttachOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPrivateAttachOpen, setIsPrivateAttachOpen]);

  // Handle send message with Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (privateMessage.trim()) {
        onSendMessage();
      }
    }
  };

  // Fixed minimize functionality
  const handleMinimizeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Minimize clicked - Target:', privateMessageTarget);

    if (privateMessageTarget && onMinimize) {
      const conversation = {
        conversationId: [auth.currentUser?.uid, privateMessageTarget?.uid].sort().join('_'),
        otherUserId: privateMessageTarget?.uid,
        otherUserName: privateMessageTarget?.displayName || privateMessageTarget?.name,
        otherUser: privateMessageTarget,
        lastMessage: privateMessages.length > 0 ?
          (privateMessages[privateMessages.length - 1].text || 'Media file') :
          'No messages yet',
        lastMessageTime: privateMessages.length > 0 ?
          privateMessages[privateMessages.length - 1].createdAt :
          new Date()
      };
      console.log('Minimizing conversation:', conversation);
      onMinimize(conversation);
    }
  };

  // Fixed close functionality
  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Close clicked');

    // Remove from minimized conversations when closing
    if (privateMessageTarget && window.removeMinimizedConversation) {
      const conversationId = [auth.currentUser?.uid, privateMessageTarget?.uid].sort().join('_');
      window.removeMinimizedConversation(conversationId);
    }

    if (onClose) {
      onClose();
    }
  };

  // Handle attachment button click
  const handleAttachmentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPrivateAttachOpen(!isPrivateAttachOpen);
  };

  // Handle private audio button click with proper positioning
  const handlePrivateAudioClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get audio button position
    const audioButton = e.currentTarget;
    const rect = audioButton.getBoundingClientRect();
    
    // Position 5px above the audio button
    const position = {
      x: rect.left + (rect.width / 2) - 70, // Center horizontally (popup is 140px wide)
      y: rect.top - 125 // 5px above + popup height
    };
    
    handlePrivateAudioButtonClick(e, position);
    setIsPrivateAttachOpen(false);
  };

  if (!isOpen || !privateMessageTarget) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={(el) => {
              dragRef.current = el;
              windowRef.current = el;
            }}
            className="ultra-luxury-pm-window"
            style={{
              ...dragStyle,
              zIndex: isDragging ? 10001 : 10000,
              transform: 'translate3d(0, 0, 0)',
              transition: 'none',
              margin: 0,
              padding: 0,
              bottom: 'auto',
              pointerEvents: isDragging ? 'none' : 'auto'
            }}
            initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 15 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              duration: 0.4
            }}
            layout
          >
            {/* Ultra Luxury Header */}
            <motion.div
              className="ultra-pm-header"
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="ultra-pm-user-section">
                <div className="ultra-pm-avatar-wrapper">
                  <img
                    src={(() => {
                      if (!privateMessageTarget?.uid) return `${getDefaultAvatarUrl('default', 'male')}`;
                      const cachedUser = window.userProfilesCache?.get(privateMessageTarget.uid);
                      return cachedUser ? getPrivateMessageAvatarUrl(cachedUser) : `${getDefaultAvatarUrl(privateMessageTarget.uid, privateMessageTarget?.gender)}`;
                    })()}
                    alt="avatar"
                    className="ultra-pm-avatar"
                  />
                  <div className={`ultra-pm-status-dot ${getUserStatus(privateMessageTarget?.uid).isOnline ? 'online' : 'offline'}`} />
                </div>
                <div className="ultra-pm-user-info">
                  <h4 className="ultra-pm-username">
                    {window.userProfilesCache?.get(privateMessageTarget?.uid)?.displayName || privateMessageTarget?.displayName || privateMessageTarget?.name || 'Chat'}
                  </h4>
                  <span className={`ultra-pm-status-text ${getUserStatus(privateMessageTarget?.uid).isOnline ? 'online' : 'offline'}`}>
                    {getUserStatus(privateMessageTarget?.uid).status}
                  </span>
                </div>
              </div>

              <div className="ultra-pm-controls">
                <motion.button
                  className="ultra-pm-control-btn minimize-btn"
                  onClick={handleMinimizeClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  whileHover={{ scale: 1.2, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                  whileTap={{ scale: 0.9 }}
                  title="Minimize"
                >
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                    <path d="M19,13H5V11H19V13Z" />
                  </svg>
                </motion.button>

                <motion.button
                  className="ultra-pm-control-btn close-btn"
                  onClick={handleCloseClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  whileHover={{ scale: 1.2, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                  whileTap={{ scale: 0.9 }}
                  title="Close"
                >
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>

            {/* Ultra Compact Chat Area */}
            <motion.div
              className="ultra-pm-chat-container"
              ref={chatAreaRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimatePresence>
                {privateMessages.length === 0 ? (
                  <motion.div
                    className="ultra-pm-empty-state"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <div className="ultra-empty-icon">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                      </svg>
                    </div>
                    <p>Start chatting...</p>
                  </motion.div>
                ) : (
                  <div className="ultra-pm-messages-list">
                    {privateMessages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        className={`ultra-pm-message ${msg.senderId === auth.currentUser?.uid ? 'sent' : 'received'}`}
                        initial={{ opacity: 0, x: msg.senderId === auth.currentUser?.uid ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 400,
                          delay: 0
                        }}
                      >
                        <div className="ultra-pm-msg-avatar">
                          <img
                            src={(() => {
                              const cachedUser = window.userProfilesCache?.get(msg.senderId);
                              if (cachedUser) {
                                return getPrivateMessageAvatarUrl(cachedUser);
                              }
                              if (msg.senderId === auth.currentUser?.uid) {
                                return loggedInUserProfile?.photoURL || `${getDefaultAvatarUrl(msg.senderId, loggedInUserProfile?.gender)}`;
                              } else {
                                return privateMessageTarget?.photoURL || `${getDefaultAvatarUrl(msg.senderId, privateMessageTarget?.gender)}`;
                              }
                            })()}
                            alt="avatar"
                            className="ultra-msg-avatar-img"
                          />
                        </div>
                        <div className="ultra-pm-msg-content">
                          <div className="ultra-pm-msg-header">
                            <span className="ultra-pm-sender">{msg.senderName}</span>
                            <span className="ultra-pm-timestamp">
                              {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          {msg.text && <p className="ultra-pm-msg-text">{msg.text}</p>}
                          {msg.imageUrl && (
                            <motion.div
                              className="ultra-pm-image-wrapper"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <img
                                src={msg.imageUrl}
                                alt={msg.imageFileName || 'Shared image'}
                                className="ultra-pm-image"
                                onClick={() => window.open(msg.imageUrl, '_blank')}
                              />
                            </motion.div>
                          )}
                          {msg.audioUrl && (
                            <motion.div
                              className="ultra-pm-audio-wrapper"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <CustomAudioPlayer
                                audioUrl={msg.audioUrl}
                                audioFileName={msg.audioFileName}
                                className="compact-audio-player"
                              />
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Ultra Compact Input Area */}
            <motion.div
              className="ultra-pm-input-area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="ultra-pm-input-row">
                <div className="ultra-pm-attachment-section" ref={attachmentDropdownRef} style={{ position: 'relative' }}>
                  <motion.button
                    type="button"
                    className="ultra-pm-attach-btn"
                    onClick={handleAttachmentClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Attachments"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 231.8828 202.3201"
                      width="22"
                      height="22"
                    >
                      <g>
                        <path
                          fill="#5CB0FF"
                          d="M118.7695,98.3201c24.2617,0,44-19.7383,44-44s-19.7383-44-44-44s-44,19.7383-44,44 S94.5078,98.3201,118.7695,98.3201z M90.7695,50.3201h24v-24c0-2.209,1.7891-4,4-4s4,1.791,4,4v24h24c2.2109,0,4,1.791,4,4 s-1.7891,4-4,4h-24v24c0,2.209-1.7891,4-4,4s-4-1.791-4-4v-24h-24c-2.2109,0-4-1.791-4-4S88.5586,50.3201,90.7695,50.3201z"
                        />
                        <path
                          fill="#1C71DA"
                          d="M8,162.4509c0-17.5742,14.3086-31.8711,31.8984-31.8711h80.0859c17.5898,0,31.8984,14.2969,31.8984,31.8711 v4h8v-4c0-21.9844-17.8984-39.8711-39.8984-39.8711H39.8984c-22,0-39.8984,17.8867-39.8984,39.8711 s17.8984,39.8691,39.8984,39.8691h31.0039v-8H39.8984C22.3086,194.3201,8,180.0232,8,162.4509z"
                        />
                        <path
                          fill="#1C71DA"
                          d="M191.9844,122.5798h-31.0039v8h31.0039c17.5898,0,31.8984,14.2969,31.8984,31.8691 c0,17.5742-14.3086,31.8711-31.8984,31.8711h-80.0859C94.3086,194.3201,80,180.0232,80,162.449v-4h-8v4 c0,21.9844,17.8984,39.8711,39.8984,39.8711h80.0859c22,0,39.8984-17.8867,39.8984-39.8711S213.9844,122.5798,191.9844,122.5798z"
                        />
                        <path
                          fill="#1C71DA"
                          d="M118.7695,106.3201c28.6719,0,52-23.3262,52-52s-23.3281-52-52-52s-52,23.3262-52,52 S90.0977,106.3201,118.7695,106.3201z M118.7695,10.3201c24.2617,0,44,19.7383,44,44s-19.7383,44-44,44s-44-19.7383-44-44 S94.5078,10.3201,118.7695,10.3201z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M90.7695,58.3201h24v24c0,2.209,1.7891,4,4,4s4-1.791,4-4v-24h24c2.2109,0,4-1.791,4-4s-1.7891-4-4-4h-24 v-24c0-2.209-1.7891-4-4-4s-4,1.791-4,4v24h-24c-2.2109,0-4,1.791-4,4S88.5586,58.3201,90.7695,58.3201z"
                        />
                      </g>
                      <path
                        fill="#FF5D5D"
                        d="M199.0215,22.1438c-1.0234,0-2.0469-0.3906-2.8281-1.1714c-1.5625-1.5625-1.5625-4.0952,0-5.6572 l14.1426-14.1421c1.5605-1.5615,4.0938-1.5615,5.6562,0c1.5625,1.5625,1.5625,4.0952,0,5.6572l-14.1426,14.1421 C201.0693,21.7532,200.0449,22.1438,199.0215,22.1438z"
                      />
                      <path
                        fill="#FF5D5D"
                        d="M213.1641,22.1423c-1.0234,0-2.0479-0.3906-2.8281-1.1714L196.1934,6.8284 c-1.5625-1.5625-1.5625-4.0947,0-5.6572c1.5605-1.5615,4.0957-1.5615,5.6562,0l14.1426,14.1426 c1.5625,1.5625,1.5625,4.0947,0,5.6572C215.2119,21.7517,214.1875,22.1423,213.1641,22.1423z"
                      />
                      <path
                        fill="#00D40B"
                        d="M205.0215,122.1438c-7.7197,0-14-6.2803-14-14s6.2803-14,14-14s14,6.2803,14,14 S212.7412,122.1438,205.0215,122.1438z M205.0215,102.1438c-3.3086,0-6,2.6914-6,6s2.6914,6,6,6s6-2.6914,6-6 S208.3301,102.1438,205.0215,102.1438z"
                      />
                      <path
                        fill="#FFC504"
                        d="M22.3359,112.7693c-1.0234,0-2.0469-0.3906-2.8281-1.1714L8.1934,100.2844 c-0.75-0.75-1.1719-1.7676-1.1719-2.8286s0.4219-2.0786,1.1719-2.8286l11.3145-11.3135c1.5625-1.5615,4.0938-1.5615,5.6562,0 l11.3135,11.3135c1.5625,1.5625,1.5625,4.0947,0,5.6572l-11.3135,11.3135C24.3838,112.3787,23.3594,112.7693,22.3359,112.7693z M16.6787,97.4558l5.6572,5.6567l5.6562-5.6567l-5.6562-5.6567L16.6787,97.4558z"
                      />
                    </svg>
                  </motion.button>

                  <AnimatePresence>
                    {isPrivateAttachOpen && (
                      <motion.div
                        className="ultra-pm-attach-dropdown"
                        initial={{ opacity: 0, scale: 0.8, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 5 }}
                        transition={{ type: "spring", damping: 25, stiffness: 400 }}
                      >
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            privateFileInputRef.current?.click();
                            setIsPrivateAttachOpen(false);
                          }}
                          className="ultra-attach-option"
                          whileHover={{ scale: 1.05, x: 3 }}
                          whileTap={{ scale: 0.95 }}
                          title="Send Image"
                        >
                          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                            <defs>
                              <linearGradient id="linear-gradient-pm" gradientUnits="userSpaceOnUse" x1="43.585" x2="67.615" y1="73.878" y2="49.848">
                                <stop offset="0" stopColor="#e6dee9" />
                                <stop offset="1" stopColor="#fdcbf1" />
                              </linearGradient>
                              <linearGradient id="New_Gradient_Swatch_9_pm" gradientUnits="userSpaceOnUse" x1="5.016" x2="94.984" y1="50" y2="50">
                                <stop offset="0" stopColor="#ba0089" />
                                <stop offset="1" stopColor="#2e3192" />
                              </linearGradient>
                            </defs>
                            <g>
                              <g>
                                <path d="m53.889 74.853c0 2.134-1.73 3.864-3.864 3.864s-3.864-1.73-3.864-3.864 1.73-3.864 3.864-3.864 3.864 1.73 3.864 3.864zm11.996 8.778h1.797v-10.238h-1.797c-1.52 0-2.751 1.232-2.751 2.751v4.735c0 1.52 1.232 2.751 2.751 2.751zm-1.239-35.423-14.621-11.027-14.621 11.027 5.158 4.072h29.486z" fill="url(#linear-gradient-pm)" />
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m21.271 58.542c0 .561-.455 1.015-1.015 1.015h-7.07c-.561 0-1.015-.455-1.015-1.015s.455-1.015 1.015-1.015h7.07c.561 0 1.015.455 1.015 1.015zm-11.196-1.015c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm10.181 3.49h-7.07c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015h7.07c.561 0 1.015-.455 1.015-1.015s-.455-1.015-1.015-1.015zm-10.181 0c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm10.181 3.49h-7.07c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015h7.07c.561 0 1.015-.455 1.015-1.015s-.455-1.015-1.015-1.015zm-10.181 0c-.561 0-1.015.455-1.015 1.015s.455 1.015 1.015 1.015 1.015-.455 1.015-1.015-.455-1.015-1.015-1.015zm84.909-46.094v46.899c0 3.882-3.158 7.041-7.041 7.041h-19.286v12.579c0 2.039-1.659 3.697-3.698 3.697h-29.918c-2.039 0-3.698-1.659-3.698-3.697v-12.579h-19.286c-3.883 0-7.041-3.159-7.041-7.041v-46.899c0-3.882 3.158-7.041 7.041-7.041h75.886c3.883 0 7.041 3.159 7.041 7.041zm-28.327 66.519v-.133h-.797c-2.068 0-3.752-1.683-3.752-3.751v-4.735c0-2.068 1.684-3.751 3.752-3.751h.797v-3.383c0-.936-.762-1.698-1.698-1.698h-6.491c-.418 0-.792-.26-.938-.652l-1.197-3.223c-.354-.95-1.271-1.588-2.285-1.588h-8.096c-1.014 0-1.932.638-2.285 1.588l-1.197 3.222c-.146.392-.52.652-.938.652h-6.491c-.937 0-1.698.762-1.698 1.698v15.754c0 .936.762 1.697 1.698 1.697h29.918c.937 0 1.698-.761 1.698-1.697zm0-10.371h-.797c-.966 0-1.752.786-1.752 1.751v4.735c0 .966.786 1.751 1.752 1.751h.797v-8.238zm26.327-56.147c0-2.78-2.262-5.041-5.041-5.041h-75.886c-2.779 0-5.041 2.261-5.041 5.041v46.899c0 2.78 2.262 5.041 5.041 5.041h19.286v-1.176c0-2.039 1.659-3.698 3.698-3.698h5.796l.955-2.571c.644-1.73 2.315-2.892 4.16-2.892h8.096c1.845 0 3.517 1.162 4.16 2.891l.955 2.571h5.796c2.039 0 3.698 1.659 3.698 3.698v1.176h19.286c2.779 0 5.041-2.261 5.041-5.041v-46.899zm-2.06 1.974v28.104c0 2.73-2.222 4.952-4.952 4.952h-71.945c-2.73 0-4.952-2.221-4.952-4.952v-28.105c0-2.73 2.222-4.952 4.952-4.952h71.946c2.73 0 4.952 2.221 4.952 4.952zm-63.353 23.108-10.069 7.946h20.148l-.013-.01zm13.294 7.936.013.011h26.15l-17.028-12.841-12.984 9.792zm41.633.011-10.007-.292c.391-.391.391-1.024 0-1.415l-.739-.74z" fill="url(#New_Gradient_Swatch_9_pm)" />
                              </g>
                            </g>
                          </svg>
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={handleInlineAudioClick}
                          className="ultra-attach-option"
                          whileHover={{ scale: 1.05, x: 3 }}
                          whileTap={{ scale: 0.95 }}
                          title="Send Audio"
                        >
                          <svg id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                            <defs>
                              <linearGradient id="GradientFill_1_pm" gradientUnits="userSpaceOnUse" x1="255.999" x2="256.001" y1="512" y2="-.006">
                                <stop offset="0" stopColor="#6c54a3" />
                                <stop offset="1" stopColor="#00b1d2" />
                              </linearGradient>
                            </defs>
                            <path d="m195.638 92.371a60.365 60.365 0 1 1 120.73 0v161.086a60.365 60.365 0 1 1 -120.73 0zm60.362 253.456a92.762 92.762 0 0 0 92.37-92.37v-161.086a92.363 92.363 0 0 0 -184.725 0v161.086a92.748 92.748 0 0 0 92.355 92.37zm38.269 127v7.173h-76.542v-7.17a.4.4 0 0 1 .314-.314h75.917a.388.388 0 0 1 .307.314zm112.49-219.37a16 16 0 1 0 -32 0 118.759 118.759 0 1 1 -237.518 0 16 16 0 1 0 -32 0c0 77.732 59.129 141.9 134.761 149.914v37.148h-21.96a32.348 32.348 0 0 0 -32.312 32.311v23.17a16.009 16.009 0 0 0 16 16h108.538a16.009 16.009 0 0 0 16-16v-23.17a32.339 32.339 0 0 0 -32.312-32.311h-21.956v-37.148c75.644-8.016 134.759-72.182 134.759-149.914z" fill="url(#GradientFill_1_pm)" fillRule="evenodd" />
                          </svg>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Ultra Compact Luxurious Inline Audio Popup - Above Audio Button */}
                <AnimatePresence>
                  {isInlineAudioOpen && (
                    <motion.div
                      ref={audioPopupRef}
                      className="ultra-mini-audio-popup"
                      initial={{ opacity: 0, scale: 0.6, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6, y: 15 }}
                      transition={{ type: "spring", damping: 30, stiffness: 500 }}
                      style={{
                        position: 'absolute',
                        bottom: '120%',
                        right: '45px',
                        background: 'linear-gradient(145deg, rgba(230, 230, 250, 0.98) 0%, rgba(221, 160, 221, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '8px',
                        boxShadow: '0 8px 25px rgba(139, 92, 246, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
                        border: '1.5px solid rgba(255, 255, 255, 0.5)',
                        color: '#4c1d95',
                        width: '160px',
                        minHeight: '70px',
                        zIndex: 1000,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}
                    >
                      {/* Luxury Close Button */}
                      <button
                        onClick={() => setIsInlineAudioOpen(false)}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: 'linear-gradient(135deg, #ff416c, #ff4757)',
                          border: '1.5px solid rgba(255, 255, 255, 0.8)',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '700',
                          boxShadow: '0 3px 8px rgba(255, 65, 108, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                          zIndex: 1001,
                          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.1) rotate(90deg)';
                          e.target.style.boxShadow = '0 6px 16px rgba(255, 65, 108, 0.7)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1) rotate(0deg)';
                          e.target.style.boxShadow = '0 4px 12px rgba(255, 65, 108, 0.5)';
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Luxury Recording Timer */}
                        {(isRecording || recordedBlob) && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '8px',
                            fontWeight: '700',
                            background: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '8px',
                            padding: '2px 6px',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isRecording ? 'linear-gradient(45deg, #ff416c, #ff4757)' : '#6b7280',
                              animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                              boxShadow: isRecording ? '0 0 6px rgba(255, 65, 108, 0.8)' : 'none'
                            }} />
                            <span style={{ color: '#4c1d95', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{formatTime(recordingTime)}</span>
                          </div>
                        )}

                        {/* Luxury Audio Preview */}
                        {(audioPreview || recordedBlob) && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
                            borderRadius: '8px',
                            padding: '4px 6px',
                            border: '1.5px solid rgba(139, 92, 246, 0.3)',
                            boxShadow: '0 3px 8px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                          }}>
                            <button
                              onClick={() => {
                                const audio = new Audio(audioPreview);
                                audio.play().catch(console.error);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                border: '1.5px solid rgba(255, 255, 255, 0.6)',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.1)';
                                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.6)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 3px 8px rgba(102, 126, 234, 0.4)';
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </button>
                            <div style={{ 
                              flex: 1, 
                              fontSize: '9px', 
                              color: '#4c1d95',
                              textAlign: 'center',
                              fontWeight: '600',
                              textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                            }}>
                              Ready to Send
                            </div>
                            <button
                              onClick={handleAudioSend}
                              style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: '2px solid rgba(255, 255, 255, 0.6)',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 3px 8px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.1)';
                                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.6)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 3px 8px rgba(16, 185, 129, 0.4)';
                              }}
                            >
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAudio(null);
                                setAudioPreview(null);
                                setRecordedBlob(null);
                                setRecordingTime(0);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #ff416c, #ff4757)',
                                border: '2px solid rgba(255, 255, 255, 0.6)',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 3px 8px rgba(255, 65, 108, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.1)';
                                e.target.style.boxShadow = '0 4px 12px rgba(255, 65, 108, 0.6)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 3px 8px rgba(255, 65, 108, 0.4)';
                              }}
                            >
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Luxury Main Controls */}
                        {!audioPreview && !recordedBlob && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '6px',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                          }}>
                            {/* Luxury Record Button */}
                            <button
                              onClick={isRecording ? stopRecording : startRecording}
                              style={{
                                background: isRecording 
                                  ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' 
                                  : 'linear-gradient(135deg, #ff416c, #ff4757)',
                                border: '1.5px solid rgba(255, 255, 255, 0.8)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isRecording 
                                  ? '0 3px 12px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                                  : '0 3px 12px rgba(255, 65, 108, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                animation: isRecording ? 'pulse 2s infinite' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isRecording) {
                                  e.target.style.transform = 'scale(1.1)';
                                  e.target.style.boxShadow = '0 6px 20px rgba(255, 65, 108, 0.7)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isRecording) {
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = '0 4px 16px rgba(255, 65, 108, 0.5)';
                                }
                              }}
                            >
                              {isRecording ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                                  <rect x="6" y="6" width="12" height="12" rx="3"/>
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                  <line x1="12" y1="19" x2="12" y2="23"/>
                                  <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                              )}
                            </button>

                            {/* Luxury Upload Button */}
                            <button
                              onClick={() => audioInputRef.current?.click()}
                              style={{
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                border: '1.5px solid rgba(255, 255, 255, 0.8)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 3px 12px rgba(102, 126, 234, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.1)';
                                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.7)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.5)';
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                            </button>
                          </div>
                        )}

                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioFileSelect}
                          style={{ display: 'none' }}
                        />
                      </div>

                      {/* Luxury Arrow pointing down to audio button */}
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: '20px',
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid rgba(221, 160, 221, 0.95)',
                        filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))'
                      }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <textarea
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type message..."
                  className="ultra-pm-input"
                  rows="1"
                />

                <motion.button
                  className="ultra-pm-send-btn"
                  onClick={onSendMessage}
                  disabled={!privateMessage.trim()}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Send message"
                >
                  <svg id="Capa_1" enableBackground="new 0 0 512.019 512.019" viewBox="0 0 512.019 512.019" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                    <g>
                      <path d="m242.532 355.703 168.472 85.314c.021-.147 59.984-430.889 60-431l-12.56 17.699z" fill="#e2c4ff"/>
                      <path d="m41.003 231.017 150 80 267.44-283.301 12.56-17.699c-49.879 25.251-143.984 73.988-430 221z" fill="#e2c4ff"/>
                      <g><g>
                        <path d="m466.431 1.123-430 221c-7.049 3.622-7.27 13.644-.389 17.577l134.961 77.121v185.195c0 8.386 9.643 12.936 16.135 7.896l132.857-103.221 86.535 43.27c6.115 3.055 13.434-.795 14.377-7.566l60-431c1.114-8.003-7.275-13.974-14.476-10.272zm-257.019 466.162 46.09-92.838 44.662 22.331zm193.607-41.44-147.544-73.771c-4.915-2.461-10.954-.487-13.429 4.498l-51.043 102.815v-148.37c0-3.588-1.924-6.901-5.039-8.682l-123.99-70.852 396.469-203.767z" fill="#020288"/>
                      </g></g>
                    </g>
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};

export default LuxuryPrivateMessageWindow;