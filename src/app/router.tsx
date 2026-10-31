import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/app-shell'
import { ErrorBoundary } from '../components/common/error-boundary'
import { LoadingSkeleton } from '../components/common/loading-skeleton'

const OverviewPage = lazy(() => import('../pages/overview-page'))
const DiscoveryPage = lazy(() => import('../pages/discovery-page'))
const JobPage = lazy(() => import('../pages/job-page'))
const VideoDetailPage = lazy(() => import('../pages/video-detail-page'))
const HistoryPage = lazy(() => import('../pages/history-page'))
const SettingsPage = lazy(() => import('../pages/settings-page'))
const NotFoundPage = lazy(() => import('../pages/not-found-page'))

function RouteFallback() {
  return <LoadingSkeleton label="Loading page" />
}

function lazyPage(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ErrorBoundary><AppShell /></ErrorBoundary>,
    errorElement: lazyPage(<NotFoundPage />),
    children: [
      { index: true, element: lazyPage(<OverviewPage />) },
      { path: 'discovery', element: lazyPage(<DiscoveryPage />) },
      { path: 'jobs/:jobId', element: lazyPage(<JobPage />) },
      { path: 'videos/:videoId', element: lazyPage(<VideoDetailPage />) },
      { path: 'history', element: lazyPage(<HistoryPage />) },
      { path: 'settings', element: lazyPage(<SettingsPage />) },
      { path: '*', element: lazyPage(<NotFoundPage />) },
    ],
  },
])
