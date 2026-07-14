import { FormEvent, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Json } from '../lib/database.types'

type PatientLinkContext = {
  access_state: string
  public_identifier?: string
  requires_intake?: boolean
  practice?: PracticeSummary
  branding?: BrandingSummary
}

type PatientLinkPortalData = {
  access_state: string
  session?: {
    expires_at?: string
    last_activity_at?: string
  }
  selected_patient?: {
    public_identifier: string
    display_name: string
    patient_number?: string | null
    patient_type?: string | null
  }
  accessible_patients?: Array<{
    public_identifier: string
    display_name: string
    patient_type?: string | null
  }>
  practice?: PracticeSummary
  branding?: BrandingSummary
  overview?: {
    next_appointment?: AppointmentSummary | null
    outstanding_balance?: number
  }
  appointments?: AppointmentSummary[]
  invoices?: InvoiceSummary[]
  receipts?: ReceiptSummary[]
  consents?: ConsentSummary[]
}

type PracticeSummary = {
  display_name?: string | null
  legal_name?: string | null
  trading_name?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  country?: string | null
  location?: {
    name?: string | null
    address_line_1?: string | null
    address_line_2?: string | null
    suburb?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country?: string | null
    phone?: string | null
    email?: string | null
  }
}

type BrandingSummary = {
  logo_url?: string | null
  primary_colour?: string | null
  accent_colour?: string | null
}

type AppointmentSummary = {
  id?: string
  date?: string | null
  start_at?: string | null
  end_at?: string | null
  duration_minutes?: number | null
  status?: string | null
  appointment_type?: string | null
  mode?: string | null
  title?: string | null
  notes?: string | null
  therapist_name?: string | null
  location_name?: string | null
  room_label?: string | null
  booking_status?: string | null
  patient_facing_title?: string | null
  patient_facing_notes?: string | null
}

type InvoiceSummary = {
  id?: string
  invoice_number?: string | null
  invoice_status?: string | null
  payment_status?: string | null
  service_date?: string | null
  invoice_date?: string | null
  issued_at?: string | null
  due_date?: string | null
  currency_code?: string | null
  total_amount?: number | null
  amount_paid?: number | null
  balance_due?: number | null
  lines?: InvoiceLineSummary[]
}

type InvoiceLineSummary = {
  procedure_name?: string | null
  procedure_code?: string | null
  description?: string | null
  service_date?: string | null
  quantity?: number | null
  unit_price?: number | null
  line_total?: number | null
  currency_code?: string | null
}

type ReceiptSummary = {
  id?: string
  receipt_number?: string | null
  receipt_status?: string | null
  receipt_date?: string | null
  issued_at?: string | null
  payment_amount?: number | null
  currency_code?: string | null
  payment_method?: string | null
  payment_reference?: string | null
  allocation_snapshot?: Json
}

type ConsentSummary = {
  consent_type?: string | null
  consent_status?: string | null
  consent_version?: string | null
  signed_by_name?: string | null
  signed_by_relationship?: string | null
  accepted_at?: string | null
  source?: string | null
}

type VerificationStatus = 'idle' | 'requesting' | 'requested' | 'verifying' | 'error'
type PublicVerificationResponse = {
  requested?: boolean
  challenge_id?: string
  expires_at?: string
  delivery_deferred?: boolean
}

const patientLinkSessionPrefix = 'allidesk.patientLinkSession.'
const genericVerificationError = 'We could not verify access. Please check the code or request a new verification code.'

function getStoredSession(publicIdentifier: string) {
  try {
    return window.localStorage.getItem(`${patientLinkSessionPrefix}${publicIdentifier}`) ?? ''
  } catch {
    return ''
  }
}

function storeSession(publicIdentifier: string, token: string) {
  try {
    window.localStorage.setItem(`${patientLinkSessionPrefix}${publicIdentifier}`, token)
  } catch {
    // Storage can be blocked in private contexts. The in-memory state still works for this page lifecycle.
  }
}

function clearStoredSession(publicIdentifier: string) {
  try {
    window.localStorage.removeItem(`${patientLinkSessionPrefix}${publicIdentifier}`)
  } catch {
    // Ignore storage cleanup failures.
  }
}

function createRandomToken() {
  const bytes = new Uint8Array(32)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseJsonObject<T>(value: Json | null): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as T
}

