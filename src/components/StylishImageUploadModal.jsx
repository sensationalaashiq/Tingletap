import React, { useState } from 'react';
import './StylishImageUploadModal.css';

const StylishImageUploadModal = React.memo(({
    isOpen,
    onClose,
    onImageUpload,
    onImageUrlUpload,
    fileInputRef,
    handleImageSelect,
    selectedImage,
    imagePreview,
    imageUrl,
    setImageUrl
}) => {
    const [imageTab, setImageTab] = useState('upload');
    const [imageCaption, setImageCaption] = useState('');

    if (!isOpen) return null;

    const handleFileUpload = () => {
        if (selectedImage && onImageUpload) {
            onImageUpload(selectedImage, imageCaption);
            resetModal();
        }
    };

    const handleUrlUpload = () => {
        if (imageUrl.trim() && onImageUrlUpload) {
            onImageUrlUpload(imageUrl.trim(), imageCaption);
            resetModal();
        }
    };

    const resetModal = () => {
        if (setImageUrl) setImageUrl('');
        setImageCaption('');
        setImageTab('upload');
        if (fileInputRef?.current) fileInputRef.current.value = '';
        if (window.clearImagePreview) window.clearImagePreview();
        onClose();
    };

    const canSend = imageTab === 'upload' ? !!selectedImage : !!imageUrl.trim();

    return (
        <div className="sim-overlay" onClick={e => { if (e.target === e.currentTarget) resetModal(); }}>
            <div className="sim-card" onClick={e => e.stopPropagation()}>

                {/* Icon Ring */}
                <div className="sim-icon-ring">
                    <svg viewBox="0 0 64 64" width="42" height="42" fill="none">
                        <defs>
                            <linearGradient id="simG" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6"/>
                                <stop offset="100%" stopColor="#6d28d9"/>
                            </linearGradient>
                        </defs>
                        <rect x="6" y="12" width="52" height="40" rx="6" fill="url(#simG)" opacity=".15"/>
                        <rect x="6" y="12" width="52" height="40" rx="6" stroke="url(#simG)" strokeWidth="2.5" fill="none"/>
                        <circle cx="20" cy="26" r="5" fill="url(#simG)" opacity=".7"/>
                        <path d="M6 40l14-12 10 10 8-8 18 14" stroke="url(#simG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M38 8v8M34 10l4-2 4 2" stroke="url(#simG)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </div>

                <div className="sim-title">Upload Image</div>

                {/* Tabs */}
                <div className="sim-tabs">
                    <button className={`sim-tab${imageTab === 'upload' ? ' active' : ''}`}
                        onClick={() => { setImageTab('upload'); if (setImageUrl) setImageUrl(''); }}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <path d="M3 13V16a1 1 0 001 1h12a1 1 0 001-1v-3M10 3v9M7 6l3-3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Upload File
                    </button>
                    <button className={`sim-tab${imageTab === 'url' ? ' active' : ''}`}
                        onClick={() => { setImageTab('url'); if (fileInputRef?.current) fileInputRef.current.value = ''; }}>
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <path d="M7.5 10a2.5 2.5 0 003.536 3.536l2.5-2.5a2.5 2.5 0 00-3.536-3.536l-1.25 1.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                            <path d="M12.5 10a2.5 2.5 0 00-3.536-3.536l-2.5 2.5a2.5 2.5 0 003.536 3.536l1.25-1.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                        </svg>
                        URL Link
                    </button>
                </div>

                <input ref={fileInputRef} type="file" onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }}/>

                {/* Content */}
                <div className="sim-content">
                    {imageTab === 'upload' ? (
                        imagePreview ? (
                            <div className="sim-preview-wrap">
                                <img src={imagePreview} alt="Preview" className="sim-preview-img"/>
                                <button className="sim-remove-preview" onClick={() => { if (fileInputRef?.current) fileInputRef.current.value = ''; }}>
                                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                                        <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="sim-drop-zone" onClick={() => fileInputRef?.current?.click()}>
                                <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
                                    <rect x="4" y="8" width="40" height="32" rx="4" fill="rgba(139,92,246,.1)" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3"/>
                                    <circle cx="16" cy="20" r="4" fill="#8b5cf6" opacity=".5"/>
                                    <path d="M4 32l12-10 8 8 6-6 14 10" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"/>
                                    <path d="M24 14v-6M21 11l3-3 3 3" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <p className="sim-drop-text">Click to select image</p>
                                <span className="sim-drop-hint">JPG, PNG, GIF, WEBP · Max 10MB</span>
                            </div>
                        )
                    ) : (
                        <div className="sim-url-section">
                            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg" className="sim-url-input"/>
                            <p className="sim-url-hint">Paste a direct link to an image</p>
                            {imageUrl && (
                                <img src={imageUrl} alt="URL Preview" className="sim-url-preview"
                                    onError={e => e.target.style.display='none'}
                                    onLoad={e => e.target.style.display='block'}/>
                            )}
                        </div>
                    )}

                    <textarea value={imageCaption} onChange={e => setImageCaption(e.target.value)}
                        placeholder="Add a caption (optional)..." className="sim-caption" rows="2"/>
                </div>

                {/* Actions */}
                <div className="sim-actions">
                    <button className="sim-btn-cancel" onClick={resetModal}
                        style={{ background: '#fff', border: '1.5px solid #e5e7eb', color: '#6b7280' }}>
                        Cancel
                    </button>
                    <button className="sim-btn-send" disabled={!canSend}
                        onClick={imageTab === 'upload' ? handleFileUpload : handleUrlUpload}
                        style={{
                            opacity: canSend ? 1 : 0.45,
                            cursor: canSend ? 'pointer' : 'not-allowed',
                            background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                            border: 'none',
                            color: '#fff',
                            WebkitTextFillColor: '#fff',
                            boxShadow: '0 4px 16px rgba(139,92,246,.42)',
                        }}>
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                            <path d="M18 2L9.5 10.5M18 2l-6 16-2.5-5.5L4 10l14-8z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ color: '#fff', WebkitTextFillColor: '#fff', fontWeight: 700 }}>Send Image</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

export default StylishImageUploadModal;
