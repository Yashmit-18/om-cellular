import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Guards the whole app against render-time crashes (lazy chunk failures,
// provider meltdowns, unexpected nulls). Defaults to a friendly, self-correcting
// fallback instead of a blank white screen.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50"><TriangleAlert className="h-7 w-7 text-red-500" /></div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-500">
            An unexpected error interrupted this page. Your data is safe — reload to continue.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Reload page
            </button>
            <button onClick={this.handleReset} className="btn-secondary">
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}