export function PatientLinkPortal() {
  const { publicIdentifier = '' } = useParams()
  const navigate = useNavigate()
  const [context, setContext] = useState<PatientLinkContext | null>(null)
  const [portalData, setPortalData] = useState<PatientLinkPortalData | null>(null)
  const [sessionToken, setSessionToken] = useState(() => publicIdentifier ? getStoredSession(publicIdentifier) : '')
  const [selectedPublicIdentifier, setSelectedPublicIdentifier] = useState('')
  const [loadingContext, setLoadingContext] = useState(true)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [error, setError] = useState('')
  const portalRequestRef = useRef(0)

  const primaryColour = portalData?.branding?.primary_colour ?? context?.branding?.primary_colour ?? '#27156f'
  const accentColour = portalData?.branding?.accent_colour ?? context?.branding?.accent_colour ?? '#ff7a3d'
  const practiceName = portalData?.practice?.display_name ?? context?.practice?.display_name ?? 'AlliDesk practice'

  const clearSession = useCallback(() => {
    if (publicIdentifier) clearStoredSession(publicIdentifier)
    setSessionToken('')
    setPortalData(null)
    setSelectedPublicIdentifier('')
  }, [publicIdentifier])

  const loadContext = useCallback(async () => {
    if (!publicIdentifier) return
    setLoadingContext(true)
    setError('')

    if (!isSupabaseConfigured || !supabase) {
      setContext({ access_state: 'configuration_error' })
      setLoadingContext(false)
      return
    }

    const { data, error: contextError } = await supabase.rpc('get_patient_link_public_context', {
      target_public_identifier: publicIdentifier,
    })

    if (contextError) {
      setContext({ access_state: 'temporary_error' })
      setError('Patient Link is temporarily unavailable. Please try again later.')
    } else {
      setContext(parseJsonObject<PatientLinkContext>(data) ?? { access_state: 'invalid' })
    }

    setLoadingContext(false)
  }, [publicIdentifier])

  const loadPortal = useCallback(async (token = sessionToken, selected = selectedPublicIdentifier) => {
    if (!publicIdentifier || !token || !supabase) return
    const requestId = portalRequestRef.current + 1
    portalRequestRef.current = requestId
    setLoadingPortal(true)
    setError('')
    setPortalData(null)

    const { data, error: portalError } = await supabase.rpc('get_patient_link_portal_data', {
      target_public_identifier: publicIdentifier,
      session_token_input: token,
      selected_public_identifier: selected || null,
    })

    const nextData = parseJsonObject<PatientLinkPortalData>(data)

    if (requestId !== portalRequestRef.current) return

    if (portalError || !nextData) {
      setError('Patient Link could not load securely. Please verify access again.')
      clearSession()
      navigate(`/p/${publicIdentifier}/verify`, { replace: true })
    } else if (nextData.access_state !== 'active') {
      setPortalData(nextData)
      if (['expired_session', 'revoked', 'suspended', 'tenant_unavailable', 'no_active_grant', 'unavailable'].includes(nextData.access_state)) {
        clearSession()
        setError(getAccessStateMessage(nextData.access_state))
        navigate(`/p/${publicIdentifier}/verify`, { replace: true })
      }
    } else {
      setPortalData(nextData)
      const selectedStillAllowed = nextData.accessible_patients?.some((patient) => patient.public_identifier === selected)
      if (selected && selectedStillAllowed === false && nextData.selected_patient?.public_identifier) {
        setSelectedPublicIdentifier(nextData.selected_patient.public_identifier)
      } else if (!selectedPublicIdentifier && nextData.selected_patient?.public_identifier) {
        setSelectedPublicIdentifier(nextData.selected_patient.public_identifier)
      }
    }

    setLoadingPortal(false)
  }, [clearSession, navigate, publicIdentifier, selectedPublicIdentifier, sessionToken])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  useEffect(() => {
    setSessionToken(publicIdentifier ? getStoredSession(publicIdentifier) : '')
  }, [publicIdentifier])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === `${patientLinkSessionPrefix}${publicIdentifier}` && !event.newValue) {
        clearSession()
        navigate(`/p/${publicIdentifier}/verify`, { replace: true })
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [clearSession, navigate, publicIdentifier])

  useEffect(() => {
    if (sessionToken && context?.access_state === 'verification_required') {
      void loadPortal(sessionToken)
    }
  }, [context?.access_state, loadPortal, sessionToken])

  useEffect(() => {
    if (!portalData?.session?.expires_at || !sessionToken) return
    const expiresAt = new Date(portalData.session.expires_at).getTime()
    const delay = Math.max(expiresAt - Date.now(), 0)
    const timeoutId = window.setTimeout(() => {
      clearSession()
      setError('Your secure Patient Link session expired. Please verify access again.')
      navigate(`/p/${publicIdentifier}/verify`, { replace: true })
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [clearSession, navigate, portalData?.session?.expires_at, publicIdentifier, sessionToken])

  async function logAccess(eventType: string, resourceType?: string, resourceId?: string) {
    if (!supabase || !sessionToken || !publicIdentifier) return
    await supabase.rpc('log_patient_link_portal_access', {
      target_public_identifier: publicIdentifier,
      session_token_input: sessionToken,
      event_type_input: eventType,
      resource_type_input: resourceType ?? null,
      resource_id_input: resourceId ?? null,
    })
  }

  async function handleLogout() {
    if (supabase && sessionToken) {
      await logAccess('logout')
      await supabase.rpc('revoke_patient_link_session', {
        target_session_token: sessionToken,
        revocation_reason_input: 'logout',
      })
    }
    clearSession()
    navigate(`/p/${publicIdentifier}/verify`, { replace: true })
  }

  function handlePatientChange(nextPublicIdentifier: string) {
    setPortalData(null)
    setSelectedPublicIdentifier(nextPublicIdentifier)
    void loadPortal(sessionToken, nextPublicIdentifier)
  }

  if (loadingContext) {
    return <PatientLinkStateShell><LoadingState title="Opening Patient Link" description="Checking secure access details." /></PatientLinkStateShell>
  }

  if (!context || context.access_state === 'invalid') {
    return <PatientLinkStateShell><ErrorState title="Patient Link unavailable" description="This link could not be opened. Please check the link or contact the practice." /></PatientLinkStateShell>
  }

  if (context.access_state === 'configuration_error') {
    return <PatientLinkStateShell><ErrorState title="Patient Link not configured" description="The portal cannot connect securely yet. Please contact the practice." /></PatientLinkStateShell>
  }

  if (['suspended', 'revoked', 'expired', 'archived', 'replaced', 'unavailable'].includes(context.access_state)) {
    return (
      <PatientLinkStateShell>
        <ErrorState title="Patient Link access unavailable" description="This Patient Link is not active. Please contact the practice for assistance." />
      </PatientLinkStateShell>
    )
  }

  const portalActive = Boolean(sessionToken && portalData?.access_state === 'active')

  return (
    <main className="external-patient-link-page" style={{ '--patient-link-primary': primaryColour, '--patient-link-accent': accentColour } as CSSProperties}>
      <section className="external-patient-link-shell">
        <header className="external-patient-link-header">
          <div>
            <span>Patient Link</span>
            <h1>{practiceName}</h1>
            <p>{portalData?.selected_patient?.display_name ?? 'Secure patient access'}</p>
          </div>
          {context.branding?.logo_url ? <img src={context.branding.logo_url} alt={practiceName} /> : <img src="/assets/Allidesk_Main_Logo copy.png" alt="AlliDesk" />}
        </header>

        {error && <p className="external-patient-link-alert" role="alert" aria-live="polite">{error}</p>}

        {!portalActive ? (
          <Routes>
            <Route path="/" element={<Navigate to="verify" replace />} />
            <Route
              path="verify"
              element={(
                <VerificationPanel
                  publicIdentifier={publicIdentifier}
                  context={context}
                  onVerified={(token) => {
                    storeSession(publicIdentifier, token)
                    setSessionToken(token)
                    void loadPortal(token).then(() => navigate(`/p/${publicIdentifier}/overview`, { replace: true }))
                  }}
                />
              )}
            />
            <Route path="*" element={<Navigate to="verify" replace />} />
          </Routes>
        ) : (
          <>
            <nav className="external-patient-link-nav" aria-label="Patient Link sections">
              <NavLink to={`/p/${publicIdentifier}/overview`}>Overview</NavLink>
              <NavLink to={`/p/${publicIdentifier}/appointments`} onClick={() => void logAccess('appointment_viewed', 'appointment_list')}>Appointments</NavLink>
              <NavLink to={`/p/${publicIdentifier}/invoices`} onClick={() => void logAccess('invoice_viewed', 'invoice_list')}>Invoices</NavLink>
              <NavLink to={`/p/${publicIdentifier}/receipts`} onClick={() => void logAccess('receipt_viewed', 'receipt_list')}>Receipts</NavLink>
              <NavLink to={`/p/${publicIdentifier}/privacy`}>Privacy</NavLink>
              <button type="button" onClick={() => void handleLogout()}>Logout</button>
            </nav>

            {portalData?.accessible_patients && portalData.accessible_patients.length > 1 && (
              <label className="external-patient-selector">
                <span>Patient/dependent</span>
                <select value={selectedPublicIdentifier} onChange={(event) => handlePatientChange(event.target.value)}>
                  {portalData.accessible_patients.map((patient) => (
                    <option value={patient.public_identifier} key={patient.public_identifier}>{patient.display_name}</option>
                  ))}
                </select>
              </label>
            )}

            {loadingPortal ? (
              <LoadingState title="Loading Patient Link" description="Refreshing your secure view." />
            ) : (
              <Routes>
                <Route path="/" element={<Navigate to="overview" replace />} />
                <Route path="verify" element={<Navigate to={`/p/${publicIdentifier}/overview`} replace />} />
                <Route path="overview" element={<OverviewView portalData={portalData} />} />
                <Route path="appointments" element={<AppointmentsView appointments={portalData?.appointments ?? []} />} />
                <Route path="invoices" element={<InvoicesView invoices={portalData?.invoices ?? []} />} />
                <Route path="receipts" element={<ReceiptsView receipts={portalData?.receipts ?? []} />} />
                <Route path="privacy" element={<PrivacyView portalData={portalData} />} />
                <Route path="*" element={<Navigate to="overview" replace />} />
              </Routes>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function PatientLinkStateShell({ children }: { children: ReactNode }) {
  return <main className="external-patient-link-page"><section className="external-patient-link-shell">{children}</section></main>
}

function VerificationPanel({ publicIdentifier, context, onVerified }: { publicIdentifier: string; context: PatientLinkContext; onVerified: (token: string) => void }) {
  const [deliveryMethod, setDeliveryMethod] = useState('email')
  const [challengeId, setChallengeId] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  async function requestChallenge() {
    if (!supabase || status === 'requesting' || status === 'verifying') return
    setStatus('requesting')
    setMessage('')
    setChallengeId('')
    setVerificationCode('')

    const { data, error } = await supabase.rpc('request_patient_link_public_verification', {
      target_public_identifier: publicIdentifier,
      delivery_method_input: deliveryMethod,
      expires_in_minutes: 10,
    })

    const response = parseJsonObject<PublicVerificationResponse>(data)

    if (error || !response?.requested) {
      setStatus('error')
      setMessage('If access is available, a verification code will be sent. Please contact the practice if it does not arrive.')
      return
    }

    setChallengeId(response.challenge_id ?? '')
    setExpiresAt(response.expires_at ?? '')
    setStatus('requested')
    setMessage('If access is available, a verification code will be sent using the selected method. Code delivery remains dependent on the practice communication service.')
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !challengeId || !verificationCode.trim() || status === 'verifying') return

    setStatus('verifying')
    setMessage('')

    const { data, error } = await supabase.rpc('verify_patient_link', {
      target_challenge_id: challengeId,
      verification_code_input: verificationCode.trim(),
    })

    if (error || !data?.[0]?.verified) {
      setStatus('error')
      setMessage(genericVerificationError)
      setVerificationCode('')
      return
    }

    const token = createRandomToken()
    const sessionResult = await supabase.rpc('create_patient_link_session', {
      target_challenge_id: challengeId,
      session_token_input: token,
      ip_address_input: null,
      user_agent_input: window.navigator.userAgent,
      expires_in_minutes: 60,
    })

    if (sessionResult.error || !sessionResult.data?.[0]?.session_id) {
      setStatus('error')
      setMessage('Verification succeeded, but the secure session could not be created. Please request a new code.')
      setVerificationCode('')
      setChallengeId('')
      return
    }

    setVerificationCode('')
    onVerified(token)
  }

  return (
    <Card className="external-patient-link-card external-patient-link-verification">
      <span>Secure access</span>
      <h2>Verify access</h2>
      <p>
        Secure Patient Link access requires a verification code before any patient-facing information is shown.
      </p>

      <div className="external-patient-link-methods">
        <label>
          <span>Delivery method</span>
          <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
        <Button type="button" onClick={() => void requestChallenge()} disabled={status === 'requesting' || status === 'verifying'}>
          {status === 'requesting' ? 'Requesting...' : 'Request code'}
        </Button>
      </div>

      <form onSubmit={submitVerification} className="external-patient-link-verify-form">
        <label>
          <span>Verification code</span>
          <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" />
        </label>
        <Button type="submit" disabled={!challengeId || status === 'verifying'}>
          {status === 'verifying' ? 'Verifying...' : 'Continue'}
        </Button>
      </form>

      {message && <p className="external-patient-link-muted" aria-live="polite">{message}</p>}
      {expiresAt && <p className="external-patient-link-muted">Code expires {formatDateTimeRange(expiresAt)}.</p>}
    </Card>
  )
}

function OverviewView({ portalData }: { portalData: PatientLinkPortalData | null }) {
  const nextAppointment = portalData?.overview?.next_appointment
  return (
    <div className="external-patient-link-grid">
      <Card className="external-patient-link-card">
        <span>Patient</span>
        <h2>{portalData?.selected_patient?.display_name ?? 'Patient'}</h2>
        <p>{[portalData?.selected_patient?.patient_number, formatLabel(portalData?.selected_patient?.patient_type)].filter(Boolean).join(' · ') || 'Secure read-only profile access.'}</p>
      </Card>
      <Card className="external-patient-link-card">
        <span>Next appointment</span>
        {nextAppointment ? <AppointmentContent appointment={nextAppointment} /> : <p>No upcoming appointment is currently visible.</p>}
      </Card>
      <Card className="external-patient-link-card">
        <span>Outstanding balance</span>
        <h2>{formatMoney(portalData?.overview?.outstanding_balance ?? 0)}</h2>
        <p>Only approved patient-facing invoice balances are included.</p>
      </Card>
      <Card className="external-patient-link-card">
        <span>Access notice</span>
        <h2>Read-only view</h2>
        <p>This portal displays approved practice information only. Contact the practice to update booking, invoice or personal access details.</p>
      </Card>
    </div>
  )
}

function AppointmentsView({ appointments }: { appointments: AppointmentSummary[] }) {
  if (appointments.length === 0) {
    return <EmptyState title="No appointments visible" description="There are no patient-facing appointments available on this Patient Link yet." />
  }

  return (
    <div className="external-patient-link-list">
      {appointments.map((appointment) => (
        <Card className="external-patient-link-card external-patient-link-appointment" key={appointment.id ?? `${appointment.start_at}-${appointment.title}`}>
          <AppointmentContent appointment={appointment} />
        </Card>
      ))}
    </div>
  )
}

function AppointmentContent({ appointment }: { appointment: AppointmentSummary }) {
  return (
    <>
      <h2>{appointment.title || appointment.patient_facing_title || formatLabel(appointment.appointment_type) || 'Appointment'}</h2>
      <p>{formatDateTimeRange(appointment.start_at ?? appointment.date, appointment.end_at)}</p>
      <div className="external-patient-link-meta">
        {appointment.therapist_name && <span>{appointment.therapist_name}</span>}
        {appointment.location_name && <span>{appointment.location_name}</span>}
        {appointment.mode && <span>{formatLabel(appointment.mode)}</span>}
        {appointment.status && <StatusBadge tone="info">{formatLabel(appointment.status)}</StatusBadge>}
      </div>
      {(appointment.notes || appointment.patient_facing_notes) && <p>{appointment.notes || appointment.patient_facing_notes}</p>}
    </>
  )
}

function InvoicesView({ invoices }: { invoices: InvoiceSummary[] }) {
  if (invoices.length === 0) {
    return <EmptyState title="No invoices visible" description="There are no issued patient-facing invoices available on this Patient Link yet." />
  }

  return (
    <div className="external-patient-link-list">
      {invoices.map((invoice, invoiceIndex) => (
        <Card className="external-patient-link-card" key={`${invoice.invoice_number ?? 'invoice'}-${invoice.invoice_date ?? invoice.issued_at ?? invoiceIndex}`}>
          <div className="external-patient-link-row">
            <div>
              <span>Invoice</span>
              <h2>{invoice.invoice_number ?? 'Invoice'}</h2>
              <p>{formatDate(invoice.invoice_date ?? invoice.issued_at)} · Due {formatDate(invoice.due_date)}</p>
            </div>
            <div>
              <StatusBadge tone={invoice.payment_status === 'paid' ? 'success' : 'warning'}>{formatLabel(invoice.payment_status ?? invoice.invoice_status)}</StatusBadge>
              <strong>{formatMoney(invoice.balance_due ?? invoice.total_amount ?? 0, invoice.currency_code)}</strong>
            </div>
          </div>
          <div className="external-patient-link-lines">
            {(invoice.lines ?? []).map((line, index) => (
              <div key={`${line.procedure_code}-${index}`}>
                <span>{[line.procedure_code, line.procedure_name].filter(Boolean).join(' · ') || 'Service'}</span>
                <strong>{formatMoney(line.line_total ?? 0, line.currency_code ?? invoice.currency_code)}</strong>
              </div>
            ))}
          </div>
          <div className="external-patient-link-totals">
            <span>Total {formatMoney(invoice.total_amount ?? 0, invoice.currency_code)}</span>
            <span>Paid {formatMoney(invoice.amount_paid ?? 0, invoice.currency_code)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ReceiptsView({ receipts }: { receipts: ReceiptSummary[] }) {
  if (receipts.length === 0) {
    return <EmptyState title="No receipts visible" description="Receipts will appear here after the practice has issued them for patient-facing access." />
  }

  return (
    <div className="external-patient-link-list">
      {receipts.map((receipt, receiptIndex) => (
        <Card className="external-patient-link-card" key={`${receipt.receipt_number ?? 'receipt'}-${receipt.receipt_date ?? receipt.issued_at ?? receiptIndex}`}>
          <div className="external-patient-link-row">
            <div>
              <span>Receipt</span>
              <h2>{receipt.receipt_number ?? 'Receipt'}</h2>
              <p>{formatDate(receipt.receipt_date ?? receipt.issued_at)}</p>
            </div>
            <div>
              <StatusBadge tone="success">{formatLabel(receipt.receipt_status ?? 'issued')}</StatusBadge>
              <strong>{formatMoney(receipt.payment_amount ?? 0, receipt.currency_code)}</strong>
            </div>
          </div>
          <div className="external-patient-link-meta">
            {receipt.payment_method && <span>{formatLabel(receipt.payment_method)}</span>}
            {receipt.payment_reference && <span>{receipt.payment_reference}</span>}
          </div>
        </Card>
      ))}
    </div>
  )
}

function PrivacyView({ portalData }: { portalData: PatientLinkPortalData | null }) {
  const practice = portalData?.practice
  const location = practice?.location
  return (
    <div className="external-patient-link-grid">
      <Card className="external-patient-link-card">
        <span>Practice details</span>
        <h2>{practice?.display_name ?? 'Practice'}</h2>
        <p>{[location?.address_line_1, location?.suburb, location?.city, location?.postal_code].filter(Boolean).join(', ') || 'Address not supplied for Patient Link display.'}</p>
        <div className="external-patient-link-meta">
          {practice?.phone && <span>{practice.phone}</span>}
          {practice?.email && <span>{practice.email}</span>}
          {practice?.website && <span>{practice.website}</span>}
        </div>
      </Card>
      <Card className="external-patient-link-card">
        <span>Privacy</span>
        <h2>Patient Link terms</h2>
        <p>This is a read-only access point for approved appointment, invoice, receipt and practice information. Contact the practice if access should be revoked or updated.</p>
      </Card>
      <Card className="external-patient-link-card">
        <span>Consent status</span>
        {(portalData?.consents ?? []).length === 0 ? (
          <p>No patient-facing consent record is visible on this Patient Link yet.</p>
        ) : (
          <div className="external-patient-link-lines">
            {(portalData?.consents ?? []).map((consent, index) => (
              <div key={`${consent.consent_type}-${index}`}>
                <span>{formatLabel(consent.consent_type)} {consent.consent_version ? `· ${consent.consent_version}` : ''}</span>
                <strong>{formatLabel(consent.consent_status)}</strong>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function formatLabel(value?: string | null) {
  if (!value) return ''
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function getAccessStateMessage(accessState: string) {
  switch (accessState) {
    case 'expired_session':
      return 'Your secure Patient Link session expired. Please verify access again.'
    case 'no_active_grant':
      return 'This Patient Link access is not active. Please contact the practice.'
    case 'tenant_unavailable':
      return 'The practice workspace is temporarily unavailable. Please contact the practice.'
    case 'suspended':
      return 'This Patient Link is suspended. Please contact the practice.'
    case 'revoked':
      return 'This Patient Link has been revoked. Please contact the practice.'
    case 'unavailable':
      return 'This patient record is not available through Patient Link. Please contact the practice.'
    default:
      return 'Please verify access again to continue securely.'
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTimeRange(start?: string | null, end?: string | null) {
  if (!start) return 'Time not set'
  const startDate = new Date(start)
  const startText = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(startDate)
  if (!end) return startText
  const endText = new Intl.DateTimeFormat('en-ZA', { timeStyle: 'short' }).format(new Date(end))
  return `${startText} - ${endText}`
}

function formatMoney(value: number, currency?: string | null) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(value)
}
