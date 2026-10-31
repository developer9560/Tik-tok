import type { HTMLAttributes, ReactNode } from 'react'

export function Surface({ children, className = '', ...attributes }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section {...attributes} className={`surface ${className}`.trim()}>{children}</section>
}

export function StatusTag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'error' }) {
  return <span className={`status-tag status-tag--${tone}`}><span className="status-tag__dot" />{children}</span>
}
