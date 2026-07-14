import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge, SearchBar } from '../components/ui'
import type { Database, Json } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type PatientRow = Database['public']['Tables']['patients']['Row']
type ResponsiblePartyRow = Database['public']['Tables']['responsible_parties']['Row']
type TherapistRow = Database['public']['Tables']['therapist_profiles']['Row']
type LocationRow = Database['public']['Tables']['practice_locations']['Row']
type PriceListItemRow = Database['public']['Tables']['price_list_items']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']
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

type SessionListItem =
  | { kind: 'session'; id: string; session: SessionRow; booking: BookingRow | null }
  | { kind: 'eligible_booking'; id: string; booking: BookingRow }

type ProcedureDraft = {
  id?: string
  price_list_item_id?: string
  procedure_name: string
  procedure_code: string
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

const sessionOutcomes = ['completed_as_planned', 'completed_with_changes', 'follow_up_required', 'report_required', 'feedback_required', 'referred_on']
const attendanceOutcomes = ['attended', 'partial_attendance']
const activeBookingStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress']

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
    description: priceItem?.description ?? '',
    unit_price: String(priceItem?.price ?? 0),
    quantity: '1',
    duration_minutes: priceItem?.duration_minutes ? String(priceItem.duration_minutes) : '',
    is_billable: true,
    differs_from_booking: true,
    change_reason: 'Added during session',
  }
}

