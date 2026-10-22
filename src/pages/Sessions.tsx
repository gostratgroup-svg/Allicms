import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge, SearchBar } from '../components/ui'
import { FinanceIcon, PencilIcon, TrashIcon } from '../components/icons'
import { RichTextComposer } from '../components/RichTextComposer'
import { showErrorNotice, showSuccessNotice } from '../lib/appNotice'
import { getMonthlyFinanceFlagsByPatient } from '../lib/financeFlags'
import type { Database, Json } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']
type BookingProcedureRow = Database['public']['Tables']['booking_procedures']['Row']
type PatientRow = Database['public']['Tables']['patients']['Row']
type ResponsiblePartyRow = Database['public']['Tables']['responsible_parties']['Row']
type TherapistRow = Database['public']['Tables']['therapist_profiles']['Row']
type LocationRow = Database['public']['Tables']['practice_locations']['Row']
type PriceListItemRow = Database['public']['Tables']['price_list_items']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionUpdate = Database['public']['Tables']['sessions']['Update']
type SessionProcedureRow = Database['public']['Tables']['session_procedures']['Row']
type SessionProcedureInsert = Database['public']['Tables']['session_procedures']['Insert']
type SessionProcedureUpdate = Database['public']['Tables']['session_procedures']['Update']
type SessionStatusHistoryRow = Database['public']['Tables']['session_status_history']['Row']
type SessionStatusHistoryInsert = Database['public']['Tables']['session_status_history']['Insert']
type SessionWorkflowEventRow = Database['public']['Tables']['session_workflow_events']['Row']
type SessionWorkflowEventInsert = Database['public']['Tables']['session_workflow_events']['Insert']
type SessionNoteRow = Database['public']['Tables']['session_notes']['Row']
type SessionNoteInsert = Database['public']['Tables']['session_notes']['Insert']
type SessionNoteUpdate = Database['public']['Tables']['session_notes']['Update']
type PatientHistoryEventInsert = Database['public']['Tables']['patient_history_events']['Insert']
type PatientHistoryEventRow = Database['public']['Tables']['patient_history_events']['Row']
type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type ClinicalEncounterRow = Database['public']['Tables']['clinical_encounters']['Row']
type ClinicalNoteRow = Database['public']['Tables']['clinical_notes']['Row']
type ClinicalNoteVersionRow = Database['public']['Tables']['clinical_note_versions']['Row']

type SessionListItem =
  | { kind: 'session'; id: string; session: SessionRow; booking: BookingRow | null }
  | { kind: 'eligible_booking'; id: string; booking: BookingRow }

type ProcedureDraft = {
  id?: string
  price_list_item_id?: string
  procedure_name: string
  procedure_code: string
  icd10_code: string
  description: string
  unit_price: string
  quantity: string
  duration_minutes: string
  is_billable: boolean
  differs_from_booking: boolean
  change_reason: string
}

type CompletionForm = {
  actual_start_at: string
  actual_end_at: string
  attendance_outcome: string
  session_outcome: string
  operational_summary: string
}

type SessionDetailsForm = {
  therapist_profile_id: string
  practice_location_id: string
  scheduled_start_at: string
  duration_minutes: string
  session_type: string
  session_modality: string
}

type NoteComposerKind = 'planning' | 'session_feedback' | 'process_note'

const sessionOutcomes = ['completed_as_planned', 'completed_with_changes', 'follow_up_required', 'report_required', 'feedback_required', 'referred_on']
const attendanceOutcomes = ['attended', 'partial_attendance']
const activeBookingStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress']
const sessionTypes = ['standard', 'assessment', 'review', 'group', 'admin', 'other']
const sessionModalities = ['in_person', 'telehealth', 'home_visit', 'school_visit', 'other']
const sessionDurationOptions = Array.from({ length: 10 }, (_, index) => (index + 1) * 15)

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function formatPatientName(patient: PatientRow | null | undefined) {
  if (!patient) return 'Unknown patient'
  return `${patient.first_name} ${patient.last_name}`.trim()
}

function formatDateTime(dateValue: string | null) {
  if (!dateValue) return 'Not set'
  return new Date(dateValue).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocal(dateValue: string | null) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  return new Date(value).toISOString()
}

function formatMoney(value: number) {
  return `R ${value.toFixed(2)}`
}

function jsonObject(value: Json): { [key: string]: Json | undefined } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function icd10CodeFromMetadata(metadata: Json) {
  const value = jsonObject(metadata).icd10_code
  return typeof value === 'string' ? value : ''
}

function metadataWithIcd10Code(metadata: Json, value: string): Json {
  const nextMetadata = { ...jsonObject(metadata) }
  const icd10Code = value.trim().toUpperCase()

  if (icd10Code) {
    nextMetadata.icd10_code = icd10Code
  } else {
    delete nextMetadata.icd10_code
  }

  return nextMetadata
}

function getSessionTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled' || status === 'no_show') return 'danger'
  if (status === 'in_progress' || status === 'paused' || status === 'reopened') return 'warning'
  if (status === 'ready') return 'info'
  return 'neutral'
}

function getWorkflowKey(sessionId: string, eventType: string, detail = '') {
  return ['session', sessionId, eventType, detail].filter(Boolean).join(':')
}

function isTerminalSession(status: string) {
  return status === 'completed' || status === 'cancelled' || status === 'no_show'
}

function getFriendlySessionError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (message.includes('duplicate key') || message.includes('23505')) return 'This action was already recorded. Refreshing the workspace will show the latest session state.'
  if (message.includes('Not allowed')) return 'Your current role is not allowed to perform this session action.'
  if (message.includes('Cannot complete a cancelled or no-show')) return 'Cancelled and no-show sessions cannot be completed.'
  if (message.includes('Actual start and end')) return 'Actual start and end times are required, and the end time must be after the start time.'
  if (message.includes('At least one active billable')) return 'At least one billable delivered procedure is required before completion.'
  if (message.includes('Session not found')) return 'This session could not be found or is no longer accessible.'
  if (message.includes('Booking not found')) return 'This booking could not be found or is no longer accessible.'
  return message
}

function getProcedureDraft(procedure: SessionProcedureRow): ProcedureDraft {
  return {
    id: procedure.id,
    price_list_item_id: procedure.price_list_item_id ?? undefined,
    procedure_name: procedure.procedure_name,
    procedure_code: procedure.procedure_code ?? '',
    icd10_code: icd10CodeFromMetadata(procedure.metadata),
    description: procedure.description ?? '',
    unit_price: String(procedure.unit_price),
    quantity: String(procedure.quantity),
    duration_minutes: procedure.duration_minutes ? String(procedure.duration_minutes) : '',
    is_billable: procedure.is_billable,
    differs_from_booking: procedure.differs_from_booking,
    change_reason: procedure.change_reason ?? '',
  }
}

function getEmptyProcedureDraft(priceItem?: PriceListItemRow): ProcedureDraft {
  return {
    price_list_item_id: priceItem?.id,
    procedure_name: priceItem?.procedure_name ?? '',
    procedure_code: priceItem?.procedure_code ?? '',
    icd10_code: priceItem ? icd10CodeFromMetadata(priceItem.metadata) : '',
    description: priceItem?.description ?? '',
    unit_price: String(priceItem?.price ?? 0),
    quantity: '1',
    duration_minutes: priceItem?.duration_minutes ? String(priceItem.duration_minutes) : '',
    is_billable: true,
    differs_from_booking: true,
    change_reason: 'Added during session',
  }
}

type SessionProcedureComboboxProps = {
  items: PriceListItemRow[]
  disabled?: boolean
  onSelect: (item: PriceListItemRow) => void
}

function SessionProcedureCombobox({ items, disabled = false, onSelect }: SessionProcedureComboboxProps) {
  const listId = useId()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(0)
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => [
      item.procedure_code,
      item.procedure_name,
      icd10CodeFromMetadata(item.metadata),
    ].some((value) => value?.toLowerCase().includes(query)))
  }, [items, search])

  const chooseItem = (item: PriceListItemRow) => {
    onSelect(item)
    setSearch('')
    setOpen(false)
    setActiveOptionIndex(0)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveOptionIndex((current) => filteredItems.length === 0 ? 0 : (current + 1) % filteredItems.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveOptionIndex((current) => filteredItems.length === 0 ? 0 : (current - 1 + filteredItems.length) % filteredItems.length)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const item = filteredItems[activeOptionIndex]
      if (item) chooseItem(item)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className="booking-procedure-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <input
        type="search"
        role="combobox"
        aria-label="Add procedure"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filteredItems.length > 0 ? `${listId}-option-${activeOptionIndex}` : undefined}
        value={search}
        disabled={disabled}
        placeholder="Add procedure"
        onFocus={() => { setOpen(true); setActiveOptionIndex(0) }}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setSearch(event.target.value)
          setOpen(true)
          setActiveOptionIndex(0)
        }}
      />
      {open && (
        <div id={listId} className="booking-procedure-options" role="listbox" aria-label="Configured procedures">
          {filteredItems.map((item, index) => (
            <button
              id={`${listId}-option-${index}`}
              className={activeOptionIndex === index ? 'active' : ''}
              type="button"
              role="option"
              aria-selected={false}
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveOptionIndex(index)}
              onClick={() => chooseItem(item)}
            >
              <strong>{item.procedure_code || 'No code'} · {item.procedure_name}</strong>
              <span>{icd10CodeFromMetadata(item.metadata) ? `ICD-10 ${icd10CodeFromMetadata(item.metadata)} · ` : ''}{formatMoney(item.price)}</span>
            </button>
          ))}
          {filteredItems.length === 0 && <p>No matching configured procedures.</p>}
        </div>
      )}
    </div>
  )
}

function getPatientHistoryCopy(eventType: string, patientName: string) {
  if (eventType === 'session_started') return { title: 'Session started', body: `${patientName}'s session was started.` }
  if (eventType === 'session_completed') return { title: 'Session completed', body: `${patientName}'s session was completed.` }
  if (eventType === 'session_reopened') return { title: 'Session reopened', body: `${patientName}'s completed session was reopened for correction.` }
  if (eventType === 'session_cancelled') return { title: 'Session cancelled', body: `${patientName}'s session was cancelled.` }
  if (eventType === 'session_no_show_recorded') return { title: 'No show recorded', body: `${patientName}'s session was marked as no show.` }
  if (eventType === 'session_procedures_changed') return { title: 'Session procedures updated', body: `${patientName}'s delivered procedure set was updated.` }
  if (eventType === 'process_note_skipped') return { title: 'Process Note skipped', body: `${patientName}'s Process Note was explicitly skipped.` }
  return { title: formatLabel(eventType), body: `${patientName}'s session was updated.` }
}

type SessionsPageProps = {
  embeddedBookingId?: string
  onSessionStatusChange?: (session: Pick<SessionRow, 'id' | 'booking_id' | 'session_status'>) => void
  onBookingChange?: (booking: BookingRow) => void
  onClinicalNoteChange?: (note: Pick<ClinicalNoteRow, 'booking_id' | 'session_id' | 'note_type' | 'note_status'>) => void
  onProcessNoteSkipChange?: (sessionId: string) => void
  onInvoiceChange?: (invoice: Pick<InvoiceRow, 'id' | 'session_id' | 'patient_id' | 'invoice_status' | 'payment_status' | 'balance_due' | 'invoice_date' | 'confirmed_at' | 'issued_at'>) => void
}

