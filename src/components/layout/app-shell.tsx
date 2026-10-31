import { Outlet } from 'react-router-dom'
import { Sidebar } from './navigation'
import { Topbar } from './topbar'

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="page-content" id="main-content"><Outlet /></main>
      </div>
    </div>
  )
}
