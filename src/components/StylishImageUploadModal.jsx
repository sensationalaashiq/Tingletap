
import React, { useState, useRef } from 'react';
import './StylishImageUploadModal.css';

const StylishImageUploadModal = ({ 
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
    // Internal state management
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
        if (setImageUrl) {
            setImageUrl('');
        }
        setImageCaption('');
        setImageTab('upload');
        if (fileInputRef && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // Clear any preview states
        if (window.clearImagePreview) {
            window.clearImagePreview();
        }
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            e.stopPropagation();
            resetModal();
        }
    };

    return (
        <div className="stylish-image-modal-overlay" onClick={handleOverlayClick}>
            <div className="stylish-image-modal">
                <div className="stylish-modal-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <h3>Upload Image</h3>
                    <button 
                        className="stylish-close-btn"
                        onClick={resetModal}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="stylish-modal-tabs">
                    <button 
                        className={`stylish-tab-btn ${imageTab === 'upload' ? 'active' : ''}`}
                        onClick={() => {
                            setImageTab('upload');
                            if (setImageUrl) {
                                setImageUrl('');
                            }
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        Upload File
                    </button>
                    <button 
                        className={`stylish-tab-btn ${imageTab === 'url' ? 'active' : ''}`}
                        onClick={() => {
                            setImageTab('url');
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
                        </svg>
                        URL Link
                    </button>
                </div>

                <div className="stylish-modal-content">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleImageSelect}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />

                    {imageTab === 'upload' ? (
                        <div className="stylish-upload-section">
                            {imagePreview ? (
                                <div className="stylish-preview-container">
                                    <img 
                                        src={imagePreview} 
                                        alt="Preview" 
                                        className="stylish-image-preview"
                                    />
                                    <button 
                                        className="stylish-remove-btn"
                                        onClick={() => {
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = '';
                                            }
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    className="stylish-drop-zone"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                    </svg>
                                    <p>Click to select image</p>
                                    <span>Max size: 10MB</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="stylish-url-section">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="stylish-url-input"
                            />
                            <p className="stylish-url-help">
                                Paste a direct link to an image (jpg, png, gif, webp, bmp, svg)
                            </p>
                            {imageUrl && (
                                <div className="stylish-url-preview">
                                    <img 
                                        src={imageUrl} 
                                        alt="URL Preview" 
                                        className="stylish-url-image"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                        onLoad={(e) => {
                                            e.target.style.display = 'block';
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <textarea
                        value={imageCaption}
                        onChange={(e) => setImageCaption(e.target.value)}
                        placeholder="Add a caption (optional)"
                        className="stylish-caption-input"
                        rows="2"
                    />
                </div>

                <div className="stylish-modal-actions">
                    <button 
                        className="stylish-btn stylish-btn-send" 
                        onClick={imageTab === 'upload' ? handleFileUpload : handleUrlUpload}
                        disabled={imageTab === 'upload' ? !selectedImage : !imageUrl.trim()}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                        </svg>
                        Send
                    </button>
                    <button 
                        className="stylish-btn stylish-btn-cancel" 
                        onClick={resetModal}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StylishImageUploadModal;
