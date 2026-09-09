import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application failed to render', error, info);
  }

  private resetSession = () => {
    try {
      window.localStorage.clear();
    } catch (error) {
      console.warn('Unable to clear local storage', error);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
        <section className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 font-display text-2xl font-800 text-red-600">!</div>
          <h1 className="mt-4 font-display text-xl font-800 text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-500">The app hit an unexpected error. Reset the local session and reload to continue.</p>
          <button type="button" onClick={this.resetSession} className="mt-6 w-full rounded-xl bg-red-500 px-4 py-3 font-display font-700 text-white transition hover:bg-red-600">Reset Session &amp; Reload</button>
        </section>
      </main>
    );
  }
}
