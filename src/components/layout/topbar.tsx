import { useState } from 'react'
import { Menu, RotateCw, Signal, SignalZero } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useApiStatus } from '../../app/api-status-context'
import { MobileNavigation } from './navigation'

const routeNames: Record<string, string> = {
  '/': 'Overview',
  '/discovery': 'New discovery',
  '/history': 'Search history',
  '/settings': 'Connections',
}

export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { status, refresh } = useApiStatus()
  const isConnected = status === 'connected'
  const label = status === 'checking' ? 'Checking backend' : isConnected ? 'Backend connected' : 'Backend unavailable'

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <button aria-label="Open navigation" className="icon-button mobile-menu-button" onClick={() => setMenuOpen(true)} type="button"><Menu size={20} /></button>
          <div className="breadcrumbs"><span className="breadcrumbs__root">Workspace</span><span className="breadcrumbs__slash">/</span><span aria-current="page">{routeNames[pathname] ?? (pathname.startsWith('/jobs/') ? 'Search progress' : pathname.startsWith('/videos/') ? 'Video detail' : 'Page')}</span></div>
        </div>
        <div className="topbar__right">
          <span className={`connection-pill connection-pill--${status}`} role="status">
            {isConnected ? <Signal size={14} /> : <SignalZero size={14} />}
            {label}
          </span>
          <button aria-label="Refresh backend status" className="icon-button topbar-refresh" disabled={status === 'checking'} onClick={() => void refresh()} title="Refresh backend status" type="button"><RotateCw size={16} /></button>
          <span aria-label="Research workspace" className="profile-chip">R</span>
        </div>
      </header>
      <MobileNavigation open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
