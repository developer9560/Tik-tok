interface LoadingSkeletonProps {
  label?: string
  rows?: number
}

export function LoadingSkeleton({ label = 'Loading content', rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className="skeleton-block" role="status" aria-label={label}>
      <span className="skeleton skeleton--heading" />
      {Array.from({ length: rows }, (_, index) => <span className="skeleton" key={index} />)}
      <span className="sr-only">{label}</span>
    </div>
  )
}
