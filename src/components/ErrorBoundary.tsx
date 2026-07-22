import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Without this, one throw anywhere in the tree unmounts the whole page and the
 * user is left staring at white. A missing icon import once did exactly that.
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error in component tree', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-red-50 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Something broke</h1>
          <p className="text-gray-600">
            The page hit an unexpected error. Reloading usually clears it.
          </p>
          <p className="text-xs text-gray-400 font-mono break-words">{error.message}</p>
          <Button type="button" onClick={() => window.location.reload()} className="w-full">
            Reload the page
          </Button>
        </div>
      </div>
    );
  }
}
