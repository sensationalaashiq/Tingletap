
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { auth, db } from '../firebase/config';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { pt } from '../utils/premiumToast';
import { compressImageToWebP, uploadMediaFile } from '../services/r2StorageService';

const COUNTRIES = [
  { name: 'Afghanistan', flag: '🇦🇫' }, { name: 'Algeria', flag: '🇩🇿' },
  { name: 'Argentina', flag: '🇦🇷' }, { name: 'Australia', flag: '🇦🇺' },
  { name: 'Austria', flag: '🇦🇹' }, { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'Belgium', flag: '🇧🇪' }, { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Canada', flag: '🇨🇦' }, { name: 'Chile', flag: '🇨🇱' },
  { name: 'China', flag: '🇨🇳' }, { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Egypt', flag: '🇪🇬' }, { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'France', flag: '🇫🇷' }, { name: 'Germany', flag: '🇩🇪' },
  { name: 'Ghana', flag: '🇬🇭' }, { name: 'Greece', flag: '🇬🇷' },
  { name: 'India', flag: '🇮🇳' }, { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Iran', flag: '🇮🇷' }, { name: 'Iraq', flag: '🇮🇶' },
  { name: 'Ireland', flag: '🇮🇪' }, { name: 'Israel', flag: '🇮🇱' },
  { name: 'Italy', flag: '🇮🇹' }, { name: 'Japan', flag: '🇯🇵' },
  { name: 'Jordan', flag: '🇯🇴' }, { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Malaysia', flag: '🇲🇾' }, { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Morocco', flag: '🇲🇦' }, { name: 'Myanmar', flag: '🇲🇲' },
  { name: 'Nepal', flag: '🇳🇵' }, { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'New Zealand', flag: '🇳🇿' }, { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Norway', flag: '🇳🇴' }, { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Philippines', flag: '🇵🇭' }, { name: 'Poland', flag: '🇵🇱' },
  { name: 'Portugal', flag: '🇵🇹' }, { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Romania', flag: '🇷🇴' }, { name: 'Russia', flag: '🇷🇺' },
  { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'Singapore', flag: '🇸🇬' },
  { name: 'South Africa', flag: '🇿🇦' }, { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Spain', flag: '🇪🇸' }, { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Sweden', flag: '🇸🇪' }, { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Syria', flag: '🇸🇾' }, { name: 'Taiwan', flag: '🇹🇼' },
  { name: 'Thailand', flag: '🇹🇭' }, { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Ukraine', flag: '🇺🇦' }, { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'United Kingdom', flag: '🇬🇧' }, { name: 'United States', flag: '🇺🇸' },
  { name: 'Venezuela', flag: '🇻🇪' }, { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Other', flag: '🌍' },
];

const EditProfile = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    gender: '',
    country: '',
    status: '',
    bio: '',
    interests: '',
    profession: '',
    age: '',
    relationship: '',
    languages: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Cropping states
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const cropContainerRef = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            displayName: data.displayName || user.displayName || '',
            gender: data.gender || '',
            country: data.country || '',
            status: data.status || '',
            bio: data.bio || '',
            interests: data.interests || '',
            profession: data.profession || '',
            age: data.age || '',
            relationship: data.relationship || '',
            languages: data.languages || ''
          });
          const defaultAvatar = data.gender === 'female' 
            ? `${getDefaultAvatarUrl(user.uid, 'female')}`
            : data.gender === 'male'
            ? `${getDefaultAvatarUrl(user.uid, 'male')}`
            : `${getDefaultAvatarUrl(user.uid, 'male')}`;
          setProfilePicPreview(data.photoURL || defaultAvatar);
        } else {
          setFormData(prev => ({ ...prev, displayName: user.displayName || '' }));
          setProfilePicPreview(`${getDefaultAvatarUrl(user.uid, 'male')}`);
        }
        setLoading(false);
      });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        pt.error('Profile picture must be less than 5MB');
        e.target.value = '';
        return;
      }
      
      setScale(1);
      setRotate(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setImagePosition({ x: 0, y: 0 });
      setIsDragging(false);
      setCrop({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5
      });
      setCompletedCrop(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    const size = Math.min(naturalWidth, naturalHeight);
    const x = (naturalWidth - size) / 2;
    const y = (naturalHeight - size) / 2;
    
    const newCrop = {
      unit: 'px',
      width: size * 0.8,
      height: size * 0.8,
      x: x + (size * 0.1),
      y: y + (size * 0.1)
    };
    
    setCrop(newCrop);
    setCompletedCrop(newCrop);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setImagePosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - imagePosition.x,
      y: touch.clientY - imagePosition.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setImagePosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const getCroppedImg = (image, crop) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !image) {
      return null;
    }

    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.clearRect(0, 0, outputSize, outputSize);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.clip();
    
    const containerSize = 240;
    const containerRadius = containerSize / 2;
    
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let displayWidth, displayHeight;
    
    if (imageAspect > 1) {
      displayHeight = containerSize;
      displayWidth = containerSize * imageAspect;
    } else {
      displayWidth = containerSize;
      displayHeight = containerSize / imageAspect;
    }
    
    displayWidth *= scale;
    displayHeight *= scale;
    
    const imageCenterX = containerRadius + imagePosition.x;
    const imageCenterY = containerRadius + imagePosition.y;
    
    const sourceX = ((containerRadius - imageCenterX) / displayWidth) * image.naturalWidth + (image.naturalWidth / 2);
    const sourceY = ((containerRadius - imageCenterY) / displayHeight) * image.naturalHeight + (image.naturalHeight / 2);
    const sourceSize = (containerSize / Math.min(displayWidth, displayHeight)) * Math.min(image.naturalWidth, image.naturalHeight);
    
    const clampedSourceX = Math.max(0, Math.min(sourceX - sourceSize/2, image.naturalWidth - sourceSize));
    const clampedSourceY = Math.max(0, Math.min(sourceY - sourceSize/2, image.naturalHeight - sourceSize));
    const clampedSourceSize = Math.min(sourceSize, 
      Math.min(image.naturalWidth - clampedSourceX, image.naturalHeight - clampedSourceY));
    
    if (rotate !== 0) {
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-outputSize / 2, -outputSize / 2);
    }
    
    ctx.drawImage(
      image,
      clampedSourceX,
      clampedSourceY,
      clampedSourceSize,
      clampedSourceSize,
      0,
      0,
      outputSize,
      outputSize
    );
    
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current) {
      pt.error('Please select an image first');
      return;
    }

    try {
      const cropToUse = completedCrop || crop;
      const croppedImageBlob = await getCroppedImg(imgRef.current, cropToUse);
      if (croppedImageBlob) {
        setProfilePic(croppedImageBlob);
        const previewUrl = URL.createObjectURL(croppedImageBlob);
        
        if (profilePicPreview && profilePicPreview.startsWith('blob:')) {
          URL.revokeObjectURL(profilePicPreview);
        }
        
        setProfilePicPreview(previewUrl);
        
        const fileInput = document.getElementById('ep-photo-input');
        if (fileInput) {
          fileInput.value = '';
        }
        
        setShowCropper(false);
        
        setOriginalImage(null);
        setCrop({
          unit: '%',
          width: 90,
          height: 90,
          x: 5,
          y: 5
        });
        setCompletedCrop(null);
        setScale(1);
        setRotate(0);
        setFlipH(false);
        setFlipV(false);
        setBrightness(100);
        setContrast(100);
        setImagePosition({ x: 0, y: 0 });
        setIsDragging(false);
        
        setTimeout(() => {
          setProfilePicPreview(previewUrl);
        }, 50);
        
        pt.image('Image cropped successfully! Save your profile to apply.');
      }
    } catch (error) {
      pt.error('Failed to crop image');
      console.error('Crop error:', error);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage(null);
    setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
    setCompletedCrop(null);
    setScale(1);
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const uploadProfilePic = async () => {
    if (!profilePic) return null;
    setUploading(true);
    try {
      const compressed = await compressImageToWebP(profilePic, { maxDim: 1080, quality: 0.8 });
      const { key, url } = await uploadMediaFile(compressed, 'profile');
      setUploading(false);
      return { key, url };
    } catch (error) {
      setUploading(false);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = auth.currentUser;
    try {
      let photoURL = profilePicPreview;
      let photoKey = null;
      if (profilePic) {
        const uploaded = await uploadProfilePic();
        photoURL = uploaded.url;
        photoKey = uploaded.key;
        setProfilePicPreview(photoURL);
      }
      const userDocRef = doc(db, 'users', user.uid);
      const currentUserDoc = await getDoc(userDocRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};
      const finalPhotoURL = profilePic
        ? photoURL
        : (currentUserData.photoURL || profilePicPreview || getDefaultAvatarUrl(user.uid, formData.gender || 'male'));
      const finalPhotoKey = profilePic ? photoKey : (currentUserData.photoKey || null);

      const getCurrentFontPreferences = () => {
        if (window.chatFontPreferences) {
          return window.chatFontPreferences;
        }
        return currentUserData.messageFontPreferences || currentUserData.fontPreferences || {
          fontSize: '8px',
          fontColor: '#333333',
          fontFamily: 'inherit',
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isStrikethrough: false
        };
      };

      const profileData = {
        ...formData,
        email: user.email,
        uid: user.uid,
        photoURL: finalPhotoURL,
        // R2 object key — stored so clients can refresh expired signed URLs
        ...(finalPhotoKey ? { photoKey: finalPhotoKey } : {}),
        updatedAt: new Date().toISOString(),
        settings: currentUserData.settings || {},
        fontPreferences: getCurrentFontPreferences()
      };

      await updateProfile(user, { 
        displayName: formData.displayName, 
        photoURL: finalPhotoURL 
      });
      await setDoc(userDocRef, profileData, { merge: true });
      
      if (profilePic) {
        setProfilePic(null);
        setProfilePicPreview(finalPhotoURL);
      }
      
      pt.profile('Profile updated successfully!');
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (error) {
      pt.error("Update failed: " + error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ep-wd-loading">
        <div className="ep-wd-spin" />
        <p>Loading profile…</p>
      </div>
    );
  }

  const cropModalJSX = showCropper ? createPortal(
    <div className="modern-crop-modal">
        <div className="crop-modal-content">
          <div className="crop-header">
            <div className="crop-title">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="camGradNew" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6"/>
                    <stop offset="35%" stopColor="#a855f7"/>
                    <stop offset="70%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                  <filter id="camGlow"><feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#a855f7" floodOpacity="0.5"/></filter>
                </defs>
                <rect x="1" y="5" width="22" height="16" rx="3.5" fill="url(#camGradNew)" filter="url(#camGlow)"/>
                <circle cx="12" cy="13" r="4.2" fill="white" opacity="0.95"/>
                <circle cx="12" cy="13" r="2.5" fill="url(#camGradNew)"/>
                <rect x="8" y="3" width="8" height="4" rx="1.5" fill="url(#camGradNew)"/>
                <circle cx="19" cy="8" r="1.2" fill="white" opacity="0.8"/>
              </svg>
              <span>Edit Profile Photo</span>
            </div>
            <div className="crop-subtitle">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#f59e0b"/>
              </svg>
              Drag · Zoom · Rotate · Flip — then Apply
            </div>
          </div>

          <div className="crop-content">
            <div 
              className="crop-preview-area"
              ref={cropContainerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="circular-preview">
                <img
                  ref={imgRef}
                  src={originalImage}
                  onLoad={onImageLoad}
                  alt="Crop preview"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${scale * (flipH ? -1 : 1)}, ${scale * (flipV ? -1 : 1)}) rotate(${rotate}deg)`,
                    transformOrigin: 'center',
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                    transition: isDragging ? 'none' : 'transform 0.1s ease'
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  draggable={false}
                />
                <div className="crop-overlay"></div>
              </div>
            </div>

            <div className="crop-controls">
              <div className="control-group">
                <label style={{color:'#3b0764',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <defs><linearGradient id="scaleGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
                    <path fill="url(#scaleGrad)" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  Zoom — {Math.round(scale * 100)}%
                </label>
                <input type="range" min="0.5" max="3" step="0.05" value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))} className="crop-slider" />
              </div>

              <div className="control-group">
                <label style={{color:'#3b0764',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <defs><linearGradient id="rotGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#0ea5e9"/></linearGradient></defs>
                    <path fill="url(#rotGrad)" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                  </svg>
                  Rotate — {rotate}°
                </label>
                <input type="range" min="0" max="360" step="5" value={rotate}
                  onChange={(e) => setRotate(parseFloat(e.target.value))} className="crop-slider" />
              </div>

              <div className="control-group">
                <label style={{color:'#3b0764',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <defs><linearGradient id="briGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#fbbf24"/></linearGradient></defs>
                    <circle cx="12" cy="12" r="5" fill="url(#briGrad)"/>
                    <path stroke="url(#briGrad)" strokeWidth="2" strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  Brightness — {brightness}%
                </label>
                <input type="range" min="30" max="180" step="5" value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))} className="crop-slider" />
              </div>

              <div className="control-group">
                <label style={{color:'#3b0764',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <defs><linearGradient id="conGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#f43f5e"/></linearGradient></defs>
                    <circle cx="12" cy="12" r="10" stroke="url(#conGrad)" strokeWidth="1.5" fill="none"/>
                    <path d="M12 2a10 10 0 000 20V2z" fill="url(#conGrad)"/>
                  </svg>
                  Contrast — {contrast}%
                </label>
                <input type="range" min="50" max="200" step="5" value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))} className="crop-slider" />
              </div>

              <div className="crop-flip-row">
                <button
                  type="button"
                  className={`crop-flip-btn ${flipH ? 'active' : ''}`}
                  onClick={() => setFlipH(h => !h)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12h18M3 12L7 8M3 12l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12l-4-4M21 12l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Flip H
                </button>
                <button
                  type="button"
                  className={`crop-flip-btn ${flipV ? 'active' : ''}`}
                  onClick={() => setFlipV(v => !v)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v18M12 3L8 7M12 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 21l-4-4M12 21l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Flip V
                </button>
                <button
                  type="button"
                  className="crop-flip-btn reset-btn"
                  onClick={() => { setScale(1); setRotate(0); setFlipH(false); setFlipV(false); setBrightness(100); setContrast(100); setImagePosition({x:0,y:0}); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4v5h5M20 20v-5h-5M4.05 9A9 9 0 0 1 20 12.95M19.95 15A9 9 0 0 1 4 11.05" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                  Reset
                </button>
              </div>
            </div>

            <div className="crop-help">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#6d28d9" strokeWidth="1.8"/>
                <path d="M12 16v-4M12 8h.01" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Drag image to reposition inside the circle
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="crop-actions">
            <button className="crop-btn save-btn" onClick={handleCropComplete}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Apply Photo
            </button>
            <button className="crop-btn cancel-btn" onClick={handleCropCancel}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
              Cancel
            </button>
          </div>
        </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
    {cropModalJSX}
    <div className="ep-wd-container">

      {/* ── Avatar ── */}
      <div className="wd-avatar-row">
        <div
          className="wd-avatar-circle"
          onClick={() => document.getElementById('ep-photo-input').click()}
        >
          {profilePicPreview
            ? <img src={profilePicPreview} alt="Profile" className="wd-avatar-img" />
            : <span className="wd-avatar-init">{(formData.displayName || 'U').slice(0, 2).toUpperCase()}</span>
          }
          <div className="wd-avatar-overlay">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="1" y="4.5" width="22" height="16" rx="4" fill="white" opacity="0.9"/>
              <circle cx="12" cy="12.5" r="4.2" fill="#7c3aed" opacity="0.9"/>
              <circle cx="12" cy="12.5" r="2.2" fill="white"/>
              <rect x="8.5" y="2.5" width="7" height="3.5" rx="1.5" fill="white" opacity="0.75"/>
              <circle cx="19.5" cy="7.5" r="1.1" fill="#a855f7" opacity="0.8"/>
            </svg>
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleProfilePicChange}
          id="ep-photo-input"
          style={{ display: 'none' }}
        />
        <span className="wd-avatar-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="3.5" width="22" height="16" rx="4" fill="#a855f7"/>
            <circle cx="12" cy="11.5" r="3.8" fill="white" opacity="0.9"/>
            <circle cx="12" cy="11.5" r="2.2" fill="#a855f7"/>
          </svg>
          Tap photo to change
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
        </span>
        {profilePic && (
          <span className="ep-photo-pending">
            Photo ready — save to apply
          </span>
        )}
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit}>
        <div className="ep-form-wrap">
        <div className="wd-fields">

          {/* Display Name */}
          <div className="wd-field-group">
            <label className="wd-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#6366f1">
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
              </svg>
              Display Name *
            </label>
            <input
              className="wd-input"
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="Your name"
              required
            />
          </div>

          {/* Age + Gender */}
          <div className="wd-field-row">
            <div className="wd-field-group">
              <label className="wd-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b">
                  <path d="M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V9H19V19M5,7V5H19V7H5M7,11H12V16H7V11Z"/>
                </svg>
                Age
              </label>
              <input
                className="wd-input"
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Age"
                min="13"
                max="120"
              />
            </div>
            <div className="wd-field-group">
              <label className="wd-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#ec4899">
                  <path d="M9,9H7V7H9V9M17,7H15V9H17V7M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2Z"/>
                </svg>
                Gender
              </label>
              <select className="wd-input" name="gender" value={formData.gender} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Country + Profession */}
          <div className="wd-field-row">
            <div className="wd-field-group">
              <label className="wd-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
                Country
              </label>
              <select className="wd-input" name="country" value={formData.country} onChange={handleInputChange}>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="wd-field-group">
              <label className="wd-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#3b82f6">
                  <path d="M20,6H16V4A2,2 0 0,0 14,2H10A2,2 0 0,0 8,4V6H4A2,2 0 0,0 2,8V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V8A2,2 0 0,0 20,6M10,4H14V6H10V4M20,20H4V8H20V20Z"/>
                </svg>
                Profession
              </label>
              <input
                className="wd-input"
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleInputChange}
                placeholder="Profession"
              />
            </div>
          </div>

          {/* Relationship + Languages */}
          <div className="wd-field-row">
            <div className="wd-field-group">
              <label className="wd-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>
                </svg>
                Relationship
              </label>
              <select className="wd-input" name="relationship" value={formData.relationship} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="single">Single</option>
                <option value="taken">Taken</option>
                <option value="married">Married</option>
                <option value="complicated">Complicated</option>
                <option value="not_saying">Prefer not to say</option>
              </select>
            </div>
            <div className="wd-field-group">
              <label className="wd-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#06b6d4">
                  <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18"/>
                </svg>
                Languages
              </label>
              <input
                className="wd-input"
                type="text"
                name="languages"
                value={formData.languages}
                onChange={handleInputChange}
                placeholder="English, Hindi…"
              />
            </div>
          </div>

          {/* Status */}
          <div className="wd-field-group">
            <label className="wd-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#8b5cf6">
                <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z"/>
              </svg>
              Status
            </label>
            <input
              className="wd-input"
              type="text"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              placeholder="e.g. Feeling great today"
              maxLength={80}
            />
          </div>

          {/* Interests */}
          <div className="wd-field-group">
            <label className="wd-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#f97316">
                <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
              </svg>
              Interests
            </label>
            <input
              className="wd-input"
              type="text"
              name="interests"
              value={formData.interests}
              onChange={handleInputChange}
              placeholder="Music, Travel, Sports…"
            />
          </div>

          {/* Bio */}
          <div className="wd-field-group">
            <label className="wd-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#84cc16">
                <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.8,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.15 12,20V6.5C10.55,5.4 8.45,5 6.5,5Z"/>
              </svg>
              Bio
            </label>
            <textarea
              className="wd-input wd-textarea"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself…"
              rows={3}
              maxLength={200}
            />
          </div>

        </div>

        {/* ── Save Button ── */}
        <button
          type="submit"
          className="wd-save-btn ep-save-btn"
          disabled={loading || uploading}
        >
          {(loading || uploading)
            ? <>
                <span className="wd-spin" />
                <span>{uploading ? 'Uploading…' : 'Saving…'}</span>
              </>
            : <>
                {/* Floppy disk — universal save icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#e0d4ff">
                  <path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12C10.34,12 9,13.34 9,15C9,16.66 10.34,18 12,18C13.66,18 15,16.66 15,15C15,13.34 13.66,12 12,12M6,6H15V10H6V6Z"/>
                </svg>
                <span>Save Changes</span>
                {/* Paper-plane accent */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#c4b5fd">
                  <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                </svg>
              </>
          }
        </button>
        </div>{/* ep-form-wrap */}
      </form>
    </div>
    </>
  );
};

export default EditProfile;
