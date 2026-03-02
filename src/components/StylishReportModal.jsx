
import React, { useState } from 'react';
import './StylishReportModal.css';

const StylishReportModal = ({ 
  isOpen, 
  onClose, 
  messageToReport, 
  onSubmit,
  reportType: initialReportType = 'Message',
  reportCategory,
  setReportCategory,
  reportReason,
  setReportReason
}) => {
  const [reportType, setReportType] = useState(initialReportType);

  // Ultra Premium SVG Icons with enhanced visibility
  const ReportShieldIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff0844" />
          <stop offset="50%" stopColor="#ffb199" />
          <stop offset="100%" stopColor="#ff8a80" />
        </linearGradient>
        <filter id="shieldGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff0844" floodOpacity="0.8"/>
        </filter>
      </defs>
      <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" 
            fill="url(#shieldGradient)" filter="url(#shieldGlow)" stroke="white" strokeWidth="1"/>
      <path d="M12 8V16M8 12H16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="3" strokeLinecap="round" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/>
    </svg>
  );

  const UserIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="userGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" 
            stroke="url(#userGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))"/>
    </svg>
  );

  const MessageIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="messageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#11998e" />
          <stop offset="100%" stopColor="#38ef7d" />
        </linearGradient>
      </defs>
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" 
            stroke="url(#messageGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))"/>
    </svg>
  );

  const SubmitIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/>
    </svg>
  );

  const handleSubmit = () => {
    if (!reportCategory) {
      console.error('Report category is required');
      return;
    }
    
    onSubmit({
      reportType,
      category: reportCategory,
      reason: reportReason
    });
    handleClose();
  };

  const handleClose = () => {
    setReportType(initialReportType || 'Message');
    if (setReportCategory) setReportCategory('Spam');
    if (setReportReason) setReportReason('');
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      setReportType(initialReportType || 'Message');
      if (setReportCategory) setReportCategory('Spam');
      if (setReportReason) setReportReason('');
    }
  }, [isOpen, initialReportType, setReportCategory, setReportReason]);

  if (!isOpen) return null;

  return (
    <div className="ultra-compact-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    }}>
      <div className="ultra-compact-modal" onClick={e => e.stopPropagation()}>
        {/* Ultra Compact Header */}
        <div className="ultra-header">
          <div className="ultra-title">
            <ReportShieldIcon />
            <span>Report Content</span>
          </div>
          <button className="ultra-close" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Compact Content */}
        <div className="ultra-content">
          {/* Target Info - Ultra Compact */}
          <div className="ultra-target">
            <div className="target-info">
              <UserIcon />
              <span><strong>{messageToReport?.displayName || 'Unknown'}</strong></span>
            </div>
            {reportType === 'Message' && messageToReport?.text && (
              <div className="target-msg">
                <MessageIcon />
                <span>"{messageToReport.text.substring(0, 30) || 'Media'}..."</span>
              </div>
            )}
          </div>

          {/* Ultra Compact Toggle */}
          <div className="ultra-toggle">
            <button 
              className={`toggle ${reportType === 'Message' ? 'active' : ''}`}
              onClick={() => setReportType('Message')}
            >
              <MessageIcon />
              Message
            </button>
            <button 
              className={`toggle ${reportType === 'User' ? 'active' : ''}`}
              onClick={() => setReportType('User')}
            >
              <UserIcon />
              User
            </button>
          </div>

          {/* Ultra Compact Category */}
          <div className="ultra-category">
            <select 
              value={reportCategory || 'Spam'} 
              onChange={(e) => {
                if (setReportCategory) setReportCategory(e.target.value);
              }}
            >
              <option value="Spam">🚫 Spam</option>
              <option value="Harassment">😠 Harassment</option>
              <option value="Incest">🔞 Incest</option>
              <option value="Hate Speech">💬 Hate Speech</option>
              <option value="Inappropriate Content">⚠️ Inappropriate</option>
              <option value="Sharing Personal Info">📱 Personal Info</option>
              <option value="Other">❓ Other</option>
            </select>
          </div>

          {/* Ultra Compact Details */}
          <div className="ultra-details">
            <textarea 
              rows="2" 
              value={reportReason || ''} 
              onChange={(e) => {
                if (setReportReason) setReportReason(e.target.value);
              }} 
              placeholder="Additional details (optional)..."
            />
          </div>
        </div>

        {/* Ultra Compact Actions */}
        <div className="ultra-actions">
          <button className="ultra-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button className="ultra-submit" onClick={handleSubmit}>
            <SubmitIcon />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default StylishReportModal;
