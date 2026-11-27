import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getDefaultAvatarUrl,
  isRealAvatarUpload,
  isGuestUser,
  getRoleDisplayLabel,
} from '../utils/roleUtils';
import { auth, db, rtdb } from '../firebase/config';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as rtdbRef, update as rtdbUpdate } from 'firebase/database';
import { invalidateCachedUserProfile } from '../utils/userProfileCache';
import { pt } from '../utils/premiumToast';
import { compressImageToWebP, uploadMediaFile } from '../services/r2StorageService';
import { syncPublicProfile } from '../utils/syncPublicProfile';

const COUNTRIES = [
  'Afghanistan', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'Chile',
  'China', 'Colombia', 'Egypt', 'Ethiopia', 'France',
  'Germany', 'Ghana', 'Greece', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kenya', 'Malaysia', 'Mexico',
  'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Pakistan', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia',
  'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Thailand',
  'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Venezuela', 'Vietnam', 'Other',
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
    languages: '',
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [savedPhotoPreview, setSavedPhotoPreview] = useState('');
  const [accountMeta, setAccountMeta] = useState({
    roleLabel: 'Member',
    username: '',
    email: '',
    isVerified: false,
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [savingState, setSavingState] = useState('idle'); // 'idle' | 'uploading' | 'saving' | 'saved' | 'error'
  const [feedbackBanner, setFeedbackBanner] = useState(null); // { type: 'error' | 'saved', text: string }

  // Photo Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
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
  const cropCircleRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef('');

  useEffect(() => {
    previewUrlRef.current = profilePicPreview;
  }, [profilePicPreview]);

  useEffect(() => {
    let cancelled = false;
    const user = auth.currentUser;
    if (!user) {
      setInitialLoading(false);
      setFeedbackBanner({ type: 'error', text: 'Please sign in to edit your profile.' });
      return undefined;
    }

    const docRef = doc(db, 'users', user.uid);
    getDoc(docRef)
      .then((docSnap) => {
        if (cancelled) return;
        if (docSnap.exists()) {
          const data = docSnap.data() || {};
          const resolvedGuest = isGuestUser({
            isGuest: data.isGuest || user.isAnonymous,
            role: data.role,
          });
          const defaultAvatar = getDefaultAvatarUrl(user.uid, data.gender || 'male', resolvedGuest);
          const resolvedAvatar = isRealAvatarUpload(data.photoURL)
            ? data.photoURL
            : (isRealAvatarUpload(user.photoURL) ? user.photoURL : defaultAvatar);

          setFormData({
            displayName: data.displayName || user.displayName || '',
            gender: data.gender || '',
            country: data.country || '',
            status: data.status || '',
            bio: data.bio || '',
            interests: data.interests || '',
            profession: data.profession || '',
            age: data.age !== undefined && data.age !== null ? String(data.age) : '',
            relationship: data.relationship || '',
            languages: data.languages || '',
          });
          setProfilePicPreview(resolvedAvatar);
          setSavedPhotoPreview(resolvedAvatar);
          setAccountMeta({
            roleLabel: getRoleDisplayLabel({
              role: data.role || 'user',
              gender: data.gender,
              isGuest: resolvedGuest,
              badge: data.badge,
            }),
            username: data.username || '',
            email: data.email || user.email || '',
            isVerified: Boolean(data.isVerified),
          });
        } else {
          const defaultAvatar = getDefaultAvatarUrl(user.uid, 'male', Boolean(user.isAnonymous));
          const resolvedAvatar = isRealAvatarUpload(user.photoURL) ? user.photoURL : defaultAvatar;
          setFormData((prev) => ({ ...prev, displayName: user.displayName || '' }));
          setProfilePicPreview(resolvedAvatar);
          setSavedPhotoPreview(resolvedAvatar);
          setAccountMeta({
            roleLabel: user.isAnonymous ? 'Guest' : 'Member',
            username: '',
            email: user.email || '',
            isVerified: Boolean(user.emailVerified),
          });
        }
        setInitialLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[EditProfile] Initial load failed, using Auth fallback:', err?.message || err);
        const fallbackAvatar = isRealAvatarUpload(user.photoURL)
          ? user.photoURL
          : getDefaultAvatarUrl(user.uid, 'male', Boolean(user.isAnonymous));
        setFormData((prev) => ({ ...prev, displayName: user.displayName || '' }));
        setProfilePicPreview(fallbackAvatar);
        setSavedPhotoPreview(fallbackAvatar);
        setAccountMeta({
          roleLabel: user.isAnonymous ? 'Guest' : 'Member',
          username: '',
          email: user.email || '',
          isVerified: Boolean(user.emailVerified),
        });
        setFeedbackBanner({
          type: 'error',
          text: 'Could not refresh saved profile details. You can still edit and save.',
        });
        setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      const current = previewUrlRef.current;
      if (typeof current === 'string' && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (savingState === 'saved' || savingState === 'error') {
      setSavingState('idle');
      setFeedbackBanner(null);
    }
  };

  // Validate file magic bytes (first 12 bytes) before accepting upload
  const checkImageMagicBytes = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const bytes = new Uint8Array(ev.target.result);
        const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        const isPng  = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
        const isGif  = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
        const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                       bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
        resolve(isJpeg || isPng || isGif || isWebp);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 12));
    });

  const resetCropControls = () => {
    setScale(1);
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      pt.error('Profile picture must be less than 5MB');
      e.target.value = '';
      return;
    }

    const isValidImage = await checkImageMagicBytes(file);
    if (!isValidImage) {
      pt.error('Invalid image file. Please select JPEG, PNG, WebP, or GIF.');
      e.target.value = '';
      return;
    }

    resetCropControls();
    const reader = new FileReader();
    reader.onload = (ev) => {
      setOriginalImage(ev.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleDiscardPendingPhoto = () => {
    if (typeof profilePicPreview === 'string' && profilePicPreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePicPreview);
    }
    setProfilePic(null);
    setProfilePicPreview(savedPhotoPreview);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y });
  };
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    setImagePosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };
  const handleTouchEnd = () => setIsDragging(false);

  const getCroppedImg = (image) => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !image.naturalWidth || !image.naturalHeight) {
      return Promise.resolve(null);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    const outputSize = 400;
    const previewElSize = cropCircleRef.current?.clientWidth || 220;
    const ratio = outputSize / previewElSize;

    canvas.width = outputSize;
    canvas.height = outputSize;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, outputSize, outputSize);

    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.clip();

    // Match CSS filter & transform matrix identically
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.translate(
      outputSize / 2 + imagePosition.x * ratio,
      outputSize / 2 + imagePosition.y * ratio,
    );
    ctx.scale(scale * (flipH ? -1 : 1), scale * (flipV ? -1 : 1));
    ctx.rotate((rotate * Math.PI) / 180);

    const aspect = image.naturalWidth / image.naturalHeight;
    const baseW = aspect >= 1 ? outputSize : outputSize * aspect;
    const baseH = aspect >= 1 ? outputSize / aspect : outputSize;

    ctx.drawImage(image, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            canvas.toBlob((fallbackBlob) => resolve(fallbackBlob), 'image/jpeg', 0.92);
          }
        },
        'image/webp',
        0.9,
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current) {
      pt.error('Please select an image first');
      return;
    }

    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current);
      if (!croppedImageBlob) {
        pt.error('Could not process cropped photo. Try another image.');
        return;
      }

      if (typeof profilePicPreview === 'string' && profilePicPreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicPreview);
      }

      const previewUrl = URL.createObjectURL(croppedImageBlob);
      setProfilePic(croppedImageBlob);
      setProfilePicPreview(previewUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowCropper(false);
      setOriginalImage(null);
      resetCropControls();
      setFeedbackBanner(null);
    } catch (error) {
      pt.error('Failed to crop image');
      console.error('[EditProfile] Crop error:', error);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    resetCropControls();
  };

  const uploadProfilePic = async () => {
    if (!profilePic) return null;
    const compressed = await compressImageToWebP(profilePic, { maxDim: 1080, quality: 0.85 });
    const { key, url } = await uploadMediaFile(compressed, 'profile');
    if (!url) throw new Error('Photo upload did not return an image URL.');
    return { key, url };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      const msg = 'Session expired. Please sign in again to save your profile.';
      setSavingState('error');
      setFeedbackBanner({ type: 'error', text: msg });
      pt.error(msg);
      return;
    }

    const cleanDisplayName = (formData.displayName || '').trim();
    if (!cleanDisplayName) {
      const msg = 'Display Name cannot be empty.';
      setSavingState('error');
      setFeedbackBanner({ type: 'error', text: msg });
      pt.error(msg);
      return;
    }

    setFeedbackBanner(null);

    try {
      let uploadedPhotoUrl = null;
      let uploadedPhotoKey = null;

      if (profilePic) {
        setSavingState('uploading');
        const uploaded = await uploadProfilePic();
        uploadedPhotoUrl = uploaded.url;
        uploadedPhotoKey = uploaded.key;
      }

      setSavingState('saving');
      const userDocRef = doc(db, 'users', user.uid);
      const currentUserDoc = await getDoc(userDocRef);
      const docExists = currentUserDoc.exists();
      const currentUserData = docExists ? (currentUserDoc.data() || {}) : {};

      const resolvedGuest = isGuestUser({
        isGuest: currentUserData.isGuest || user.isAnonymous,
        role: currentUserData.role,
      });
      const fallbackDefault = getDefaultAvatarUrl(
        user.uid,
        formData.gender || currentUserData.gender || 'male',
        resolvedGuest,
      );

      const finalPhotoURL = uploadedPhotoUrl
        || (isRealAvatarUpload(currentUserData.photoURL)
          ? currentUserData.photoURL
          : (isRealAvatarUpload(profilePicPreview) ? profilePicPreview : fallbackDefault));
      const finalPhotoKey = uploadedPhotoUrl
        ? uploadedPhotoKey
        : (currentUserData.photoKey || null);

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
          isStrikethrough: false,
        };
      };

      // Strictly whitelist editable fields; never mutate protected role, badge, or moderation fields.
      const editableProfilePayload = {
        displayName: cleanDisplayName,
        gender: formData.gender || '',
        country: formData.country || '',
        status: (formData.status || '').trim(),
        bio: (formData.bio || '').trim(),
        interests: (formData.interests || '').trim(),
        profession: (formData.profession || '').trim(),
        age: formData.age === '' ? '' : String(formData.age).trim(),
        relationship: formData.relationship || '',
        languages: (formData.languages || '').trim(),
        photoURL: finalPhotoURL,
        ...(finalPhotoKey ? { photoKey: finalPhotoKey } : {}),
        updatedAt: new Date().toISOString(),
        settings: currentUserData.settings || {},
        fontPreferences: getCurrentFontPreferences(),
      };

      const firestoreWritePayload = docExists
        ? editableProfilePayload
        : {
            ...editableProfilePayload,
            uid: user.uid,
            email: user.email || '',
            role: 'user',
            isGuest: Boolean(user.isAnonymous),
            createdAt: new Date().toISOString(),
          };

      await setDoc(userDocRef, firestoreWritePayload, { merge: true });

      // Mirror public profile subset while preserving server-assigned roles/badges
      await syncPublicProfile(
        user.uid,
        { ...currentUserData, ...firestoreWritePayload },
        { preserveExisting: true },
      );

      // Auth photoURL only supports short HTTPS URLs (< 2048 chars), never base64 data: URLs
      const canSetAuthPhoto =
        Boolean(finalPhotoURL)
        && !String(finalPhotoURL).startsWith('data:')
        && String(finalPhotoURL).length < 1800;

      try {
        await updateProfile(
          user,
          canSetAuthPhoto
            ? { displayName: cleanDisplayName, photoURL: finalPhotoURL }
            : { displayName: cleanDisplayName },
        );
      } catch (authErr) {
        console.warn('[EditProfile] Auth profile mirror skipped:', authErr?.message || authErr);
      }

      if (profilePic) {
        if (typeof profilePicPreview === 'string' && profilePicPreview.startsWith('blob:')) {
          URL.revokeObjectURL(profilePicPreview);
        }
        setProfilePic(null);
        setProfilePicPreview(finalPhotoURL);
        setSavedPhotoPreview(finalPhotoURL);
      }

      invalidateCachedUserProfile(user.uid);

      // Immediately propagate DP/name/gender to RTDB presence & local window caches
      // so every user in every room, userlist, dropdown, PM, and profile sees it live.
      const mergedUpdatedProfile = {
        ...currentUserData,
        ...firestoreWritePayload,
        uid: user.uid,
      };
      try {
        if (window.userProfilesCache) {
          window.userProfilesCache[user.uid] = {
            ...(window.userProfilesCache[user.uid] || {}),
            ...mergedUpdatedProfile,
          };
        }
        if (window._appUserProfile?.uid === user.uid) {
          window._appUserProfile = { ...window._appUserProfile, ...mergedUpdatedProfile };
          window.dispatchEvent(new CustomEvent('_appUserProfileChanged', { detail: window._appUserProfile }));
        }
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: { uid: user.uid, ...editableProfilePayload },
        }));

        const rtdbPatch = {
          photoURL: finalPhotoURL || null,
          displayName: cleanDisplayName,
          gender: formData.gender || currentUserData.gender || 'male',
        };
        if (window._currentStatusData) {
          window._currentStatusData = { ...window._currentStatusData, ...rtdbPatch };
        }
        rtdbUpdate(rtdbRef(rtdb, `status/${user.uid}`), rtdbPatch).catch(() => {});
        const activeRid = window._tingleBotRoomId
          || window._currentStatusData?.currentRoomId
          || window.location.pathname.match(/\/room\/([^/]+)/)?.[1];
        if (activeRid) {
          rtdbUpdate(rtdbRef(rtdb, `room_presence/${activeRid}/${user.uid}`), rtdbPatch).catch(() => {});
        }
      } catch {}

      setSavingState('saved');
      setFeedbackBanner({ type: 'saved', text: 'Profile updated successfully' });
      pt.profile('Profile updated successfully');

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('[EditProfile] Save failed:', error);
      const rawMsg = String(error?.message || 'Unable to save profile changes.');
      const friendlyMsg = rawMsg.toLowerCase().includes('permission')
        ? 'Permission denied while saving profile. Please refresh your session and retry.'
        : rawMsg;
      setSavingState('error');
      setFeedbackBanner({ type: 'error', text: friendlyMsg });
      pt.error(friendlyMsg);
    }
  };

  if (initialLoading) {
    return (
      <div className="ep-wd-loading" role="status" aria-live="polite">
        <div className="ep-wd-spin" />
        <p>Loading profile details...</p>
      </div>
    );
  }

  const isBusy = savingState === 'uploading' || savingState === 'saving';

  const cropModalJSX = showCropper
    ? createPortal(
        <div className="modern-crop-modal" role="dialog" aria-modal="true" aria-label="Edit Profile Photo">
          <div className="crop-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="crop-header">
              <div className="crop-header-text">
                <div className="crop-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="epGradCrop" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="5.5" width="20" height="14.5" rx="3.5" fill="url(#epGradCrop)" />
                    <path d="M8.5 5.5l1.2-2h4.6l1.2 2" fill="#8b5cf6" />
                    <circle cx="12" cy="12.5" r="3.6" fill="#ffffff" />
                    <circle cx="12" cy="12.5" r="1.8" fill="#6366f1" />
                  </svg>
                  <span>Adjust Profile Photo</span>
                </div>
                <p className="crop-subtitle">Drag to frame, then fine-tune zoom, angle, or tone</p>
              </div>
              <button type="button" className="crop-icon-close" onClick={handleCropCancel} aria-label="Close photo editor">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="epGradCropClose" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <path d="M18 6L6 18M6 6l12 12" stroke="url(#epGradCropClose)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="crop-content">
              <div
                className="crop-preview-area"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="circular-preview" ref={cropCircleRef}>
                  <img
                    ref={imgRef}
                    src={originalImage}
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
                      transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    draggable={false}
                  />
                  <div className="crop-overlay" />
                </div>
              </div>

              <div className="crop-controls">
                <div className="crop-slider-grid">
                  <div className="control-group">
                    <div className="crop-control-head">
                      <span>Zoom</span>
                      <span className="crop-control-val">{Math.round(scale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="3"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="crop-slider"
                    />
                  </div>

                  <div className="control-group">
                    <div className="crop-control-head">
                      <span>Rotate</span>
                      <span className="crop-control-val">{rotate}deg</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={rotate}
                      onChange={(e) => setRotate(parseFloat(e.target.value))}
                      className="crop-slider"
                    />
                  </div>

                  <div className="control-group">
                    <div className="crop-control-head">
                      <span>Brightness</span>
                      <span className="crop-control-val">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="170"
                      step="5"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                      className="crop-slider"
                    />
                  </div>

                  <div className="control-group">
                    <div className="crop-control-head">
                      <span>Contrast</span>
                      <span className="crop-control-val">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      step="5"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                      className="crop-slider"
                    />
                  </div>
                </div>

                <div className="crop-flip-row">
                  <button
                    type="button"
                    className={`crop-flip-btn ${flipH ? 'active' : ''}`}
                    onClick={() => setFlipH((h) => !h)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M8 7L3 12l5 5M16 7l5 5-5 5" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 4v16" stroke="#ec4899" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                    <span>Flip H</span>
                  </button>
                  <button
                    type="button"
                    className={`crop-flip-btn ${flipV ? 'active' : ''}`}
                    onClick={() => setFlipV((v) => !v)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M7 8l5-5 5 5M7 16l5 5 5-5" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 12h16" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                    <span>Flip V</span>
                  </button>
                  <button
                    type="button"
                    className="crop-flip-btn reset-btn"
                    onClick={resetCropControls}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4v5h5M20 20v-5h-5M4.5 9A8.5 8.5 0 0 1 20 12.5M19.5 15A8.5 8.5 0 0 1 4 11.5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="crop-actions">
              <button type="button" className="crop-btn cancel-btn" onClick={handleCropCancel}>
                Cancel
              </button>
              <button type="button" className="crop-btn save-btn" onClick={handleCropComplete}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Apply Photo</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {cropModalJSX}
      <div className="ep-wd-container">
        {/* Profile Photo Hero Row */}
        <div className="wd-avatar-card">
          <button
            type="button"
            className="wd-avatar-circle"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" className="wd-avatar-img" referrerPolicy="no-referrer" />
            ) : (
              <span className="wd-avatar-init">
                {(formData.displayName || 'U').slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="wd-avatar-overlay" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="15" rx="3.5" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="12.5" r="3.4" stroke="white" strokeWidth="2" />
                <path d="M8.5 5l1.2-2h4.6l1.2 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>

          <div className="wd-avatar-meta">
            <div className="wd-avatar-identity">
              <span className="wd-avatar-name">{formData.displayName || 'Your Profile'}</span>
              <span className="wd-avatar-sub">
                {accountMeta.username ? `@${accountMeta.username} · ` : ''}
                {accountMeta.roleLabel}
                {accountMeta.isVerified ? ' · Verified' : ''}
              </span>
            </div>

            <div className="wd-avatar-actions">
              <button
                type="button"
                className="wd-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="epGradCamBtn" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="55%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <rect x="2.5" y="5.5" width="19" height="14" rx="3.2" fill="url(#epGradCamBtn)" />
                  <circle cx="12" cy="12.5" r="3.2" fill="#ffffff" />
                  <circle cx="12" cy="12.5" r="1.5" fill="#6366f1" />
                </svg>
                <span>{profilePic ? 'Choose Another' : 'Change Photo'}</span>
              </button>

              {profilePic && (
                <button
                  type="button"
                  className="wd-photo-reset-btn"
                  onClick={handleDiscardPendingPhoto}
                  disabled={isBusy}
                >
                  Undo
                </button>
              )}
            </div>

            {profilePic && (
              <p className="ep-photo-pending-note">New photo cropped and ready — save to apply</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            onChange={handleProfilePicChange}
            id="ep-photo-input"
            style={{ display: 'none' }}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="ep-form-wrap" noValidate>
          <div className="ep-section">
            <div className="ep-section-head">Identity</div>
            <div className="wd-fields">
              <div className="wd-field-group">
                <label className="wd-label" htmlFor="ep-display-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="epGradUser" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <circle cx="12" cy="8" r="4" fill="url(#epGradUser)" />
                    <path d="M5 20a7 7 0 0 1 14 0" fill="url(#epGradUser)" />
                  </svg>
                  <span>Display Name *</span>
                </label>
                <input
                  id="ep-display-name"
                  className="wd-input"
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="Your display name"
                  maxLength={40}
                  required
                />
              </div>

              <div className="wd-field-row">
                <div className="wd-field-group">
                  <label className="wd-label" htmlFor="ep-age">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradCal" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                      <rect x="3" y="4.5" width="18" height="16.5" rx="3" fill="url(#epGradCal)" />
                      <path d="M3 9.5h18" stroke="#ffffff" strokeWidth="1.8" />
                      <path d="M8 2.5v3.5M16 2.5v3.5" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                    <span>Age</span>
                  </label>
                  <input
                    id="ep-age"
                    className="wd-input"
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="e.g. 24"
                    min="13"
                    max="120"
                  />
                </div>

                <div className="wd-field-group">
                  <label className="wd-label" htmlFor="ep-gender">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradGender" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      <circle cx="10" cy="14" r="5" fill="url(#epGradGender)" />
                      <path d="M14 10l6-6M15 4h5v5" stroke="#ec4899" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Gender</span>
                  </label>
                  <select
                    id="ep-gender"
                    className="wd-input"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="">Select</option>
                    <option value="male">Male (Purush)</option>
                    <option value="female">Female (Stree)</option>
                    <option value="other">Other (Navrang)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="ep-section">
            <div className="ep-section-head">Details</div>
            <div className="wd-fields">
              <div className="wd-field-row">
                <div className="wd-field-group">
                  <label className="wd-label" htmlFor="ep-country">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradGlobe" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                      </defs>
                      <circle cx="12" cy="12" r="9" fill="url(#epGradGlobe)" />
                      <path d="M3.5 12h17M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" stroke="#ffffff" strokeWidth="1.5" />
                    </svg>
                    <span>Country</span>
                  </label>
                  <select
                    id="ep-country"
                    className="wd-input"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wd-field-group">
                  <label className="wd-label" htmlFor="ep-profession">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradBrief" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="#6366f1" strokeWidth="2.1" />
                      <rect x="3" y="7" width="18" height="13" rx="3" fill="url(#epGradBrief)" />
                      <path d="M3 12h18" stroke="#ffffff" strokeWidth="1.5" opacity="0.85" />
                    </svg>
                    <span>Profession</span>
                  </label>
                  <input
                    id="ep-profession"
                    className="wd-input"
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    placeholder="Designer, Student..."
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="wd-field-row">
                <div className="wd-field-group">
                  <label className="wd-label" htmlFor="ep-relationship">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradHeart" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <path d="M12 20.5s-7.5-4.7-9.2-9.2C1.6 8 3.8 4.5 7.4 4.5c2 0 3.7 1.1 4.6 2.6.9-1.5 2.6-2.6 4.6-2.6 3.6 0 5.8 3.5 4.6 6.8-1.7 4.5-9.2 9.2-9.2 9.2z" fill="url(#epGradHeart)" />
                    </svg>
                    <span>Relationship</span>
                  </label>
                  <select
                    id="ep-relationship"
                    className="wd-input"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                  >
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="taken">Taken</option>
                    <option value="married">Married</option>
                    <option value="complicated">Complicated</option>
                    <option value="not_saying">Prefer not to say</option>
                  </select>
                </div>

                <div className="wd-field-group">
                  <label className="wd-label" htmlFor="ep-languages">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradLang" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="url(#epGradLang)" />
                      <path d="M7.5 10h9M7.5 13h5.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span>Languages</span>
                  </label>
                  <input
                    id="ep-languages"
                    className="wd-input"
                    type="text"
                    name="languages"
                    value={formData.languages}
                    onChange={handleInputChange}
                    placeholder="English, Hindi..."
                    maxLength={80}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ep-section">
            <div className="ep-section-head">Bio &amp; Presence</div>
            <div className="wd-fields">
              <div className="wd-field-group">
                <div className="wd-label-row">
                  <label className="wd-label" htmlFor="ep-status">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradStatus" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#14b8a6" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <circle cx="12" cy="12" r="9" fill="url(#epGradStatus)" />
                      <path d="M8.5 12.2l2.3 2.3 4.8-5" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Status Line</span>
                  </label>
                  <span className="wd-char-count">{formData.status.length}/80</span>
                </div>
                <input
                  id="ep-status"
                  className="wd-input"
                  type="text"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  placeholder="Share a quick mood or note"
                  maxLength={80}
                />
              </div>

              <div className="wd-field-group">
                <label className="wd-label" htmlFor="ep-interests">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="epGradStar" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                    <path d="M12 3l2.6 5.4L20.5 9l-4.2 4.1 1 5.9L12 16.2 6.7 19l1-5.9L3.5 9l5.9-.6L12 3z" fill="url(#epGradStar)" />
                  </svg>
                  <span>Interests</span>
                </label>
                <input
                  id="ep-interests"
                  className="wd-input"
                  type="text"
                  name="interests"
                  value={formData.interests}
                  onChange={handleInputChange}
                  placeholder="Music, Cinema, Gaming..."
                  maxLength={120}
                />
              </div>

              <div className="wd-field-group">
                <div className="wd-label-row">
                  <label className="wd-label" htmlFor="ep-bio">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="epGradBio" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#epGradBio)" />
                      <path d="M7 8.5h10M7 12h10M7 15.5h6" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                    <span>Bio</span>
                  </label>
                  <span className="wd-char-count">{formData.bio.length}/200</span>
                </div>
                <textarea
                  id="ep-bio"
                  className="wd-input wd-textarea"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell people a little about yourself"
                  rows={3}
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          {feedbackBanner && (
            <div
              className={`ep-feedback-banner ${feedbackBanner.type === 'error' ? 'is-error' : 'is-success'}`}
              role="alert"
            >
              {feedbackBanner.type === 'error' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" fill="#ef4444" />
                  <path d="M12 7.5v5.5M12 16.5v.5" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" fill="#10b981" />
                  <path d="M8 12.5l2.8 2.8 5.2-5.6" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span>{feedbackBanner.text}</span>
            </div>
          )}

          <div className="ep-submit-bar">
            {onClose && (
              <button
                type="button"
                className="wd-cancel-btn"
                onClick={onClose}
                disabled={isBusy}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={`wd-save-btn ${savingState === 'saved' ? 'is-saved' : ''}`}
              disabled={isBusy}
            >
              {savingState === 'uploading' && (
                <>
                  <span className="wd-spin" />
                  <span>Uploading Photo...</span>
                </>
              )}
              {savingState === 'saving' && (
                <>
                  <span className="wd-spin" />
                  <span>Saving Profile...</span>
                </>
              )}
              {savingState === 'saved' && (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9.5" fill="#34d399" />
                    <path d="M8 12.5l2.8 2.8 5.2-5.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Saved</span>
                </>
              )}
              {(savingState === 'idle' || savingState === 'error') && (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="#c4b5fd" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M17 21v-7.5H7V21" fill="#ffffff" />
                    <path d="M8 3.5v4h7v-4" fill="#6366f1" />
                  </svg>
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditProfile;
