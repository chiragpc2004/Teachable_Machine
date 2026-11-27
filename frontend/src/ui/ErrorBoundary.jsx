import { Component } from 'react';
import { clearAll } from '../project/storage.js';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="card" role="alert">
          <h1>Something went wrong</h1>
          <p>Reloading usually fixes it. Your project is saved in this browser.</p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
              Reload
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                if (!confirm('Delete the saved project and start over?')) return;
                await clearAll().catch(() => {});
                location.reload();
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }
}
