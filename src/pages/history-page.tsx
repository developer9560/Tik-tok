import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock3, History, LoaderCircle, RefreshCw, Search, Video } from 'lucide-react'
import { ApiError, getSearchJobs } from '../services/api-client'
import type { SearchJob } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'
import { LoadingSkeleton } from '../components/common/loading-skeleton'

const activeStatuses = new Set(['queued', 'collecting', 'retrieving', 'processing'])
const number = (value: number) => new Intl.NumberFormat().format(value)

function statusPresentation(status: string) {
  switch (status) {
    case 'queued':
      return { label: 'Queued', detail: 'Waiting for a worker to start collection', tone: 'warning', active: true }
    case 'collecting':
      return { label: 'Collecting', detail: 'Bright Data is collecting videos', tone: 'warning', active: true }
    case 'retrieving':
      return { label: 'Retrieving', detail: 'Downloading provider results', tone: 'warning', active: true }
    case 'processing':
      return { label: 'Processing', detail: 'Checking videos against your criteria', tone: 'warning', active: true }
    case 'completed':
      return { label: 'Completed', detail: 'Search finished successfully', tone: 'success', active: false }
    case 'partially_completed':
      return { label: 'Partially completed', detail: 'Search finished with fewer matches than requested', tone: 'warning', active: false }
    case 'failed':
      return { label: 'Failed', detail: 'Search could not be completed', tone: 'error', active: false }
    case 'canceled':
      return { label: 'Canceled', detail: 'Search was canceled', tone: 'neutral', active: false }
    default:
      return { label: status.replaceAll('_', ' '), detail: 'Latest search status', tone: 'neutral', active: false }
  }
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: 'Date unavailable', time: '' }
  return {
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date),
    time: new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date),
  }
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<SearchJob[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true)
    try {
      const response = await getSearchJobs(1, 50, signal)
      setJobs(response.items)
      setTotal(response.total)
      setUpdatedAt(new Date())
      setError(null)
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof ApiError ? cause.message : 'Search history could not be loaded.')
    } finally {
      if (!signal?.aborted) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [load])

  const hasActiveJobs = jobs?.some((job) => activeStatuses.has(job.status)) ?? false
  useEffect(() => {
    if (!hasActiveJobs) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 5000)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [hasActiveJobs, jobs, load])

  const activeCount = jobs?.filter((job) => activeStatuses.has(job.status)).length ?? 0
  const matchCount = jobs?.reduce((sum, job) => sum + job.counts.matched, 0) ?? 0

  return (
    <div className="page-stack history-page">
      <PageHeader
        eyebrow="YOUR WORKSPACE"
        title="Search history"
        description="Track collection progress, revisit completed searches, and open the results you’ve collected."
        trailing={<button className="button button--quiet" disabled={refreshing} onClick={() => void load()} type="button"><RefreshCw className={refreshing ? 'button-spinner' : ''} size={14} /> Refresh</button>}
      />

      {jobs && jobs.length > 0 && (
        <section aria-label="Search history overview" className="history-overview">
          <Surface className="history-overview__card">
            <span className="history-overview__icon"><History size={17} /></span>
            <span className="history-overview__label">All searches</span>
            <strong>{number(total)}</strong>
            <span className="history-overview__detail">saved in your workspace</span>
          </Surface>
          <Surface className={`history-overview__card${activeCount ? ' history-overview__card--active' : ''}`}>
            <span className="history-overview__icon"><LoaderCircle className={activeCount ? 'button-spinner' : ''} size={17} /></span>
            <span className="history-overview__label">In progress</span>
            <strong>{number(activeCount)}</strong>
            <span className="history-overview__detail">{activeCount ? 'status refreshes automatically' : 'no active searches right now'}</span>
          </Surface>
          <Surface className="history-overview__card">
            <span className="history-overview__icon"><Video size={17} /></span>
            <span className="history-overview__label">Matching videos</span>
            <strong>{number(matchCount)}</strong>
            <span className="history-overview__detail">across the latest {number(jobs.length)} searches</span>
          </Surface>
        </section>
      )}

      <section aria-labelledby="history-list-heading" className="history-section">
        <div className="history-section__heading">
          <div>
            <p className="eyebrow">RECENT ACTIVITY</p>
            <h2 id="history-list-heading">Your searches</h2>
          </div>
          {updatedAt && <span className="history-updated"><Clock3 size={13} /> Updated {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(updatedAt)}</span>}
        </div>

        {jobs === null && !error && <Surface className="history-loading"><LoadingSkeleton label="Loading your search history" rows={4} /></Surface>}
        {error && <Surface className="history-error" role="alert">
          <span className="history-error__icon"><AlertTriangle size={18} /></span>
          <div><strong>Couldn’t load search history</strong><p>{error}</p></div>
          <button className="button button--quiet button--small" disabled={refreshing} onClick={() => void load()} type="button">Try again</button>
        </Surface>}
        {jobs?.length === 0 && !error && <Surface className="history-empty">
          <span className="history-empty__icon"><Search size={20} /></span>
          <h2>No searches yet</h2>
          <p>Start a discovery to see its live collection status and saved results here.</p>
          <Link className="button button--primary" to="/discovery">Start a discovery <ArrowRight size={15} /></Link>
        </Surface>}

        {jobs && jobs.length > 0 && <div className="history-grid">
          {jobs.map((job) => {
            const state = statusPresentation(job.status)
            const created = formatDateTime(job.created_at)
            const updated = formatDateTime(job.updated_at)
            return <Link aria-label={`Open ${job.criteria.keyword} search, ${state.label}`} className={`history-card${state.active ? ' history-card--active' : ''}`} key={job.id} to={`/jobs/${encodeURIComponent(job.id)}`}>
              <div className="history-card__top">
                <span className={`history-card__status history-card__status--${state.tone}`}>
                  <span className={`history-card__status-dot${state.active ? ' history-card__status-dot--active' : ''}`} />
                  {state.label}
                </span>
                <ArrowRight aria-hidden="true" className="history-card__arrow" size={16} />
              </div>
              <h3 className="history-card__keyword">{job.criteria.keyword}</h3>
              <p className="history-card__state">{state.detail}</p>
              <div className="history-card__dates">
                <div><span>Started</span><time dateTime={job.created_at}>{created.date}{created.time && ` · ${created.time}`}</time></div>
                <div><span>Last update</span><time dateTime={job.updated_at}>{updated.date}{updated.time && ` · ${updated.time}`}</time></div>
              </div>
              <div className="history-card__footer">
                <span><strong>{number(job.counts.matched)}</strong> matched</span>
                <span><strong>{number(job.counts.discovered)}</strong> collected</span>
                <span>Target <strong>{number(job.criteria.target_count)}</strong></span>
              </div>
            </Link>
          })}
        </div>}
      </section>
    </div>
  )
}
