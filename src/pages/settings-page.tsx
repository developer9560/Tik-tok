import { useApiStatus } from '../app/api-status-context'
import { ErrorState } from '../components/common/error-state'
import { LoadingSkeleton } from '../components/common/loading-skeleton'
import { PageHeader } from '../components/common/page-header'
import { StatusTag, Surface } from '../components/common/surface'

export default function SettingsPage() {
  const { status, databaseReady, databaseError, config, configError, refreshedAt, refresh } = useApiStatus()

  return (
    <div className="page-stack page-stack--narrow">
      <PageHeader eyebrow="WORKSPACE SETUP" title="Connections" description="Check the application’s connection to the backend. Provider secrets are never shown here." />
      <Surface className="connection-card">
        <div className="connection-card__header"><div><p className="eyebrow">APPLICATION BACKEND</p><h2>FastAPI connection</h2></div><StatusTag tone={status === 'connected' ? 'success' : status === 'unavailable' ? 'error' : 'neutral'}>{status === 'connected' ? 'Connected' : status === 'unavailable' ? 'Unavailable' : 'Checking'}</StatusTag></div>
        <p className="connection-card__description">Status is checked from the backend health endpoint. No Bright Data request is started from this workspace.</p>
        {status === 'checking' && <LoadingSkeleton label="Checking backend connection" rows={2} />}
        {status === 'unavailable' && <ErrorState title="Backend could not be reached." description="Check that the FastAPI service is running, then try again." onRetry={() => void refresh()} />}
        {status === 'connected' && configError && <ErrorState title="Provider configuration could not be read." description={configError} onRetry={() => void refresh()} />}
        {status === 'connected' && config && (
          <div className="connection-details">
            <div className="connection-detail"><span>MySQL database</span><StatusTag tone={databaseReady ? 'success' : 'error'}>{databaseReady ? 'Ready' : 'Not ready'}</StatusTag></div>
            {!databaseReady && <p className="connection-card__hint">{databaseError || 'Set MYSQL_PASSWORD in the backend process environment, start MySQL, and apply migrations.'}</p>}
            <div className="connection-detail"><span>Bright Data token</span><StatusTag tone={config.token_configured ? 'success' : 'warning'}>{config.token_configured ? 'Configured' : 'Needs setup'}</StatusTag></div>
            <div className="connection-detail"><span>Dataset</span><StatusTag tone={config.dataset_configured ? 'success' : 'warning'}>{config.dataset_configured ? 'Configured' : 'Needs setup'}</StatusTag></div>
            {!config.token_configured && <p className="connection-card__hint">Set <code>BRIGHTDATA_API_TOKEN</code> in the backend process environment and restart the API. The backend does not read `.env` files.</p>}
            <p className="connection-card__hint">For security, the token value is not available to the frontend.</p>
          </div>
        )}
        {refreshedAt && <p className="connection-card__updated">Last checked {refreshedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>}
      </Surface>
    </div>
  )
}
