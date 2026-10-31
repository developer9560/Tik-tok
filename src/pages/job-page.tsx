import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Check, Download, LoaderCircle, RefreshCw } from 'lucide-react'
import { ApiError, getExportUrl, getSearchJob, getSearchVideos } from '../services/api-client'
import type { SearchJob, PaginatedVideos, VideoDecisionFilter, VideoResult } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'
import { VideoCard } from '../components/videos/video-card'

const terminal = new Set(['completed', 'partially_completed', 'failed'])
const collectionStages = [
  { status: 'queued', label: 'Queued' },
  { status: 'collecting', label: 'Collecting' },
  { status: 'retrieving', label: 'Retrieving' },
  { status: 'processing', label: 'Filtering' },
]
const number = (n: number) => new Intl.NumberFormat().format(n)

function collectionLabel(job: SearchJob) {
  if (job.status === 'failed') return 'Collection failed'
  if (job.status === 'queued') return 'Your search is queued'
  if (job.status === 'collecting' && job.snapshot_id) return 'Collecting videos from TikTok'
  if (job.status === 'collecting') return 'Starting your video collection'
  if (job.status === 'retrieving') return 'Preparing your collected videos'
  if (job.status === 'processing') return 'Checking videos against your filters'
  if (job.status === 'partially_completed') return 'Collection completed with a shortfall'
  if (job.status === 'completed') return 'Collection complete'
  return 'Collection status unavailable'
}

function collectionDescription(job: SearchJob) {
  if (job.status === 'queued') return 'Your search is queued and will begin when a worker is available.'
  if (job.status === 'collecting' && job.snapshot_id) return 'Bright Data is searching and collecting videos now. This can take longer for large result sets; keep this page open and we’ll update the status automatically.'
  if (job.status === 'collecting') return 'Your request is being sent to Bright Data. Collection will begin as soon as the provider accepts it.'
  if (job.status === 'retrieving') return 'Collection is ready. We’re bringing the videos into your workspace now.'
  if (job.status === 'processing') return 'Videos have been collected. We’re checking them against your selected filters.'
  return 'The backend is updating this job. Check again in a few seconds.'
}

