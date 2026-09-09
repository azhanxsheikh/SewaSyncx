import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class SOSRouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SOS screen failed to render', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-white px-6 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">!</div>
          <h1 className="mt-5 font-display text-xl font-800 text-gray-900">We couldn't load this request</h1>
          <p className="mt-2 text-sm text-gray-500">Your request is safe. Return home and try again.</p>
          <button onClick={() => window.location.assign('/')} className="mt-6 w-full rounded-xl bg-red-500 py-3 font-display font-700 text-white hover:bg-red-600">Return to home</button>
        </div>
      </div>
    );
  }
}
