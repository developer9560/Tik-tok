import type { ReactNode } from 'react'
import { Compass } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  eyebrow?: string
}

export function EmptyState({ title, description, icon, eyebrow = 'Workspace' }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <span className="empty-state__icon" aria-hidden="true">{icon ?? <Compass size={20} />}</span>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="empty-state-title">{title}</h2>
      <p className="empty-state__description">{description}</p>
    </section>
  )
}
