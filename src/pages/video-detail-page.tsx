import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getVideo } from '../services/api-client'
import type { VideoResult } from '../services/api-client'
import { PageHeader } from '../components/common/page-header'
import { Surface } from '../components/common/surface'

export default function VideoDetailPage() {
  const { videoId = '' } = useParams()
  const [video, setVideo] = useState<VideoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void getVideo(videoId, controller.signal).then(setVideo).catch((cause: unknown) => {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof ApiError ? cause.message : 'Could not load this video.')
    })
    return () => controller.abort()
  }, [videoId])
  const externalUrl = video?.url && /^https:\/\/(www\.)?tiktok\.com\//i.test(video.url) ? video.url : null
  const sound = video?.original_sound == null
    ? null
    : typeof video.original_sound === 'string'
      ? video.original_sound
      : JSON.stringify(video.original_sound)
  const provenance = video?.collection_provenance
  return <div className="page-stack"><PageHeader eyebrow="VIDEO DETAIL" title={video?.creator_username ? `@${video.creator_username}` : 'Video details'} description="Provider fields and the backend’s recorded matching decision." trailing={<Link className="button button--quiet" to="/history">Search history</Link>} />
    {error && <Surface className="empty-results" role="alert">{error}</Surface>}
    {!video && !error && <Surface className="loading-panel" role="status">Loading video details…</Surface>}
    {video && <Surface className="video-detail">
      {video.thumbnail_url && !thumbnailFailed ? <img className="video-detail__image" alt="Video thumbnail" onError={() => setThumbnailFailed(true)} src={video.thumbnail_url} /> : <div className="video-detail__image video-detail__image--missing">Thumbnail unavailable</div>}
      <div className="video-detail__content"><span className="status-tag">{video.decision}</span><h2>{video.description || 'No description provided by TikTok'}</h2>
        <dl className="video-facts">{[
          ['Post ID', video.provider_post_id],
          ['Creator ID', video.creator_id],
          ['Creator', video.creator_username ? `@${video.creator_username}` : null],
          ['Creator profile', video.creator_url],
          ['Creator avatar', video.creator_avatar_url],
          ['Upload date', video.upload_date ? new Date(video.upload_date).toLocaleString() : null],
          ['Views', video.views],
          ['Likes', video.likes],
          ['Comments', video.comments],
          ['Shares', video.shares],
          ['Saves', video.saves],
          ['Duration (seconds)', video.duration_seconds],
          ['Hashtags', video.hashtags.length ? video.hashtags.map((tag) => `#${tag}`).join(' ') : null],
          ['Thumbnail', video.thumbnail_url],
          ['Region (provider field)', video.region],
          ['Original sound', sound],
          ['Category', video.category],
          ['Category evidence', video.category_method],
          ['Category confidence', video.category_confidence],
          ['Detected language', video.detected_language],
          ['Language evidence', video.language_evidence_type],
          ['Language confidence', video.language_confidence],
          ['Language status', video.language_status],
          ['Decision reasons', video.rejection_reasons.join(', ') || null],
          ['First seen', new Date(video.first_seen_at).toLocaleString()],
          ['Last seen', new Date(video.last_seen_at).toLocaleString()],
          ['Collection dataset', provenance?.dataset_id],
          ['Collection attempt', provenance ? `${provenance.attempt_number} (${provenance.status})` : null],
          ['Collection started', provenance ? new Date(provenance.started_at).toLocaleString() : null],
          ['Collection finished', provenance?.finished_at ? new Date(provenance.finished_at).toLocaleString() : null],
        ].map(([key, value]) => <div key={String(key)}><dt>{key}</dt><dd>{value === null || value === '' ? 'Not available' : String(value)}</dd></div>)}</dl>
        {externalUrl && <a className="button button--primary" href={externalUrl} rel="noreferrer" target="_blank">Open original TikTok <ExternalLink size={15} /></a>}
      </div>
    </Surface>}
  </div>
}