function getPatientHistoryCopy(eventType: string, patientName: string) {
  if (eventType === 'session_started') return { title: 'Session started', body: `${patientName}'s session was started.` }
  if (eventType === 'session_completed') return { title: 'Session completed', body: `${patientName}'s session was completed.` }
  if (eventType === 'session_reopened') return { title: 'Session reopened', body: `${patientName}'s completed session was reopened for correction.` }
  if (eventType === 'session_cancelled') return { title: 'Session cancelled', body: `${patientName}'s session was cancelled.` }
  if (eventType === 'session_no_show_recorded') return { title: 'No show recorded', body: `${patientName}'s session was marked as no show.` }
  if (eventType === 'session_procedures_changed') return { title: 'Session procedures updated', body: `${patientName}'s delivered procedure set was updated.` }
  return { title: formatLabel(eventType), body: `${patientName}'s session was updated.` }
}

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeTenant, profile } = useAuth()
  const authorization = useAuthorization()
  const canViewSessions = authorization.hasPermission('tenant.bookings.view', 'tenant.clinical.view', 'tenant.finance.view')
  const canManageSession = authorization.hasPermission('tenant.bookings.manage', 'tenant.clinical.manage')
  const canCompleteSession = authorization.hasRole('admin', 'therapist')
  const canReadInternalNotes = authorization.hasRole('admin', 'receptionist', 'therapist')
  const canReadPricing = authorization.hasPermission('tenant.finance.view', 'tenant.practice.configure')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [responsibleParties, setResponsibleParties] = useState<ResponsiblePartyRow[]>([])
  const [therapists, setTherapists] = useState<TherapistRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionProcedures, setSessionProcedures] = useState<SessionProcedureRow[]>([])
  const [sessionHistory, setSessionHistory] = useState<SessionStatusHistoryRow[]>([])
  const [sessionEvents, setSessionEvents] = useState<SessionWorkflowEventRow[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNoteRow[]>([])
  const [priceListItems, setPriceListItems] = useState<PriceListItemRow[]>([])
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
  const [noteBody, setNoteBody] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [reopenReason, setReopenReason] = useState('')

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
    const bookingItems: SessionListItem[] = eligibleBookings.map((booking) => ({
      kind: 'eligible_booking',
      id: `booking-${booking.id}`,
      booking,
    }))

    return [...existingSessions, ...bookingItems]
      .filter((item) => {
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
  }, [bookingById, eligibleBookings, patientById, search, sessions, statusFilter, therapistById])

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
  const selectedSessionProcedures = useMemo(
    () => selectedSession ? sessionProcedures.filter((procedure) => procedure.session_id === selectedSession.id) : [],
    [selectedSession, sessionProcedures],
  )
  const selectedSessionHistory = useMemo(
    () => selectedSession ? sessionHistory.filter((history) => history.session_id === selectedSession.id) : [],
    [selectedSession, sessionHistory],
  )
  const selectedSessionEvents = useMemo(
    () => selectedSession ? sessionEvents.filter((event) => event.session_id === selectedSession.id) : [],
    [selectedSession, sessionEvents],
  )
  const selectedSessionNotes = useMemo(
    () => selectedSession ? sessionNotes.filter((note) => note.session_id === selectedSession.id) : [],
    [selectedSession, sessionNotes],
  )
  const sessionTotal = useMemo(
    () => selectedSessionProcedures.reduce((total, procedure) => total + procedure.line_total, 0),
    [selectedSessionProcedures],
  )
  const procedureDraftTotal = useMemo(
    () => procedureDrafts.reduce((total, procedure) => {
      const unitPrice = Number(procedure.unit_price)
      const quantity = Number(procedure.quantity)
      if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) return total
      return total + unitPrice * quantity
    }, 0),
    [procedureDrafts],
  )
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
        sessionsResult,
        proceduresResult,
        historyResult,
        eventsResult,
        notesResult,
        priceItemsResult,
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
        canReadPricing
          ? supabaseClient
              .from('price_list_items')
              .select('id, tenant_id, price_list_id, procedure_name, procedure_code, description, price, duration_minutes, is_active, metadata, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .eq('is_active', true)
              .order('procedure_name', { ascending: true })
          : pricingEmptyResult,
      ])

      if (!isMounted) return

      const firstError = patientsResult.error || responsiblePartiesResult.error || therapistsResult.error || locationsResult.error || bookingsResult.error || sessionsResult.error || proceduresResult.error || historyResult.error || eventsResult.error || notesResult.error || priceItemsResult.error
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
      setSessions((sessionsResult.data ?? []) as SessionRow[])
      setSessionProcedures((proceduresResult.data ?? []) as SessionProcedureRow[])
      setSessionHistory((historyResult.data ?? []) as SessionStatusHistoryRow[])
      setSessionEvents((eventsResult.data ?? []) as SessionWorkflowEventRow[])
      setSessionNotes((notesResult.data ?? []) as SessionNoteRow[])
      setPriceListItems((priceItemsResult.data ?? []) as PriceListItemRow[])
      setLoading(false)
    }

    loadSessionsWorkspace()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, canReadInternalNotes, canReadPricing, canViewSessions])

  useEffect(() => {
    const requestedSessionId = searchParams.get('session')
    const requestedBookingId = searchParams.get('booking')
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
      setSearchParams({}, { replace: true })
    }
  }, [listItems, searchParams, selectedItemId, setSearchParams])

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
    ])

    const firstError = bookingsResult.error || sessionsResult.error || proceduresResult.error || historyResult.error || eventsResult.error || notesResult.error
    if (firstError) throw new Error(firstError.message)

    setBookings((bookingsResult.data ?? []) as BookingRow[])
    const nextSessions = (sessionsResult.data ?? []) as SessionRow[]
    setSessions(nextSessions)
    setSessionProcedures((proceduresResult.data ?? []) as SessionProcedureRow[])
    setSessionHistory((historyResult.data ?? []) as SessionStatusHistoryRow[])
    setSessionEvents((eventsResult.data ?? []) as SessionWorkflowEventRow[])
    setSessionNotes((notesResult.data ?? []) as SessionNoteRow[])
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
      setSearchParams({ session: rpcRow.session_id }, { replace: true })
      setSuccessMessage(rpcRow.created_session ? 'Session created from booking.' : 'Existing session opened for this booking.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session creation failed.'))
    } finally {
      setSaving(false)
    }
  }

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

  const startSession = async () => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canManageSession || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (!['not_started', 'ready', 'reopened'].includes(selectedSession.session_status)) {
        throw new Error('This session cannot be started from its current state.')
      }
      const nowIso = new Date().toISOString()
      const result = await supabase
        .from('sessions')
        .update({
          session_status: 'in_progress',
          attendance_outcome: 'attended',
          actual_start_at: selectedSession.actual_start_at ?? nowIso,
          updated_by_profile_id: profile?.id ?? null,
        })
        .eq('id', selectedSession.id)
        .eq('tenant_id', activeTenant.id)
        .eq('session_status', selectedSession.session_status)
        .select()
        .single()

      if (result.error) throw new Error(result.error.message)
      const updatedSession = result.data as SessionRow
      await createStatusHistory(selectedSession, 'in_progress', 'session_started', 'Session started', updatedSession.actual_start_at, null)
      await createWorkflowEvent(updatedSession, 'session_started', 'v1', { actual_start_at: updatedSession.actual_start_at })
      await createPatientHistory(updatedSession, 'session_started', updatedSession.id)
      await syncBookingFromSession(updatedSession, 'in_progress')
      await refreshSessionRecords(updatedSession.id)
      setSuccessMessage('Session started.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session could not be started.'))
    } finally {
      setSaving(false)
    }
  }

  const pauseOrResumeSession = async (nextStatus: 'paused' | 'in_progress') => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canManageSession || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const eventType = nextStatus === 'paused' ? 'session_paused' : 'session_resumed'
      if (nextStatus === 'paused' && selectedSession.session_status !== 'in_progress') throw new Error('Only in-progress sessions can be paused.')
      if (nextStatus === 'in_progress' && selectedSession.session_status !== 'paused') throw new Error('Only paused sessions can be resumed.')
      const result = await supabase
        .from('sessions')
        .update({ session_status: nextStatus, updated_by_profile_id: profile?.id ?? null })
        .eq('id', selectedSession.id)
        .eq('tenant_id', activeTenant.id)
        .eq('session_status', selectedSession.session_status)
        .select()
        .single()

      if (result.error) throw new Error(result.error.message)
      const updatedSession = result.data as SessionRow
      await createStatusHistory(selectedSession, nextStatus, eventType, formatLabel(eventType))
      await createWorkflowEvent(updatedSession, eventType, `${Date.now()}`)
      await refreshSessionRecords(updatedSession.id)
      setSuccessMessage(nextStatus === 'paused' ? 'Session paused.' : 'Session resumed.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session state could not be updated.'))
    } finally {
      setSaving(false)
    }
  }

  const syncBookingFromSession = async (session: SessionRow, targetStatus: 'in_progress' | 'cancelled' | 'no_show') => {
    if (!supabase || !activeTenant?.id) return
    const updatePayload: Partial<BookingRow> = {
      updated_by_profile_id: profile?.id ?? null,
    }
    if (targetStatus === 'in_progress') {
      updatePayload.booking_status = 'in_progress'
      updatePayload.checked_in_at = session.actual_start_at ?? new Date().toISOString()
      updatePayload.in_progress_at = session.actual_start_at ?? new Date().toISOString()
    }
    if (targetStatus === 'cancelled') {
      updatePayload.booking_status = 'cancelled'
      updatePayload.cancelled_at = session.cancelled_at ?? new Date().toISOString()
      updatePayload.cancellation_reason = session.cancellation_reason ?? 'Session cancelled'
    }
    if (targetStatus === 'no_show') {
      updatePayload.booking_status = 'no_show'
      updatePayload.no_show_at = session.no_show_at ?? new Date().toISOString()
    }
    const result = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', session.booking_id)
      .eq('tenant_id', activeTenant.id)
      .not('booking_status', 'in', '("completed","cancelled","no_show")')

    if (result.error) throw new Error('Booking synchronization failed after the session action.')
  }

  const saveProcedures = async () => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canEditSelectedSession || saving) return
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
        if (key && duplicateKey.has(key)) throw new Error('Duplicate delivered procedure lines are not allowed. Adjust the quantity instead.')
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

  const addProcedure = () => {
    const firstPriceItem = priceListItems[0]
    setProcedureDrafts((current) => [...current, getEmptyProcedureDraft(firstPriceItem)])
  }

  const updateProcedureDraft = (index: number, patch: Partial<ProcedureDraft>) => {
    setProcedureDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, ...patch } : draft
    )))
  }

  const removeProcedureDraft = (index: number) => {
    setProcedureDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))
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
        operational_summary_input: completionForm.operational_summary.trim() || null,
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
      setSuccessMessage(rpcRow?.completed_session ? 'Session completed. Draft invoice request recorded.' : 'Session was already completed.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session completion failed.'))
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

  const cancelOrNoShowSession = async (nextStatus: 'cancelled' | 'no_show') => {
    if (!selectedSession || !supabase || !activeTenant?.id || !canManageSession || saving) return
    const reason = nextStatus === 'cancelled' ? window.prompt('Reason for cancelling this session?') : 'No show recorded'
    if (nextStatus === 'cancelled' && (!reason || !reason.trim())) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (isTerminalSession(selectedSession.session_status)) throw new Error('Terminal sessions cannot be cancelled or marked no-show again.')
      if (nextStatus === 'no_show' && !['not_started', 'ready'].includes(selectedSession.session_status)) throw new Error('No show can only be recorded before a session has started.')
      const nowIso = new Date().toISOString()
      const updatePayload: Partial<SessionRow> = {
        session_status: nextStatus,
        attendance_outcome: nextStatus === 'cancelled' ? 'cancelled' : 'no_show',
        updated_by_profile_id: profile?.id ?? null,
      }
      if (nextStatus === 'cancelled') {
        updatePayload.cancelled_at = nowIso
        updatePayload.cancelled_by_profile_id = profile?.id ?? null
        updatePayload.cancellation_reason = reason?.trim() ?? 'Session cancelled'
        updatePayload.draft_invoice_request_status = 'cancelled'
      } else {
        updatePayload.no_show_at = nowIso
      }

      const result = await supabase
        .from('sessions')
        .update(updatePayload)
        .eq('id', selectedSession.id)
        .eq('tenant_id', activeTenant.id)
        .eq('session_status', selectedSession.session_status)
        .select()
        .single()

      if (result.error) throw new Error(result.error.message)
      const updatedSession = result.data as SessionRow
      const eventType = nextStatus === 'cancelled' ? 'session_cancelled' : 'session_no_show_recorded'
      await createStatusHistory(selectedSession, nextStatus, eventType, reason ?? eventType, null, null, nextStatus === 'cancelled')
      await createWorkflowEvent(updatedSession, eventType, 'v1')
      await createPatientHistory(updatedSession, eventType, updatedSession.id)
      await syncBookingFromSession(updatedSession, nextStatus)
      await refreshSessionRecords(updatedSession.id)
      setSuccessMessage(nextStatus === 'cancelled' ? 'Session cancelled.' : 'No show recorded.')
    } catch (error) {
      setActionError(getFriendlySessionError(error, 'Session action failed.'))
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
      setSuccessMessage('Operational note saved.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Operational note could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState title="Loading sessions" description="Preparing bookings, sessions, procedures and workflow history." />
  if (loadError) return <ErrorState title="Sessions unavailable" description={loadError} />

  return (
    <div className="booking-engine-page session-engine-page">
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
                      setSearchParams(item.kind === 'session' ? { session: item.session.id } : { booking: item.booking.id }, { replace: true })
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
              <div>
                <span>{selectedSession ? 'Session workspace' : 'Eligible booking'}</span>
                <h3>{formatPatientName(selectedPatient)}</h3>
              </div>
              <div className="patients-action-row">
                {selectedItem?.kind === 'eligible_booking' && canManageSession && (
                  <Button disabled={saving} onClick={() => createSessionFromBooking(selectedItem.booking)}>Create Session</Button>
                )}
                {selectedSession && <StatusBadge tone={getSessionTone(selectedSession.session_status)}>{formatLabel(selectedSession.session_status)}</StatusBadge>}
              </div>
            </div>

            {selectedBooking ? (
              <div className="booking-detail-grid">
                <div><span>Patient</span><strong>{formatPatientName(selectedPatient)}</strong><small>{selectedPatient?.patient_number ?? 'No patient number'}</small></div>
                <div><span>Responsible party</span><strong>{selectedResponsibleParty?.full_name ?? 'Not captured'}</strong><small>{selectedResponsibleParty?.phone ?? selectedResponsibleParty?.email ?? 'No contact detail'}</small></div>
                <div><span>Therapist</span><strong>{selectedTherapist?.display_name ?? 'No therapist'}</strong><small>{selectedTherapist?.profession ?? 'No profession'}</small></div>
                <div><span>Location</span><strong>{selectedLocation?.location_name ?? 'No location'}</strong><small>{selectedBooking.room_label ?? selectedLocation?.room_venue_notes ?? ''}</small></div>
                <div><span>Scheduled start</span><strong>{formatDateTime(selectedBooking.start_at)}</strong></div>
                <div><span>Scheduled end</span><strong>{formatDateTime(selectedBooking.end_at)}</strong></div>
                <div><span>Booking status</span><strong>{formatLabel(selectedBooking.booking_status)}</strong></div>
                <div><span>Type / modality</span><strong>{formatLabel(selectedBooking.booking_type)} · {formatLabel(selectedBooking.appointment_mode)}</strong></div>
                {selectedSession && <div><span>Actual start</span><strong>{formatDateTime(selectedSession.actual_start_at)}</strong></div>}
                {selectedSession && <div><span>Actual end</span><strong>{formatDateTime(selectedSession.actual_end_at)}</strong></div>}
                {selectedSession && <div><span>Actual duration</span><strong>{selectedSession.actual_duration_minutes ? `${selectedSession.actual_duration_minutes} min` : 'Not captured'}</strong></div>}
                {selectedSession && <div><span>Attendance</span><strong>{formatLabel(selectedSession.attendance_outcome)}</strong></div>}
                {selectedSession && <div><span>Outcome</span><strong>{selectedSession.session_outcome ? formatLabel(selectedSession.session_outcome) : 'Not captured'}</strong></div>}
                {selectedSession && <div><span>Draft invoice</span><strong>{formatLabel(selectedSession.draft_invoice_request_status)}</strong><small>{formatDateTime(selectedSession.draft_invoice_requested_at)}</small></div>}
                {selectedSession && <div><span>Reopened</span><strong>{formatDateTime(selectedSession.reopened_at)}</strong><small>{selectedSession.reopen_reason ?? ''}</small></div>}
              </div>
            ) : (
              <EmptyState title="No session selected" description="Select a session or eligible booking from the queue." />
            )}
          </Card>

          {selectedSession && (
            <Card className="patients-foundation-card">
              <span>Lifecycle actions</span>
              <div className="patients-foundation-grid">
                {['not_started', 'ready', 'reopened'].includes(selectedSession.session_status) && <Button variant="secondary" disabled={saving || !canManageSession} onClick={startSession}>Start Session</Button>}
                {selectedSession.session_status === 'in_progress' && <Button variant="secondary" disabled={saving || !canManageSession} onClick={() => pauseOrResumeSession('paused')}>Pause</Button>}
                {selectedSession.session_status === 'paused' && <Button variant="secondary" disabled={saving || !canManageSession} onClick={() => pauseOrResumeSession('in_progress')}>Resume</Button>}
                {!isTerminalSession(selectedSession.session_status) && <Button variant="secondary" disabled={saving || !canManageSession} onClick={() => cancelOrNoShowSession('cancelled')}>Cancel</Button>}
                {['not_started', 'ready'].includes(selectedSession.session_status) && <Button variant="secondary" disabled={saving || !canManageSession} onClick={() => cancelOrNoShowSession('no_show')}>No Show</Button>}
                {selectedSession.session_status === 'completed' && <StatusBadge tone="warning">Future finance reconciliation may be required if reopened</StatusBadge>}
              </div>
            </Card>
          )}

          {selectedSession && (
            <Card className="practice-profile-form-card">
              <div className="practice-profile-form-header">
                <div>
                  <span>Delivered procedures</span>
                  <h3>{formatMoney(procedureDraftTotal || sessionTotal)}</h3>
                </div>
                <div className="patients-action-row">
                  {canReadPricing && canEditSelectedSession && <Button variant="secondary" disabled={saving} onClick={addProcedure}>Add Procedure</Button>}
                  {canEditSelectedSession && <Button disabled={saving} onClick={saveProcedures}>Save Procedures</Button>}
                </div>
              </div>

              <div className="booking-procedure-list">
                {procedureDrafts.length === 0 ? (
                  <EmptyState title="No delivered procedures" description="Session procedures are copied from booking procedures when the session is created." />
                ) : procedureDrafts.map((procedure, index) => (
                  <article key={procedure.id ?? `new-${index}`}>
                    <label><span>Procedure</span><input value={procedure.procedure_name} disabled={!canEditSelectedSession || saving} onChange={(event) => updateProcedureDraft(index, { procedure_name: event.target.value, differs_from_booking: true })} /></label>
                    <label><span>Code</span><input value={procedure.procedure_code} disabled={!canEditSelectedSession || saving} onChange={(event) => updateProcedureDraft(index, { procedure_code: event.target.value, differs_from_booking: true })} /></label>
                    <label><span>Qty</span><input type="number" min="1" step="1" value={procedure.quantity} disabled={!canEditSelectedSession || saving} onChange={(event) => updateProcedureDraft(index, { quantity: event.target.value, differs_from_booking: true })} /></label>
                    <label><span>Price</span><input type="number" min="0" step="0.01" value={procedure.unit_price} disabled={!canEditSelectedSession || saving || !canReadPricing} onChange={(event) => updateProcedureDraft(index, { unit_price: event.target.value, differs_from_booking: true })} /></label>
                    <label><span>Duration</span><input type="number" min="1" step="1" value={procedure.duration_minutes} disabled={!canEditSelectedSession || saving} onChange={(event) => updateProcedureDraft(index, { duration_minutes: event.target.value, differs_from_booking: true })} /></label>
                    <label><span>Change reason</span><input value={procedure.change_reason} disabled={!canEditSelectedSession || saving || !procedure.differs_from_booking} onChange={(event) => updateProcedureDraft(index, { change_reason: event.target.value })} /></label>
                    <div><strong>{formatMoney((Number(procedure.unit_price) || 0) * (Number(procedure.quantity) || 0))}</strong><span>{procedure.differs_from_booking ? 'Changed' : 'From booking'}</span></div>
                    {canEditSelectedSession && <button type="button" disabled={saving} onClick={() => removeProcedureDraft(index)}>Remove</button>}
                  </article>
                ))}
              </div>
              {!canReadPricing && <p className="session-foundation-note">Pricing edits are restricted. Existing session procedure snapshots are still visible for finance readiness.</p>}
            </Card>
          )}

          {selectedSession && (
            <Card className="practice-profile-form-card">
              <div className="practice-profile-form-header">
                <div>
                  <span>Completion workflow</span>
                  <h3>Actual care delivery</h3>
                </div>
                {canCompleteSession && <Button disabled={saving || selectedSession.session_status === 'completed'} onClick={completeSession}>Complete Session</Button>}
              </div>
              <div className="settings-form-grid booking-form-grid">
                <label><span>Actual start</span><input type="datetime-local" value={completionForm.actual_start_at} disabled={!canCompleteSession || saving || selectedSession.session_status === 'completed'} onChange={(event) => setCompletionForm((current) => ({ ...current, actual_start_at: event.target.value }))} /></label>
                <label><span>Actual end</span><input type="datetime-local" value={completionForm.actual_end_at} disabled={!canCompleteSession || saving || selectedSession.session_status === 'completed'} onChange={(event) => setCompletionForm((current) => ({ ...current, actual_end_at: event.target.value }))} /></label>
                <label><span>Attendance</span><select value={completionForm.attendance_outcome} disabled={!canCompleteSession || saving || selectedSession.session_status === 'completed'} onChange={(event) => setCompletionForm((current) => ({ ...current, attendance_outcome: event.target.value }))}>{attendanceOutcomes.map((outcome) => <option value={outcome} key={outcome}>{formatLabel(outcome)}</option>)}</select></label>
                <label><span>Outcome</span><select value={completionForm.session_outcome} disabled={!canCompleteSession || saving || selectedSession.session_status === 'completed'} onChange={(event) => setCompletionForm((current) => ({ ...current, session_outcome: event.target.value }))}>{sessionOutcomes.map((outcome) => <option value={outcome} key={outcome}>{formatLabel(outcome)}</option>)}</select></label>
                <label className="wide-field"><span>Operational summary</span><textarea value={completionForm.operational_summary} disabled={!canCompleteSession || saving || selectedSession.session_status === 'completed'} onChange={(event) => setCompletionForm((current) => ({ ...current, operational_summary: event.target.value }))} /></label>
              </div>
              <p className="session-foundation-note">Completion records draft-invoice readiness only. Invoice creation is deferred to the Finance Engine.</p>
            </Card>
          )}

          {selectedSession && selectedSession.session_status === 'completed' && (
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

          {selectedSession && canReadInternalNotes && (
            <Card className="practice-profile-form-card">
              <div className="practice-profile-form-header">
                <div>
                  <span>Operational notes</span>
                  <h3>Non-clinical only</h3>
                </div>
                {canManageSession && <Button variant="secondary" disabled={saving} onClick={saveOperationalNote}>Save Note</Button>}
              </div>
              <label className="session-note-editor">
                <span>Internal operational note</span>
                <textarea value={noteBody} disabled={!canManageSession || saving} onChange={(event) => setNoteBody(event.target.value)} />
              </label>
              <p className="session-foundation-note">Do not capture clinical process notes here. Clinical documentation remains a future engine.</p>
            </Card>
          )}

          {selectedSession && (
            <Card className="patients-foundation-card">
              <span>Status history and workflow events</span>
              <div className="booking-history-grid">
                <div>
                  <strong>Status history</strong>
                  {selectedSessionHistory.length === 0 ? (
                    <p>No session status history recorded yet.</p>
                  ) : selectedSessionHistory.map((history) => (
                    <article key={history.id}>
                      <strong>{formatLabel(history.event_type)}</strong>
                      <span>{formatLabel(history.from_status ?? 'none')} to {formatLabel(history.to_status)} · {formatDateTime(history.created_at)}</span>
                      {history.event_reason && <p>{history.event_reason}</p>}
                    </article>
                  ))}
                </div>
                <div>
                  <strong>Workflow events</strong>
                  {selectedSessionEvents.length === 0 ? (
                    <p>No session workflow events recorded yet.</p>
                  ) : selectedSessionEvents.map((event) => (
                    <article key={event.id}>
                      <strong>{formatLabel(event.event_type)}</strong>
                      <span>{formatLabel(event.event_status)} · {formatDateTime(event.created_at)}</span>
                      {event.error_message && <p>{event.error_message}</p>}
                    </article>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {(actionError || successMessage) && (
            <div className={`practice-profile-message ${actionError ? 'error' : 'success'}`}>
              {actionError || successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
