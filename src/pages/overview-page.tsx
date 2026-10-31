import { useEffect, useState } from 'react'
import { ArrowUpRight, AudioLines, CalendarClock, CircleCheck, ScanSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError, getOverviewMetrics, getSearchJobs } from '../services/api-client'
import type { OverviewMetrics, SearchJob } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'

const principles = [
  { icon: CalendarClock, title: 'Filter with precision', description: 'Set an upload window and view range. Missing metadata stays visible instead of being guessed.' },
  { icon: ScanSearch, title: 'Review every match', description: 'Keep category decisions transparent, with the evidence behind each result.' },
  { icon: AudioLines, title: 'Verify language carefully', description: 'Separate caption language from spoken-language evidence and confidence.' },
]

export default function OverviewPage() {
  const [jobs, setJobs] = useState<SearchJob[] | null>(null)
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled([
      getOverviewMetrics(controller.signal),
      getSearchJobs(1, 5, controller.signal),
    ]).then(([metricsResult, jobsResult]) => {
      if (controller.signal.aborted) return
      if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value)
      else setMetricsError(metricsResult.reason instanceof ApiError ? metricsResult.reason.message : 'Dashboard metrics could not be loaded.')
      if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value.items)
      else setHistoryError(jobsResult.reason instanceof ApiError ? jobsResult.reason.message : 'Recent searches could not be loaded.')
    })
    return () => controller.abort()
  }, [])
  const number = (value: number) => new Intl.NumberFormat().format(value)
  return (
    <div className="page-stack">
      <PageHeader eyebrow="YOUR RESEARCH WORKSPACE" title="Find the signal in every scroll." description="A focused workspace for discovering TikTok videos and verifying every result against your criteria." />

      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-panel__copy">
          <span className="welcome-panel__label"><span className="welcome-panel__spark" /> CLIPSCOPE WORKSPACE</span>
          <h2 id="welcome-title">Research starts with the right filters.</h2>
          <p>Search TikTok by keyword, track real collection progress, and inspect the evidence behind every matching video.</p>
          <Link className="text-link" to="/discovery">Start a new discovery <ArrowUpRight size={16} /></Link>
        </div>
        <div aria-hidden="true" className="welcome-art">
          <div className="welcome-art__halo" />
          <div className="welcome-art__orbit welcome-art__orbit--one" />
          <div className="welcome-art__orbit welcome-art__orbit--two" />
          <span className="welcome-art__node welcome-art__node--one"><ScanSearch size={21} /></span>
          <span className="welcome-art__node welcome-art__node--two"><AudioLines size={19} /></span>
          <span className="welcome-art__node welcome-art__node--three"><CircleCheck size={19} /></span>
          <span className="welcome-art__center"><span /></span>
        </div>
      </section>

      <section aria-label="Workspace metrics" className="dashboard-metrics">
        {metrics && [
          ['Total jobs', metrics.total_jobs],
          ['Active jobs', metrics.active_jobs],
          ['Unique videos', metrics.unique_videos],
          ['Matching videos', metrics.matching_videos],
          ['Unverified language', metrics.unverified_videos],
        ].map(([label, value]) => (
          <Surface className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{number(Number(value))}</strong>
          </Surface>
        ))}
        {metricsError && <Surface className="metric-error" role="alert">Dashboard metrics unavailable: {metricsError}</Surface>}
        {!metrics && !metricsError && <Surface className="metric-error" role="status">Loading dashboard metrics…</Surface>}
      </section>

      <section className="principles-section" aria-labelledby="principles-title">
        <div className="section-heading">
          <div><p className="eyebrow">BUILT FOR TRUSTWORTHY DISCOVERY</p><h2 id="principles-title">The details that matter</h2></div>
          <span className="section-heading__note">No guessed counts. No hidden filters.</span>
        </div>
        <div className="principles-grid">
          {principles.map(({ icon: Icon, title, description }, index) => (
            <Surface className="principle-card" key={title}>
              <span className="principle-card__icon"><Icon size={19} strokeWidth={1.8} /></span>
              <span className="principle-card__index">0{index + 1}</span>
              <h3>{title}</h3><p>{description}</p>
            </Surface>
          ))}
        </div>
      </section>

      <Surface className="activity-panel">
        <div className="activity-panel__header"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recent searches</h2></div><span className="activity-panel__mark"><CircleCheck size={17} /></span></div>
        {jobs === null && !historyError && <p className="activity-loading" role="status">Loading recent searches…</p>}
        {historyError && <p className="activity-loading" role="alert">{historyError}</p>}
        {jobs?.length === 0 && <div className="activity-empty"><p className="eyebrow">NO SEARCH HISTORY YET</p><h3>Your workspace is ready.</h3><p>Start a keyword search to see its live collection status here.</p><Link className="button button--quiet button--small" to="/discovery">Start discovery <ArrowUpRight size={14} /></Link></div>}
        {jobs && jobs.length > 0 && <div className="activity-list">{jobs.map((job) => <Link className="activity-row" key={job.id} to={`/jobs/${encodeURIComponent(job.id)}`}><div><strong>{job.criteria.keyword}</strong><span>{new Date(job.created_at).toLocaleString()}</span></div><div><span className="status-tag">{job.status.replaceAll('_', ' ')}</span><strong>{job.counts.matched} matched</strong></div></Link>)}</div>}
      </Surface>
      {metrics && metrics.recent_failures.length > 0 && <Surface className="activity-panel">
        <div className="activity-panel__header"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Recent failures</h2></div></div>
        <div className="activity-list">{metrics.recent_failures.map((job) => <Link className="activity-row" key={job.id} to={`/jobs/${encodeURIComponent(job.id)}`}><div><strong>{job.criteria.keyword}</strong><span>{job.error_summary || 'No failure detail available'}</span></div><div><span className="status-tag status-tag--error">failed</span></div></Link>)}</div>
      </Surface>}
      <footer className="page-footer"><span>ClipScope</span><span>Evidence-led video discovery</span></footer>
    </div>
  )
}
