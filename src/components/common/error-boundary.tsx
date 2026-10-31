import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ClipScope interface error', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="crash-screen">
          <span className="empty-state__icon empty-state__icon--error"><AlertTriangle size={20} /></span>
          <p className="eyebrow">Something went wrong</p>
          <h1>We couldn’t load this view.</h1>
          <p className="empty-state__description">Your search data has not been changed. Return to the workspace and try again.</p>
          <Link className="button button--primary" to="/" onClick={() => this.setState({ hasError: false })}>Return to workspace</Link>
        </main>
      )
    }
    return this.props.children
  }
}
