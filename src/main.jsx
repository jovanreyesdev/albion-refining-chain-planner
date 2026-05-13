import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/useTranslation.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
      {/* Vercel Analytics — tracks page views in production.
          No-ops in dev mode so local testing doesn't pollute the data. */}
      <Analytics />
    </LanguageProvider>
  </StrictMode>,
)