export default function JobPage() {
  const { jobId = '' } = useParams()
  const [job, setJob] = useState<SearchJob | null>(null)
  const [page, setPage] = useState<PaginatedVideos | null>(null)
  const [sort, setSort] = useState<'views' | 'upload_date' | 'creator'>('views')
  const [pageNumber, setPageNumber] = useState(1)
  const [decision, setDecision] = useState<VideoDecisionFilter>('all')
  const [search, setSearch] = useState('')
  const [progressError, setProgressError] = useState<string | null>(null)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [resultsRefreshKey, setResultsRefreshKey] = useState(0)
  const [loadingResults, setLoadingResults] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasResultsRef = useRef(false)

  const loadProgress = useCallback(async (signal?: AbortSignal) => {
    if (!jobId) return
    try {
      const current = await getSearchJob(jobId, signal)
      setJob(current)
      setProgressError(null)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      const message = cause instanceof ApiError ? cause.message : 'Could not load this search.'
      setProgressError(message)
    }
  }, [jobId])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void loadProgress(controller.signal), 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [loadProgress])

  const shouldPollProgress = job !== null && !terminal.has(job.status)
  useEffect(() => {
    if (!shouldPollProgress) return
    const controller = new AbortController()
    const interval = window.setInterval(() => void loadProgress(controller.signal), 8000)
    return () => {
      window.clearInterval(interval)
      controller.abort()
    }
  }, [shouldPollProgress, jobId, loadProgress])

  const resultsRevision = job
    ? `${job.status}:${job.counts.discovered}:${job.counts.processed}:${job.counts.matched}:${job.counts.rejected}:${job.counts.duplicates}:${job.counts.unverified}`
    : ''

  useEffect(() => {
    if (!resultsRevision) return
    const controller = new AbortController()
    if (!hasResultsRef.current) setLoadingResults(true)
    void getSearchVideos(jobId, pageNumber, sort, decision, search, controller.signal)
      .then((results) => {
        hasResultsRef.current = true
        setPage(results)
        setResultsError(null)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setResultsError(cause instanceof ApiError ? cause.message : 'Could not load video results.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingResults(false)
      })
    return () => controller.abort()
  }, [jobId, resultsRevision, resultsRefreshKey, pageNumber, sort, decision, search])

  async function refresh() {
    setRefreshing(true)
    try {
      await loadProgress()
      setResultsRefreshKey((key) => key + 1)
    } finally {
      setRefreshing(false)
    }
  }

  function changeSort(value: typeof sort) { setSort(value); setPageNumber(1) }
  function changeDecision(value: VideoDecisionFilter) { setDecision(value); setPageNumber(1) }
  function changeSearch(value: string) { setSearch(value); setPageNumber(1) }
  const activeStageIndex = job ? collectionStages.findIndex((stage) => stage.status === job.status) : -1
  const pageTitle = !job
    ? 'Search progress'
    : job.status === 'failed'
      ? 'Search could not complete'
      : terminal.has(job.status)
        ? 'Search results'
        : 'Search in progress'

  return <div className="page-stack job-page">
    <PageHeader
      eyebrow={job && !terminal.has(job.status) ? 'LIVE DISCOVERY' : 'SEARCH JOB'}
      title={pageTitle}
      description={job ? `Keyword: ${job.criteria.keyword} · Target: ${number(job.criteria.target_count)} matching videos` : 'Your collection status and results will appear here.'}
      trailing={<button className="button button--quiet" disabled={refreshing} onClick={() => void refresh()} type="button"><RefreshCw size={14} /> Refresh status</button>}
    />
    {!job && !progressError && <Surface className="loading-panel" role="status"><LoaderCircle aria-hidden="true" className="button-spinner" size={18} /> Loading search status…</Surface>}
    {!job && progressError && <Surface className="job-error job-error--compact" role="alert">
      <AlertTriangle size={17} />
      <div><strong>Search status unavailable</strong><p>{progressError}</p><button className="button button--quiet button--small" disabled={refreshing} onClick={() => void refresh()} type="button">Try again</button> <Link to="/history">Search history</Link></div>
    </Surface>}
    {job && <>
      <Surface className="job-summary">
        <div className={`job-summary__head${!terminal.has(job.status) ? ' job-summary__head--active' : ''}`}>
          <div className="job-summary__status-copy">
            <span className="eyebrow">{!terminal.has(job.status) ? 'WHAT’S HAPPENING RIGHT NOW' : 'FINAL STATUS'}</span>
            <p className="job-summary__status">{collectionLabel(job)}</p>
            <span className="job-summary__keyword">Searching TikTok for <strong>{job.criteria.keyword}</strong></span>
          </div>
          <span className={`status-tag job-summary__badge${job.status === 'failed' ? ' status-tag--error' : terminal.has(job.status) ? ' status-tag--success' : ' status-tag--warning'}`}>
            {!terminal.has(job.status) && <LoaderCircle aria-hidden="true" className="button-spinner" size={16} />}
            {job.status.replaceAll('_', ' ')}
          </span>
        </div>
        {!terminal.has(job.status) && <>
          <div className="collection-progress" role="status" aria-live="polite">
            <span className="collection-progress__icon"><LoaderCircle aria-hidden="true" className="button-spinner" size={24} /></span>
            <p className="collection-progress__description">{collectionDescription(job)}</p>
            <span className="collection-progress__refresh">Checking automatically every 8 seconds</span>
          </div>
          <p className="collection-wait-note">Please wait while we collect your videos. Larger searches can take longer; this page updates automatically without reloading.</p>
          <ol className="collection-steps" aria-label="Collection progress">
            {collectionStages.map((stage, index) => {
              const complete = activeStageIndex > index
              const active = activeStageIndex === index
              return <li aria-current={active ? 'step' : undefined} className={`collection-step${complete ? ' collection-step--complete' : ''}${active ? ' collection-step--active' : ''}`} key={stage.status}>
                <span className="collection-step__marker">{complete ? <Check aria-hidden="true" size={13} /> : active ? <LoaderCircle aria-hidden="true" className="button-spinner" size={13} /> : index + 1}</span>
                <span>{stage.label}</span>
              </li>
            })}
          </ol>
        </>}
        {progressError && <p className="job-inline-error" role="status">Could not refresh the latest status: {progressError} The last known status remains visible; the page will retry automatically.</p>}
        <div className="job-counts">{[['Discovered', job.counts.discovered], ['Processed', job.counts.processed], ['Matching', job.counts.matched], ['Rejected', job.counts.rejected], ['Duplicates', job.counts.duplicates], ['Unverified', job.counts.unverified]].map(([label, value]) => <div className="job-count" key={label}><span>{label}</span><strong>{number(Number(value))}</strong></div>)}</div>
        {job.error_summary && job.status === 'failed' && <p className="job-summary__message">{job.error_summary}</p>}
        {(job.status === 'partially_completed' || job.status === 'completed') && job.shortfall !== null && job.shortfall > 0 && <p className="job-summary__message">Matched {number(job.counts.matched)} of {number(job.criteria.target_count)} requested; shortfall {number(job.shortfall)}. The provider result set was exhausted without relaxing your filters.</p>}
        {!terminal.has(job.status) && <p className="job-summary__message">The requested count is a target; filters are not relaxed to fill it.</p>}
      </Surface>
      <section className="results-section">
        <div className="results-toolbar"><div><span className="eyebrow">DISCOVERY RESULTS</span><h2>{number(page?.total ?? 0)} {decision === 'all' ? 'collected' : decision} videos</h2><p className="results-toolbar__note">Review the records returned for “{job.criteria.keyword}”. Select a card to open its TikTok video.</p></div><div className="results-controls"><label className="results-search">Search description/creator<input aria-label="Search descriptions and creators" maxLength={200} onChange={(event) => changeSearch(event.target.value)} placeholder="Search videos" type="search" value={search} /></label><label>Sort by <select onChange={(event) => changeSort(event.target.value as typeof sort)} value={sort}><option value="views">Views</option><option value="upload_date">Upload date</option><option value="creator">Creator</option></select></label><label>Show <select aria-label="Filter videos by decision" onChange={(event) => changeDecision(event.target.value as VideoDecisionFilter)} value={decision}><option value="all">All collected</option><option value="matched">Matching</option><option value="unverified">Unverified</option><option value="rejected">Rejected</option></select></label><a className="button button--quiet button--small" download href={getExportUrl(job.id, 'csv', decision, search)}>CSV <Download size={13} /></a><a className="button button--quiet button--small" download href={getExportUrl(job.id, 'json', decision, search)}>JSON <Download size={13} /></a></div></div>
        {!page && loadingResults && <Surface className="loading-panel" role="status"><LoaderCircle aria-hidden="true" className="button-spinner" size={18} /> Loading video results…</Surface>}
        {resultsError && <p className="results-inline-error" role="status"><AlertTriangle aria-hidden="true" size={14} /> Video results could not be refreshed: {resultsError} {page ? 'Showing the last loaded results.' : 'They will be retried when progress changes or when you refresh.'}</p>}
        {page && page.items.length > 0 && <div className="video-grid video-grid--discovery">{page.items.map((video: VideoResult) => <VideoCard key={video.id} video={video} />)}</div>}
        {page && page.items.length === 0 && <Surface className="empty-results"><h3>{job.status === 'failed' ? 'Collection failed' : terminal.has(job.status) ? 'No videos in this view' : 'Your videos are still on the way'}</h3><p>{job.status === 'failed' ? 'See the status message above for details.' : terminal.has(job.status) ? 'No collected videos match this decision filter and search.' : 'Please wait while the provider collects and the backend processes your results. This page checks status automatically; you do not need to reload it.'}</p></Surface>}
        {page && page.total_pages > 1 && <div className="pagination"><button className="button button--quiet button--small" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)} type="button">Previous</button><span>Page {page.page} of {page.total_pages}</span><button className="button button--quiet button--small" disabled={pageNumber >= page.total_pages} onClick={() => setPageNumber((p) => p + 1)} type="button">Next</button></div>}
      </section>
    </>}
  </div>
}
