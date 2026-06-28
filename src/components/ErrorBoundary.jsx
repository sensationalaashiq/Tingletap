import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Don't auto-reload for any errors - just log them
    // PM errors should be handled gracefully in components
  }

  render() {
    if (this.state.hasError) {
      const isFirestoreError = this.state.error?.message?.includes('FIRESTORE') && 
                               this.state.error?.message?.includes('INTERNAL ASSERTION FAILED');

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
          <p style={{ marginBottom: '10px', color: '#666' }}>
            The application encountered an unexpected error. Please try reloading the page.
          </p>
          <p style={{ marginBottom: '20px', color: '#e74c3c', fontSize: '12px', maxWidth: '500px', wordBreak: 'break-word', background: '#fff0f0', padding: '8px', borderRadius: '4px' }}>
            {this.state.error?.toString()}
          </p>
          <button 
            onClick={() => window.location.reload()}
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
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;