export function SessionsPage({ embeddedBookingId, onSessionStatusChange, onBookingChange, onClinicalNoteChange, onProcessNoteSkipChange, onInvoiceChange }: SessionsPageProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeTenant, profile } = useAuth()
  const authorization = useAuthorization()
  const canViewSessions = authorization.hasPermission('tenant.bookings.view', 'tenant.clinical.view', 'tenant.finance.view')
  const canManageSession = authorization.hasPermission('tenant.bookings.manage', 'tenant.clinical.manage')
  const canCompleteSession = authorization.hasRole('admin', 'therapist')
  const canReadInternalNotes = authorization.hasRole('admin', 'receptionist', 'therapist')
  const canReadPricing = authorization.hasPermission('tenant.finance.view', 'tenant.practice.configure')
  const canViewClinical = authorization.hasPermission('tenant.clinical.view') && !authorization.isSuperAdmin
  const canViewFinance = authorization.hasPermission('tenant.finance.view')
  const canConfirmSessionInvoice = authorization.hasRole('admin', 'finance')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [responsibleParties, setResponsibleParties] = useState<ResponsiblePartyRow[]>([])
  const [therapists, setTherapists] = useState<TherapistRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bookingProcedures, setBookingProcedures] = useState<BookingProcedureRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionProcedures, setSessionProcedures] = useState<SessionProcedureRow[]>([])
  const [, setSessionHistory] = useState<SessionStatusHistoryRow[]>([])
  const [, setSessionEvents] = useState<SessionWorkflowEventRow[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNoteRow[]>([])
  const [initialPatientNotes, setInitialPatientNotes] = useState<PatientHistoryEventRow[]>([])
  const [priceListItems, setPriceListItems] = useState<PriceListItemRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [billingFlagMetadata, setBillingFlagMetadata] = useState<Json | null>(null)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [procedureDrafts, setProcedureDrafts] = useState<ProcedureDraft[]>([])
  const [completionForm, setCompletionForm] = useState<CompletionForm>({
    actual_start_at: '',
    actual_end_at: '',
    attendance_outcome: 'attended',
    session_outcome: 'completed_as_planned',
    operational_summary: '',
  })
  const [completionIntent, setCompletionIntent] = useState<'complete' | 'confirm_invoice' | null>(null)
  const [noteBody, setNoteBody] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [reopenReason, setReopenReason] = useState('')
  const [selectedSection, setSelectedSection] = useState<'details' | 'notes' | 'finance'>('notes')
  const [isEditingSessionDetails, setIsEditingSessionDetails] = useState(false)
  const [sessionDetailsForm, setSessionDetailsForm] = useState<SessionDetailsForm>({
    therapist_profile_id: '',
    practice_location_id: '',
    scheduled_start_at: '',
    duration_minutes: '60',
    session_type: 'standard',
    session_modality: 'in_person',
  })
  const [activeNoteComposer, setActiveNoteComposer] = useState<NoteComposerKind | null>(null)
  const [clinicalNoteBody, setClinicalNoteBody] = useState('')
  const [clinicalNote, setClinicalNote] = useState<ClinicalNoteRow | null>(null)
  const [clinicalNoteVersion, setClinicalNoteVersion] = useState<ClinicalNoteVersionRow | null>(null)
  const [hasSavedProcessNote, setHasSavedProcessNote] = useState(false)
  const [loadingClinicalNote, setLoadingClinicalNote] = useState(false)
  const [isEditingNoteComposer, setIsEditingNoteComposer] = useState(true)
  const autoCreatedBookingIds = useRef(new Set<string>())

  useEffect(() => {
    if (actionError) showErrorNotice(actionError)
  }, [actionError])

  useEffect(() => {
    if (successMessage) showSuccessNotice(successMessage)
  }, [successMessage])

  const sessionBookingIds = useMemo(() => new Set(sessions.map((session) => session.booking_id)), [sessions])
  const patientById = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients])
  const therapistById = useMemo(() => new Map(therapists.map((therapist) => [therapist.id, therapist])), [therapists])
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations])
  const bookingById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings])

  const eligibleBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const patient = patientById.get(booking.patient_id)
      const therapist = booking.therapist_profile_id ? therapistById.get(booking.therapist_profile_id) : null
      const location = booking.practice_location_id ? locationById.get(booking.practice_location_id) : null
      return !sessionBookingIds.has(booking.id)
        && Boolean(patient)
        && patient?.patient_status !== 'archived'
        && Boolean(therapist?.is_active)
        && (!location || location.is_active)
        && activeBookingStatuses.includes(booking.booking_status)
    })
  }, [bookingById, bookings, locationById, patientById, sessionBookingIds, therapistById])

  const listItems = useMemo<SessionListItem[]>(() => {
    const existingSessions: SessionListItem[] = sessions.map((session) => ({
      kind: 'session',
      id: session.id,
      session,
      booking: bookingById.get(session.booking_id) ?? null,
    }))
    const embeddedBooking = embeddedBookingId
      ? bookings.find((booking) => booking.id === embeddedBookingId && !sessionBookingIds.has(booking.id))
      : null
    const visibleEligibleBookings = embeddedBooking && !eligibleBookings.some((booking) => booking.id === embeddedBooking.id)
      ? [...eligibleBookings, embeddedBooking]
      : eligibleBookings
    const bookingItems: SessionListItem[] = visibleEligibleBookings.map((booking) => ({
      kind: 'eligible_booking',
      id: `booking-${booking.id}`,
      booking,
    }))

    return [...existingSessions, ...bookingItems]
      .filter((item) => {
        const itemBooking = item.kind === 'session' ? item.booking : item.booking
        if (embeddedBookingId && itemBooking?.id === embeddedBookingId) return true
        if (statusFilter === 'active') {
          return item.kind === 'eligible_booking' || !isTerminalSession(item.session.session_status)
        }
        if (statusFilter !== 'all') {
          return item.kind === 'session' && item.session.session_status === statusFilter
        }
        return true
      })
      .filter((item) => {
        const booking = item.kind === 'session' ? item.booking : item.booking
        const patient = booking ? patientById.get(booking.patient_id) : null
        const therapist = booking?.therapist_profile_id ? therapistById.get(booking.therapist_profile_id) : null
        const haystack = `${formatPatientName(patient)} ${therapist?.display_name ?? ''} ${booking?.booking_status ?? ''}`.toLowerCase()
        return haystack.includes(search.toLowerCase())
      })
      .sort((left, right) => {
        const leftBooking = left.kind === 'session' ? left.booking : left.booking
        const rightBooking = right.kind === 'session' ? right.booking : right.booking
        return (leftBooking?.start_at ?? '').localeCompare(rightBooking?.start_at ?? '')
      })
  }, [bookingById, bookings, eligibleBookings, embeddedBookingId, patientById, search, sessionBookingIds, sessions, statusFilter, therapistById])

  const selectedItem = useMemo(() => listItems.find((item) => item.id === selectedItemId) ?? listItems[0] ?? null, [listItems, selectedItemId])
  const selectedSession = selectedItem?.kind === 'session' ? selectedItem.session : null
  const selectedBooking = selectedItem?.kind === 'session' ? selectedItem.booking : selectedItem?.booking ?? null
  const selectedPatient = selectedBooking ? patientById.get(selectedBooking.patient_id) ?? null : null
  const selectedTherapist = selectedBooking?.therapist_profile_id ? therapistById.get(selectedBooking.therapist_profile_id) ?? null : null
  const selectedLocation = selectedBooking?.practice_location_id ? locationById.get(selectedBooking.practice_location_id) ?? null : null
  const selectedResponsibleParty = selectedPatient
    ? responsibleParties.find((party) => party.patient_id === selectedPatient.id && party.is_billing_contact)
      ?? responsibleParties.find((party) => party.patient_id === selectedPatient.id && party.is_primary)
      ?? responsibleParties.find((party) => party.patient_id === selectedPatient.id)
      ?? null
    : null
  const financeFlagByPatientId = useMemo(() => getMonthlyFinanceFlagsByPatient({
    invoices,
    billingMetadata: billingFlagMetadata,
    timeZone: activeTenant?.time_zone,
  }), [activeTenant?.time_zone, billingFlagMetadata, invoices])
  const selectedPatientFinanceFlag = selectedPatient ? financeFlagByPatientId.get(selectedPatient.id) ?? null : null
  const selectedSessionProcedures = useMemo(
    () => selectedSession ? sessionProcedures.filter((procedure) => procedure.session_id === selectedSession.id) : [],
    [selectedSession, sessionProcedures],
  )
  const selectedBookingProcedures = useMemo(
    () => selectedBooking ? bookingProcedures.filter((procedure) => procedure.booking_id === selectedBooking.id) : [],
    [bookingProcedures, selectedBooking],
  )
  const selectedPriceListItems = useMemo(
    () => selectedBooking?.price_list_id
      ? priceListItems.filter((item) => item.price_list_id === selectedBooking.price_list_id && item.is_active)
      : [],
    [priceListItems, selectedBooking?.price_list_id],
  )
  const plannedTotal = useMemo(
    () => selectedBookingProcedures.reduce((total, procedure) => total + procedure.line_total, 0),
    [selectedBookingProcedures],
  )
  const deliveredTotal = useMemo(
    () => selectedSessionProcedures
      .filter((procedure) => procedure.is_billable)
      .reduce((total, procedure) => total + procedure.line_total - procedure.discount_amount + procedure.adjustment_amount, 0),
    [selectedSessionProcedures],
  )
  const hasBillableDeliveredServices = useMemo(
    () => selectedSessionProcedures.some((procedure) => procedure.is_billable),
    [selectedSessionProcedures],
  )
  const selectedSessionNotes = useMemo(
    () => selectedSession ? sessionNotes.filter((note) => note.session_id === selectedSession.id) : [],
    [selectedSession, sessionNotes],
  )
  const processNoteSkipped = useMemo(
    () => selectedSessionNotes.some((note) => (
      note.note_type === 'other'
      && note.visibility === 'internal'
      && note.metadata
      && typeof note.metadata === 'object'
      && !Array.isArray(note.metadata)
      && note.metadata.task_type === 'process_note'
      && note.metadata.disposition === 'skipped'
    )),
    [selectedSessionNotes],
  )
  const selectedInvoice = useMemo(
    () => selectedSession
      ? invoices.find((invoice) => invoice.session_id === selectedSession.id && !invoice.deleted_at && !['cancelled', 'voided'].includes(invoice.invoice_status)) ?? null
      : null,
    [invoices, selectedSession],
  )
  const selectedInitialPatientNote = useMemo(() => {
    if (!selectedSession) return null
    const firstPatientSession = sessions
      .filter((session) => session.patient_id === selectedSession.patient_id && !session.deleted_at)
      .sort((left, right) => (left.scheduled_start_at ?? '').localeCompare(right.scheduled_start_at ?? ''))[0]
    if (firstPatientSession?.id !== selectedSession.id) return null
    return initialPatientNotes.find((note) => note.patient_id === selectedSession.patient_id) ?? null
  }, [initialPatientNotes, selectedSession, sessions])
  const isPostSessionTime = Boolean(
    selectedSession?.scheduled_end_at
    && new Date(selectedSession.scheduled_end_at).getTime() <= Date.now(),
  )
  const canEditDeliveredProcedures = Boolean(
    canManageSession
    && selectedSession
    && !['cancelled', 'no_show'].includes(selectedSession.session_status)
    && (!isTerminalSession(selectedSession.session_status) || (selectedSession.session_status === 'completed' && !selectedInvoice)),
  )
  const hasUnsavedProcedureChanges = useMemo(() => {
    const draftIds = new Set(procedureDrafts.flatMap((draft) => draft.id ? [draft.id] : []))
    if (selectedSessionProcedures.some((procedure) => !draftIds.has(procedure.id))) return true

    return procedureDrafts.some((draft) => {
      if (!draft.id) return true
      const existing = selectedSessionProcedures.find((procedure) => procedure.id === draft.id)
      if (!existing) return true
      const duration = draft.duration_minutes ? Number(draft.duration_minutes) : null
      return existing.procedure_name !== draft.procedure_name.trim()
        || (existing.procedure_code ?? '') !== draft.procedure_code.trim()
        || (existing.description ?? '') !== draft.description.trim()
        || Number(existing.unit_price) !== Number(draft.unit_price)
        || Number(existing.quantity) !== Number(draft.quantity)
        || (existing.duration_minutes ?? null) !== duration
        || existing.is_billable !== draft.is_billable
        || existing.differs_from_booking !== draft.differs_from_booking
        || (existing.change_reason ?? '') !== (draft.differs_from_booking ? draft.change_reason.trim() : '')
    })
  }, [procedureDrafts, selectedSessionProcedures])
  const notesTaskOutstanding = Boolean(
    selectedSession
    && isPostSessionTime
    && !['cancelled', 'no_show'].includes(selectedSession.session_status)
    && !processNoteSkipped
    && !hasSavedProcessNote,
  )
  const financeTaskOutstanding = Boolean(
    selectedSession
    && isPostSessionTime
    && !['cancelled', 'no_show'].includes(selectedSession.session_status)
    && canViewFinance
    && hasBillableDeliveredServices
    && !selectedInvoice?.issued_at,
  )

  useEffect(() => {
    if (!selectedSession || !activeTenant?.id || !supabase || !canViewClinical) {
      setHasSavedProcessNote(false)
      return
    }

    let cancelled = false
    const supabaseClient = supabase
    const tenantId = activeTenant.id
    const sessionId = selectedSession.id
    const loadProcessNoteStatus = async () => {
      const result = await supabaseClient
        .from('clinical_notes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('session_id', sessionId)
        .eq('note_type', 'process_note')
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      if (!cancelled) setHasSavedProcessNote(Boolean(result.data) && !result.error)
    }

    setHasSavedProcessNote(false)
    void loadProcessNoteStatus()
    return () => {
      cancelled = true
    }
  }, [activeTenant?.id, canViewClinical, selectedSession])
  useEffect(() => {
    if (!selectedSession || !onSessionStatusChange) return
    onSessionStatusChange({
      id: selectedSession.id,
      booking_id: selectedSession.booking_id,
      session_status: selectedSession.session_status,
    })
  }, [onSessionStatusChange, selectedSession])
  const canEditSelectedSession = canManageSession && selectedSession ? !isTerminalSession(selectedSession.session_status) : false

  useEffect(() => {
    if (!activeTenant?.id) {
      setLoading(false)
      setLoadError('No active tenant workspace is selected.')
      return
    }
    if (!supabase) {
      setLoading(false)
      setLoadError('Supabase is not configured for this environment.')
      return
    }
    if (!canViewSessions) {
      setLoading(false)
      setLoadError('You do not have access to the session workspace.')
      return
    }

    let isMounted = true
    const tenantId = activeTenant.id
    const supabaseClient = supabase
    const notesEmptyResult = Promise.resolve({ data: [], error: null })
    const pricingEmptyResult = Promise.resolve({ data: [], error: null })

    async function loadSessionsWorkspace() {
      setLoading(true)
      setLoadError('')
      setActionError('')
      setSuccessMessage('')

      const [
        patientsResult,
        responsiblePartiesResult,
        therapistsResult,
        locationsResult,
        bookingsResult,
        bookingProceduresResult,
        sessionsResult,
        proceduresResult,
        historyResult,
        eventsResult,
        notesResult,
        initialPatientNotesResult,
        priceItemsResult,
        invoicesResult,
        billingSettingsResult,
      ] = await Promise.all([
        supabaseClient
          .from('patients')
          .select('id, tenant_id, patient_number, patient_status, patient_type, title, first_name, last_name, preferred_name, date_of_birth, id_number, gender, language, email, phone, referral_source, active_icd10_code, assigned_therapist_profile_id, intake_sent_at, intake_started_at, intake_completed_at, reviewed_at, archived_at, archive_reason, merged_into_patient_id, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('responsible_parties')
          .select('id, tenant_id, patient_id, party_type, relationship_to_patient, full_name, organisation_name, id_number, email, phone, is_primary, is_billing_contact, account_responsibility_status, medical_aid_member_number, medical_aid_dependant_code, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('therapist_profiles')
          .select('id, tenant_id, user_id, display_name, profession, qualifications, bio, default_appointment_duration_minutes, default_billing_rate, practice_number, billing_name, billing_email, billing_phone, is_active, metadata, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('practice_locations')
          .select('id, tenant_id, practice_profile_id, location_name, location_type, address_line_1, address_line_2, suburb, city, province, postal_code, country, contact_email, contact_phone, room_venue_notes, is_main_location, is_active, metadata, created_at, updated_at, deleted_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('bookings')
          .select('id, tenant_id, patient_id, therapist_profile_id, practice_location_id, price_list_id, recurrence_rule_id, booking_status, booking_type, booking_source, appointment_mode, start_at, end_at, duration_minutes, timezone, room_label, patient_facing_title, patient_facing_notes, cancellation_reason, cancelled_at, no_show_at, checked_in_at, in_progress_at, completed_at, rescheduled_from_booking_id, session_ready, draft_invoice_ready, patient_link_visible, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('start_at', { ascending: true }),
        supabaseClient
          .from('booking_procedures')
          .select('*')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('sessions')
          .select('id, tenant_id, booking_id, patient_id, therapist_profile_id, practice_location_id, session_status, attendance_outcome, session_type, session_modality, session_outcome, scheduled_start_at, scheduled_end_at, actual_start_at, actual_end_at, actual_duration_minutes, timezone, room_label, operational_summary, completed_at, completed_by_profile_id, cancelled_at, cancelled_by_profile_id, cancellation_reason, no_show_at, reopened_at, reopened_by_profile_id, reopen_reason, draft_invoice_requested_at, draft_invoice_request_status, patient_history_ready, patient_link_update_ready, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('scheduled_start_at', { ascending: true }),
        supabaseClient
          .from('session_procedures')
          .select('id, tenant_id, session_id, booking_procedure_id, price_list_id, price_list_item_id, procedure_name, procedure_code, description, unit_price, quantity, discount_amount, adjustment_amount, line_total, duration_minutes, currency_code, is_billable, differs_from_booking, change_reason, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('session_status_history')
          .select('id, tenant_id, session_id, booking_id, patient_id, from_status, to_status, event_type, event_reason, actual_start_at, actual_end_at, is_patient_visible, metadata, created_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('session_workflow_events')
          .select('id, tenant_id, session_id, booking_id, patient_id, event_type, idempotency_key, event_status, payload, processed_at, failed_at, error_message, created_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        canReadInternalNotes
          ? supabaseClient
              .from('session_notes')
              .select('id, tenant_id, session_id, note_type, visibility, title, body, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
          : notesEmptyResult,
        canReadInternalNotes
          ? supabaseClient
              .from('patient_history_events')
              .select('id, tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id, is_patient_visible, patient_visible_title, patient_visible_body, occurred_at, created_by_profile_id, metadata, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .eq('event_type', 'internal_patient_note')
              .is('deleted_at', null)
              .order('occurred_at', { ascending: false })
          : notesEmptyResult,
        canReadPricing
          ? supabaseClient
              .from('price_list_items')
              .select('id, tenant_id, price_list_id, procedure_name, procedure_code, description, price, duration_minutes, is_active, metadata, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .eq('is_active', true)
              .order('procedure_name', { ascending: true })
          : pricingEmptyResult,
        canViewFinance
          ? supabaseClient
              .from('invoices')
              .select('*')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : Promise.resolve({ data: [], error: null }),
        canViewFinance
          ? supabaseClient
              .from('billing_settings')
              .select('metadata')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (!isMounted) return

      const firstError = patientsResult.error || responsiblePartiesResult.error || therapistsResult.error || locationsResult.error || bookingsResult.error || bookingProceduresResult.error || sessionsResult.error || proceduresResult.error || historyResult.error || eventsResult.error || notesResult.error || initialPatientNotesResult.error || priceItemsResult.error || invoicesResult.error || billingSettingsResult.error
      if (firstError) {
        setLoadError(firstError.message)
        setLoading(false)
        return
      }

      setPatients((patientsResult.data ?? []) as PatientRow[])
      setResponsibleParties((responsiblePartiesResult.data ?? []) as ResponsiblePartyRow[])
      setTherapists((therapistsResult.data ?? []) as TherapistRow[])
      setLocations((locationsResult.data ?? []) as LocationRow[])
      setBookings((bookingsResult.data ?? []) as BookingRow[])
      setBookingProcedures((bookingProceduresResult.data ?? []) as BookingProcedureRow[])
      setSessions((sessionsResult.data ?? []) as SessionRow[])
      setSessionProcedures((proceduresResult.data ?? []) as SessionProcedureRow[])
      setSessionHistory((historyResult.data ?? []) as SessionStatusHistoryRow[])
      setSessionEvents((eventsResult.data ?? []) as SessionWorkflowEventRow[])
      setSessionNotes((notesResult.data ?? []) as SessionNoteRow[])
      setInitialPatientNotes((initialPatientNotesResult.data ?? []) as PatientHistoryEventRow[])
      setPriceListItems((priceItemsResult.data ?? []) as PriceListItemRow[])
      setInvoices((invoicesResult.data ?? []) as InvoiceRow[])
      setBillingFlagMetadata((billingSettingsResult.data as { metadata: Json } | null)?.metadata ?? null)
      setLoading(false)
    }

    loadSessionsWorkspace()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, canReadInternalNotes, canReadPricing, canViewFinance, canViewSessions])

  useEffect(() => {
    const requestedSessionId = searchParams.get('session')
    const requestedBookingId = embeddedBookingId ?? searchParams.get('booking')
    const requestedItem = requestedSessionId
      ? listItems.find((item) => item.kind === 'session' && item.session.id === requestedSessionId)
      : requestedBookingId
        ? listItems.find((item) => item.kind === 'session' && item.session.booking_id === requestedBookingId)
          ?? listItems.find((item) => item.kind === 'eligible_booking' && item.booking.id === requestedBookingId)
        : null

    if (requestedItem && selectedItemId !== requestedItem.id) {
      setSelectedItemId(requestedItem.id)
      return
    }

    if (!selectedItemId && listItems[0]) setSelectedItemId(listItems[0].id)
    if (selectedItemId && listItems.length && !listItems.some((item) => item.id === selectedItemId)) setSelectedItemId(listItems[0].id)
    if ((requestedSessionId || requestedBookingId) && listItems.length && !requestedItem) {
      setActionError('The requested booking or session is not available in this workspace. It may be completed, archived, or restricted for your role.')
      if (!embeddedBookingId) setSearchParams({}, { replace: true })
    }
  }, [embeddedBookingId, listItems, searchParams, selectedItemId, setSearchParams])

  useEffect(() => {
    setSelectedSection('notes')
    setCompletionIntent(null)
    setIsEditingSessionDetails(false)
    setActiveNoteComposer(null)
    setClinicalNoteBody('')
    setClinicalNote(null)
    setClinicalNoteVersion(null)
    setIsEditingNoteComposer(true)
  }, [selectedItemId])

  useEffect(() => {
    if (!selectedSession || !selectedBooking) return
    const startValue = selectedBooking.start_at ?? selectedSession.scheduled_start_at
    const endValue = selectedBooking.end_at ?? selectedSession.scheduled_end_at
    const scheduledStart = startValue ? new Date(startValue) : null
    const scheduledEnd = endValue ? new Date(endValue) : null
    const calculatedDuration = scheduledStart && scheduledEnd
      ? Math.max(15, Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / 60_000))
      : 60
    setSessionDetailsForm({
      therapist_profile_id: selectedSession.therapist_profile_id ?? selectedBooking.therapist_profile_id ?? '',
      practice_location_id: selectedSession.practice_location_id ?? selectedBooking.practice_location_id ?? '',
      scheduled_start_at: toDateTimeLocal(startValue),
      duration_minutes: String(selectedBooking.duration_minutes ?? calculatedDuration),
      session_type: selectedSession.session_type || selectedBooking.booking_type,
      session_modality: selectedSession.session_modality || selectedBooking.appointment_mode,
    })
  }, [selectedBooking, selectedSession])

  useEffect(() => {
    if (!selectedSession) {
      setProcedureDrafts([])
      setCompletionForm({
        actual_start_at: '',
        actual_end_at: '',
        attendance_outcome: 'attended',
        session_outcome: 'completed_as_planned',
        operational_summary: '',
      })
      setNoteBody('')
      setNoteId(null)
      return
    }

    setProcedureDrafts(selectedSessionProcedures.map(getProcedureDraft))
    setCompletionForm({
      actual_start_at: toDateTimeLocal(selectedSession.actual_start_at) || toDateTimeLocal(selectedSession.scheduled_start_at),
      actual_end_at: toDateTimeLocal(selectedSession.actual_end_at) || toDateTimeLocal(selectedSession.scheduled_end_at),
      attendance_outcome: selectedSession.attendance_outcome === 'not_recorded' ? 'attended' : selectedSession.attendance_outcome,
      session_outcome: selectedSession.session_outcome ?? 'completed_as_planned',
      operational_summary: selectedSession.operational_summary ?? '',
    })
    const operationalNote = selectedSessionNotes.find((note) => note.note_type === 'operational' && note.visibility === 'internal') ?? null
    setNoteId(operationalNote?.id ?? null)
    setNoteBody(operationalNote?.body ?? '')
  }, [selectedSession, selectedSessionProcedures, selectedSessionNotes])

  const refreshSessionRecords = async (sessionId?: string) => {
    if (!activeTenant?.id || !supabase) return
    const tenantId = activeTenant.id
    const [
      bookingsResult,
      sessionsResult,
      proceduresResult,
      historyResult,
      eventsResult,
      notesResult,
      invoicesResult,
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, tenant_id, patient_id, therapist_profile_id, practice_location_id, price_list_id, recurrence_rule_id, booking_status, booking_type, booking_source, appointment_mode, start_at, end_at, duration_minutes, timezone, room_label, patient_facing_title, patient_facing_notes, cancellation_reason, cancelled_at, no_show_at, checked_in_at, in_progress_at, completed_at, rescheduled_from_booking_id, session_ready, draft_invoice_ready, patient_link_visible, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      supabase
        .from('sessions')
        .select('id, tenant_id, booking_id, patient_id, therapist_profile_id, practice_location_id, session_status, attendance_outcome, session_type, session_modality, session_outcome, scheduled_start_at, scheduled_end_at, actual_start_at, actual_end_at, actual_duration_minutes, timezone, room_label, operational_summary, completed_at, completed_by_profile_id, cancelled_at, cancelled_by_profile_id, cancellation_reason, no_show_at, reopened_at, reopened_by_profile_id, reopen_reason, draft_invoice_requested_at, draft_invoice_request_status, patient_history_ready, patient_link_update_ready, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      supabase
        .from('session_procedures')
        .select('id, tenant_id, session_id, booking_procedure_id, price_list_id, price_list_item_id, procedure_name, procedure_code, description, unit_price, quantity, discount_amount, adjustment_amount, line_total, duration_minutes, currency_code, is_billable, differs_from_booking, change_reason, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      supabase
        .from('session_status_history')
        .select('id, tenant_id, session_id, booking_id, patient_id, from_status, to_status, event_type, event_reason, actual_start_at, actual_end_at, is_patient_visible, metadata, created_by_profile_id, deleted_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('session_workflow_events')
        .select('id, tenant_id, session_id, booking_id, patient_id, event_type, idempotency_key, event_status, payload, processed_at, failed_at, error_message, created_by_profile_id, deleted_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      canReadInternalNotes
        ? supabase
            .from('session_notes')
            .select('id, tenant_id, session_id, note_type, visibility, title, body, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      canViewFinance
        ? supabase
            .from('invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
        : Promise.resolve({ data: [], error: null }),
    ])

    const firstError = bookingsResult.error || sessionsResult.error || proceduresResult.error || historyResult.error || eventsResult.error || notesResult.error || invoicesResult.error
    if (firstError) throw new Error(firstError.message)

    setBookings((bookingsResult.data ?? []) as BookingRow[])
    const nextSessions = (sessionsResult.data ?? []) as SessionRow[]
    setSessions(nextSessions)
    setSessionProcedures((proceduresResult.data ?? []) as SessionProcedureRow[])
    setSessionHistory((historyResult.data ?? []) as SessionStatusHistoryRow[])
    setSessionEvents((eventsResult.data ?? []) as SessionWorkflowEventRow[])
    setSessionNotes((notesResult.data ?? []) as SessionNoteRow[])
    setInvoices((invoicesResult.data ?? []) as InvoiceRow[])
    if (sessionId) setSelectedItemId(sessionId)
  }

  const createPatientHistory = async (session: SessionRow, eventType: string, sourceId: string, bodyOverride?: string) => {
    if (!activeTenant?.id || !supabase) return
    const patient = patientById.get(session.patient_id)
    const copy = getPatientHistoryCopy(eventType, formatPatientName(patient))
    const existingResult = await supabase
      .from('patient_history_events')
      .select('id')
      .eq('tenant_id', activeTenant.id)
      .eq('patient_id', session.patient_id)
      .eq('event_type', eventType)
      .eq('source_table', 'sessions')
      .eq('source_id', sourceId)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingResult.data) return
    if (existingResult.error) throw new Error('Patient history could not be checked before recording the session event.')

    const payload: PatientHistoryEventInsert = {
      tenant_id: activeTenant.id,
      patient_id: session.patient_id,
      event_type: eventType,
      event_title: copy.title,
      event_body: bodyOverride ?? copy.body,
      source_table: 'sessions',
      source_id: sourceId,
      is_patient_visible: eventType === 'session_completed',
      patient_visible_title: eventType === 'session_completed' ? copy.title : null,
      patient_visible_body: eventType === 'session_completed' ? bodyOverride ?? copy.body : null,
      created_by_profile_id: profile?.id ?? null,
      metadata: {
        session_id: session.id,
        booking_id: session.booking_id,
      },
    }
    const insertResult = await supabase.from('patient_history_events').insert(payload)
    if (insertResult.error) throw new Error('Patient history could not be recorded for this session event.')
  }

  const createWorkflowEvent = async (session: SessionRow, eventType: string, detail: string, payload: Json = {}) => {
    if (!activeTenant?.id || !supabase) return
    const result = await supabase
      .from('session_workflow_events')
      .insert({
        tenant_id: activeTenant.id,
        session_id: session.id,
        booking_id: session.booking_id,
        patient_id: session.patient_id,
        event_type: eventType,
        idempotency_key: getWorkflowKey(session.id, eventType, detail),
        event_status: 'pending',
        payload,
        created_by_profile_id: profile?.id ?? null,
      } satisfies SessionWorkflowEventInsert)

    if (result.error && result.error.code !== '23505') throw new Error('Session workflow event could not be recorded.')
  }

  const createStatusHistory = async (session: SessionRow, toStatus: string, eventType: string, reason: string, actualStartAt?: string | null, actualEndAt?: string | null, patientVisible = false) => {
    if (!activeTenant?.id || !supabase) return
    const payload: SessionStatusHistoryInsert = {
      tenant_id: activeTenant.id,
      session_id: session.id,
      booking_id: session.booking_id,
      patient_id: session.patient_id,
      from_status: session.session_status,
      to_status: toStatus,
      event_type: eventType,
      event_reason: reason,
      actual_start_at: actualStartAt ?? session.actual_start_at,
      actual_end_at: actualEndAt ?? session.actual_end_at,
      is_patient_visible: patientVisible,
      created_by_profile_id: profile?.id ?? null,
    }
    const result = await supabase.from('session_status_history').insert(payload)
    if (result.error) throw new Error('Session status history could not be recorded.')
  }

  const createSessionFromBooking = async (booking: BookingRow) => {
    if (!supabase || !canManageSession || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const validationError = validateEligibleBooking(booking)
      if (validationError) throw new Error(validationError)

      const result = await supabase.rpc('create_session_from_booking', { target_booking_id: booking.id })
      if (result.error) throw new Error(result.error.message)
      const rpcRow = result.data?.[0]
      if (!rpcRow?.session_id) throw new Error('The session could not be created from this booking.')

      await refreshSessionRecords(rpcRow.session_id)
      if (!embeddedBookingId) setSearchParams({ session: rpcRow.session_id }, { replace: true })
      setSuccessMessage(rpcRow.created_session ? 'Session created from booking.' : 'Existing session opened for this booking.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session creation failed.'))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!embeddedBookingId || selectedItem?.kind !== 'eligible_booking' || !canManageSession || saving) return
    if (autoCreatedBookingIds.current.has(selectedItem.booking.id)) return
    autoCreatedBookingIds.current.add(selectedItem.booking.id)
    void createSessionFromBooking(selectedItem.booking)
  }, [canManageSession, embeddedBookingId, saving, selectedItem])

  const validateEligibleBooking = (booking: BookingRow) => {
    const patient = patientById.get(booking.patient_id)
    const therapist = booking.therapist_profile_id ? therapistById.get(booking.therapist_profile_id) : null
    const location = booking.practice_location_id ? locationById.get(booking.practice_location_id) : null
    if (booking.tenant_id !== activeTenant?.id) return 'Booking does not belong to the active tenant.'
    if (!patient) return 'Booking requires a patient before session creation.'
    if (patient.patient_status === 'archived') return 'Archived patients cannot start sessions.'
    if (!therapist) return 'Booking requires a therapist before session creation.'
    if (!therapist.is_active) return 'Inactive therapists cannot start sessions.'
    if (location && !location.is_active) return 'Inactive locations cannot start sessions.'
    if (!activeBookingStatuses.includes(booking.booking_status)) return 'This booking status is not eligible for session creation.'
    if (sessionBookingIds.has(booking.id)) return 'This booking already has a session.'
    return ''
  }


  const saveProcedures = async () => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canEditDeliveredProcedures || saving) return
    const supabaseClient = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (procedureDrafts.length === 0) throw new Error('At least one delivered procedure is required.')
      const duplicateKey = new Set<string>()
      for (const draft of procedureDrafts) {
        const validationError = validateProcedureDraft(draft)
        if (validationError) throw new Error(validationError)
        const key = (draft.price_list_item_id || draft.procedure_code || draft.procedure_name).trim().toLowerCase()
        if (key && duplicateKey.has(key)) throw new Error('This procedure has already been added.')
        if (key) duplicateKey.add(key)
      }

      const draftIds = new Set(procedureDrafts.map((draft) => draft.id).filter(Boolean))
      const removedProcedures = selectedSessionProcedures.filter((procedure) => !draftIds.has(procedure.id))
      const hasProcedureChanges = removedProcedures.length > 0 || procedureDrafts.some((draft) => {
        if (!draft.id) return true
        const existing = selectedSessionProcedures.find((procedure) => procedure.id === draft.id)
        if (!existing) return true
        const duration = draft.duration_minutes ? Number(draft.duration_minutes) : null
        return existing.procedure_name !== draft.procedure_name.trim()
          || (existing.procedure_code ?? '') !== draft.procedure_code.trim()
          || (existing.description ?? '') !== draft.description.trim()
          || Number(existing.unit_price) !== Number(draft.unit_price)
          || Number(existing.quantity) !== Number(draft.quantity)
          || (existing.duration_minutes ?? null) !== duration
          || existing.is_billable !== draft.is_billable
          || existing.differs_from_booking !== draft.differs_from_booking
          || (existing.change_reason ?? '') !== (draft.differs_from_booking ? draft.change_reason.trim() : '')
      })
      if (!hasProcedureChanges) {
        setSuccessMessage('No delivered procedure changes to save.')
        return
      }
      await Promise.all(removedProcedures.map((procedure) => (
        supabaseClient
          .from('session_procedures')
          .update({ deleted_at: new Date().toISOString(), updated_by_profile_id: profile?.id ?? null })
          .eq('id', procedure.id)
          .eq('tenant_id', activeTenant.id)
      )))

      for (const draft of procedureDrafts) {
        const quantity = Number(draft.quantity)
        const unitPrice = Number(draft.unit_price)
        const duration = draft.duration_minutes ? Number(draft.duration_minutes) : null
        const payload: SessionProcedureInsert | SessionProcedureUpdate = {
          tenant_id: activeTenant.id,
          session_id: selectedSession.id,
          price_list_item_id: draft.price_list_item_id ?? null,
          procedure_name: draft.procedure_name.trim(),
          procedure_code: draft.procedure_code.trim() || null,
          description: draft.description.trim() || null,
          unit_price: unitPrice,
          quantity,
          line_total: unitPrice * quantity,
          duration_minutes: duration,
          currency_code: 'ZAR',
          is_billable: draft.is_billable,
          differs_from_booking: draft.differs_from_booking,
          change_reason: draft.differs_from_booking ? draft.change_reason.trim() : null,
          metadata: metadataWithIcd10Code(
            selectedSessionProcedures.find((procedure) => procedure.id === draft.id)?.metadata ?? {},
            draft.icd10_code,
          ),
          updated_by_profile_id: profile?.id ?? null,
        }

        const result = draft.id
          ? await supabaseClient.from('session_procedures').update(payload).eq('id', draft.id).eq('tenant_id', activeTenant.id)
          : await supabaseClient.from('session_procedures').insert({ ...payload, created_by_profile_id: profile?.id ?? null } as SessionProcedureInsert)

        if (result.error) throw new Error(result.error.message)
      }

      await createStatusHistory(selectedSession, selectedSession.session_status, 'session_procedures_changed', 'Delivered procedures updated')
      await createWorkflowEvent(selectedSession, 'session_procedures_changed', `${Date.now()}`)
      await createPatientHistory(selectedSession, 'session_procedures_changed', selectedSession.id)
      await refreshSessionRecords(selectedSession.id)
      setSuccessMessage('Delivered procedures saved. Draft invoice data will use these final delivered procedure snapshots.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Delivered procedures could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const confirmSessionInvoice = async () => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canConfirmSessionInvoice || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (!isPostSessionTime) throw new Error('The invoice can be confirmed after the scheduled session time has ended.')
      if (['cancelled', 'no_show'].includes(selectedSession.session_status)) throw new Error('Cancelled or no-show sessions cannot use the treatment invoice workflow.')
      if (!hasBillableDeliveredServices) throw new Error('Save at least one billable delivered service before confirming the invoice.')
      if (hasUnsavedProcedureChanges) throw new Error('Save delivered service changes before confirming the invoice.')

      const supabaseClient = supabase
      const tenantId = activeTenant.id
      const loadInvoice = async (invoiceId: string) => {
        const result = await supabaseClient
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .eq('tenant_id', tenantId)
          .single()
        if (result.error) throw new Error(result.error.message)
        return result.data as InvoiceRow
      }

      let completedDuringConfirmation = false
      if (selectedSession.session_status !== 'completed') {
        const validationError = validateCompletion()
        if (validationError) throw new Error(validationError)

        const completionResult = await supabaseClient.rpc('complete_session', {
          target_session_id: selectedSession.id,
          actual_start_at_input: fromDateTimeLocal(completionForm.actual_start_at),
          actual_end_at_input: fromDateTimeLocal(completionForm.actual_end_at),
          attendance_outcome_input: completionForm.attendance_outcome,
          session_outcome_input: completionForm.session_outcome,
          operational_summary_input: completionForm.operational_summary.trim() || undefined,
        })
        if (completionResult.error) throw new Error(completionResult.error.message)
        const completionRow = completionResult.data?.[0]
        if (completionRow?.session_status !== 'completed') throw new Error('The session could not be completed before invoice confirmation.')

        completedDuringConfirmation = Boolean(completionRow.completed_session)
        onSessionStatusChange?.({ id: selectedSession.id, booking_id: selectedSession.booking_id, session_status: 'completed' })
      }

      let invoice = selectedInvoice
      if (!invoice) {
        const draftResult = await supabaseClient.rpc('create_draft_invoice_from_session', {
          target_session_id: selectedSession.id,
        })
        if (draftResult.error) throw new Error(draftResult.error.message)
        const draftRow = draftResult.data?.[0]
        if (!draftRow?.invoice_id) throw new Error('The invoice could not be created from the delivered services.')
        invoice = await loadInvoice(draftRow.invoice_id)
      }

      if (invoice.invoice_status === 'review_required') {
        throw new Error('This invoice requires review in Finance before it can be confirmed.')
      }

      if (['draft', 'ready_to_confirm'].includes(invoice.invoice_status)) {
        const confirmResult = await supabaseClient.rpc('confirm_invoice', { target_invoice_id: invoice.id })
        if (confirmResult.error) throw new Error(confirmResult.error.message)
        const confirmedInvoice = await loadInvoice(invoice.id)
        invoice = confirmedInvoice
        setInvoices((current) => [confirmedInvoice, ...current.filter((item) => item.id !== confirmedInvoice.id)])
        onInvoiceChange?.(confirmedInvoice)
      }

      if (invoice.invoice_status !== 'confirmed' && !invoice.confirmed_at) throw new Error('The invoice was not confirmed. Open Finance to review its current status.')

      setInvoices((current) => [invoice, ...current.filter((item) => item.id !== invoice.id)])
      onInvoiceChange?.(invoice)
      await refreshSessionRecords(selectedSession.id)
      setCompletionIntent(null)
      setSuccessMessage(`${completedDuringConfirmation ? 'Session completed. ' : ''}Invoice confirmed. Review and issue it when ready.`)
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'The invoice could not be confirmed.'))
    } finally {
      setSaving(false)
    }
  }

  const issueSessionInvoice = async () => {
    if (!selectedSession || !selectedInvoice || !supabase || !activeTenant?.id || !canConfirmSessionInvoice || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (selectedInvoice.invoice_status !== 'confirmed') throw new Error('Only a confirmed invoice can be issued.')
      const issueResult = await supabase.rpc('issue_invoice', { target_invoice_id: selectedInvoice.id })
      if (issueResult.error) throw new Error(issueResult.error.message)

      const invoiceResult = await supabase
        .from('invoices')
        .select('*')
        .eq('id', selectedInvoice.id)
        .eq('tenant_id', activeTenant.id)
        .single()
      if (invoiceResult.error) throw new Error(invoiceResult.error.message)
      const issuedInvoice = invoiceResult.data as InvoiceRow
      if (!issuedInvoice.issued_at) throw new Error('The invoice was not issued. Open Finance to review its current status.')

      setInvoices((current) => [issuedInvoice, ...current.filter((item) => item.id !== issuedInvoice.id)])
      onInvoiceChange?.(issuedInvoice)
      await refreshSessionRecords(selectedSession.id)
      setSuccessMessage('Invoice issued. It is available in Finance, the Patient File history and Patient Link. Email delivery is not yet connected.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'The invoice could not be issued.'))
    } finally {
      setSaving(false)
    }
  }

  const validateProcedureDraft = (draft: ProcedureDraft) => {
    const quantity = Number(draft.quantity)
    const unitPrice = Number(draft.unit_price)
    const duration = draft.duration_minutes ? Number(draft.duration_minutes) : null
    if (!draft.procedure_name.trim()) return 'Procedure name is required.'
    if (!Number.isFinite(quantity) || quantity <= 0) return 'Procedure quantity must be positive.'
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return 'Procedure price cannot be negative.'
    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) return 'Procedure duration must be positive if supplied.'
    if (draft.differs_from_booking && !draft.change_reason.trim()) return 'Procedure changes require a change reason.'
    return ''
  }

  const addProcedure = (priceItem: PriceListItemRow) => {
    setProcedureDrafts((current) => {
      if (current.some((draft) => draft.price_list_item_id === priceItem.id)) return current
      return [...current, getEmptyProcedureDraft(priceItem)]
    })
  }

  const removeProcedureDraft = (index: number) => {
    setProcedureDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))
  }

  const saveSessionDetails = async () => {
    if (!selectedSession || !selectedBooking || !activeTenant?.id || !supabase || !canEditSelectedSession || saving) return

    const therapist = therapistById.get(sessionDetailsForm.therapist_profile_id)
    const location = locationById.get(sessionDetailsForm.practice_location_id)
    const start = sessionDetailsForm.scheduled_start_at ? new Date(sessionDetailsForm.scheduled_start_at) : null
    const duration = Number(sessionDetailsForm.duration_minutes)

    if (!therapist?.is_active) {
      setActionError('Select an active therapist.')
      return
    }
    if (!location?.is_active) {
      setActionError('Select an active location.')
      return
    }
    if (!start || Number.isNaN(start.getTime())) {
      setActionError('Select a valid scheduled start time.')
      return
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setActionError('Duration must be a positive number of minutes.')
      return
    }

    const end = new Date(start.getTime() + duration * 60_000)
    const conflict = bookings.find((booking) => {
      if (booking.id === selectedBooking.id || booking.therapist_profile_id !== therapist.id) return false
      if (!activeBookingStatuses.includes(booking.booking_status) || !booking.start_at || !booking.end_at) return false
      return new Date(booking.start_at) < end && new Date(booking.end_at) > start
    })
    if (conflict) {
      setActionError(`${therapist.display_name} already has another appointment during this time.`)
      return
    }

    setSaving(true)
    setActionError('')
    setSuccessMessage('')

    const bookingPatch: BookingUpdate = {
      therapist_profile_id: therapist.id,
      practice_location_id: location.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      duration_minutes: duration,
      booking_type: sessionDetailsForm.session_type,
      appointment_mode: sessionDetailsForm.session_modality,
      timezone: activeTenant.time_zone ?? selectedBooking.timezone,
      room_label: location.room_venue_notes,
      updated_by_profile_id: profile?.id ?? null,
    }
    const sessionPatch: SessionUpdate = {
      therapist_profile_id: therapist.id,
      practice_location_id: location.id,
      scheduled_start_at: start.toISOString(),
      scheduled_end_at: end.toISOString(),
      session_type: sessionDetailsForm.session_type,
      session_modality: sessionDetailsForm.session_modality,
      timezone: activeTenant.time_zone ?? selectedSession.timezone,
      room_label: location.room_venue_notes,
      updated_by_profile_id: profile?.id ?? null,
    }

    try {
      const bookingResult = await supabase
        .from('bookings')
        .update(bookingPatch)
        .eq('id', selectedBooking.id)
        .eq('tenant_id', activeTenant.id)
        .select()
        .single()
      if (bookingResult.error) throw new Error(bookingResult.error.message)

      const sessionResult = await supabase
        .from('sessions')
        .update(sessionPatch)
        .eq('id', selectedSession.id)
        .eq('tenant_id', activeTenant.id)
        .select()
        .single()

      if (sessionResult.error) {
        await supabase
          .from('bookings')
          .update({
            therapist_profile_id: selectedBooking.therapist_profile_id,
            practice_location_id: selectedBooking.practice_location_id,
            start_at: selectedBooking.start_at,
            end_at: selectedBooking.end_at,
            duration_minutes: selectedBooking.duration_minutes,
            booking_type: selectedBooking.booking_type,
            appointment_mode: selectedBooking.appointment_mode,
            timezone: selectedBooking.timezone,
            room_label: selectedBooking.room_label,
            updated_by_profile_id: profile?.id ?? null,
          })
          .eq('id', selectedBooking.id)
          .eq('tenant_id', activeTenant.id)
        throw new Error(sessionResult.error.message)
      }

      const savedBooking = bookingResult.data as BookingRow
      onBookingChange?.(savedBooking)
      await refreshSessionRecords(selectedSession.id)
      setIsEditingSessionDetails(false)
      setSuccessMessage('Session details saved.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session details could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const completeSession = async () => {
    if (!selectedSession || !supabase || !canCompleteSession || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const validationError = validateCompletion()
      if (validationError) throw new Error(validationError)

      const result = await supabase.rpc('complete_session', {
        target_session_id: selectedSession.id,
        actual_start_at_input: fromDateTimeLocal(completionForm.actual_start_at),
        actual_end_at_input: fromDateTimeLocal(completionForm.actual_end_at),
        attendance_outcome_input: completionForm.attendance_outcome,
        session_outcome_input: completionForm.session_outcome,
        operational_summary_input: completionForm.operational_summary.trim() || undefined,
      })

      if (result.error) throw new Error(result.error.message)
      const rpcRow = result.data?.[0]
      if (rpcRow?.completed_session) {
        const eventResult = await supabase
          .from('session_workflow_events')
          .select('id')
          .eq('session_id', selectedSession.id)
          .eq('event_type', 'draft_invoice_requested')
          .is('deleted_at', null)
          .maybeSingle()
        if (eventResult.error || !eventResult.data) throw new Error('Session completed, but draft invoice readiness could not be verified. Please refresh before continuing.')
      }
      await refreshSessionRecords(selectedSession.id)
      setIsEditingSessionDetails(false)
      setCompletionIntent(null)
      setSuccessMessage(rpcRow?.completed_session ? 'Session completed. Draft invoice request recorded.' : 'Session was already completed.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session completion failed.'))
    } finally {
      setSaving(false)
    }
  }

  const applyTerminalOutcome = async (outcome: 'cancelled' | 'no_show') => {
    if (!selectedSession || !supabase || !canCompleteSession || saving) return

    const cancellationReason = outcome === 'cancelled'
      ? window.prompt('Why is this session being cancelled?')?.trim()
      : null

    if (outcome === 'cancelled' && !cancellationReason) return

    const confirmed = window.confirm(
      outcome === 'cancelled'
        ? 'Cancel this session and remove it from the Calendar? The history will be preserved.'
        : 'Mark this session as No Show? No treatment or no-show fee will be charged.',
    )
    if (!confirmed) return

    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = outcome === 'cancelled'
        ? await supabase.rpc('cancel_session', {
            target_session_id: selectedSession.id,
            cancellation_reason_input: cancellationReason ?? '',
          })
        : await supabase.rpc('record_session_no_show', {
            target_session_id: selectedSession.id,
          })

      if (result.error) throw new Error(result.error.message)

      const bookingResult = await supabase
        .from('bookings')
        .select('id, tenant_id, patient_id, therapist_profile_id, practice_location_id, price_list_id, recurrence_rule_id, booking_status, booking_type, booking_source, appointment_mode, start_at, end_at, duration_minutes, timezone, room_label, patient_facing_title, patient_facing_notes, cancellation_reason, cancelled_at, no_show_at, checked_in_at, in_progress_at, completed_at, rescheduled_from_booking_id, session_ready, draft_invoice_ready, patient_link_visible, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
        .eq('id', selectedSession.booking_id)
        .single()

      if (bookingResult.error) throw new Error(bookingResult.error.message)
      onBookingChange?.(bookingResult.data as BookingRow)
      await refreshSessionRecords(selectedSession.id)
      setSuccessMessage(
        outcome === 'cancelled'
          ? 'Session cancelled. Its history has been preserved.'
          : 'No Show recorded. No treatment charge was created.',
      )
    } catch (error) {
      setActionError(getFriendlySessionError(error, outcome === 'cancelled' ? 'Session cancellation failed.' : 'No Show could not be recorded.'))
    } finally {
      setSaving(false)
    }
  }

  const validateCompletion = () => {
    const start = completionForm.actual_start_at ? new Date(completionForm.actual_start_at) : null
    const end = completionForm.actual_end_at ? new Date(completionForm.actual_end_at) : null
    if (!selectedSession) return 'Select a session first.'
    if (selectedSession.session_status === 'cancelled' || selectedSession.session_status === 'no_show') return 'Cancelled or no-show sessions cannot be completed.'
    if (selectedSession.session_status === 'completed') return 'This session is already completed.'
    if (!start || Number.isNaN(start.getTime())) return 'Actual start time is required.'
    if (!end || Number.isNaN(end.getTime())) return 'Actual end time is required.'
    if (end <= start) return 'Actual end must be after actual start.'
    if (!attendanceOutcomes.includes(completionForm.attendance_outcome)) return 'Attendance outcome is required.'
    if (!sessionOutcomes.includes(completionForm.session_outcome)) return 'Session outcome is required.'
    if (selectedSessionProcedures.filter((procedure) => procedure.is_billable).length === 0) return 'At least one billable delivered procedure is required before completion.'
    return ''
  }

  const reopenSession = async () => {
    if (!selectedSession || !supabase || !canCompleteSession || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (selectedSession.session_status !== 'completed') throw new Error('Only completed sessions can be reopened.')
      if (!reopenReason.trim()) throw new Error('Reopen reason is required.')
      const confirmed = window.confirm('Reopen this completed session? Future finance reconciliation may be required.')
      if (!confirmed) return

      const result = await supabase.rpc('reopen_completed_session', {
        target_session_id: selectedSession.id,
        reopen_reason_input: reopenReason.trim(),
      })

      if (result.error) throw new Error(result.error.message)
      await refreshSessionRecords(selectedSession.id)
      setReopenReason('')
      setSuccessMessage('Session reopened for correction.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session could not be reopened.'))
    } finally {
      setSaving(false)
    }
  }

  const saveOperationalNote = async () => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canReadInternalNotes || !canManageSession || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (noteId && !noteBody.trim()) {
        const archivePayload: SessionNoteUpdate = {
          deleted_at: new Date().toISOString(),
          updated_by_profile_id: profile?.id ?? null,
        }
        const archiveResult = await supabase.from('session_notes').update(archivePayload).eq('id', noteId).eq('tenant_id', activeTenant.id)
        if (archiveResult.error) throw new Error(archiveResult.error.message)
      } else if (noteId) {
        const updatePayload: SessionNoteUpdate = {
          body: noteBody.trim(),
          updated_by_profile_id: profile?.id ?? null,
        }
        const updateResult = await supabase.from('session_notes').update(updatePayload).eq('id', noteId).eq('tenant_id', activeTenant.id)
        if (updateResult.error) throw new Error(updateResult.error.message)
      } else if (noteBody.trim()) {
        const insertPayload: SessionNoteInsert = {
          tenant_id: activeTenant.id,
          session_id: selectedSession.id,
          note_type: 'operational',
          visibility: 'internal',
          body: noteBody.trim(),
          created_by_profile_id: profile?.id ?? null,
          updated_by_profile_id: profile?.id ?? null,
        }
        const insertResult = await supabase.from('session_notes').insert(insertPayload)
        if (insertResult.error) throw new Error(insertResult.error.message)
      }
      await refreshSessionRecords(selectedSession.id)
      setIsEditingNoteComposer(false)
      setSuccessMessage('Session planning saved.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Operational note could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const openNoteComposer = async (kind: NoteComposerKind) => {
    if (kind === 'planning') {
      if (activeNoteComposer === kind) {
        setActiveNoteComposer(null)
      } else {
        setActiveNoteComposer(kind)
        setIsEditingNoteComposer(!noteId)
      }
      return
    }
    if (!selectedSession || !activeTenant?.id || !supabase || !canViewClinical) return
    if (activeNoteComposer === kind) {
      setActiveNoteComposer(null)
      return
    }

    setActiveNoteComposer(kind)
    setLoadingClinicalNote(true)
    setClinicalNoteBody('')
    setClinicalNote(null)
    setClinicalNoteVersion(null)
    setIsEditingNoteComposer(true)
    setActionError('')
    try {
      const noteResult = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .eq('session_id', selectedSession.id)
        .eq('note_type', kind)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (noteResult.error) throw new Error(noteResult.error.message)

      const note = noteResult.data as ClinicalNoteRow | null
      if (!note) return
      setClinicalNote(note)
      setIsEditingNoteComposer(false)

      const versionQuery = supabase
        .from('clinical_note_versions')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .eq('clinical_note_id', note.id)
        .is('deleted_at', null)
        .order('version_number', { ascending: false })
        .limit(1)
      const versionResult = note.latest_version_id
        ? await versionQuery.eq('id', note.latest_version_id).maybeSingle()
        : await versionQuery.maybeSingle()
      if (versionResult.error) throw new Error(versionResult.error.message)
      const version = versionResult.data as ClinicalNoteVersionRow | null
      setClinicalNoteVersion(version)
      setClinicalNoteBody(version?.free_text_content ?? '')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Clinical note could not be loaded.')
    } finally {
      setLoadingClinicalNote(false)
    }
  }

  const saveClinicalComposer = async (finalise: boolean) => {
    if (!selectedSession || !selectedBooking || !selectedPatient || !activeTenant?.id || !supabase || !canViewClinical || saving || activeNoteComposer === null || activeNoteComposer === 'planning') return
    if (!clinicalNoteBody.trim()) {
      setActionError('Enter note content before saving.')
      return
    }
    if (clinicalNote && clinicalNote.note_status !== 'draft' && clinicalNote.note_status !== 'in_progress') {
      setActionError('This clinical note is immutable. Open the Patient File to review or amend it.')
      return
    }

    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      let noteId = clinicalNote?.id ?? null
      let versionId = clinicalNoteVersion?.id ?? null

      if (!noteId || !versionId) {
        const encounterResult = await supabase
          .from('clinical_encounters')
          .select('*')
          .eq('tenant_id', activeTenant.id)
          .eq('session_id', selectedSession.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (encounterResult.error) throw new Error(encounterResult.error.message)

        let encounter = encounterResult.data as ClinicalEncounterRow | null
        if (!encounter) {
          const createdEncounter = await supabase
            .from('clinical_encounters')
            .insert({
              tenant_id: activeTenant.id,
              patient_id: selectedPatient.id,
              booking_id: selectedBooking.id,
              session_id: selectedSession.id,
              responsible_therapist_profile_id: selectedSession.therapist_profile_id,
              practice_location_id: selectedSession.practice_location_id,
              encounter_type: 'session',
              encounter_status: selectedSession.session_status === 'completed' ? 'completed' : 'in_progress',
              clinical_visibility: 'internal',
              occurred_at: selectedSession.actual_start_at ?? selectedSession.scheduled_start_at,
              started_at: selectedSession.actual_start_at,
              ended_at: selectedSession.actual_end_at,
              metadata: {},
              created_by_profile_id: profile?.id ?? null,
              updated_by_profile_id: profile?.id ?? null,
            })
            .select()
            .single()
          if (createdEncounter.error) throw new Error(createdEncounter.error.message)
          encounter = createdEncounter.data as ClinicalEncounterRow
        }

        const createResult = await supabase.rpc('create_clinical_note_draft', {
          target_tenant_id: activeTenant.id,
          target_patient_id: selectedPatient.id,
          clinical_encounter_id_input: encounter.id,
          note_type_input: activeNoteComposer,
          note_title_input: activeNoteComposer === 'session_feedback' ? 'Session Feedback' : 'Process Note',
          free_text_content_input: clinicalNoteBody.trim(),
          structured_content_input: {},
          clinical_visibility_input: activeNoteComposer === 'session_feedback' ? 'patient_facing' : 'internal',
          patient_visible_allowed_input: activeNoteComposer === 'session_feedback',
          is_restricted_input: false,
          idempotency_key_input: `session-note-${selectedSession.id}-${activeNoteComposer}`,
        })
        if (createResult.error) throw new Error(createResult.error.message)
        noteId = createResult.data?.[0]?.clinical_note_id ?? null
        versionId = createResult.data?.[0]?.clinical_note_version_id ?? null
      } else {
        const saveResult = await supabase.rpc('save_clinical_note_free_text_draft', {
          target_note_version_id: versionId,
          free_text_content_input: clinicalNoteBody.trim(),
          idempotency_key_input: `session-note-save-${versionId}-${Date.now()}`,
        })
        if (saveResult.error) throw new Error(saveResult.error.message)
      }

      if (!noteId || !versionId) throw new Error('The clinical note could not be verified after saving.')
      if (finalise) {
        const finaliseResult = await supabase.rpc('finalise_clinical_note_version', { target_note_version_id: versionId })
        if (finaliseResult.error) throw new Error(finaliseResult.error.message)
      }

      const refreshedResult = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('id', noteId)
        .eq('tenant_id', activeTenant.id)
        .single()
      if (refreshedResult.error) throw new Error(refreshedResult.error.message)
      const refreshedNote = refreshedResult.data as ClinicalNoteRow
      setClinicalNote(refreshedNote)
      if (activeNoteComposer === 'process_note') setHasSavedProcessNote(true)
      const refreshedVersionResult = await supabase
        .from('clinical_note_versions')
        .select('*')
        .eq('id', versionId)
        .eq('tenant_id', activeTenant.id)
        .single()
      if (refreshedVersionResult.error) throw new Error(refreshedVersionResult.error.message)
      setClinicalNoteVersion(refreshedVersionResult.data as ClinicalNoteVersionRow)
      onClinicalNoteChange?.(refreshedNote)
      setIsEditingNoteComposer(false)
      setSuccessMessage(finalise
        ? 'Clinical note completed.'
        : activeNoteComposer === 'session_feedback'
          ? 'Session feedback saved privately as a draft.'
          : 'Clinical note draft saved.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Clinical note could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const skipProcessNote = async () => {
    if (!selectedSession || !activeTenant?.id || !supabase || !canManageSession || !canViewClinical || saving || processNoteSkipped) return

    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const savedNoteResult = await supabase
        .from('clinical_notes')
        .select('id')
        .eq('tenant_id', activeTenant.id)
        .eq('session_id', selectedSession.id)
        .eq('note_type', 'process_note')
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (savedNoteResult.error) throw new Error(savedNoteResult.error.message)
      if (savedNoteResult.data) {
        setHasSavedProcessNote(true)
        setSuccessMessage('Process Note is already saved.')
        return
      }

      const existingSkipResult = await supabase
        .from('session_notes')
        .select('id')
        .eq('tenant_id', activeTenant.id)
        .eq('session_id', selectedSession.id)
        .eq('note_type', 'other')
        .is('deleted_at', null)
        .contains('metadata', { task_type: 'process_note', disposition: 'skipped' })
        .limit(1)
        .maybeSingle()
      if (existingSkipResult.error) throw new Error(existingSkipResult.error.message)

      if (!existingSkipResult.data) {
        const insertResult = await supabase.from('session_notes').insert({
          tenant_id: activeTenant.id,
          session_id: selectedSession.id,
          note_type: 'other',
          visibility: 'internal',
          title: 'Process Note',
          body: 'Process Note explicitly skipped.',
          metadata: { task_type: 'process_note', disposition: 'skipped' },
          created_by_profile_id: profile?.id ?? null,
          updated_by_profile_id: profile?.id ?? null,
        } satisfies SessionNoteInsert)
        if (insertResult.error) throw new Error(insertResult.error.message)
      }

      await createPatientHistory(selectedSession, 'process_note_skipped', selectedSession.id)
      await refreshSessionRecords(selectedSession.id)
      onProcessNoteSkipChange?.(selectedSession.id)
      setActiveNoteComposer(null)
      setSuccessMessage('Process Note skipped for this session.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Process Note could not be skipped.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState title="Loading sessions" description="Preparing bookings, sessions, procedures and workflow history." />
  if (loadError) return <ErrorState title="Sessions unavailable" description={loadError} />

  return (
    <div className={`booking-engine-page session-engine-page${embeddedBookingId ? ' embedded-session-panel' : ''}`}>
      <Card className="booking-toolbar">
        <div>
          <span>Session Engine</span>
          <h3>{activeTenant?.practice_name ?? 'Sessions'}</h3>
        </div>
        <div className="booking-toolbar-group">
          <Link className="ui-button ui-button-secondary" to="/bookings">Bookings</Link>
          <Link className="ui-button ui-button-secondary" to="/patients">Patients</Link>
          <Link className="ui-button ui-button-secondary" to="/finance">Finance</Link>
        </div>
      </Card>

      <div className="booking-filter-row">
        <SearchBar label="Search sessions" value={search} placeholder="Patient or therapist" onChange={setSearch} />
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="not_started">Not started</option>
            <option value="ready">Ready</option>
            <option value="in_progress">In progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="reopened">Reopened</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No show</option>
          </select>
        </label>
      </div>

      <div className="booking-workspace-layout">
        <Card className="booking-calendar-card">
          <div className="practice-profile-form-header">
            <div>
              <span>Session queue</span>
              <h3>{listItems.length} records</h3>
            </div>
            <StatusBadge tone="info">{eligibleBookings.length} eligible bookings</StatusBadge>
          </div>
          {listItems.length === 0 ? (
            <EmptyState title="No sessions or eligible bookings" description="Checked-in, confirmed or scheduled bookings will appear here when they are ready for session work." />
          ) : (
            <div className="booking-agenda-list">
              {listItems.map((item) => {
                const booking = item.kind === 'session' ? item.booking : item.booking
                const patient = booking ? patientById.get(booking.patient_id) : null
                const therapist = booking?.therapist_profile_id ? therapistById.get(booking.therapist_profile_id) : null
                const status = item.kind === 'session' ? item.session.session_status : 'eligible_booking'
                return (
                  <button
                    className={selectedItem?.id === item.id ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id)
                      if (!embeddedBookingId) setSearchParams(item.kind === 'session' ? { session: item.session.id } : { booking: item.booking.id }, { replace: true })
                    }}
                    key={item.id}
                  >
                    <div className="booking-agenda-time">
                      <strong>{booking?.start_at ? new Date(booking.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}</strong>
                      <span>{booking?.duration_minutes ?? 0} min</span>
                    </div>
                    <div>
                      <strong>{formatPatientName(patient)}</strong>
                      <span>{therapist?.display_name ?? 'No therapist'} · {formatDateTime(booking?.start_at ?? null)}</span>
                    </div>
                    <StatusBadge tone={item.kind === 'session' ? getSessionTone(item.session.session_status) : 'warning'}>{formatLabel(status)}</StatusBadge>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <div className="booking-editor-stack">
          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header">
              <div className="session-patient-heading">
                <span>{selectedSession ? 'Session workspace' : 'Eligible booking'}</span>
                <h3>{formatPatientName(selectedPatient)}</h3>
                <div className="session-patient-status-row">
                  {selectedSession && <StatusBadge tone={getSessionTone(selectedSession.session_status)}>{formatLabel(selectedSession.session_status)}</StatusBadge>}
                  {selectedPatientFinanceFlag && canViewFinance && (
                    <span
                      className={`session-finance-account-flag finance-flag-${selectedPatientFinanceFlag}`}
                      role="img"
                      aria-label={`${selectedPatientFinanceFlag} finance flag: patient statement has an unpaid balance`}
                      title={`${selectedPatientFinanceFlag[0].toUpperCase()}${selectedPatientFinanceFlag.slice(1)} finance flag · unpaid monthly statement balance`}
                    >
                      <FinanceIcon size={16} />
                    </span>
                  )}
                </div>
              </div>
              <div className="session-header-actions">
                <div className="patients-action-row">
                  {selectedPatient && <Link className="ui-button ui-button-secondary" to={`/patients?patient=${selectedPatient.id}`}>Patient File</Link>}
                  {selectedItem?.kind === 'eligible_booking' && embeddedBookingId && <StatusBadge tone="info">Preparing session</StatusBadge>}
                  {selectedItem?.kind === 'eligible_booking' && !embeddedBookingId && canManageSession && (
                    <Button
                      disabled={saving || Boolean(validateEligibleBooking(selectedItem.booking))}
                      onClick={() => createSessionFromBooking(selectedItem.booking)}
                    >{validateEligibleBooking(selectedItem.booking) ? 'Session unavailable' : 'Create Session'}</Button>
                  )}
                  {selectedSession && canCompleteSession && !isTerminalSession(selectedSession.session_status) && (
                    <Button disabled={saving} onClick={() => setCompletionIntent('complete')}>Completed</Button>
                  )}
                </div>
                {selectedSession && canCompleteSession && !isTerminalSession(selectedSession.session_status) && (
                  <div className="session-terminal-secondary-actions" aria-label="Other session outcomes">
                    <button type="button" disabled={saving} onClick={() => applyTerminalOutcome('cancelled')}>Cancelled</button>
                    <span aria-hidden="true">·</span>
                    <button type="button" disabled={saving} onClick={() => applyTerminalOutcome('no_show')}>No Show</button>
                  </div>
                )}
              </div>
            </div>

            {selectedSession && (
              <div className="session-workspace-tabs" role="tablist" aria-label="Session workspace sections">
                <button className={selectedSection === 'details' ? 'active' : ''} type="button" role="tab" aria-selected={selectedSection === 'details'} onClick={() => setSelectedSection('details')}>Session Details</button>
                <button className={selectedSection === 'notes' ? 'active' : ''} type="button" role="tab" aria-selected={selectedSection === 'notes'} onClick={() => setSelectedSection('notes')}>
                  Notes
                  {notesTaskOutstanding && <span className="session-tab-task-dot" aria-label="Process Note outstanding" title="Process Note outstanding" />}
                </button>
                <button className={selectedSection === 'finance' ? 'active' : ''} type="button" role="tab" aria-selected={selectedSection === 'finance'} onClick={() => setSelectedSection('finance')}>
                  Finance
                  {financeTaskOutstanding && <span className="session-tab-task-dot" aria-label="Invoice issuing outstanding" title="Invoice issuing outstanding" />}
                </button>
                {selectedSection === 'details' && canEditSelectedSession && (
                  <div className="session-details-edit-actions">
                    <button className={`ui-icon-action session-details-edit${isEditingSessionDetails ? ' is-active' : ''}`} type="button" onClick={() => setIsEditingSessionDetails((current) => !current)} aria-label={isEditingSessionDetails ? 'Close session detail editing' : 'Edit session details'} title="Edit">
                      <PencilIcon />
                    </button>
                    {isEditingSessionDetails && <Button disabled={saving} onClick={saveSessionDetails}>{saving ? 'Saving' : 'Save'}</Button>}
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'details' && (selectedBooking ? (isEditingSessionDetails && selectedSession ? (
              <div className="settings-form-grid booking-form-grid session-details-editor">
                <label><span>Patient</span><input value={formatPatientName(selectedPatient)} readOnly /></label>
                <label><span>Responsible party</span><input value={selectedResponsibleParty?.full_name ?? 'Not captured'} readOnly /></label>
                <label><span>Therapist</span><select value={sessionDetailsForm.therapist_profile_id} disabled={saving} onChange={(event) => setSessionDetailsForm((current) => ({ ...current, therapist_profile_id: event.target.value }))}><option value="">Select therapist</option>{therapists.map((therapist) => <option value={therapist.id} key={therapist.id}>{therapist.display_name}{therapist.is_active ? '' : ' · inactive'}</option>)}</select></label>
                <label><span>Location</span><select value={sessionDetailsForm.practice_location_id} disabled={saving} onChange={(event) => setSessionDetailsForm((current) => ({ ...current, practice_location_id: event.target.value }))}><option value="">Select location</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.location_name}{location.is_active ? '' : ' · inactive'}</option>)}</select></label>
                <label><span>Scheduled start</span><input type="datetime-local" step="900" value={sessionDetailsForm.scheduled_start_at} disabled={saving} onChange={(event) => setSessionDetailsForm((current) => ({ ...current, scheduled_start_at: event.target.value }))} /></label>
                <label><span>Duration</span><select value={sessionDetailsForm.duration_minutes} disabled={saving} onChange={(event) => setSessionDetailsForm((current) => ({ ...current, duration_minutes: event.target.value }))}>{sessionDurationOptions.map((duration) => <option value={duration} key={duration}>{duration} minutes</option>)}</select></label>
                <label><span>Session type</span><select value={sessionDetailsForm.session_type} disabled={saving} onChange={(event) => setSessionDetailsForm((current) => ({ ...current, session_type: event.target.value }))}>{sessionTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
                <label><span>Mode</span><select value={sessionDetailsForm.session_modality} disabled={saving} onChange={(event) => setSessionDetailsForm((current) => ({ ...current, session_modality: event.target.value }))}>{sessionModalities.map((mode) => <option value={mode} key={mode}>{formatLabel(mode)}</option>)}</select></label>
              </div>
            ) : (
              <div className="booking-detail-grid session-detail-summary">
                <div><span>Patient</span><strong>{formatPatientName(selectedPatient)}</strong><small>{selectedPatient?.patient_number ?? 'No patient number'}</small></div>
                <div><span>Responsible party</span><strong>{selectedResponsibleParty?.full_name ?? 'Not captured'}</strong><small>{selectedResponsibleParty?.phone ?? selectedResponsibleParty?.email ?? 'No contact detail'}</small></div>
                <div><span>Therapist</span><strong>{selectedTherapist?.display_name ?? 'No therapist'}</strong><small>{selectedTherapist?.profession ?? 'No profession'}</small></div>
                <div><span>Location</span><strong>{selectedLocation?.location_name ?? 'No location'}</strong><small>{selectedBooking.room_label ?? selectedLocation?.room_venue_notes ?? ''}</small></div>
                <div><span>Scheduled start</span><strong>{formatDateTime(selectedBooking.start_at)}</strong></div>
                <div><span>Duration</span><strong>{selectedBooking.duration_minutes ?? 0} min</strong></div>
                <div><span>Type / modality</span><strong>{formatLabel(selectedBooking.booking_type)} · {formatLabel(selectedBooking.appointment_mode)}</strong></div>
              </div>
            )) : (
              <EmptyState title="No session selected" description="Select a session or eligible booking from the queue." />
            ))}
          </Card>

          {selectedSection === 'finance' && selectedBooking && (
            <Card className="practice-profile-form-card session-booked-total-card">
              <div className="session-charge-summary">
                <div className="session-booked-total-copy">
                  <span>Planned charges</span>
                  <strong>{formatMoney(plannedTotal)}</strong>
                  <small>Original booking estimate</small>
                </div>
                <div className="session-booked-total-copy session-delivered-total-copy">
                  <span>Delivered services</span>
                  <strong>{formatMoney(deliveredTotal)}</strong>
                  <small>Saved billable procedure lines</small>
                </div>
              </div>
              <div className="session-finance-actions">
                {canConfirmSessionInvoice && selectedSession && isPostSessionTime && !['cancelled', 'no_show'].includes(selectedSession.session_status) && !selectedInvoice?.issued_at && (!selectedInvoice || ['draft', 'ready_to_confirm'].includes(selectedInvoice.invoice_status)) && (
                  <span title={hasUnsavedProcedureChanges ? 'Save delivered service changes before confirming the invoice' : selectedSession.session_status === 'completed' ? 'Confirm this invoice' : 'Confirm clinical completion, then confirm this invoice'}>
                    <Button
                      disabled={saving || !hasBillableDeliveredServices || hasUnsavedProcedureChanges}
                      onClick={() => selectedSession.session_status === 'completed' ? void confirmSessionInvoice() : setCompletionIntent('confirm_invoice')}
                    >
                      {saving ? 'Confirming' : 'Confirm Invoice'}
                    </Button>
                  </span>
                )}
                {canConfirmSessionInvoice && selectedInvoice?.invoice_status === 'confirmed' && !selectedInvoice.issued_at && (
                  <Button disabled={saving} onClick={issueSessionInvoice}>{saving ? 'Issuing' : 'Issue Invoice'}</Button>
                )}
                {canViewFinance && selectedInvoice?.invoice_status === 'review_required' && (
                  <Link className="ui-button ui-button-secondary" to={`/finance?invoice=${selectedInvoice.id}`}>Review Invoice</Link>
                )}
              </div>
            </Card>
          )}

          {selectedSection === 'finance' && selectedSession && (
            <Card className="practice-profile-form-card">
              <div className="practice-profile-form-header session-procedure-actions">
                {canReadPricing && canEditDeliveredProcedures && (
                  <label className="booking-procedure-search">
                    <span>Add procedure</span>
                    <SessionProcedureCombobox
                      items={selectedPriceListItems.filter((item) => !procedureDrafts.some((draft) => draft.price_list_item_id === item.id))}
                      disabled={saving || selectedPriceListItems.length === 0}
                      onSelect={addProcedure}
                    />
                  </label>
                )}
                {canEditDeliveredProcedures && procedureDrafts.length > 0 && <Button disabled={saving} onClick={saveProcedures}>Save</Button>}
              </div>

              <div className="session-procedure-table-wrap">
                <table className="session-procedure-table booking-procedure-table">
                  <thead>
                    <tr>
                      <th>Procedure code</th>
                      <th>Name</th>
                      <th>ICD-10 code</th>
                      <th>Price</th>
                      {canEditDeliveredProcedures && <th aria-label="Actions" />}
                    </tr>
                  </thead>
                  <tbody>
                    {procedureDrafts.map((procedure, index) => (
                      <tr key={procedure.id ?? `new-${index}`}>
                        <td className="session-procedure-code">{procedure.procedure_code || '—'}</td>
                        <td>{procedure.procedure_name}</td>
                        <td className="session-procedure-icd10">{procedure.icd10_code || '—'}</td>
                        <td className="session-procedure-price">{formatMoney(Number(procedure.unit_price) || 0)}</td>
                        {canEditDeliveredProcedures && (
                          <td className="session-procedure-remove-cell">
                            <button className="ui-icon-action" type="button" disabled={saving} onClick={() => removeProcedureDraft(index)} aria-label="Remove procedure" title="Remove procedure"><TrashIcon /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!canReadPricing && <p className="session-foundation-note">Pricing edits are restricted. Existing session procedure snapshots are still visible for finance readiness.</p>}
            </Card>
          )}

          {selectedSection === 'details' && selectedSession && selectedSession.session_status === 'completed' && (
            <Card className="practice-profile-form-card">
              <div className="practice-profile-form-header">
                <div>
                  <span>Reopen session</span>
                  <h3>Correction workflow</h3>
                </div>
                {canCompleteSession && <Button variant="secondary" disabled={saving} onClick={reopenSession}>Reopen</Button>}
              </div>
              <div className="settings-form-grid booking-form-grid">
                <label className="wide-field"><span>Reopen reason</span><textarea value={reopenReason} disabled={!canCompleteSession || saving} onChange={(event) => setReopenReason(event.target.value)} /></label>
              </div>
            </Card>
          )}

          {selectedSection === 'notes' && selectedSession && canReadInternalNotes && (
            <Card className="practice-profile-form-card">
              {selectedInitialPatientNote?.event_body && (
                <aside className="session-initial-patient-note" aria-label="Initial patient note">
                  <span>Initial patient note</span>
                  <p>{selectedInitialPatientNote.event_body}</p>
                  <small>Captured during patient creation · {formatDateTime(selectedInitialPatientNote.occurred_at)}</small>
                </aside>
              )}
              <div className="session-note-types">
                <section>
                  <button className="session-note-add" type="button" disabled={!canManageSession || saving} onClick={() => openNoteComposer('planning')}>+ Add Session Planning</button>
                  <span>Internal</span>
                  {activeNoteComposer === 'planning' && (
                    <div className="session-note-composer">
                      <RichTextComposer
                        value={noteBody}
                        onChange={setNoteBody}
                        onSave={saveOperationalNote}
                        onEdit={() => setIsEditingNoteComposer(true)}
                        readOnly={Boolean(noteId) && !isEditingNoteComposer}
                        disabled={!canManageSession || saving}
                        saving={saving}
                        ariaLabel="Session planning"
                      />
                    </div>
                  )}
                </section>
                <section>
                  <button className="session-note-add" type="button" disabled={!canViewClinical || saving} onClick={() => openNoteComposer('session_feedback')}>+ Add Session Feedback</button>
                  <span>Case management · Draft remains private</span>
                  {activeNoteComposer === 'session_feedback' && (
                    <div className="session-note-composer">
                      {loadingClinicalNote ? <LoadingState title="Loading feedback" /> : (
                        <RichTextComposer
                          value={clinicalNoteBody}
                          onChange={setClinicalNoteBody}
                          onSave={() => saveClinicalComposer(false)}
                          onEdit={clinicalNote && !['draft', 'in_progress'].includes(clinicalNote.note_status) ? undefined : () => setIsEditingNoteComposer(true)}
                          onComplete={clinicalNote && ['draft', 'in_progress'].includes(clinicalNote.note_status) && !isEditingNoteComposer ? () => saveClinicalComposer(true) : undefined}
                          readOnly={!isEditingNoteComposer}
                          disabled={saving || Boolean(clinicalNote && !['draft', 'in_progress'].includes(clinicalNote.note_status))}
                          saving={saving}
                          saveLabel="Save Feedback"
                          ariaLabel="Session feedback"
                        />
                      )}
                    </div>
                  )}
                </section>
                <section>
                  <div className="session-note-action-line">
                    <button className="session-note-add" type="button" disabled={!canViewClinical || saving} onClick={() => openNoteComposer('process_note')}>+ Add Process Note</button>
                    {hasSavedProcessNote ? (
                      <StatusBadge tone="success">Saved</StatusBadge>
                    ) : processNoteSkipped ? (
                      <StatusBadge tone="neutral">Skipped</StatusBadge>
                    ) : (
                      <button className="session-note-skip" type="button" disabled={!canViewClinical || !canManageSession || saving} onClick={() => void skipProcessNote()}>Skip</button>
                    )}
                  </div>
                  <span>Internal</span>
                  {activeNoteComposer === 'process_note' && (
                    <div className="session-note-composer">
                      {loadingClinicalNote ? <LoadingState title="Loading process note" /> : (
                        <RichTextComposer
                          value={clinicalNoteBody}
                          onChange={setClinicalNoteBody}
                          onSave={() => saveClinicalComposer(false)}
                          onEdit={clinicalNote && !['draft', 'in_progress'].includes(clinicalNote.note_status) ? undefined : () => setIsEditingNoteComposer(true)}
                          onComplete={clinicalNote && ['draft', 'in_progress'].includes(clinicalNote.note_status) && !isEditingNoteComposer ? () => saveClinicalComposer(true) : undefined}
                          readOnly={!isEditingNoteComposer}
                          disabled={saving || Boolean(clinicalNote && !['draft', 'in_progress'].includes(clinicalNote.note_status))}
                          saving={saving}
                          ariaLabel="Process note"
                        />
                      )}
                    </div>
                  )}
                </section>
              </div>
            </Card>
          )}

        </div>
      </div>
      {completionIntent && selectedSession && selectedSession.session_status !== 'completed' && (
        <div className="modal-backdrop nested" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) setCompletionIntent(null) }}>
          <section className="modal-card session-completion-modal" role="dialog" aria-modal="true" aria-labelledby="session-completion-title">
            <button className="modal-close" type="button" disabled={saving} onClick={() => setCompletionIntent(null)} aria-label="Close clinical completion confirmation">X</button>
            <p>Clinical completion</p>
            <h2 id="session-completion-title">Confirm attendance and treatment</h2>
            <div className="settings-form-grid booking-form-grid">
              <label><span>Actual start</span><input type="datetime-local" value={completionForm.actual_start_at} disabled={saving} onChange={(event) => setCompletionForm((current) => ({ ...current, actual_start_at: event.target.value }))} /></label>
              <label><span>Actual end</span><input type="datetime-local" value={completionForm.actual_end_at} disabled={saving} onChange={(event) => setCompletionForm((current) => ({ ...current, actual_end_at: event.target.value }))} /></label>
              <label><span>Attendance</span><select value={completionForm.attendance_outcome} disabled={saving} onChange={(event) => setCompletionForm((current) => ({ ...current, attendance_outcome: event.target.value }))}>{attendanceOutcomes.map((outcome) => <option value={outcome} key={outcome}>{formatLabel(outcome)}</option>)}</select></label>
              <label><span>Outcome</span><select value={completionForm.session_outcome} disabled={saving} onChange={(event) => setCompletionForm((current) => ({ ...current, session_outcome: event.target.value }))}>{sessionOutcomes.map((outcome) => <option value={outcome} key={outcome}>{formatLabel(outcome)}</option>)}</select></label>
              <label className="wide-field"><span>Clinical completion summary</span><textarea value={completionForm.operational_summary} disabled={saving} onChange={(event) => setCompletionForm((current) => ({ ...current, operational_summary: event.target.value }))} /></label>
            </div>
            <p className="quiet">Confirming records these treatment facts through the protected Session lifecycle.</p>
            <div className="finance-actions-row">
              <Button variant="secondary" disabled={saving} onClick={() => setCompletionIntent(null)}>Cancel</Button>
              <Button disabled={saving} onClick={() => completionIntent === 'confirm_invoice' ? void confirmSessionInvoice() : void completeSession()}>
                {saving ? 'Saving' : completionIntent === 'confirm_invoice' ? 'Complete & Confirm Invoice' : 'Complete Session'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
