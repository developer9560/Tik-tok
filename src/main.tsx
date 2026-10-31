import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { ApiStatusProvider } from './app/api-status-context'
import { ToastProvider } from './components/common/toast'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ApiStatusProvider>
        <RouterProvider router={router} />
      </ApiStatusProvider>
    </ToastProvider>
  </StrictMode>,
)
