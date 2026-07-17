import React from 'react';

// FIX L-04: Track reload attempts in sessionStorage so we can detect reload loops.
// If the same error keeps crashing after 2 reloads, offer a "Clear data & reload"
// escape hatch instead of leaving the user stuck in an infinite reload loop.
const RELOAD_COUNT_KEY = 'tt_eb_reload_count';
const RELOAD_TS_KEY    = 'tt_eb_reload_ts';
const RELOAD_WINDOW_MS = 30_000; // resets after 30 s of stability

function getReloadCount() {
  try {
    const ts = parseInt(sessionStorage.getItem(RELOAD_TS_KEY) || '0', 10);
    if (Date.now() - ts > RELOAD_WINDOW_MS) return 0; // stale — treat as fresh
    return parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);
  } catch { return 0; }
}

function incrementReloadCount() {
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(getReloadCount() + 1));
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
  } catch {}
}

function clearReloadCount() {
  try {
    sessionStorage.removeItem(RELOAD_COUNT_KEY);
    sessionStorage.removeItem(RELOAD_TS_KEY);
  } catch {}
}

// Keys that can cause persistent crash loops if corrupted
const CLEARABLE_STORAGE_KEYS = [
  'tt_guest_profile', 'tt_page_toast', 'selectedTheme', 'tt_translation_settings',
  'tt_username_style', 'tt_msg_style', 'lb_cache_senders:all', 'lb_cache_receivers:all',
];

function clearAppData() {
  try {
    CLEARABLE_STORAGE_KEYS.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    clearReloadCount();
  } catch {}
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, reloadCount: getReloadCount() };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    // Don't auto-reload — just log. PM / Firestore errors should be handled
    // gracefully in their own components rather than crashing the whole app.
  }

  handleReload = () => {
    incrementReloadCount();
    window.location.reload();
  };

  handleClearAndReload = () => {
    clearAppData();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { reloadCount } = this.state;
      const isLooping = reloadCount >= 2;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '16px' }}>
            🚨 Something went wrong
          </h2>

          {isLooping ? (
            <p style={{ marginBottom: '10px', color: '#666', maxWidth: '440px' }}>
              The app keeps crashing after reloading. Clearing saved data usually fixes this.
            </p>
          ) : (
            <p style={{ marginBottom: '10px', color: '#666' }}>
              The application encountered an unexpected error. Please try reloading the page.
            </p>
          )}

          <p style={{ marginBottom: '20px', color: '#e74c3c', fontSize: '12px', maxWidth: '500px', wordBreak: 'break-word', background: '#fff0f0', padding: '8px', borderRadius: '4px' }}>
            {this.state.error?.toString()}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Reload Page
            </button>

            {/* Show "Clear data" after 2 failed reloads, or always as secondary option */}
            <button
              onClick={this.handleClearAndReload}
              style={{
                padding: '12px 24px',
                backgroundColor: isLooping ? '#e74c3c' : '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: isLooping ? '16px' : '14px'
              }}
            >
              {isLooping ? '🗑️ Clear Data & Reload' : 'Clear Data & Reload'}
            </button>
          </div>

          {isLooping && (
            <p style={{ marginTop: '16px', fontSize: '11px', color: '#999', maxWidth: '400px' }}>
              This clears locally saved settings (theme, preferences) but does not affect your account or messages.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;