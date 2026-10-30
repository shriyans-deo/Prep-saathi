import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '../lib/i18n';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const lang = document.documentElement.lang === 'hi' ? 'hi' : 'en';
    return (
      <div role="alert" className="max-w-md py-8">
        <h1 className="text-xl font-bold mb-1">{translate(lang, 'This screen hit a problem')}</h1>
        <p className="text-ink-soft mb-4">{translate(lang, 'Your saved work is safe. Reloading usually fixes it.')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 px-4 rounded-sheet bg-ink text-white font-semibold"
        >
          {translate(lang, 'Reload')}
        </button>
      </div>
    );
  }
}
