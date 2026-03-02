
import React, { useState, useEffect, useRef } from 'react';
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
            ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=female&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
            : data.gender === 'male'
            ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
            : `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
          setProfilePicPreview(data.photoURL || defaultAvatar);
        } else {
          setFormData(prev => ({ ...prev, displayName: user.displayName || '' }));
          setProfilePicPreview(`https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`);
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
        
        const fileInput = document.getElementById('profileImageInput');
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
          ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=female&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
          : formData.gender === 'male'
          ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
          : `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
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
      <div className="modern-edit-loading">
        <div className="elegant-spinner"></div>
        <p>Loading your profile...</p>
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
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            animation: fadeIn 0.3s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .crop-modal-content {
            background: linear-gradient(145deg, #ffffff, #f8fafc);
            border-radius: 24px;
            width: 100%;
            max-width: 420px;
            box-shadow: 
              0 25px 50px rgba(0, 0, 0, 0.15),
              0 0 0 1px rgba(255, 255, 255, 0.1);
            animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(40px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          .crop-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            text-align: center;
          }

          .crop-title {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: white;
            font-size: 18px;
            font-weight: 600;
          }

          .crop-content {
            padding: 24px;
          }

          .crop-preview-area {
            display: flex;
            justify-content: center;
            margin-bottom: 24px;
          }

          .circular-preview {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            overflow: hidden;
            background: #f1f5f9;
            border: 4px solid #667eea;
            position: relative;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
          }

          .crop-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid rgba(102, 126, 234, 0.6);
            border-radius: 50%;
            pointer-events: none;
          }

          .crop-controls {
            margin-bottom: 20px;
          }

          .control-group {
            margin-bottom: 16px;
          }

          .control-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #475569;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
          }

          .control-group input[type="range"] {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #e2e8f0;
            outline: none;
            -webkit-appearance: none;
          }

          .control-group input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #667eea;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .crop-help {
            background: rgba(102, 126, 234, 0.1);
            padding: 12px 16px;
            border-radius: 12px;
            color: #475569;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
            border: 1px solid rgba(102, 126, 234, 0.2);
          }

          .crop-actions {
            display: flex;
            gap: 12px;
            padding: 0 24px 24px;
          }

          .crop-btn {
            flex: 1;
            padding: 14px 20px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .save-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }

          .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
          }

          .cancel-btn {
            background: #f1f5f9;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }

          .cancel-btn:hover {
            background: #e2e8f0;
            color: #475569;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="modern-edit-profile">
      <style jsx>{`
        .modern-edit-profile {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          background: linear-gradient(145deg, #ffffff, #f8fafc);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.2);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .profile-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .profile-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
          pointer-events: none;
        }

        .header-title {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 1;
        }

        .avatar-section {
          padding: 32px 24px;
          display: flex;
          justify-content: center;
          background: linear-gradient(145deg, #f8fafc, #ffffff);
        }

        .avatar-container {
          position: relative;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .avatar-container:hover {
          transform: scale(1.05) translateY(-4px);
        }

        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #667eea;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          box-shadow: 
            0 8px 32px rgba(102, 126, 234, 0.3),
            0 0 0 4px rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
        }

        .avatar-container:hover .profile-avatar {
          box-shadow: 
            0 12px 40px rgba(102, 126, 234, 0.4),
            0 0 0 4px rgba(255, 255, 255, 1);
        }

        .upload-overlay {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .upload-overlay:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .upload-overlay svg {
          width: 20px;
          height: 20px;
          color: white;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }

        .hidden-file-input {
          display: none;
        }

        .form-container {
          padding: 24px;
          background: linear-gradient(145deg, #f8fafc, #ffffff);
        }

        .input-grid {
          display: grid;
          gap: 20px;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .input-row.full-width {
          grid-template-columns: 1fr;
        }

        .modern-input, .modern-select, .modern-textarea {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.9);
          color: #1e293b;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          box-sizing: border-box;
        }

        .modern-input:focus, .modern-select:focus, .modern-textarea:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(255, 255, 255, 1);
          box-shadow: 
            0 0 0 4px rgba(102, 126, 234, 0.1),
            0 4px 16px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        .modern-input::placeholder, .modern-select::placeholder, .modern-textarea::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .modern-select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 16px center;
          background-repeat: no-repeat;
          background-size: 16px;
          padding-right: 48px;
        }

        .modern-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .action-section {
          padding: 24px;
          background: linear-gradient(145deg, #f8fafc, #ffffff);
          border-top: 1px solid #e2e8f0;
        }

        .button-group {
          display: flex;
          gap: 16px;
        }

        .primary-btn {
          flex: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
          background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        }

        .primary-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .secondary-btn {
          flex: 1;
          background: rgba(255, 255, 255, 0.9);
          color: #667eea;
          border: 2px solid rgba(102, 126, 234, 0.3);
          padding: 16px 24px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .secondary-btn:hover {
          background: rgba(102, 126, 234, 0.1);
          border-color: #667eea;
          color: #5a67d8;
          transform: translateY(-1px);
        }

        .modern-edit-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          background: linear-gradient(145deg, #ffffff, #f8fafc);
          border-radius: 24px;
          gap: 20px;
          color: #475569;
        }

        .elegant-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .modern-edit-loading p {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .modern-edit-profile {
            max-width: 360px;
            margin: 10px;
          }
          
          .input-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .profile-avatar {
            width: 100px;
            height: 100px;
          }

          .upload-overlay {
            width: 36px;
            height: 36px;
            bottom: 6px;
            right: 6px;
          }

          .upload-overlay svg {
            width: 18px;
            height: 18px;
          }

          .modern-input,
          .modern-select,
          .modern-textarea {
            padding: 14px 18px;
            font-size: 14px;
          }

          .primary-btn,
          .secondary-btn {
            padding: 14px 20px;
            font-size: 14px;
          }

          .button-group {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="profile-header">
        <h2 className="header-title">Edit Profile</h2>
      </div>

      <div className="avatar-section">
        <div className="avatar-container" onClick={() => document.getElementById('profileImageInput').click()}>
          <img src={profilePicPreview} alt="Profile" className="profile-avatar" />
          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePicChange}
            id="profileImageInput"
            className="hidden-file-input"
          />
          <div className="upload-overlay">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5C13.66 15.5 15 14.16 15 12.5C15 10.84 13.66 9.5 12 9.5C10.34 9.5 9 10.84 9 12.5C9 14.16 10.34 15.5 12 15.5ZM9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z"/>
            </svg>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-container">
          <div className="input-grid">
            <div className="input-row full-width">
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="👤 Full Name"
                required
              />
            </div>

            <div className="input-row">
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="🎂 Age"
                min="13"
                max="120"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="modern-select"
              >
                <option value="">⚧️ Gender</option>
                <option value="male">♂️ Male</option>
                <option value="female">♀️ Female</option>
                <option value="other">⚧️ Other</option>
              </select>
            </div>

            <div className="input-row">
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="🌍 Country"
              />
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="💼 Profession"
              />
            </div>

            <div className="input-row">
              <select
                name="relationship"
                value={formData.relationship}
                onChange={handleInputChange}
                className="modern-select"
              >
                <option value="">💝 Relationship</option>
                <option value="single">Single</option>
                <option value="taken">In a Relationship</option>
                <option value="married">Married</option>
                <option value="complicated">It's Complicated</option>
                <option value="not_saying">Prefer not to say</option>
              </select>
              <input
                type="text"
                name="languages"
                value={formData.languages}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="🗣️ Languages"
              />
            </div>

            <div className="input-row full-width">
              <input
                type="text"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="📝 Status Message"
              />
            </div>

            <div className="input-row full-width">
              <input
                type="text"
                name="interests"
                value={formData.interests}
                onChange={handleInputChange}
                className="modern-input"
                placeholder="🎯 Interests & Hobbies"
              />
            </div>

            <div className="input-row full-width">
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="modern-textarea"
                placeholder="📖 Tell us about yourself..."
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className="action-section">
          <div className="button-group">
            <button
              type="submit"
              disabled={loading || uploading}
              className="primary-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
              </svg>
              {loading ? 'Saving...' : uploading ? 'Uploading...' : 'Save Changes'}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="secondary-btn"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
