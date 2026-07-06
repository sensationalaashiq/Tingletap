import React, { useEffect } from 'react';
import './IPBanModal.css';

const IPBanModal = React.memo(({ banInfo, onRetry }) => {
  // Aggressive anti-bypass measures
  useEffect(() => {
    // Block browser back/forward
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    // Block common escape routes
    const blockKeyEvents = (e) => {
      // Block F5, Ctrl+R, Ctrl+Shift+R, Ctrl+F5
      if ((e.keyCode === 116) || 
          (e.ctrlKey && e.keyCode === 82) ||
          (e.ctrlKey && e.shiftKey && e.keyCode === 82) ||
          (e.ctrlKey && e.keyCode === 116)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      
      // Block Alt+F4, Ctrl+W, Ctrl+T, Ctrl+N
      if ((e.altKey && e.keyCode === 115) ||
          (e.ctrlKey && e.keyCode === 87) ||
          (e.ctrlKey && e.keyCode === 84) ||
          (e.ctrlKey && e.keyCode === 78)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      
      // Block Escape
      if (e.keyCode === 27) {
        e.preventDefault();
        return false;
      }
    };

    const blockMouseEvents = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    };

    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handlePopState);
    document.addEventListener('keydown', blockKeyEvents, true);
    document.addEventListener('contextmenu', blockMouseEvents, true);
    
    // Push history state to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    
    // Block common escape methods
    window.onbeforeunload = () => '';
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handlePopState);
      document.removeEventListener('keydown', blockKeyEvents, true);
      document.removeEventListener('contextmenu', blockMouseEvents, true);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="ip-ban-overlay">
      <div className="ip-ban-modal">
        <div className="ip-ban-header">
          <div className="ip-ban-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2" fill="rgba(220, 38, 38, 0.1)"/>
              <path d="m4.93 4.93 14.14 14.14" stroke="#dc2626" strokeWidth="3" strokeLinecap="round"/>
              <path d="M12 8v4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="ip-ban-title">
            <h1>🚫 IP ADDRESS BANNED</h1>
            <p>Network Access Permanently Restricted</p>
          </div>
        </div>

        <div className="ip-ban-content">
          <div className="ban-notice">
            <h2>🛡️ Security Alert</h2>
            <p>
              Your IP address has been permanently banned from accessing TingleTap. 
              This restriction applies to all devices connected from your network location.
            </p>
          </div>

          {banInfo && (
            <div className="ban-details">
              <h3>📋 Ban Information</h3>
              <div className="ban-info-grid">
                <div className="ban-info-item">
                  <span className="label">🌐 Your IP Address:</span>
                  <span className="value ip-highlight">{banInfo.ip}</span>
                </div>
                
                {banInfo.bannedAt && (
                  <div className="ban-info-item">
                    <span className="label">📅 Banned On:</span>
                    <span className="value">{formatDate(banInfo.bannedAt)}</span>
                  </div>
                )}
                
                {banInfo.reason && (
                  <div className="ban-info-item">
                    <span className="label">📝 Reason:</span>
                    <span className="value">{banInfo.reason}</span>
                  </div>
                )}
                
                {banInfo.bannedBy && (
                  <div className="ban-info-item">
                    <span className="label">👤 Banned By:</span>
                    <span className="value">{banInfo.bannedBy}</span>
                  </div>
                )}
                
                {banInfo.userInfo?.displayName && (
                  <div className="ban-info-item">
                    <span className="label">🏷️ Associated Account:</span>
                    <span className="value">{banInfo.userInfo.displayName}</span>
                  </div>
                )}

                {banInfo.location && (
                  <div className="ban-info-item">
                    <span className="label">📍 Location:</span>
                    <span className="value">{banInfo.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ban-consequences">
            <h3>⚠️ What This Means</h3>
            <ul>
              <li>🚫 <strong>Complete Access Block:</strong> You cannot access TingleTap from this IP address</li>
              <li>🌐 <strong>Network-Wide Ban:</strong> All devices on your network are affected</li>
              <li>🔒 <strong>Permanent Restriction:</strong> This ban does not expire automatically</li>
              <li>📱 <strong>Device Independent:</strong> Changing devices won't restore access</li>
              <li>🛡️ <strong>Security Measure:</strong> This protects our community from harmful behavior</li>
            </ul>
          </div>

          <div className="ban-appeal">
            <h3>📧 Appeal Process</h3>
            <p>
              If you believe this ban was issued in error, you may contact our support team 
              from a different network connection. Please include your IP address and ban reference 
              information in your appeal.
            </p>
            <div className="contact-info">
              <p><strong>Support Email:</strong> Support@tingletap.com</p>
              <p><strong>Reference ID:</strong> {banInfo?.id || 'Unknown'}</p>
            </div>
          </div>

          <div className="ban-footer">
            <div className="footer-note">
              <p>
                <strong>Note:</strong> Attempting to bypass this ban through VPNs, proxies, 
                or other means is strictly prohibited and may result in additional restrictions.
              </p>
            </div>
            
            {onRetry && (
              <button 
                className="retry-button"
                onClick={onRetry}
              >
                🔄 Check Access Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default IPBanModal;