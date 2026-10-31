import { useState } from 'react'
import { Bookmark, ExternalLink, Eye, Heart, MessageCircle, Play, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { VideoResult } from '../../services/api-client'

function count(value: number | null) { return value === null ? '—' : Intl.NumberFormat().format(value) }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString() : 'Date unavailable' }

export function VideoCard({ video }: { video: VideoResult }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const safeUrl = video.url && /^https:\/\/(www\.)?tiktok\.com\//i.test(video.url) ? video.url : null
  const safeCreatorUrl = video.creator_url && /^https:\/\/(www\.)?tiktok\.com\//i.test(video.creator_url)
    ? video.creator_url
    : null
  return <article className="video-card">
    <a
      aria-label={safeUrl ? 'Open TikTok video in a new tab' : 'Open video details'}
      className="video-card__main"
      href={safeUrl ?? `/videos/${encodeURIComponent(video.id)}`}
      rel={safeUrl ? 'noreferrer' : undefined}
      target={safeUrl ? '_blank' : undefined}
    >
      <div className="video-card__media">
        {video.thumbnail_url && !thumbnailFailed
          ? <img alt="Video thumbnail" loading="lazy" onError={() => setThumbnailFailed(true)} src={video.thumbnail_url} />
          : <span>Thumbnail unavailable</span>}
        <span aria-hidden="true" className="video-card__play"><Play fill="currentColor" size={17} /></span>
      </div>
      <div className="video-card__body">
        <div className="video-card__meta">
          <span className={`status-tag${video.decision === 'matched' ? ' status-tag--success' : ' status-tag--warning'}`}>{video.decision}</span>
          <time>{date(video.upload_date)}</time>
        </div>
        <h3 className="video-card__title">{video.description || 'No description provided by TikTok'}</h3>
        <div className="video-card__creator">
          {video.creator_avatar_url
            ? <img alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} src={video.creator_avatar_url} />
            : <span aria-hidden="true" className="video-card__creator-fallback">{video.creator_username?.slice(0, 1).toUpperCase() || '?'}</span>}
          <span>{video.creator_username ? `@${video.creator_username}` : 'Creator unavailable'}</span>
          {video.region && <span className="video-card__region">{video.region}</span>}
        </div>
        <div className="video-card__metrics">
          <span><Eye size={14} />{count(video.views)} views</span>
          <span><Heart size={14} />{count(video.likes)} likes</span>
          <span><MessageCircle size={14} />{count(video.comments)} comments</span>
          <span><Share2 size={14} />{count(video.shares)} shares</span>
          <span><Bookmark size={14} />{count(video.saves)} saves</span>
        </div>
        {video.hashtags.length > 0 && <div className="video-card__tags">{video.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
      </div>
    </a>
    <div className="video-card__footer">
      <span className="video-card__identity">
        {video.creator_id && <span>User ID: {video.creator_id}</span>}
        <span>Region: {video.region || 'Not provided'}</span>
      </span>
      <span className="video-card__links">
        {safeCreatorUrl && <a href={safeCreatorUrl} rel="noreferrer" target="_blank">Profile <ExternalLink size={13} /></a>}
        <Link to={`/videos/${encodeURIComponent(video.id)}`}>Details</Link>
      </span>
    </div>
  </article>
}
