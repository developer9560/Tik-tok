import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, LoaderCircle, Search } from 'lucide-react'
import { ApiError, createSearchJob } from '../services/api-client'
import type { SearchCriteria } from '../services/api-client'
import { useApiStatus } from '../app/api-status-context'
import { Surface } from '../components/common/surface'

interface FormValues {
  keyword: string
  category: string
  minViews: string
  maxViews: string
  minAgeDays: string
  language: string
  languageRequirement: 'spoken' | 'text'
  targetCount: string
}

const initialValues: FormValues = {
  keyword: '',
  category: '',
  minViews: '500',
  maxViews: ' ',
  minAgeDays: '5',
  language: 'ru',
  languageRequirement: 'spoken',
  targetCount: '300',
}

function parseOptionalNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const { status, databaseReady, databaseError, config, configError } = useApiStatus()
  const providerReady = status === 'connected' && databaseReady === true && config?.token_configured === true
  const [values, setValues] = useState<FormValues>(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!providerReady) {
      setError('The backend, database, and Bright Data configuration must all be ready before starting a search. Check Connections and retry.')
      return
    }

    const keyword = values.keyword.trim()
    const minViews = parseOptionalNumber(values.minViews)
    const maxViews = parseOptionalNumber(values.maxViews)
    const minAgeDays = parseOptionalNumber(values.minAgeDays)
    const targetCount = Number(values.targetCount)
    if (!keyword) return setError('Enter a keyword to search TikTok.')
    if ((minViews !== null && (!Number.isSafeInteger(minViews) || minViews < 0)) || (maxViews !== null && (!Number.isSafeInteger(maxViews) || maxViews < 0))) {
      return setError('View counts must be non-negative whole numbers.')
    }
    if (minViews !== null && maxViews !== null && minViews > maxViews) return setError('Minimum views must be less than or equal to maximum views.')
    if (minAgeDays !== null && (!Number.isSafeInteger(minAgeDays) || minAgeDays < 0)) return setError('Minimum age must be a non-negative whole number of days.')
    if (!Number.isSafeInteger(targetCount) || targetCount < 1) return setError('Target results must be a positive whole number.')

    const criteria: SearchCriteria = {
      keyword,
      category: values.category.trim() || null,
      min_views: minViews,
      max_views: maxViews,
      min_age_days: minAgeDays,
      target_language: values.language || null,
      language_requirement: values.languageRequirement,
      target_count: targetCount,
    }

    setSubmitting(true)
    try {
      const job = await createSearchJob(criteria)
      navigate(`/jobs/${encodeURIComponent(job.id)}`)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The search could not be created. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack page-stack--narrow">
      {/* <PageHeader eyebrow="NEW DISCOVERY" title="Build a precise search." description="Search by keyword, then let the backend evaluate each returned video against your criteria." /> */}
      <div>
        <h1 className="font-bold text-2xl">New discovery</h1>
        <p className="page-header__description">Search by keyword, then let the backend evaluate each returned video against your criteria.</p>
      </div>
      <Surface className="search-form-surface">
        <div className="form-intro">
          <span className="form-intro__icon"><Search size={19} /></span>
          <div><h2>Search criteria</h2><p>Only videos that meet the filters you set count as matches.</p></div>
        </div>
        {status === 'checking' && (
          <div className="form-note form-note--neutral form-field--wide" role="status">
            <p>Checking backend and Bright Data configuration…</p>
          </div>
        )}
        {status === 'unavailable' && (
          <div className="form-note form-note--warning form-field--wide" role="alert">
            <AlertTriangle aria-hidden="true" size={17} />
            <p><strong>Backend unavailable.</strong> Connect to the API before starting a search. <Link to="/settings">Check Connections</Link>.</p>
          </div>
        )}
        {status === 'connected' && databaseReady === false && (
          <div className="form-note form-note--warning form-field--wide" role="alert">
            <AlertTriangle aria-hidden="true" size={17} />
            <p><strong>Search database is not ready.</strong> {databaseError || 'Check the MySQL password, service, and migrations.'} <Link to="/settings">Check Connections</Link>.</p>
          </div>
        )}
        {status === 'connected' && configError && (
          <div className="form-note form-note--warning form-field--wide" role="alert">
            <AlertTriangle aria-hidden="true" size={17} />
            <p><strong>Provider configuration could not be checked.</strong> {configError} <Link to="/settings">Check Connections</Link>.</p>
          </div>
        )}
        {status === 'connected' && config?.token_configured === false && (
          <div className="form-note form-note--warning form-field--wide" role="status">
            <AlertTriangle aria-hidden="true" size={17} />
            <p><strong>Bright Data is not configured.</strong> New searches would fail. Set <code>BRIGHTDATA_API_TOKEN</code> in the backend process environment and restart the API. No <code>.env</code> file is read. See <Link to="/settings">Connections</Link> for status.</p>
          </div>
        )}
        {submitting && (
          <div className="form-note form-note--neutral discovery-submit-status" role="status" aria-live="polite">
            <LoaderCircle aria-hidden="true" className="button-spinner" size={17} />
            <p><strong>Creating your search.</strong> The backend is accepting your request; the live collection status will open as soon as the job is created.</p>
          </div>
        )}
        <form aria-busy={submitting} className="search-form" noValidate onSubmit={onSubmit}>
          <fieldset className="search-form__fields" disabled={submitting}>
          <div className="form-field form-field--wide">
            <label htmlFor="keyword">Search keyword <span className="required-mark">*</span></label>
            <input autoComplete="off" autoFocus id="keyword" maxLength={200} onChange={(event) => update('keyword', event.target.value)} placeholder="e.g. football skills" required value={values.keyword} />
            <span className="field-hint">The keyword is sent through FastAPI to the configured TikTok discovery dataset.</span>
          </div>

          <div className="form-field form-field--wide">
            <label htmlFor="category">Video category <span className="field-optional">Optional</span></label>
            <input id="category" maxLength={100} onChange={(event) => update('category', event.target.value)} placeholder="e.g. football" value={values.category} />
            <span className="field-hint">Initial matching checks the returned description and hashtags. It is a transparent keyword rule.</span>
          </div>

          <div className="form-field">
            <label htmlFor="min-views">Minimum views</label>
            <input id="min-views" min="0" onChange={(event) => update('minViews', event.target.value)} placeholder="No minimum" type="number" value={values.minViews} />
          </div>
          <div className="form-field">
            <label htmlFor="max-views">Maximum views</label>
            <input id="max-views" min="0" onChange={(event) => update('maxViews', event.target.value)} placeholder="No maximum" type="number" value={values.maxViews} />
          </div>

          <div className="form-field">
            <label htmlFor="min-age">Minimum video age</label>
            <div className="input-with-suffix"><input id="min-age" min="0" onChange={(event) => update('minAgeDays', event.target.value)} placeholder="Any age" type="number" value={values.minAgeDays} /><span>days</span></div>
            <span className="field-hint">Measured from the saved search cutoff.</span>
          </div>
          <div className="form-field">
            <label htmlFor="target-count">Target matching videos</label>
            <input id="target-count" min="1" onChange={(event) => update('targetCount', event.target.value)} type="number" value={values.targetCount} />
            <span className="field-hint">A target, not a promise. Filters are never weakened to fill it.</span>
          </div>

          <div className="form-field">
            <label htmlFor="language">Target language</label>
            <select id="language" onChange={(event) => update('language', event.target.value)} value={values.language}>
              <option value="">No language filter</option>
              <option value="ru">Russian</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="uk">Ukrainian</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="language-evidence">Language evidence</label>
            <select id="language-evidence" onChange={(event) => update('languageRequirement', event.target.value as FormValues['languageRequirement'])} value={values.languageRequirement}>
              <option value="spoken">Spoken language</option>
              <option value="text">Description / caption text</option>
            </select>
          </div>

          <div className="form-note form-note--warning form-field--wide">
            <AlertTriangle aria-hidden="true" size={17} />
            <p><strong>Language verification is evidence-based.</strong> Spoken audio transcription is not connected yet, so spoken-language searches will show qualifying videos as unverified. Text mode analyzes the returned description only; it does not verify speech.</p>
          </div>
          <div className="form-note form-note--neutral form-field--wide">
            <p><strong>Country is left blank for this dataset.</strong> The supplied cURL includes a country field, but its geographic meaning is not defined in the product requirements.</p>
          </div>

          {error && <p className="form-error form-field--wide" role="alert">{error}</p>}
          <div className="form-actions form-field--wide">
            <span>Bright Data credentials remain on the backend.</span>
            <button className="button button--primary" disabled={submitting || !providerReady} type="submit">
              {submitting ? <><LoaderCircle className="button-spinner" size={16} /> Creating search…</> : <>Start search <ArrowRight size={16} /></>}
            </button>
          </div>
          </fieldset>
        </form>
      </Surface>
    </div>
  )
}
