import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getSearchJobs } from '../services/api-client'
import type { SearchJob } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'

export default function HistoryPage() {
  const [jobs, setJobs] = useState<SearchJob[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getSearchJobs(1, 50, controller.signal).then((response) => setJobs(response.items)).catch((cause: unknown) => {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof ApiError ? cause.message : 'Search history could not be loaded.')
    })
    return () => controller.abort()
  }, [])
  return (
    <div className="page-stack page-stack--narrow">
      <PageHeader eyebrow="WORKSPACE" title="Search history" description="Return to previous searches and review their collection outcomes." />
      {jobs === null && !error && <Surface className="loading-panel" role="status">Loading saved searches…</Surface>}
      {error && <Surface className="empty-results" role="alert">{error}</Surface>}
      {jobs?.length === 0 && <Surface className="empty-results"><h2>No saved searches yet</h2><p>Start a discovery to see its real collection status here.</p><Link className="button button--primary" to="/discovery">New discovery</Link></Surface>}
      {jobs && jobs.length > 0 && <div className="history-list">{jobs.map((job) => <Link className="history-row" key={job.id} to={`/jobs/${encodeURIComponent(job.id)}`}><div><strong>{job.criteria.keyword}</strong><span>{new Date(job.created_at).toLocaleString()} · {job.criteria.target_count} target videos</span></div><div className="history-row__result"><span className="status-tag">{job.status.replaceAll('_', ' ')}</span><strong>{job.counts.matched} matched</strong></div></Link>)}</div>}
    </div>
  )
}
