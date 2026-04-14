// PATH: rsklegacy-frontend/src/components/layout/ErrorBoundary.tsx

/**
 * FIX (Issue #10): React ErrorBoundary.
 *
 * Previously, any uncaught error from a failed contract read (e.g. RPC down,
 * malformed response) would crash the entire application with a blank screen.
 *
 * This ErrorBoundary wraps the whole app (in layout.tsx) and renders a
 * recovery UI instead of crashing. It is a class component because React's
 * error boundary API (componentDidCatch / getDerivedStateFromError) is only
 * available on class components.
 */

"use client";
import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message ?? "Unknown error",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to a monitoring service (e.g. Sentry).
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
          <div className="max-w-md w-full border border-red-500/30 bg-red-500/10 rounded-2xl p-8 text-center space-y-4">
            <p className="text-3xl">⚠</p>
            <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
            <p className="text-zinc-400 text-sm">
              The app encountered an unexpected error — this is usually caused by an RPC
              connection failure or an unexpected contract response.
            </p>
            {this.state.message && (
              <p className="text-zinc-600 text-xs font-mono break-all">
                {this.state.message.slice(0, 200)}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
              aria-label="Try reloading the application"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}