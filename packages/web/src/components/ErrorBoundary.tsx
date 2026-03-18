import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg m-4">
          <h3 className="text-red-400 font-bold">Something went wrong</h3>
          <p className="text-sm text-red-300 mt-1">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-red-800 text-white rounded text-sm hover:bg-red-700">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
