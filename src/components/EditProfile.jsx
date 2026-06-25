
import React, { useState, useEffect, useRef } from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { auth, db } from '../firebase/config';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

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
        toast.error('Profile picture must be less than 5MB');
        e.target.value = '';
        return;
      }
      
      setScale(1);
      setRotate(0);
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
      toast.error('Please select an image first');
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
        setImagePosition({ x: 0, y: 0 });
        setIsDragging(false);
        
        setTimeout(() => {
          setProfilePicPreview(previewUrl);
        }, 50);
        
        toast.success('✅ Image cropped successfully! Now save your profile to apply changes.');
      }
    } catch (error) {
      toast.error('Failed to crop image');
      console.error('Crop error:', error);
    }
  };

  const handleCropCancel = () => {
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
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const uploadProfilePic = async () => {
    if (!profilePic) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', profilePic);
      formData.append('key', 'bec822839da595fbbc6ffafddca80839');
      const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Image upload failed');
      }
      setUploading(false);
      return result.data.url;
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
      if (profilePic) {
        photoURL = await uploadProfilePic();
        setProfilePicPreview(photoURL);
      }
      const userDocRef = doc(db, 'users', user.uid);
      const currentUserDoc = await getDoc(userDocRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};
      const finalPhotoURL = profilePic ? photoURL : (
        formData.gender === 'female' 
          ? `${getDefaultAvatarUrl(user.uid, 'female')}`
          : formData.gender === 'male'
          ? `${getDefaultAvatarUrl(user.uid, 'male')}`
          : `${getDefaultAvatarUrl(user.uid, 'male')}`
      );

      const getCurrentFontPreferences = () => {
        if (window.chatFontPreferences) {
          return window.chatFontPreferences;
        }
        const localPrefs = {
          fontSize: localStorage.getItem('chatFontSize'),
          fontColor: localStorage.getItem('chatFontColor'),
          fontFamily: localStorage.getItem('chatFontFamily'),
          isBold: localStorage.getItem('chatIsBold') === 'true',
          isItalic: localStorage.getItem('chatIsItalic') === 'true',
          isUnderline: localStorage.getItem('chatIsUnderline') === 'true',
          isStrikethrough: localStorage.getItem('chatIsStrikethrough') === 'true'
        };
        if (localPrefs.fontSize || localPrefs.fontColor || localPrefs.fontFamily) {
          return {
            fontSize: localPrefs.fontSize || '14px',
            fontColor: localPrefs.fontColor || '#333333',
            fontFamily: localPrefs.fontFamily || 'inherit',
            isBold: Boolean(localPrefs.isBold),
            isItalic: Boolean(localPrefs.isItalic),
            isUnderline: Boolean(localPrefs.isUnderline),
            isStrikethrough: Boolean(localPrefs.isStrikethrough)
          };
        }
        return currentUserData.fontPreferences || {
          fontSize: '14px',
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
      
      toast.success('✅ Profile updated successfully!');
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (error) {
      toast.error("❌ Update failed: " + error.message);
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

  // Modern Crop Modal
  if (showCropper) {
    return (
      <div className="modern-crop-modal">
        <div className="crop-modal-content">
          <div className="crop-header">
            <div className="crop-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17l-3-3 1.5-1.5L9 14l6-6 1.5 1.5L9 17z"/>
              </svg>
              <span>Crop Your Photo</span>
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
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${scale}) rotate(${rotate}deg)`,
                    transformOrigin: 'center',
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
                <label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  Scale
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.1" 
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                />
              </div>

              <div className="control-group">
                <label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C17.52 2 22 6.48 22 12s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 18c4.41 0 8-3.59 8-8s-3.59-8-8-8-8 3.59-8 8 3.59 8 8 8zm1-13h-2v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                  </svg>
                  Rotate
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  step="5" 
                  value={rotate}
                  onChange={(e) => setRotate(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="crop-help">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z"/>
              </svg>
              Drag to move • Use sliders to adjust
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="crop-actions">
            <button
              className="crop-btn save-btn"
              onClick={handleCropComplete}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Apply Crop
            </button>
            <button
              className="crop-btn cancel-btn"
              onClick={handleCropCancel}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Cancel
            </button>
          </div>
        </div>

        <style jsx>{`
          .modern-crop-modal {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(30, 20, 60, 0.72);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            animation: cropFadeIn 0.28s ease-out;
          }
          @keyframes cropFadeIn { from { opacity:0 } to { opacity:1 } }

          .crop-modal-content {
            background: linear-gradient(160deg, #faf8ff 0%, #f3effe 100%);
            border-radius: 28px;
            width: 100%;
            max-width: 440px;
            box-shadow:
              0 32px 64px rgba(109, 40, 217, 0.22),
              0 0 0 1.5px rgba(196, 181, 253, 0.55),
              inset 0 1px 0 rgba(255,255,255,0.85);
            animation: cropSlideUp 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
          }
          @keyframes cropSlideUp {
            from { opacity:0; transform: scale(0.88) translateY(36px); }
            to   { opacity:1; transform: scale(1) translateY(0); }
          }

          .crop-header {
            background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 60%, #c4b5fd 100%);
            padding: 22px 24px 18px;
            text-align: center;
            border-bottom: 1.5px solid rgba(196,181,253,0.4);
            position: relative;
          }
          .crop-header::after {
            content: '';
            position: absolute;
            bottom: 0; left: 50%; transform: translateX(-50%);
            width: 60px; height: 3px;
            background: linear-gradient(90deg, #a78bfa, #7c3aed);
            border-radius: 2px;
          }

          .crop-title {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: #4c1d95;
            font-size: 18px;
            font-weight: 700;
            font-family: 'Playfair Display', 'Georgia', serif;
            letter-spacing: 0.02em;
          }
          .crop-title svg { filter: drop-shadow(0 1px 2px rgba(124,58,237,0.25)); }

          .crop-content { padding: 26px 26px 18px; }

          .crop-preview-area {
            display: flex;
            justify-content: center;
            margin-bottom: 22px;
          }

          .circular-preview {
            width: 240px;
            height: 240px;
            border-radius: 50%;
            overflow: hidden;
            background: linear-gradient(135deg, #ede9fe, #f5f3ff);
            border: 4px solid #a78bfa;
            position: relative;
            box-shadow:
              0 0 0 6px rgba(167,139,250,0.15),
              0 12px 36px rgba(124,58,237,0.2);
          }

          .crop-overlay {
            position: absolute; top:0; left:0; right:0; bottom:0;
            border: 2.5px solid rgba(167,139,250,0.5);
            border-radius: 50%;
            pointer-events: none;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%);
          }

          .crop-controls { margin-bottom: 18px; }

          .control-group { margin-bottom: 14px; }

          .control-group label {
            display: flex;
            align-items: center;
            gap: 7px;
            color: #5b21b6;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          }

          .control-group input[type="range"] {
            width: 100%;
            height: 5px;
            border-radius: 4px;
            background: linear-gradient(90deg, #ddd6fe, #ede9fe);
            outline: none;
            -webkit-appearance: none;
          }
          .control-group input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px; height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            cursor: pointer;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(124,58,237,0.35);
          }

          .crop-help {
            background: rgba(167,139,250,0.1);
            padding: 11px 15px;
            border-radius: 12px;
            color: #6d28d9;
            font-size: 12.5px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            border: 1px solid rgba(167,139,250,0.25);
          }

          .crop-actions {
            display: flex;
            gap: 12px;
            padding: 0 26px 26px;
          }

          .crop-btn {
            flex: 1;
            padding: 14px 20px;
            border: none !important;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
            display: flex !important;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .save-btn {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9) !important;
            color: white !important;
            box-shadow: 0 6px 20px rgba(124,58,237,0.38);
          }
          .save-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 28px rgba(124,58,237,0.5);
          }

          .cancel-btn {
            background: rgba(167,139,250,0.1) !important;
            color: #7c3aed !important;
            border: 1.5px solid rgba(167,139,250,0.35) !important;
          }
          .cancel-btn:hover {
            background: rgba(167,139,250,0.2) !important;
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    );
  }

  return (
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 15.5C13.66 15.5 15 14.16 15 12.5C15 10.84 13.66 9.5 12 9.5C10.34 9.5 9 10.84 9 12.5C9 14.16 10.34 15.5 12 15.5ZM9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z"/>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{opacity:.55}}>
            <path d="M12 15.5C13.66 15.5 15 14.16 15 12.5C15 10.84 13.66 9.5 12 9.5C10.34 9.5 9 10.84 9 12.5C9 14.16 10.34 15.5 12 15.5ZM9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z"/>
          </svg>
          Tap photo to change
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{opacity:.4}}>
            <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
          </svg>
        </span>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit}>
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
              <input
                className="wd-input"
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="Country"
              />
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
      </form>
    </div>
  );
};

export default EditProfile;
