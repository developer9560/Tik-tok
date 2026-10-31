import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getHealth, getProviderConfig, getReadiness } from '../services/api-client'
import type { ProviderConfigResponse } from '../services/api-client'

export type ApiStatus = 'checking' | 'connected' | 'unavailable'

interface ApiStatusContextValue {
  status: ApiStatus
  databaseReady: boolean | null
  databaseError: string | null
  config: ProviderConfigResponse | null
  configError: string | null
  refreshedAt: Date | null
  refresh: () => Promise<void>
}

const ApiStatusContext = createContext<ApiStatusContextValue | null>(null)

export function ApiStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ApiStatus>('checking')
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [config, setConfig] = useState<ProviderConfigResponse | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    const [healthResult, readinessResult, configResult] = await Promise.allSettled([
      getHealth(),
      getReadiness(),
      getProviderConfig(),
    ])
    setStatus(healthResult.status === 'fulfilled' && healthResult.value.status === 'ok' ? 'connected' : 'unavailable')
    if (readinessResult.status === 'fulfilled' && readinessResult.value.status === 'ready') {
      setDatabaseReady(true)
      setDatabaseError(null)
    } else {
      setDatabaseReady(false)
      setDatabaseError(
        readinessResult.status === 'rejected' && readinessResult.reason instanceof Error
          ? readinessResult.reason.message
          : 'The search database is not ready.',
      )
    }
    if (configResult.status === 'fulfilled') {
      setConfig(configResult.value)
      setConfigError(null)
    } else {
      setConfig(null)
      setConfigError(configResult.reason instanceof Error ? configResult.reason.message : 'Unable to read provider configuration.')
    }
    setRefreshedAt(new Date())
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const value = useMemo(
    () => ({ status, databaseReady, databaseError, config, configError, refreshedAt, refresh }),
    [status, databaseReady, databaseError, config, configError, refreshedAt, refresh],
  )

  return <ApiStatusContext.Provider value={value}>{children}</ApiStatusContext.Provider>
}

export function useApiStatus() {
  const context = useContext(ApiStatusContext)
  if (!context) throw new Error('useApiStatus must be used inside ApiStatusProvider')
  return context
}
