import React from 'react';

/**
 * Catches render/effect crashes anywhere below it so the player sees a
 * readable message instead of a blank white/black screen. The message
 * includes the error text so bug reports are actionable.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // surface to console for debugging; no external logging yet
    console.error('Nightfall crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="eb-fallback">
          <div className="eb-card">
            <h1>The night went dark.</h1>
            <p>Something crashed while loading. The error was:</p>
            <pre>{String(this.state.error?.message || this.state.error)}</pre>
            <div className="eb-actions">
              <button className="btn-primary" onClick={() => window.location.reload()}>
                Try Again
              </button>
              <button className="btn-ghost" onClick={() => window.location.assign('/')}>
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
