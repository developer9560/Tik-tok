import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  History,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  Search,
  Video,
} from 'lucide-react'
import { ApiError, getOverviewMetrics, getSearchJobs } from '../services/api-client'
import type { OverviewMetrics, SearchJob } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'

const activeStatuses = new Set(['queued', 'collecting', 'retrieving', 'processing'])
const number = (value: number) => new Intl.NumberFormat().format(value)

const principles = [
  { icon: Clock3, title: 'Filter with precision', description: 'Set an upload window and view range. Missing metadata stays visible instead of being guessed.' },
  { icon: ScanSearch, title: 'Review every result', description: 'Keep category decisions transparent, with the evidence behind each video.' },
  { icon: AudioLines, title: 'Verify language carefully', description: 'Separate caption language from spoken-language evidence and confidence.' },
]

function jobStatus(status: string) {
  switch (status) {
    case 'queued': return { label: 'Queued', tone: 'warning', active: true }
    case 'collecting': return { label: 'Collecting', tone: 'warning', active: true }
    case 'retrieving': return { label: 'Retrieving', tone: 'warning', active: true }
    case 'processing': return { label: 'Processing', tone: 'warning', active: true }
    case 'completed': return { label: 'Completed', tone: 'success', active: false }
    case 'partially_completed': return { label: 'Partial', tone: 'warning', active: false }
    case 'failed': return { label: 'Failed', tone: 'error', active: false }
    case 'canceled': return { label: 'Canceled', tone: 'neutral', active: false }
    default: return { label: status.replaceAll('_', ' '), tone: 'neutral', active: false }
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function OverviewPage() {
  const [jobs, setJobs] = useState<SearchJob[] | null>(null)
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true)
    const [metricsResult, jobsResult] = await Promise.allSettled([
      getOverviewMetrics(signal),
      getSearchJobs(1, 5, signal),
    ])
    if (signal?.aborted) return

    if (metricsResult.status === 'fulfilled') {
      setMetrics(metricsResult.value)
      setMetricsError(null)
    } else {
      setMetricsError(metricsResult.reason instanceof ApiError ? metricsResult.reason.message : 'Dashboard metrics could not be loaded.')
    }
    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value.items)
      setHistoryError(null)
    } else {
      setHistoryError(jobsResult.reason instanceof ApiError ? jobsResult.reason.message : 'Recent searches could not be loaded.')
    }
    setLastUpdated(new Date())
    setRefreshing(false)
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
    const interval = window.setInterval(() => void load(controller.signal), 10000)
    return () => {
      window.clearInterval(interval)
      controller.abort()
    }
  }, [hasActiveJobs, load])

  const metricCards = metrics ? [
    { label: 'Total searches', value: metrics.total_jobs, detail: 'Searches in your workspace', icon: Search, tone: 'violet', href: '/history' },
    { label: 'Active searches', value: metrics.active_jobs, detail: metrics.active_jobs ? 'Collection is in progress' : 'No searches running', icon: Activity, tone: 'amber', href: '/history', active: metrics.active_jobs > 0 },
    { label: 'Videos discovered', value: metrics.unique_videos, detail: 'Unique videos collected', icon: Video, tone: 'blue', href: '/history' },
    { label: 'Matching videos', value: metrics.matching_videos, detail: 'Meet your search criteria', icon: CheckCircle2, tone: 'green', href: '/history' },
    { label: 'Language review', value: metrics.unverified_videos, detail: 'Need language verification', icon: Eye, tone: 'rose', href: '/history' },
  ] : []

  return (
    <div className="page-stack overview-page">
      <PageHeader
        eyebrow="RESEARCH WORKSPACE"
        title="Discovery at a glance"
        description="Monitor collection activity, review your results, and pick up where your research left off."
        trailing={
          <div className="overview-header-actions">
            {lastUpdated && <span className="overview-updated"><Clock3 size={13} /> Updated {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(lastUpdated)}</span>}
            <button aria-label="Refresh dashboard" className="button button--quiet" disabled={refreshing} onClick={() => void load()} type="button">
              <RefreshCw className={refreshing ? 'button-spinner' : ''} size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* <section className="welcome-panel overview-hero" aria-labelledby="welcome-title">
        <div className="welcome-panel__copy">
          <span className="welcome-panel__label"><span className="welcome-panel__spark" /> CLIPSCOPE WORKSPACE</span>
          <h2 id="welcome-title">Turn discovery into insight.</h2>
          <p>Search TikTok by keyword, follow collection as it happens, and inspect the evidence behind each result.</p>
          <div className="overview-hero__actions">
            <Link className="button button--hero-primary" to="/discovery">Start a discovery <ArrowUpRight size={16} /></Link>
            <Link className="button button--hero-secondary" to="/history">View search history <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div aria-hidden="true" className="welcome-art">
          <div className="welcome-art__halo" />
          <div className="welcome-art__orbit welcome-art__orbit--one" />
          <div className="welcome-art__orbit welcome-art__orbit--two" />
          <span className="welcome-art__node welcome-art__node--one"><ScanSearch size={21} /></span>
          <span className="welcome-art__node welcome-art__node--two"><AudioLines size={19} /></span>
          <span className="welcome-art__node welcome-art__node--three"><CheckCircle2 size={19} /></span>
          <span className="welcome-art__center"><span /></span>
        </div>
      </section> */}

      <section aria-labelledby="workspace-metrics-heading" className="overview-metrics-section">
        <div className="overview-section-heading">
          <div><p className="eyebrow">WORKSPACE PULSE</p><h2 id="workspace-metrics-heading">Your research, at a glance</h2></div>
          {hasActiveJobs && <span className="overview-live-indicator"><span /> Live collection updates enabled</span>}
        </div>
        {metrics && <div className="dashboard-metrics">
          {metricCards.map(({ label, value, detail, icon: Icon, tone, href, active }) => (
            <Link aria-label={`${label}: ${number(Number(value))}. ${detail}`} className={`overview-metric overview-metric--${tone}${active ? ' overview-metric--active' : ''}`} key={label} to={href}>
              <span className="overview-metric__top"><span className="overview-metric__icon"><Icon aria-hidden="true" size={17} /></span>{active && <span className="overview-metric__pulse"><span /> Live</span>}</span>
              <span className="overview-metric__label">{label}</span>
              <strong>{number(Number(value))}</strong>
              <span className="overview-metric__detail">{detail}</span>
            </Link>
          ))}
        </div>}
        {metricsError && <Surface className="metric-error" role="alert"><CircleAlert size={16} /> Dashboard metrics unavailable: {metricsError} <button className="overview-inline-retry" onClick={() => void load()} type="button">Retry</button></Surface>}
        {!metrics && !metricsError && <Surface className="metric-error" role="status"><LoaderCircle className="button-spinner" size={16} /> Loading workspace metrics…</Surface>}
      </section>

      <section aria-labelledby="recent-searches-heading" className="overview-activity">
        <Surface className="activity-panel">
          <div className="activity-panel__header">
            <div><p className="eyebrow">YOUR WORKSPACE</p><h2 id="recent-searches-heading">Recent searches</h2><p className="overview-panel__description">Open a search to follow its status or review collected videos.</p></div>
            <Link aria-label="View all search history" className="overview-panel__icon-link" to="/history"><History size={17} /></Link>
          </div>
          {jobs === null && !historyError && <div className="overview-list-loading" role="status"><LoaderCircle className="button-spinner" size={16} /> Loading recent searches…</div>}
          {historyError && <div className="overview-list-error" role="alert"><CircleAlert size={16} /><span>{historyError}</span><button className="overview-inline-retry" onClick={() => void load()} type="button">Retry</button></div>}
          {jobs?.length === 0 && <div className="activity-empty"><span className="activity-empty__icon"><Search size={20} /></span><h3>Your workspace is ready.</h3><p>Start a keyword search to see its live collection status here.</p><Link className="button button--quiet button--small" to="/discovery">Start discovery <ArrowUpRight size={14} /></Link></div>}
          {jobs && jobs.length > 0 && <div className="overview-search-list">
            {jobs.map((job) => {
              const status = jobStatus(job.status)
              return <Link className={`overview-search-row${status.active ? ' overview-search-row--active' : ''}`} key={job.id} to={`/jobs/${encodeURIComponent(job.id)}`}>
                <span className={`overview-search-row__icon overview-search-row__icon--${status.tone}`}><Search size={16} /></span>
                <span className="overview-search-row__main"><strong>{job.criteria.keyword}</strong><span><Clock3 size={12} /> {formatDate(job.created_at)}</span></span>
                <span className={`overview-search-row__status overview-search-row__status--${status.tone}`}><span className={status.active ? 'overview-status-dot overview-status-dot--active' : 'overview-status-dot'} />{status.label}</span>
                <span className="overview-search-row__matches"><strong>{number(job.counts.matched)}</strong><span>matched</span></span>
                <ArrowRight aria-hidden="true" className="overview-search-row__arrow" size={16} />
              </Link>
            })}
          </div>}
          <div className="overview-panel-footer"><Link to="/history">View all searches <ArrowRight size={14} /></Link><Link to="/discovery">New discovery <ArrowUpRight size={14} /></Link></div>
        </Surface>

        <Surface className="overview-attention-panel">
          <div className="activity-panel__header"><div><p className="eyebrow">RESEARCH PRINCIPLES</p><h2>Built for clear decisions</h2></div><span className="activity-panel__mark"><CheckCircle2 size={17} /></span></div>
          <div className="overview-principles">
            {principles.map(({ icon: Icon, title, description }, index) => (
              <div className="overview-principle" key={title}>
                <span className="overview-principle__icon"><Icon size={16} /></span>
                <span className="overview-principle__copy"><strong>{title}</strong><span>{description}</span></span>
                <span className="overview-principle__index">0{index + 1}</span>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      {metrics && metrics.recent_failures.length > 0 && <Surface className="overview-failures">
        <div className="activity-panel__header"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Recent failures</h2></div><span className="overview-failure-icon"><CircleAlert size={17} /></span></div>
        <div className="overview-search-list">{metrics.recent_failures.map((job) => (
          <Link className="overview-search-row overview-search-row--failure" key={job.id} to={`/jobs/${encodeURIComponent(job.id)}`}>
            <span className="overview-search-row__icon overview-search-row__icon--error"><CircleAlert size={16} /></span>
            <span className="overview-search-row__main"><strong>{job.criteria.keyword}</strong><span>{job.error_summary || 'No failure detail available'}</span></span>
            <span className="overview-search-row__status overview-search-row__status--error">Failed</span>
            <ArrowRight aria-hidden="true" className="overview-search-row__arrow" size={16} />
          </Link>
        ))}</div>
      </Surface>}

      <footer className="page-footer"><span>ClipScope</span><span>Evidence-led video discovery</span></footer>
    </div>
  )
}
