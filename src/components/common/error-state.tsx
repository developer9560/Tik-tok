import { AlertCircle, RotateCw } from 'lucide-react'

interface ErrorStateProps {
  title: string
  description: string
  onRetry?: () => void
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <section className="notice notice--error" role="alert">
      <span className="notice__icon"><AlertCircle size={19} /></span>
      <div className="notice__content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {onRetry && (
        <button className="button button--quiet button--small" onClick={onRetry} type="button">
          <RotateCw size={15} /> Try again
        </button>
      )}
    </section>
  )
}
