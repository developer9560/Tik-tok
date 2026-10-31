import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { ApiError, getExportUrl, getSearchJob, getSearchVideos } from '../services/api-client'
import type { SearchJob, PaginatedVideos, VideoDecisionFilter, VideoResult } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'
import { VideoCard } from '../components/videos/video-card'

const terminal = new Set(['completed', 'partially_completed', 'failed'])
const number = (n: number) => new Intl.NumberFormat().format(n)

function collectionLabel(job: SearchJob) {
  if (job.status === 'failed') return 'Collection failed'
  if (job.status === 'queued') return 'Queued'
  if (job.snapshot_id) return 'Provider snapshot active'
  if (job.status === 'collecting') return 'Submitting provider request'
  if (job.status === 'retrieving') return 'Retrieving provider results'
  if (job.status === 'processing') return 'Filtering results'
  return 'Collection finished'
}

export default function JobPage() {
  const { jobId = '' } = useParams()
  const [job, setJob] = useState<SearchJob | null>(null)
  const [page, setPage] = useState<PaginatedVideos | null>(null)
  const [sort, setSort] = useState<'views' | 'upload_date' | 'creator'>('views')
  const [pageNumber, setPageNumber] = useState(1)
  const [decision, setDecision] = useState<VideoDecisionFilter>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!jobId) return
    setError(null)
    try {
      const current = await getSearchJob(jobId, signal)
      setJob(current)
      const results = await getSearchVideos(jobId, pageNumber, sort, decision, search, signal)
      setPage(results)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof ApiError ? cause.message : 'Could not load this search.')
    }
  }, [jobId, pageNumber, sort, decision, search])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])

  useEffect(() => {
    if (!job || terminal.has(job.status)) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 4000)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [job, load])

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }
  function changeSort(value: typeof sort) { setSort(value); setPageNumber(1) }
  function changeDecision(value: VideoDecisionFilter) { setDecision(value); setPageNumber(1) }
  function changeSearch(value: string) { setSearch(value); setPageNumber(1) }

  return <div className="page-stack job-page">
    <PageHeader eyebrow="SEARCH JOB" title={job ? `“${job.criteria.keyword}”` : 'Search progress'} description="Collection and filtering status from the backend. Results refresh while the provider snapshot is running." trailing={<button className="button button--quiet" disabled={refreshing} onClick={() => void refresh()} type="button"><RefreshCw size={14} /> Refresh</button>} />
    {!job && !error && <Surface className="loading-panel" role="status">Loading search status…</Surface>}
    {error && <Surface className="job-error" role="alert"><AlertTriangle size={18} /><div><strong>Search details unavailable</strong><p>{error}</p><Link to="/history">Open search history</Link></div></Surface>}
    {job && <>
      <Surface className="job-summary">
        <div className="job-summary__head"><div><span className="eyebrow">STATUS</span><p className="job-summary__status">{job.status.replaceAll('_', ' ')}</p></div><span className={`status-tag${job.status === 'failed' ? ' status-tag--error' : ''}`}>{collectionLabel(job)}</span></div>
        <div className="job-counts">{[['Discovered', job.counts.discovered], ['Processed', job.counts.processed], ['Matching', job.counts.matched], ['Rejected', job.counts.rejected], ['Duplicates', job.counts.duplicates], ['Unverified', job.counts.unverified]].map(([label, value]) => <div className="job-count" key={label}><span>{label}</span><strong>{number(Number(value))}</strong></div>)}</div>
        {job.error_summary && job.status === 'failed' && <p className="job-summary__message">{job.error_summary}</p>}
        {(job.status === 'partially_completed' || job.status === 'completed') && job.shortfall !== null && job.shortfall > 0 && <p className="job-summary__message">Matched {number(job.counts.matched)} of {number(job.criteria.target_count)} requested; shortfall {number(job.shortfall)}. The provider result set was exhausted without relaxing your filters.</p>}
        {!terminal.has(job.status) && <p className="job-summary__message">This page checks for updates every few seconds. The requested count is a target; filters are not relaxed to fill it.</p>}
      </Surface>
      <section className="results-section">
        <div className="results-toolbar"><div><span className="eyebrow">VIDEO RESULTS</span><h2>{number(page?.total ?? 0)} {decision === 'all' ? 'collected' : decision} videos</h2></div><div className="results-controls"><label className="results-search">Search description/creator<input aria-label="Search descriptions and creators" maxLength={200} onChange={(event) => changeSearch(event.target.value)} placeholder="Search videos" type="search" value={search} /></label><label>Sort by <select onChange={(event) => changeSort(event.target.value as typeof sort)} value={sort}><option value="views">Views</option><option value="upload_date">Upload date</option><option value="creator">Creator</option></select></label><label>Show <select aria-label="Filter videos by decision" onChange={(event) => changeDecision(event.target.value as VideoDecisionFilter)} value={decision}><option value="all">All collected</option><option value="matched">Matching</option><option value="unverified">Unverified</option><option value="rejected">Rejected</option></select></label><a className="button button--quiet button--small" download href={getExportUrl(job.id, 'csv', decision, search)}>CSV <Download size={13} /></a><a className="button button--quiet button--small" download href={getExportUrl(job.id, 'json', decision, search)}>JSON <Download size={13} /></a></div></div>
        {!page && !error && <Surface className="loading-panel" role="status">Loading results…</Surface>}
        {page && page.items.length > 0 && <div className="video-grid">{page.items.map((video: VideoResult) => <VideoCard key={video.id} video={video} />)}</div>}
        {page && page.items.length === 0 && <Surface className="empty-results"><h3>{job.status === 'failed' ? 'Collection failed' : terminal.has(job.status) ? 'No videos in this view' : 'No videos in this view yet'}</h3><p>{job.status === 'failed' ? 'See the status message above for details.' : terminal.has(job.status) ? 'No collected videos match this decision filter and search.' : 'The provider may still be collecting, or no videos in this view have been processed yet.'}</p></Surface>}
        {page && page.total_pages > 1 && <div className="pagination"><button className="button button--quiet button--small" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)} type="button">Previous</button><span>Page {page.page} of {page.total_pages}</span><button className="button button--quiet button--small" disabled={pageNumber >= page.total_pages} onClick={() => setPageNumber((p) => p + 1)} type="button">Next</button></div>}
      </section>
    </>}
  </div>
}
