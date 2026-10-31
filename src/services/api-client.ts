export interface HealthResponse {
  status: string
}

export interface ProviderConfigResponse {
  token_configured: boolean
  dataset_configured: boolean
  dataset_id: string | null
  keyword_dataset_id?: string
}

export interface SearchCriteria {
  keyword: string
  category: string | null
  min_views: number | null
  max_views: number | null
  min_age_days: number | null
  target_language: string | null
  language_requirement: 'spoken' | 'text'
  target_count: number
}

export interface SearchCounts {
  discovered: number
  processed: number
  matched: number
  rejected: number
  duplicates: number
  unverified: number
}

export interface SearchJob {
  id: string
  status: string
  criteria: SearchCriteria
  counts: SearchCounts
  cutoff_at: string
  shortfall: number | null
  snapshot_id: string | null
  error_summary: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface SearchJobList {
  items: SearchJob[]
  page: number
  page_size: number
  total: number
}

export interface OverviewMetrics {
  total_jobs: number
  active_jobs: number
  unique_videos: number
  matching_videos: number
  unverified_videos: number
  recent_failures: SearchJob[]
}

export interface CollectionProvenance {
  search_job_id: string
  dataset_id: string
  attempt_number: number
  status: string
  started_at: string
  finished_at: string | null
}

export interface VideoResult {
  id: string
  provider_post_id: string | null
  url: string | null
  description: string | null
  creator_id: string | null
  creator_username: string | null
  creator_url: string | null
  creator_avatar_url: string | null
  upload_date: string | null
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  duration_seconds: number | null
  hashtags: string[]
  thumbnail_url: string | null
  original_sound: unknown | null
  region: string | null
  category: string | null
  category_method: string | null
  category_confidence: number | null
  detected_language: string | null
  language_evidence_type: string | null
  language_confidence: number | null
  language_status: string | null
  decision: string
  rejection_reasons: string[]
  first_seen_at: string
  last_seen_at: string
  collection_provenance: CollectionProvenance | null
}

export interface PaginatedVideos {
  items: VideoResult[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type VideoDecisionFilter = 'all' | 'matched' | 'unverified' | 'rejected'

export class ApiError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(10_000)
  const requestSignal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
      signal: requestSignal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('The backend did not respond in time.')
    }
    throw new ApiError('The backend could not be reached.')
  }

  if (!response.ok) {
    let detail = `Backend request failed (${response.status}).`
    try {
      const payload: unknown = await response.json()
      if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
        const value = payload.detail
        detail = typeof value === 'string' ? value : detail
      }
    } catch { /* Keep the safe status-based message. */ }
    throw new ApiError(detail, response.status)
  }
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('The backend returned an invalid response.')
  }
}

export function getHealth(signal?: AbortSignal) {
  return request<HealthResponse>('/api/health', { signal })
}

export function getReadiness(signal?: AbortSignal) {
  return request<HealthResponse>('/api/health/ready', { signal })
}

export function getProviderConfig(signal?: AbortSignal) {
  return request<ProviderConfigResponse>('/api/brightdata/config', { signal })
}

export function createSearchJob(criteria: SearchCriteria, signal?: AbortSignal) {
  return request<SearchJob>('/api/v1/search-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria),
    signal,
  })
}

export function getSearchJob(jobId: string, signal?: AbortSignal) {
  return request<SearchJob>(`/api/v1/search-jobs/${encodeURIComponent(jobId)}/progress`, { signal })
}

export function getSearchJobs(page = 1, pageSize = 20, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return request<SearchJobList>(`/api/v1/search-jobs?${query}`, { signal })
}

export function getOverviewMetrics(signal?: AbortSignal) {
  return request<OverviewMetrics>('/api/v1/overview', { signal })
}

export function getSearchVideos(jobId: string, page = 1, sortBy: 'views' | 'upload_date' | 'creator' = 'views', decision: VideoDecisionFilter = 'all', search = '', signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), page_size: '50', sort_by: sortBy, order: 'desc', decision })
  if (search.trim()) query.set('search', search.trim())
  return request<PaginatedVideos>(`/api/v1/search-jobs/${encodeURIComponent(jobId)}/videos?${query}`, { signal })
}

export function getVideo(videoId: string, signal?: AbortSignal) {
  return request<VideoResult>(`/api/v1/videos/${encodeURIComponent(videoId)}`, { signal })
}

export function getExportUrl(jobId: string, format: 'json' | 'csv' = 'json', decision: VideoDecisionFilter = 'all', search = '') {
  const query = new URLSearchParams({ output_format: format, decision })
  if (search.trim()) query.set('search', search.trim())
  return `${baseUrl}/api/v1/search-jobs/${encodeURIComponent(jobId)}/videos/export?${query}`
}
