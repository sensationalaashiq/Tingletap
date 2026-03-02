
import React, { useState } from 'react';
import './VPNBlockModal.css';

const VPNBlockModal = ({ vpnInfo, onRetry }) => {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminBypass = () => {
    // Simple admin bypass for testing (you should implement proper authentication)
    if (adminPassword === 'admin123') {
      localStorage.setItem('vpn_bypass', 'true');
      window.location.reload();
    } else {
      alert('Invalid admin password');
    }
  };

  return (
    <div className="vpn-block-overlay">
      <div className="vpn-block-modal">
        <div className="vpn-block-header">
          <div className="vpn-block-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" 
                fill="#ef4444"
              />
            </svg>
          </div>
          <div className="vpn-block-title">
            <h2>🚫 Access Denied</h2>
            <p>VPN/Proxy Detected</p>
          </div>
        </div>

        <div className="vpn-block-content">
          <div className="vpn-block-message">
            <h3>🛡️ Security Notice</h3>
            <p>
              We've detected that you're using a VPN, proxy, or similar service. 
              For security and compliance reasons, access to our platform is restricted 
              when using these services.
            </p>
          </div>

          {vpnInfo && (
            <div className="vpn-detection-details">
              <div className="detail-item">
                <span className="label">Your IP:</span>
                <span className="value">{vpnInfo.ip}</span>
              </div>
              {vpnInfo.location && (
                <div className="detail-item">
                  <span className="label">Location:</span>
                  <span className="value">{vpnInfo.location}</span>
                </div>
              )}
              {vpnInfo.provider && (
                <div className="detail-item">
                  <span className="label">Provider:</span>
                  <span className="value">{vpnInfo.provider}</span>
                </div>
              )}
              {vpnInfo.detectedBy?.length > 0 && (
                <div className="detail-item">
                  <span className="label">Detected by:</span>
                  <span className="value">{vpnInfo.detectedBy.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          <div className="vpn-instructions">
            <h4>📋 To access our platform:</h4>
            <ol>
              <li>Disconnect from your VPN or proxy service</li>
              <li>Close and restart your browser</li>
              <li>Visit our site using your regular internet connection</li>
              <li>If issues persist, try clearing your browser cache</li>
            </ol>
          </div>

          <div className="vpn-actions">
            <button 
              className="retry-button"
              onClick={onRetry}
            >
              🔄 Check Again
            </button>
            <button 
              className="help-button"
              onClick={() => window.open('/contact', '_blank')}
            >
              🆘 Need Help?
            </button>
            <button 
              className="admin-button"
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              style={{ display: process.env.NODE_ENV === 'development' ? 'block' : 'none' }}
            >
              🔧 Admin
            </button>
          </div>

          {showAdminPanel && (
            <div className="admin-bypass-panel">
              <h4>🔧 Admin Bypass (Development Only)</h4>
              <div className="admin-input-group">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Admin password"
                  className="admin-password-input"
                />
                <button onClick={handleAdminBypass} className="admin-bypass-button">
                  Bypass
                </button>
              </div>
            </div>
          )}

          <div className="vpn-footer">
            <p>
              <strong>Why do we block VPNs?</strong><br/>
              We block VPNs and proxies to prevent abuse, ensure compliance with regional regulations, 
              and maintain the security and integrity of our platform for all users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPNBlockModal;
