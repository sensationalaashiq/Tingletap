import React from 'react';
import './VPNBlockModal.css';

const VPNBlockModal = React.memo(({ vpnInfo, onRetry }) => {
  // Derive which threat types were detected for the subtitle line
  const threats = [
    vpnInfo?.is_vpn     && 'VPN',
    vpnInfo?.is_proxy   && 'Proxy',
    vpnInfo?.is_tor     && 'Tor',
    vpnInfo?.is_relay   && 'Relay',
    vpnInfo?.is_hosting && 'Datacenter',
  ].filter(Boolean);

  const detectedLabel = threats.length > 0 ? threats.join(' · ') : 'Restricted Connection';

  // API temporarily unavailable (not a VPN block, just a check failure)
  const isUnavailable = vpnInfo?._unavailable;

  return (
    <div className="vpn-overlay" role="alertdialog" aria-modal="true" aria-label="Access Restricted">
      <div className="vpn-card">

        {/* Shield icon */}
        <div className="vpn-icon-wrap">
          <svg className="vpn-shield" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L3 6v5c0 5.25 3.75 10.15 9 11.35C17.25 21.15 21 16.25 21 11V6L12 2z"
              fill="currentColor" opacity=".15"
            />
            <path
              d="M12 2L3 6v5c0 5.25 3.75 10.15 9 11.35C17.25 21.15 21 16.25 21 11V6L12 2z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"
            />
            <path
              d="M8.5 12.5l2.5 2.5 5-5"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>

        {isUnavailable ? (
          <>
            <h1 className="vpn-title">Verification Temporarily Unavailable</h1>
            <p className="vpn-subtitle">Security Status · Unable to verify</p>
            <p className="vpn-message">
              We were unable to verify your connection at this time.
              Please wait a moment and try again.
            </p>
          </>
        ) : (
          <>
            <h1 className="vpn-title">Access Restricted</h1>
            <p className="vpn-subtitle">Security Status · {detectedLabel}</p>
            <p className="vpn-message">
              VPN, Proxy, Tor, or Datacenter connections are not allowed.
              Please disable them and try again.
            </p>
          </>
        )}

        <div className="vpn-divider" />

        {/* Action buttons */}
        <div className="vpn-actions">
          <button className="vpn-btn vpn-btn--primary" onClick={onRetry}>
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
              <path
                d="M4 10a6 6 0 1 0 1.17-3.55M4 10V6m0 4H8"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Check Again
          </button>
          <a className="vpn-btn vpn-btn--secondary" href="/contact">
            Contact Support
          </a>
        </div>

        <p className="vpn-footer-note">
          Your account is not affected. Connect without VPN/Proxy/Tor to continue.
        </p>
      </div>
    </div>
  );
});

VPNBlockModal.displayName = 'VPNBlockModal';
export default VPNBlockModal;
