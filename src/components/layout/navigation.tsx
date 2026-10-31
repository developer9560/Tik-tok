import { NavLink } from 'react-router-dom'
import { Activity, Archive, Compass, Layers3, Settings2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavigationItem { label: string; to: string; icon: LucideIcon }

const primaryNavigation: NavigationItem[] = [
  { label: 'Overview', to: '/', icon: Layers3 },
  { label: 'New discovery', to: '/discovery', icon: Compass },
  { label: 'Search history', to: '/history', icon: Archive },
]

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="nav-group">
        <p className="nav-group__label">Workspace</p>
        <nav aria-label="Workspace navigation" className="nav-list">
          {primaryNavigation.map(({ label, to, icon: Icon }) => (
            <NavLink className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} end={to === '/'} key={to} onClick={onNavigate} to={to}>
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="nav-group nav-group--bottom">
        <p className="nav-group__label">Workspace setup</p>
        <nav aria-label="Settings navigation" className="nav-list">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} onClick={onNavigate} to="/settings">
            <Settings2 aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>Connections</span>
          </NavLink>
        </nav>
      </div>
    </>
  )
}

function Brand() {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true"><Activity size={19} strokeWidth={2.2} /></span>
      <span className="brand-name">clipscope<span>®</span></span>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main sidebar">
      <Brand />
      <NavigationLinks />
      <div className="sidebar-footer">
        <span className="sidebar-footer__avatar">CS</span>
        <div><strong>Research workspace</strong><span>Private workspace</span></div>
        <span className="sidebar-footer__dot" aria-label="Local workspace" />
      </div>
    </aside>
  )
}

interface MobileNavigationProps { open: boolean; onClose: () => void }

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  if (!open) return null
  return (
    <div className="mobile-nav-layer">
      <button aria-label="Close navigation" className="mobile-nav-backdrop" onClick={onClose} type="button" />
      <aside aria-label="Mobile navigation" aria-modal="true" className="mobile-nav-drawer" role="dialog">
        <div className="mobile-nav-drawer__header"><Brand /><button aria-label="Close navigation" className="icon-button" onClick={onClose} type="button"><X size={19} /></button></div>
        <NavigationLinks onNavigate={onClose} />
      </aside>
    </div>
  )
}
