import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/empty-state'

export default function NotFoundPage() {
  return (
    <div className="page-stack page-stack--narrow">
      <EmptyState eyebrow="404 · PAGE NOT FOUND" title="We couldn’t find that page." description="The page may have moved, or the address may be incorrect." />
      <Link className="button button--primary button--center" to="/">Back to overview</Link>
    </div>
  )
}
