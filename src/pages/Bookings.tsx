import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database, Json } from '../lib/database.types'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']
type BookingProcedureRow = Database['public']['Tables']['booking_procedures']['Row']
type BookingProcedureInsert = Database['public']['Tables']['booking_procedures']['Insert']
type BookingStatusHistoryInsert = Database['public']['Tables']['booking_status_history']['Insert']
type BookingStatusHistoryRow = Database['public']['Tables']['booking_status_history']['Row']
type BookingNoteRow = Database['public']['Tables']['booking_notes']['Row']
type BookingNoteInsert = Database['public']['Tables']['booking_notes']['Insert']
type BookingNoteUpdate = Database['public']['Tables']['booking_notes']['Update']
type BookingWorkflowEventInsert = Database['public']['Tables']['booking_workflow_events']['Insert']
type BookingWorkflowEventRow = Database['public']['Tables']['booking_workflow_events']['Row']
type PatientRow = Database['public']['Tables']['patients']['Row']
type PatientHistoryEventInsert = Database['public']['Tables']['patient_history_events']['Insert']
type ResponsiblePartyRow = Database['public']['Tables']['responsible_parties']['Row']
type TherapistRow = Database['public']['Tables']['therapist_profiles']['Row']
type LocationRow = Database['public']['Tables']['practice_locations']['Row']
type PriceListRow = Database['public']['Tables']['price_lists']['Row']
type PriceListItemRow = Database['public']['Tables']['price_list_items']['Row']

type CalendarMode = 'day' | 'week'

type BookingFormState = {
  patient_id: string
  therapist_profile_id: string
  practice_location_id: string
  price_list_id: string
  booking_status: string
  booking_type: string
  booking_source: string
  appointment_mode: string
  booking_date: string
  start_time: string
  duration_minutes: string
  patient_facing_title: string
  patient_facing_notes: string
  internal_admin_note: string
}

type ProcedureSelection = {
  booking_procedure_id?: string
  price_list_item_id: string
  quantity: string
  procedure_name?: string
  procedure_code?: string | null
  description?: string | null
  unit_price?: number
  duration_minutes?: number | null
  currency_code?: string
}

const bookingStatuses = ['draft', 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']
const blockingBookingStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress']
const bookingTypes = ['standard', 'assessment', 'review', 'group', 'admin', 'other']
const bookingSources = ['internal', 'patient_link', 'phone', 'email', 'imported', 'external_calendar']
const appointmentModes = ['in_person', 'telehealth', 'home_visit', 'school_visit', 'other']

const emptyBookingForm: BookingFormState = {
  patient_id: '',
  therapist_profile_id: '',
  practice_location_id: '',
  price_list_id: '',
  booking_status: 'scheduled',
  booking_type: 'standard',
  booking_source: 'internal',
  appointment_mode: 'in_person',
  booking_date: formatDateInput(new Date()),
  start_time: '09:00',
  duration_minutes: '60',
  patient_facing_title: '',
  patient_facing_notes: '',
  internal_admin_note: '',
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function formatPatientName(patient: PatientRow | null | undefined) {
  if (!patient) return 'Unknown patient'
  return `${patient.first_name} ${patient.last_name}`.trim()
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date)
  const day = nextDate.getDay()
  const diff = day === 0 ? -6 : 1 - day
  nextDate.setDate(nextDate.getDate() + diff)
  return nextDate
}

function combineDateTime(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`)
}

function formatTime(dateValue: string | null) {
  if (!dateValue) return 'No time'
  return new Date(dateValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

function formatMoney(value: number) {
  return `R ${value.toFixed(2)}`
}

function getBookingEnd(dateValue: string, timeValue: string, durationMinutes: number) {
  const start = combineDateTime(dateValue, timeValue)
  return new Date(start.getTime() + durationMinutes * 60_000)
}

function getBookingTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled' || status === 'no_show') return 'danger'
  if (status === 'checked_in' || status === 'in_progress') return 'warning'
  if (status === 'confirmed') return 'info'
  return 'neutral'
}

function isTerminalBooking(status: string) {
  return status === 'completed' || status === 'cancelled' || status === 'no_show'
}

function isScheduleChanged(previousBooking: BookingRow | null, startAt: string, endAt: string) {
  if (!previousBooking) return false
  return previousBooking.start_at !== startAt || previousBooking.end_at !== endAt
}

function getEditableStatusOptions(booking: BookingRow | null) {
  if (!booking) return ['draft', 'scheduled']
  if (booking.booking_status === 'draft') return ['draft', 'scheduled']
  if (booking.booking_status === 'scheduled') return ['scheduled', 'confirmed']
  return [booking.booking_status]
}

function getProcedureSignature(procedure: Pick<BookingProcedureRow, 'price_list_item_id' | 'procedure_name' | 'procedure_code' | 'description' | 'unit_price' | 'quantity' | 'line_total' | 'duration_minutes' | 'currency_code'>) {
  return [
    procedure.price_list_item_id ?? '',
    procedure.procedure_name,
    procedure.procedure_code ?? '',
    procedure.description ?? '',
    procedure.unit_price,
    procedure.quantity,
    procedure.line_total,
    procedure.duration_minutes ?? '',
    procedure.currency_code,
  ].join('|')
}

function getSelectionSignature(selection: ProcedureSelection, item: PriceListItemRow | undefined) {
  const quantity = Number(selection.quantity)
  const unitPrice = selection.booking_procedure_id ? selection.unit_price ?? item?.price ?? 0 : item?.price ?? 0
  const lineTotal = unitPrice * quantity

  return [
    selection.price_list_item_id,
    selection.booking_procedure_id ? selection.procedure_name ?? item?.procedure_name ?? 'Procedure' : item?.procedure_name ?? 'Procedure',
    selection.booking_procedure_id ? selection.procedure_code ?? item?.procedure_code ?? '' : item?.procedure_code ?? '',
    selection.booking_procedure_id ? selection.description ?? item?.description ?? '' : item?.description ?? '',
    unitPrice,
    quantity,
    lineTotal,
    selection.booking_procedure_id ? selection.duration_minutes ?? item?.duration_minutes ?? '' : item?.duration_minutes ?? '',
    selection.currency_code ?? 'ZAR',
  ].join('|')
}

function createWorkflowKey(bookingId: string, eventType: string, detail = '') {
  return ['booking', bookingId, eventType, detail].filter(Boolean).join(':')
}

function getWorkflowEventTypeForStatus(status: string) {
  if (status === 'scheduled') return 'booking_created'
  if (status === 'confirmed') return 'booking_confirmed'
  if (status === 'checked_in') return 'patient_checked_in'
  if (status === 'cancelled') return 'booking_cancelled'
  if (status === 'no_show') return 'no_show_recorded'
  return 'status_changed'
}

function getPatientHistoryCopy(eventType: string, booking: BookingRow, patientName: string) {
  const bookingTime = `${formatDateTime(booking.start_at)} to ${formatTime(booking.end_at)}`

  if (eventType === 'booking_created') {
    return {
      title: 'Booking created',
      body: `${patientName} was booked for ${bookingTime}.`,
    }
  }
  if (eventType === 'booking_confirmed') {
    return {
      title: 'Booking confirmed',
      body: `${patientName}'s booking for ${bookingTime} was confirmed.`,
    }
  }
  if (eventType === 'booking_rescheduled') {
    return {
      title: 'Booking rescheduled',
      body: `${patientName}'s booking was moved to ${bookingTime}.`,
    }
  }
  if (eventType === 'booking_cancelled') {
    return {
      title: 'Booking cancelled',
      body: `${patientName}'s booking for ${bookingTime} was cancelled.`,
    }
  }
  if (eventType === 'patient_checked_in') {
    return {
      title: 'Patient checked in',
      body: `${patientName} checked in for the booking at ${bookingTime}.`,
    }
  }
  if (eventType === 'no_show_recorded') {
    return {
      title: 'No show recorded',
      body: `${patientName} was marked as a no show for ${bookingTime}.`,
    }
  }

  return {
    title: 'Booking updated',
    body: `${patientName}'s booking was updated.`,
  }
}

function formFromBooking(booking: BookingRow | null, note: BookingNoteRow | null): BookingFormState {
  if (!booking) return emptyBookingForm
  const startAt = booking.start_at ? new Date(booking.start_at) : new Date()

  return {
    patient_id: booking.patient_id,
    therapist_profile_id: booking.therapist_profile_id ?? '',
    practice_location_id: booking.practice_location_id ?? '',
    price_list_id: booking.price_list_id ?? '',
    booking_status: booking.booking_status,
    booking_type: booking.booking_type,
    booking_source: booking.booking_source,
    appointment_mode: booking.appointment_mode,
    booking_date: formatDateInput(startAt),
    start_time: startAt.toTimeString().slice(0, 5),
    duration_minutes: String(booking.duration_minutes ?? 60),
    patient_facing_title: booking.patient_facing_title ?? '',
    patient_facing_notes: booking.patient_facing_notes ?? '',
    internal_admin_note: note?.body ?? '',
  }
}

export function BookingsPage() {
  const { activeTenant, profile } = useAuth()
  const authorization = useAuthorization()
  const canManageBookings = authorization.hasPermission('tenant.bookings.manage')
  const canReadPricing = authorization.hasPermission('tenant.finance.view', 'tenant.practice.configure')
  const canReadInternalNotes = authorization.hasRole('admin', 'receptionist', 'therapist')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [therapists, setTherapists] = useState<TherapistRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [priceLists, setPriceLists] = useState<PriceListRow[]>([])
  const [priceListItems, setPriceListItems] = useState<PriceListItemRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [bookingProcedures, setBookingProcedures] = useState<BookingProcedureRow[]>([])
  const [bookingNotes, setBookingNotes] = useState<BookingNoteRow[]>([])
  const [bookingStatusHistory, setBookingStatusHistory] = useState<BookingStatusHistoryRow[]>([])
  const [bookingWorkflowEvents, setBookingWorkflowEvents] = useState<BookingWorkflowEventRow[]>([])
  const [responsibleParties, setResponsibleParties] = useState<ResponsiblePartyRow[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()))
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('day')
  const [therapistFilter, setTherapistFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [formState, setFormState] = useState<BookingFormState>(emptyBookingForm)
  const [procedureSelections, setProcedureSelections] = useState<ProcedureSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  )
  const selectedBookingNote = useMemo(
    () => bookingNotes.find((note) => note.booking_id === selectedBookingId && note.note_type === 'internal_admin') ?? null,
    [bookingNotes, selectedBookingId],
  )
  const selectedBookingProcedures = useMemo(
    () => bookingProcedures.filter((procedure) => procedure.booking_id === selectedBookingId),
    [bookingProcedures, selectedBookingId],
  )
  const selectedBookingStatusHistory = useMemo(
    () => bookingStatusHistory.filter((history) => history.booking_id === selectedBookingId),
    [bookingStatusHistory, selectedBookingId],
  )
  const selectedBookingWorkflowEvents = useMemo(
    () => bookingWorkflowEvents.filter((event) => event.booking_id === selectedBookingId),
    [bookingWorkflowEvents, selectedBookingId],
  )
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === formState.patient_id) ?? null,
    [formState.patient_id, patients],
  )
  const selectedResponsibleParty = useMemo(
    () => responsibleParties.find((party) => party.patient_id === formState.patient_id && party.is_billing_contact)
      ?? responsibleParties.find((party) => party.patient_id === formState.patient_id && party.is_primary)
      ?? responsibleParties.find((party) => party.patient_id === formState.patient_id)
      ?? null,
    [formState.patient_id, responsibleParties],
  )
  const selectedTherapist = useMemo(
    () => therapists.find((therapist) => therapist.id === formState.therapist_profile_id) ?? null,
    [formState.therapist_profile_id, therapists],
  )
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === formState.practice_location_id) ?? null,
    [formState.practice_location_id, locations],
  )
  const visibleDates = useMemo(() => {
    const baseDate = new Date(`${selectedDate}T00:00:00`)
    if (calendarMode === 'day') return [baseDate]
    const weekStart = startOfWeek(baseDate)
    return Array.from({ length: 6 }, (_, index) => addDays(weekStart, index))
  }, [calendarMode, selectedDate])
  const filteredBookings = useMemo(() => {
    const dateKeys = new Set(visibleDates.map((date) => formatDateInput(date)))

    return bookings
      .filter((booking) => {
        const bookingDate = booking.start_at ? formatDateInput(new Date(booking.start_at)) : ''
        const matchesDate = dateKeys.has(bookingDate)
        const matchesTherapist = therapistFilter === 'all' || booking.therapist_profile_id === therapistFilter
        const matchesLocation = locationFilter === 'all' || booking.practice_location_id === locationFilter
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'active' && !isTerminalBooking(booking.booking_status))
          || booking.booking_status === statusFilter

        return matchesDate && matchesTherapist && matchesLocation && matchesStatus
      })
      .sort((left, right) => (left.start_at ?? '').localeCompare(right.start_at ?? ''))
  }, [bookings, locationFilter, statusFilter, therapistFilter, visibleDates])
  const procedureTotal = useMemo(() => {
    return procedureSelections.reduce((total, selection) => {
      const item = priceListItems.find((priceItem) => priceItem.id === selection.price_list_item_id)
      const quantity = Number(selection.quantity)
      const unitPrice = selection.unit_price ?? item?.price
      if (unitPrice === undefined || Number.isNaN(quantity)) return total
      return total + unitPrice * quantity
    }, 0)
  }, [priceListItems, procedureSelections])
  const selectedBookingSnapshotTotal = useMemo(
    () => selectedBookingProcedures.reduce((total, procedure) => total + procedure.line_total, 0),
    [selectedBookingProcedures],
  )
  const canEditSelectedBooking = canManageBookings && (!selectedBooking || !isTerminalBooking(selectedBooking.booking_status))
  const editableStatusOptions = useMemo(() => getEditableStatusOptions(selectedBooking), [selectedBooking])

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

    let isMounted = true
    const tenantId = activeTenant.id
    const supabaseClient = supabase
    const pricingEmptyResult = Promise.resolve({ data: [], error: null })
    const notesEmptyResult = Promise.resolve({ data: [], error: null })

    async function loadBookingWorkspace() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const [
        patientsResult,
        responsiblePartiesResult,
        therapistsResult,
        locationsResult,
        priceListsResult,
        priceListItemsResult,
        bookingsResult,
        proceduresResult,
        statusHistoryResult,
        workflowEventsResult,
        notesResult,
      ] = await Promise.all([
        supabaseClient
          .from('patients')
          .select('id, tenant_id, patient_number, patient_status, patient_type, title, first_name, last_name, preferred_name, date_of_birth, id_number, gender, language, email, phone, referral_source, active_icd10_code, assigned_therapist_profile_id, intake_sent_at, intake_started_at, intake_completed_at, reviewed_at, archived_at, archive_reason, merged_into_patient_id, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('last_name', { ascending: true }),
        supabaseClient
          .from('responsible_parties')
          .select('id, tenant_id, patient_id, party_type, relationship_to_patient, full_name, organisation_name, id_number, email, phone, is_primary, is_billing_contact, account_responsibility_status, medical_aid_member_number, medical_aid_dependant_code, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('is_billing_contact', { ascending: false })
          .order('is_primary', { ascending: false }),
        supabaseClient
          .from('therapist_profiles')
          .select('id, tenant_id, user_id, display_name, profession, qualifications, bio, default_appointment_duration_minutes, default_billing_rate, practice_number, billing_name, billing_email, billing_phone, is_active, metadata, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('display_name', { ascending: true }),
        supabaseClient
          .from('practice_locations')
          .select('id, tenant_id, practice_profile_id, location_name, location_type, address_line_1, address_line_2, suburb, city, province, postal_code, country, contact_email, contact_phone, room_venue_notes, is_main_location, is_active, metadata, created_at, updated_at, deleted_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('location_name', { ascending: true }),
        canReadPricing
          ? supabaseClient
              .from('price_lists')
              .select('id, tenant_id, name, description, list_type, is_default, is_active, metadata, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .eq('is_active', true)
              .order('is_default', { ascending: false })
              .order('name', { ascending: true })
          : pricingEmptyResult,
        canReadPricing
          ? supabaseClient
              .from('price_list_items')
              .select('id, tenant_id, price_list_id, procedure_name, procedure_code, description, price, duration_minutes, is_active, metadata, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .eq('is_active', true)
              .order('procedure_name', { ascending: true })
          : pricingEmptyResult,
        supabaseClient
          .from('bookings')
          .select('id, tenant_id, patient_id, therapist_profile_id, practice_location_id, price_list_id, recurrence_rule_id, booking_status, booking_type, booking_source, appointment_mode, start_at, end_at, duration_minutes, timezone, room_label, patient_facing_title, patient_facing_notes, cancellation_reason, cancelled_at, no_show_at, checked_in_at, in_progress_at, completed_at, rescheduled_from_booking_id, session_ready, draft_invoice_ready, patient_link_visible, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('start_at', { ascending: true }),
        supabaseClient
          .from('booking_procedures')
          .select('id, tenant_id, booking_id, price_list_id, price_list_item_id, procedure_name, procedure_code, description, unit_price, quantity, discount_amount, adjustment_amount, line_total, duration_minutes, currency_code, is_billable, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('booking_status_history')
          .select('id, tenant_id, booking_id, from_status, to_status, event_type, event_reason, old_start_at, old_end_at, new_start_at, new_end_at, is_patient_visible, metadata, created_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('booking_workflow_events')
          .select('id, tenant_id, booking_id, event_type, idempotency_key, event_status, payload, processed_at, failed_at, error_message, created_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        canReadInternalNotes
          ? supabaseClient
              .from('booking_notes')
              .select('id, tenant_id, booking_id, note_type, title, body, is_patient_visible, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : notesEmptyResult,
      ])

      if (!isMounted) return

      const firstError = patientsResult.error || responsiblePartiesResult.error || therapistsResult.error || locationsResult.error || priceListsResult.error || priceListItemsResult.error || bookingsResult.error || proceduresResult.error || statusHistoryResult.error || workflowEventsResult.error || notesResult.error
      if (firstError) {
        setLoadError(firstError.message)
        setLoading(false)
        return
      }

      setPatients((patientsResult.data ?? []) as PatientRow[])
      setResponsibleParties((responsiblePartiesResult.data ?? []) as ResponsiblePartyRow[])
      setTherapists((therapistsResult.data ?? []) as TherapistRow[])
      setLocations((locationsResult.data ?? []) as LocationRow[])
      const nextPriceLists = (priceListsResult.data ?? []) as PriceListRow[]
      setPriceLists(nextPriceLists)
      setPriceListItems((priceListItemsResult.data ?? []) as PriceListItemRow[])
      const nextBookings = (bookingsResult.data ?? []) as BookingRow[]
      setBookings(nextBookings)
      setBookingProcedures((proceduresResult.data ?? []) as BookingProcedureRow[])
      setBookingStatusHistory((statusHistoryResult.data ?? []) as BookingStatusHistoryRow[])
      setBookingWorkflowEvents((workflowEventsResult.data ?? []) as BookingWorkflowEventRow[])
      setBookingNotes((notesResult.data ?? []) as BookingNoteRow[])

      const defaultPriceList = nextPriceLists.find((priceList) => priceList.is_default) ?? nextPriceLists[0] ?? null
      const firstBooking = nextBookings.find((booking) => booking.start_at?.slice(0, 10) === selectedDate) ?? nextBookings[0] ?? null
      setSelectedBookingId(firstBooking?.id ?? null)
      if (!firstBooking) {
        setFormState((current) => ({ ...current, price_list_id: defaultPriceList?.id ?? '' }))
      }
      setLoading(false)
    }

    loadBookingWorkspace()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, canReadInternalNotes, canReadPricing])

  useEffect(() => {
    const note = bookingNotes.find((bookingNote) => bookingNote.booking_id === selectedBookingId && bookingNote.note_type === 'internal_admin') ?? null
    const booking = bookings.find((currentBooking) => currentBooking.id === selectedBookingId) ?? null
    setFormState(formFromBooking(booking, note))
    setProcedureSelections(
      booking
        ? bookingProcedures
            .filter((procedure) => procedure.booking_id === booking.id && procedure.price_list_item_id)
            .map((procedure) => ({
              booking_procedure_id: procedure.id,
              price_list_item_id: procedure.price_list_item_id ?? '',
              quantity: String(procedure.quantity),
              procedure_name: procedure.procedure_name,
              procedure_code: procedure.procedure_code,
              description: procedure.description,
              unit_price: procedure.unit_price,
              duration_minutes: procedure.duration_minutes,
              currency_code: procedure.currency_code,
            }))
      : [],
    )
  }, [bookingNotes, bookingProcedures, bookings, selectedBookingId])

  useEffect(() => {
    if (!selectedBookingId) return
    if (filteredBookings.some((booking) => booking.id === selectedBookingId)) return
    setSelectedBookingId(filteredBookings[0]?.id ?? null)
  }, [filteredBookings, selectedBookingId])

  const startNewBooking = () => {
    const defaultPriceList = priceLists.find((priceList) => priceList.is_default) ?? priceLists[0] ?? null
    setSelectedBookingId(null)
    setFormState({
      ...emptyBookingForm,
      booking_date: selectedDate,
      price_list_id: defaultPriceList?.id ?? '',
    })
    setProcedureSelections([])
    setSaveError('')
    setSuccessMessage('')
  }

  const selectBooking = (booking: BookingRow) => {
    setSelectedBookingId(booking.id)
    setSaveError('')
    setSuccessMessage('')
  }

  const updateFormField = <Field extends keyof BookingFormState>(field: Field, value: BookingFormState[Field]) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const activePriceListItems = useMemo(
    () => priceListItems.filter((item) => item.price_list_id === formState.price_list_id),
    [formState.price_list_id, priceListItems],
  )

  const addProcedureSelection = () => {
    const firstItem = activePriceListItems[0]
    if (!firstItem) return
    setProcedureSelections((current) => [...current, { price_list_item_id: firstItem.id, quantity: '1' }])
  }

  const updateProcedureSelection = (index: number, nextSelection: Partial<ProcedureSelection>) => {
    setProcedureSelections((current) => current.map((selection, currentIndex) => (
      currentIndex === index ? { ...selection, ...nextSelection } : selection
    )))
  }

  const removeProcedureSelection = (index: number) => {
    setProcedureSelections((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const createPatientHistoryEvent = async (eventType: string, booking: BookingRow, sourceTable: string, sourceId: string, description?: string) => {
    if (!activeTenant?.id || !supabase) return

    const existingResult = await supabase
      .from('patient_history_events')
      .select('id')
      .eq('tenant_id', activeTenant.id)
      .eq('patient_id', booking.patient_id)
      .eq('event_type', eventType)
      .eq('source_table', sourceTable)
      .eq('source_id', sourceId)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingResult.data) return
    if (existingResult.error) throw new Error('Patient history could not be checked before recording the booking event.')

    const patient = patients.find((currentPatient) => currentPatient.id === booking.patient_id)
    const copy = getPatientHistoryCopy(eventType, booking, formatPatientName(patient))
    const payload: PatientHistoryEventInsert = {
      tenant_id: activeTenant.id,
      patient_id: booking.patient_id,
      event_type: eventType,
      event_title: copy.title,
      event_body: description ?? copy.body,
      source_table: sourceTable,
      source_id: sourceId,
      is_patient_visible: true,
      patient_visible_title: copy.title,
      patient_visible_body: description ?? copy.body,
      created_by_profile_id: profile?.id ?? null,
      metadata: {
        booking_id: booking.id,
        booking_status: booking.booking_status,
        start_at: booking.start_at,
        end_at: booking.end_at,
      },
    }
    const insertResult = await supabase.from('patient_history_events').insert(payload)
    if (insertResult.error) throw new Error('Patient history could not be recorded for this booking event.')
  }

  const createWorkflowEvent = async (eventType: string, booking: BookingRow, detail: string, payload: Json = {}) => {
    if (!activeTenant?.id || !supabase) return null

    const result = await supabase
      .from('booking_workflow_events')
      .insert({
        tenant_id: activeTenant.id,
        booking_id: booking.id,
        event_type: eventType,
        idempotency_key: createWorkflowKey(booking.id, eventType, detail),
        event_status: 'pending',
        payload,
        created_by_profile_id: profile?.id ?? null,
      } satisfies BookingWorkflowEventInsert)
      .select()
      .single()

    if (result.error) {
      if (result.error.code === '23505') return null
      throw new Error('This booking action was already recorded.')
    }

    const event = result.data as BookingWorkflowEventRow
    setBookingWorkflowEvents((currentEvents) => [event, ...currentEvents])
    return event
  }

  const createStatusHistory = async (
    booking: BookingRow,
    eventType: string,
    fromStatus: string | null,
    reason: string,
    oldStartAt: string | null,
    oldEndAt: string | null,
    metadata: Json = {},
  ) => {
    if (!activeTenant?.id || !supabase) return null

    let existingQuery = supabase
      .from('booking_status_history')
      .select('id, tenant_id, booking_id, from_status, to_status, event_type, event_reason, old_start_at, old_end_at, new_start_at, new_end_at, is_patient_visible, metadata, created_by_profile_id, deleted_at, created_at, updated_at')
      .eq('tenant_id', activeTenant.id)
      .eq('booking_id', booking.id)
      .eq('event_type', eventType)
      .eq('to_status', booking.booking_status)
      .is('deleted_at', null)
    existingQuery = booking.start_at ? existingQuery.eq('new_start_at', booking.start_at) : existingQuery.is('new_start_at', null)
    existingQuery = booking.end_at ? existingQuery.eq('new_end_at', booking.end_at) : existingQuery.is('new_end_at', null)
    const existingResult = await existingQuery.maybeSingle()

    if (existingResult.data) return existingResult.data as BookingStatusHistoryRow
    if (existingResult.error) {
      throw new Error('Booking history could not be checked before recording the event.')
    }

    const result = await supabase
      .from('booking_status_history')
      .insert({
        tenant_id: activeTenant.id,
        booking_id: booking.id,
        from_status: fromStatus,
        to_status: booking.booking_status,
        event_type: eventType,
        event_reason: reason,
        old_start_at: oldStartAt,
        old_end_at: oldEndAt,
        new_start_at: booking.start_at,
        new_end_at: booking.end_at,
        is_patient_visible: true,
        metadata,
        created_by_profile_id: profile?.id ?? null,
      } satisfies BookingStatusHistoryInsert)
      .select()
      .single()

    if (result.error) {
      throw new Error('The booking was saved, but the status history could not be recorded.')
    }

    const history = result.data as BookingStatusHistoryRow
    setBookingStatusHistory((currentHistory) => [history, ...currentHistory])
    return history
  }

  const validateBooking = () => {
    const patient = patients.find((currentPatient) => currentPatient.id === formState.patient_id)
    const therapist = therapists.find((currentTherapist) => currentTherapist.id === formState.therapist_profile_id)
    const location = locations.find((currentLocation) => currentLocation.id === formState.practice_location_id)
    const duration = Number(formState.duration_minutes)
    const start = combineDateTime(formState.booking_date, formState.start_time)
    const end = getBookingEnd(formState.booking_date, formState.start_time, duration)

    if (!patient) return 'Patient is required.'
    if (patient.patient_status === 'archived') return 'Archived patients cannot receive new bookings.'
    if (!therapist) return 'Therapist is required.'
    if (!therapist.is_active) return 'Inactive therapists cannot receive new bookings.'
    if (!location) return 'Location is required.'
    if (!location.is_active) return 'Inactive locations cannot receive new bookings.'
    if (!formState.booking_date || !formState.start_time || Number.isNaN(start.getTime())) return 'A valid booking date and start time are required.'
    if (!Number.isFinite(duration) || duration <= 0) return 'Duration must be a positive number of minutes.'
    if (end <= start) return 'End time must be after start time.'
    if (selectedBooking && isTerminalBooking(selectedBooking.booking_status)) return 'Terminal bookings cannot be edited in this foundation.'
    if (selectedBooking && (selectedBooking.booking_status === 'checked_in' || selectedBooking.booking_status === 'in_progress' || selectedBooking.booking_status === 'completed')) {
      return 'Checked-in, in-progress and completed bookings cannot be rescheduled from this workspace yet.'
    }
    if (!editableStatusOptions.includes(formState.booking_status)) return `Cannot move ${formatLabel(selectedBooking?.booking_status ?? 'new')} booking to ${formatLabel(formState.booking_status)} from this workspace.`

    const seenProcedures = new Set<string>()
    if (canReadPricing) {
      for (const selection of procedureSelections) {
        const item = priceListItems.find((priceItem) => priceItem.id === selection.price_list_item_id)
        const quantity = Number(selection.quantity)
        const unitPrice = selection.booking_procedure_id ? selection.unit_price ?? item?.price : item?.price
        if (!item) return 'Every selected procedure must exist in the active price list.'
        if (!Number.isFinite(quantity) || quantity <= 0) return 'Procedure quantities must be positive.'
        if (unitPrice === undefined || unitPrice < 0) return 'Procedure prices must be valid.'
        if (seenProcedures.has(selection.price_list_item_id)) return 'Duplicate procedure line items are not allowed. Increase the quantity instead.'
        seenProcedures.add(selection.price_list_item_id)
      }
    }

    const conflict = bookings.find((booking) => {
      if (booking.id === selectedBookingId) return false
      if (booking.therapist_profile_id !== formState.therapist_profile_id) return false
      if (!blockingBookingStatuses.includes(booking.booking_status)) return false
      if (!booking.start_at || !booking.end_at) return false
      const existingStart = new Date(booking.start_at)
      const existingEnd = new Date(booking.end_at)
      return existingStart < end && existingEnd > start
    })

    if (conflict) {
      const conflictPatient = patients.find((currentPatient) => currentPatient.id === conflict.patient_id)
      return `Conflict: ${selectedTherapist?.display_name ?? 'Therapist'} already has ${formatPatientName(conflictPatient)} from ${formatTime(conflict.start_at)} to ${formatTime(conflict.end_at)}.`
    }

    return ''
  }

  const saveBooking = async () => {
    if (!activeTenant?.id || !supabase || !canManageBookings || saving) return

    const validationError = validateBooking()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const duration = Number(formState.duration_minutes)
    const start = combineDateTime(formState.booking_date, formState.start_time)
    const end = getBookingEnd(formState.booking_date, formState.start_time, duration)
    const startIso = start.toISOString()
    const endIso = end.toISOString()
    const scheduleChanged = isScheduleChanged(selectedBooking, startIso, endIso)
    const statusChanged = Boolean(selectedBooking && selectedBooking.booking_status !== formState.booking_status)
    const statusLifecycleEvent = formState.booking_status === 'confirmed'
      ? 'booking_confirmed'
      : selectedBooking?.booking_status === 'draft' && formState.booking_status === 'scheduled'
        ? 'booking_created'
        : ''
    const eventType = !selectedBooking ? 'booking_created' : scheduleChanged ? 'booking_rescheduled' : statusChanged ? statusLifecycleEvent : ''
    const bookingPayload: Omit<BookingInsert, 'tenant_id' | 'patient_id'> = {
      therapist_profile_id: formState.therapist_profile_id,
      practice_location_id: formState.practice_location_id,
      price_list_id: formState.price_list_id || null,
      booking_status: formState.booking_status,
      booking_type: formState.booking_type,
      booking_source: formState.booking_source,
      appointment_mode: formState.appointment_mode,
      start_at: startIso,
      end_at: endIso,
      duration_minutes: duration,
      timezone: activeTenant.time_zone ?? 'Africa/Johannesburg',
      room_label: selectedLocation?.room_venue_notes ?? null,
      patient_facing_title: formState.patient_facing_title.trim() || null,
      patient_facing_notes: formState.patient_facing_notes.trim() || null,
      session_ready: formState.booking_status === 'scheduled' || formState.booking_status === 'confirmed',
      draft_invoice_ready: procedureSelections.length > 0,
      patient_link_visible: true,
      updated_by_profile_id: profile?.id ?? null,
    }

    const bookingResult = selectedBooking
      ? await supabase
          .from('bookings')
          .update(bookingPayload satisfies BookingUpdate)
          .eq('id', selectedBooking.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('bookings')
          .insert({
            ...bookingPayload,
            tenant_id: activeTenant.id,
            patient_id: formState.patient_id,
            created_by_profile_id: profile?.id ?? null,
          })
          .select()
          .single()

    if (bookingResult.error) {
      setSaveError(bookingResult.error.message)
      setSaving(false)
      return
    }

    const savedBooking = bookingResult.data as BookingRow

    let savedProcedures: BookingProcedureRow[] = bookingProcedures.filter((procedure) => procedure.booking_id === savedBooking.id)
    if (canReadPricing) {
      const existingProcedures = bookingProcedures.filter((procedure) => procedure.booking_id === savedBooking.id)
      const existingSignature = existingProcedures.map(getProcedureSignature).sort().join('::')
      const nextSignature = procedureSelections
        .map((selection) => getSelectionSignature(selection, priceListItems.find((priceItem) => priceItem.id === selection.price_list_item_id)))
        .sort()
        .join('::')
      const proceduresChanged = existingSignature !== nextSignature

      if (proceduresChanged) {
        const existingProcedureIds = existingProcedures.map((procedure) => procedure.id)
        if (existingProcedureIds.length > 0) {
          const archiveResult = await supabase
            .from('booking_procedures')
            .update({ deleted_at: new Date().toISOString(), updated_by_profile_id: profile?.id ?? null })
            .in('id', existingProcedureIds)
            .eq('tenant_id', activeTenant.id)

          if (archiveResult.error) {
            setSaveError(archiveResult.error.message)
            setSaving(false)
            return
          }
        }

        const procedurePayloads: BookingProcedureInsert[] = procedureSelections.map((selection) => {
          const item = priceListItems.find((priceItem) => priceItem.id === selection.price_list_item_id)
          const quantity = Number(selection.quantity)
          const unitPrice = selection.booking_procedure_id ? selection.unit_price ?? item?.price ?? 0 : item?.price ?? 0
          const lineTotal = unitPrice * quantity
          return {
            tenant_id: activeTenant.id,
            booking_id: savedBooking.id,
            price_list_id: formState.price_list_id || null,
            price_list_item_id: item?.id ?? null,
            procedure_name: selection.booking_procedure_id ? selection.procedure_name ?? item?.procedure_name ?? 'Procedure' : item?.procedure_name ?? 'Procedure',
            procedure_code: selection.booking_procedure_id ? selection.procedure_code ?? item?.procedure_code ?? null : item?.procedure_code ?? null,
            description: selection.booking_procedure_id ? selection.description ?? item?.description ?? null : item?.description ?? null,
            unit_price: unitPrice,
            quantity,
            discount_amount: 0,
            adjustment_amount: 0,
            line_total: lineTotal,
            duration_minutes: selection.booking_procedure_id ? selection.duration_minutes ?? item?.duration_minutes ?? null : item?.duration_minutes ?? null,
            currency_code: selection.currency_code ?? 'ZAR',
            is_billable: true,
            created_by_profile_id: profile?.id ?? null,
            updated_by_profile_id: profile?.id ?? null,
          }
        })

        savedProcedures = []
        if (procedurePayloads.length > 0) {
          const proceduresResult = await supabase.from('booking_procedures').insert(procedurePayloads).select()
          if (proceduresResult.error) {
            setSaveError(proceduresResult.error.message)
            setSaving(false)
            return
          }
          savedProcedures = (proceduresResult.data ?? []) as BookingProcedureRow[]
        }
      }
    }

    if (canReadInternalNotes && selectedBookingNote && !formState.internal_admin_note.trim()) {
      const archiveNoteResult = await supabase
        .from('booking_notes')
        .update({ deleted_at: new Date().toISOString(), updated_by_profile_id: profile?.id ?? null })
        .eq('id', selectedBookingNote.id)
        .eq('tenant_id', activeTenant.id)
        .select()
        .single()

      if (archiveNoteResult.error) {
        setSaveError(archiveNoteResult.error.message)
        setSaving(false)
        return
      }
      setBookingNotes((currentNotes) => currentNotes.filter((note) => note.id !== selectedBookingNote.id))
    }

    if (canReadInternalNotes && formState.internal_admin_note.trim()) {
      const notePayload: Omit<BookingNoteInsert, 'tenant_id' | 'booking_id' | 'body'> = {
        note_type: 'internal_admin',
        title: 'Administrative note',
        is_patient_visible: false,
        updated_by_profile_id: profile?.id ?? null,
      }
      const noteResult = selectedBookingNote
        ? await supabase
            .from('booking_notes')
            .update({ ...notePayload, body: formState.internal_admin_note.trim() } satisfies BookingNoteUpdate)
            .eq('id', selectedBookingNote.id)
            .eq('tenant_id', activeTenant.id)
            .select()
            .single()
        : await supabase
            .from('booking_notes')
            .insert({
              ...notePayload,
              tenant_id: activeTenant.id,
              booking_id: savedBooking.id,
              body: formState.internal_admin_note.trim(),
              created_by_profile_id: profile?.id ?? null,
            })
            .select()
            .single()

      if (noteResult.error) {
        setSaveError(noteResult.error.message)
        setSaving(false)
        return
      }
      const savedNote = noteResult.data as BookingNoteRow
      setBookingNotes((currentNotes) => selectedBookingNote
        ? currentNotes.map((note) => (note.id === savedNote.id ? savedNote : note))
        : [...currentNotes, savedNote])
    }

    if (eventType) {
      try {
        const history = await createStatusHistory(
          savedBooking,
          eventType,
          selectedBooking?.booking_status ?? null,
          eventType === 'booking_rescheduled'
            ? `Booking rescheduled from ${formatDateTime(selectedBooking?.start_at ?? null)} to ${formatDateTime(savedBooking.start_at)}.`
            : eventType === 'booking_created'
              ? 'Booking created from booking workspace.'
              : `Booking status changed from ${formatLabel(selectedBooking?.booking_status ?? 'none')} to ${formatLabel(savedBooking.booking_status)}.`,
          selectedBooking?.start_at ?? null,
          selectedBooking?.end_at ?? null,
          {
            old_start_at: selectedBooking?.start_at ?? null,
            old_end_at: selectedBooking?.end_at ?? null,
            new_start_at: savedBooking.start_at,
            new_end_at: savedBooking.end_at,
          },
        )
        await createWorkflowEvent(eventType, savedBooking, eventType === 'booking_rescheduled' ? `${selectedBooking?.start_at ?? ''}->${savedBooking.start_at ?? ''}` : savedBooking.booking_status, {
          old_start_at: selectedBooking?.start_at ?? null,
          old_end_at: selectedBooking?.end_at ?? null,
          new_start_at: savedBooking.start_at,
          new_end_at: savedBooking.end_at,
        })
        await createPatientHistoryEvent(eventType, savedBooking, history ? 'booking_status_history' : 'bookings', history?.id ?? savedBooking.id)
      } catch (eventError) {
        setSaveError(eventError instanceof Error ? eventError.message : 'The booking was saved, but the booking event could not be recorded.')
        setSaving(false)
        return
      }
    }

    setBookings((currentBookings) => {
      const nextBookings = selectedBooking
        ? currentBookings.map((booking) => (booking.id === savedBooking.id ? savedBooking : booking))
        : [...currentBookings, savedBooking]
      return nextBookings.sort((left, right) => (left.start_at ?? '').localeCompare(right.start_at ?? ''))
    })
    setBookingProcedures((currentProcedures) => [
      ...currentProcedures.filter((procedure) => procedure.booking_id !== savedBooking.id),
      ...savedProcedures,
    ])
    setSelectedBookingId(savedBooking.id)
    setSuccessMessage(selectedBooking ? 'Booking updated.' : 'Booking created.')
    setSaving(false)
  }

  const updateStatus = async (nextStatus: string) => {
    if (!activeTenant?.id || !supabase || !selectedBooking || !canManageBookings || saving) return
    const allowedTransitions: Record<string, string[]> = {
      draft: ['scheduled'],
      scheduled: ['confirmed', 'cancelled', 'no_show'],
      confirmed: ['checked_in', 'cancelled', 'no_show'],
    }
    if (selectedBooking.booking_status === nextStatus) {
      setSaveError(`Booking is already ${formatLabel(nextStatus)}.`)
      return
    }
    if (!(allowedTransitions[selectedBooking.booking_status] ?? []).includes(nextStatus)) {
      setSaveError(`Cannot move ${formatLabel(selectedBooking.booking_status)} booking to ${formatLabel(nextStatus)} from this workspace.`)
      return
    }
    if (isTerminalBooking(selectedBooking.booking_status)) {
      setSaveError('Terminal bookings cannot be changed in this foundation.')
      return
    }

    let cancellationReason: string | null = null
    if (nextStatus === 'cancelled') {
      cancellationReason = window.prompt('Cancellation reason')?.trim() || null
      if (!cancellationReason) {
        setSaveError('Cancellation reason is required.')
        return
      }
    }

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const statusPayload: BookingUpdate = {
      booking_status: nextStatus,
      updated_by_profile_id: profile?.id ?? null,
    }
    if (nextStatus === 'confirmed') statusPayload.session_ready = true
    if (nextStatus === 'checked_in') statusPayload.checked_in_at = now
    if (nextStatus === 'cancelled') {
      statusPayload.cancelled_at = now
      statusPayload.cancellation_reason = cancellationReason
      statusPayload.session_ready = false
      statusPayload.draft_invoice_ready = false
    }
    if (nextStatus === 'no_show') {
      statusPayload.no_show_at = now
      statusPayload.session_ready = false
    }

    const result = await supabase
      .from('bookings')
      .update(statusPayload)
      .eq('id', selectedBooking.id)
      .eq('tenant_id', activeTenant.id)
      .select()
      .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedBooking = result.data as BookingRow
    const eventType = getWorkflowEventTypeForStatus(nextStatus)

    try {
      const history = await createStatusHistory(
        savedBooking,
        eventType,
        selectedBooking.booking_status,
        cancellationReason ?? `Booking moved to ${formatLabel(nextStatus)}.`,
        selectedBooking.start_at,
        selectedBooking.end_at,
      )
      await createWorkflowEvent(eventType, savedBooking, nextStatus, { from_status: selectedBooking.booking_status, to_status: nextStatus })
      await createPatientHistoryEvent(eventType, savedBooking, history ? 'booking_status_history' : 'bookings', history?.id ?? savedBooking.id, cancellationReason ?? undefined)
    } catch (eventError) {
      setSaveError(eventError instanceof Error ? eventError.message : 'The booking status changed, but the event trail could not be recorded.')
      setSaving(false)
      return
    }

    setBookings((currentBookings) => currentBookings.map((booking) => (booking.id === savedBooking.id ? savedBooking : booking)))
    setSelectedBookingId(savedBooking.id)
    setSuccessMessage(`Booking marked ${formatLabel(nextStatus)}.`)
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading bookings" description="Preparing the tenant booking calendar." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Bookings unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="booking-engine-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Booking Engine</span>
          <h3>{activeTenant?.practice_name ?? 'Bookings workspace'}</h3>
          <p>Manage tenant bookings, calendar visibility, procedure snapshots and booking workflow readiness. Sessions and invoices remain deferred.</p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{bookings.length} bookings</StatusBadge>
          {!canManageBookings && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="booking-toolbar">
        <div className="booking-toolbar-group">
          <button type="button" onClick={() => setSelectedDate(formatDateInput(addDays(new Date(`${selectedDate}T00:00:00`), calendarMode === 'day' ? -1 : -7)))}>&lt;</button>
          <button type="button" onClick={() => setSelectedDate(formatDateInput(new Date()))}>Today</button>
          <button type="button" onClick={() => setSelectedDate(formatDateInput(addDays(new Date(`${selectedDate}T00:00:00`), calendarMode === 'day' ? 1 : 7)))}>&gt;</button>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
        <div className="booking-toolbar-group">
          <button className={calendarMode === 'day' ? 'active' : ''} type="button" onClick={() => setCalendarMode('day')}>Day</button>
          <button className={calendarMode === 'week' ? 'active' : ''} type="button" onClick={() => setCalendarMode('week')}>Week</button>
        </div>
        {canManageBookings && <Button onClick={startNewBooking}>New Booking</Button>}
      </div>

      <div className="booking-filter-row">
        <label><span>Therapist</span><select value={therapistFilter} onChange={(event) => setTherapistFilter(event.target.value)}><option value="all">All therapists</option>{therapists.map((therapist) => <option value={therapist.id} key={therapist.id}>{therapist.display_name}</option>)}</select></label>
        <label><span>Location</span><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="all">All locations</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.location_name}</option>)}</select></label>
        <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Active bookings</option><option value="all">All statuses</option>{bookingStatuses.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
      </div>

      <div className="booking-workspace-layout">
        <Card className="booking-calendar-card">
          <div className="practice-locations-list-header">
            <div>
              <span>{calendarMode === 'day' ? 'Day view' : 'Week view'}</span>
              <h3>{calendarMode === 'day' ? selectedDate : `${formatDateInput(visibleDates[0])} to ${formatDateInput(visibleDates[visibleDates.length - 1])}`}</h3>
            </div>
            <StatusBadge tone="neutral">{filteredBookings.length} shown</StatusBadge>
          </div>

          {filteredBookings.length === 0 ? (
            <EmptyState title="No bookings for this view" description="Adjust the filters or create a new booking for this date range." />
          ) : (
            <div className="booking-agenda-list">
              {filteredBookings.map((booking) => {
                const patient = patients.find((currentPatient) => currentPatient.id === booking.patient_id)
                const therapist = therapists.find((currentTherapist) => currentTherapist.id === booking.therapist_profile_id)
                const location = locations.find((currentLocation) => currentLocation.id === booking.practice_location_id)
                return (
                  <button className={selectedBookingId === booking.id ? 'active' : ''} type="button" onClick={() => selectBooking(booking)} key={booking.id}>
                    <div className="booking-agenda-time">
                      <strong>{formatTime(booking.start_at)}</strong>
                      <span>{booking.duration_minutes ?? 0} min</span>
                    </div>
                    <div>
                      <strong>{formatPatientName(patient)}</strong>
                      <span>{therapist?.display_name ?? 'No therapist'} · {location?.location_name ?? 'No location'}</span>
                    </div>
                    <StatusBadge tone={getBookingTone(booking.booking_status)}>{formatLabel(booking.booking_status)}</StatusBadge>
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
                <span>{selectedBooking ? 'Booking detail' : 'Create booking'}</span>
                <h3>{selectedBooking ? formatPatientName(patients.find((patient) => patient.id === selectedBooking.patient_id)) : 'New Booking'}</h3>
              </div>
              <div className="patients-action-row">
                {canManageBookings && <Button disabled={saving || !canEditSelectedBooking} onClick={saveBooking}>{saving ? 'Saving' : selectedBooking ? 'Save Booking' : 'Create Booking'}</Button>}
              </div>
            </div>

            <div className="settings-form-grid booking-form-grid">
              <label><span>Patient</span><select value={formState.patient_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('patient_id', event.target.value)}><option value="">Select patient</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{formatPatientName(patient)} · {formatLabel(patient.patient_status)}</option>)}</select></label>
              <label><span>Therapist</span><select value={formState.therapist_profile_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('therapist_profile_id', event.target.value)}><option value="">Select therapist</option>{therapists.map((therapist) => <option value={therapist.id} key={therapist.id}>{therapist.display_name}{therapist.is_active ? '' : ' · inactive'}</option>)}</select></label>
              <label><span>Location</span><select value={formState.practice_location_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('practice_location_id', event.target.value)}><option value="">Select location</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.location_name}{location.is_active ? '' : ' · inactive'}</option>)}</select></label>
              <label><span>Date</span><input type="date" value={formState.booking_date} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_date', event.target.value)} /></label>
              <label><span>Start time</span><input type="time" value={formState.start_time} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('start_time', event.target.value)} /></label>
              <label><span>Duration minutes</span><input type="number" min="15" step="15" value={formState.duration_minutes} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('duration_minutes', event.target.value)} /></label>
              <label><span>Status</span><select value={formState.booking_status} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_status', event.target.value)}>{editableStatusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
              <label><span>Booking type</span><select value={formState.booking_type} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_type', event.target.value)}>{bookingTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
              <label><span>Source</span><select value={formState.booking_source} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_source', event.target.value)}>{bookingSources.map((source) => <option value={source} key={source}>{formatLabel(source)}</option>)}</select></label>
              <label><span>Mode</span><select value={formState.appointment_mode} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('appointment_mode', event.target.value)}>{appointmentModes.map((mode) => <option value={mode} key={mode}>{formatLabel(mode)}</option>)}</select></label>
              <label className="wide-field"><span>Patient-facing title</span><input value={formState.patient_facing_title} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('patient_facing_title', event.target.value)} /></label>
              <label className="wide-field"><span>Patient-facing notes</span><textarea value={formState.patient_facing_notes} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('patient_facing_notes', event.target.value)} /></label>
              {canReadInternalNotes && <label className="wide-field"><span>Internal administrative note</span><textarea value={formState.internal_admin_note} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('internal_admin_note', event.target.value)} /></label>}
            </div>
          </Card>

          {selectedBooking && (
            <Card className="patients-foundation-card">
              <span>Booking record</span>
              <div className="booking-detail-grid">
                <div><span>Patient</span><strong>{formatPatientName(selectedPatient)}</strong></div>
                <div><span>Responsible party</span><strong>{selectedResponsibleParty?.full_name ?? 'Not captured'}</strong><small>{selectedResponsibleParty?.phone ?? selectedResponsibleParty?.email ?? 'No contact detail'}</small></div>
                <div><span>Therapist</span><strong>{selectedTherapist?.display_name ?? 'No therapist'}</strong></div>
                <div><span>Location</span><strong>{selectedLocation?.location_name ?? 'No location'}</strong><small>{selectedBooking.room_label ?? selectedLocation?.room_venue_notes ?? ''}</small></div>
                <div><span>Start</span><strong>{formatDateTime(selectedBooking.start_at)}</strong></div>
                <div><span>End</span><strong>{formatDateTime(selectedBooking.end_at)}</strong></div>
                <div><span>Duration</span><strong>{selectedBooking.duration_minutes ?? 0} min</strong></div>
                <div><span>Status</span><strong>{formatLabel(selectedBooking.booking_status)}</strong></div>
                <div><span>Type</span><strong>{formatLabel(selectedBooking.booking_type)}</strong></div>
                <div><span>Source</span><strong>{formatLabel(selectedBooking.booking_source)}</strong></div>
                <div><span>Mode</span><strong>{formatLabel(selectedBooking.appointment_mode)}</strong></div>
                <div><span>Total snapshot</span><strong>{formatMoney(selectedBookingSnapshotTotal)}</strong></div>
                <div><span>Created</span><strong>{formatDateTime(selectedBooking.created_at)}</strong></div>
                <div><span>Updated</span><strong>{formatDateTime(selectedBooking.updated_at)}</strong></div>
              </div>
              {selectedBookingProcedures.length > 0 && (
                <div className="booking-snapshot-list">
                  {selectedBookingProcedures.map((procedure) => (
                    <article key={procedure.id}>
                      <div>
                        <strong>{procedure.procedure_code || 'Procedure'} · {procedure.procedure_name}</strong>
                        <span>{procedure.description || 'No description'}</span>
                      </div>
                      <strong>{formatMoney(procedure.line_total)}</strong>
                    </article>
                  ))}
                </div>
              )}
              <div className="booking-detail-note">
                <strong>Patient-facing appointment information</strong>
                <p>{selectedBooking.patient_facing_title || selectedBooking.patient_facing_notes ? `${selectedBooking.patient_facing_title ?? ''} ${selectedBooking.patient_facing_notes ?? ''}`.trim() : 'No patient-facing appointment information captured.'}</p>
              </div>
              {canReadInternalNotes && selectedBookingNote && (
                <div className="booking-detail-note restricted">
                  <strong>Internal administrative note</strong>
                  <p>{selectedBookingNote.body}</p>
                </div>
              )}
            </Card>
          )}

          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header">
              <div>
                <span>Procedures and pricing</span>
                <h3>{formatMoney(procedureTotal)}</h3>
              </div>
              {canReadPricing && canEditSelectedBooking && <Button variant="secondary" disabled={saving || activePriceListItems.length === 0} onClick={addProcedureSelection}>Add Procedure</Button>}
            </div>
            {!canReadPricing ? (
              <EmptyState title="Procedure pricing restricted" description="Your role can manage bookings without loading price list data." />
            ) : priceLists.length === 0 ? (
              <EmptyState title="No active price lists" description="Create a price list in Finance before adding billable procedures." />
            ) : (
              <>
                <div className="settings-form-grid booking-form-grid">
                  <label><span>Price list</span><select value={formState.price_list_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => { updateFormField('price_list_id', event.target.value); setProcedureSelections([]) }}><option value="">No price list</option>{priceLists.map((priceList) => <option value={priceList.id} key={priceList.id}>{priceList.name}</option>)}</select></label>
                </div>
                <div className="booking-procedure-list">
                  {procedureSelections.length === 0 ? (
                    <EmptyState title="No procedures selected" description="Add procedures to snapshot booking pricing for future invoice readiness." />
                  ) : procedureSelections.map((selection, index) => {
                    const item = priceListItems.find((priceItem) => priceItem.id === selection.price_list_item_id)
                    const quantity = Number(selection.quantity)
                    return (
                      <article key={`${selection.price_list_item_id}-${index}`}>
                        <label><span>Procedure</span><select value={selection.price_list_item_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateProcedureSelection(index, { booking_procedure_id: undefined, price_list_item_id: event.target.value, procedure_name: undefined, procedure_code: undefined, description: undefined, unit_price: undefined, duration_minutes: undefined, currency_code: undefined })}>{activePriceListItems.map((priceItem) => <option value={priceItem.id} key={priceItem.id}>{priceItem.procedure_code || 'Code'} · {priceItem.procedure_name}</option>)}</select></label>
                        <label><span>Qty</span><input type="number" min="1" step="1" value={selection.quantity} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateProcedureSelection(index, { quantity: event.target.value })} /></label>
                        <div><strong>{formatMoney((selection.unit_price ?? item?.price ?? 0) * (Number.isFinite(quantity) ? quantity : 0))}</strong><span>{selection.duration_minutes ?? item?.duration_minutes ? `${selection.duration_minutes ?? item?.duration_minutes} min` : 'No duration'}</span></div>
                        {canEditSelectedBooking && <button type="button" disabled={saving} onClick={() => removeProcedureSelection(index)}>Remove</button>}
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </Card>

          {selectedBooking && (
            <Card className="patients-foundation-card">
              <span>Status actions</span>
              <div className="patients-foundation-grid">
                {selectedBooking.booking_status === 'draft' && <Button variant="secondary" disabled={saving || !canManageBookings} onClick={() => updateStatus('scheduled')}>Schedule</Button>}
                {selectedBooking.booking_status === 'scheduled' && <Button variant="secondary" disabled={saving || !canManageBookings} onClick={() => updateStatus('confirmed')}>Confirm</Button>}
                {selectedBooking.booking_status === 'confirmed' && <Button variant="secondary" disabled={saving || !canManageBookings} onClick={() => updateStatus('checked_in')}>Check In</Button>}
                {(selectedBooking.booking_status === 'confirmed' || selectedBooking.booking_status === 'checked_in' || selectedBooking.booking_status === 'in_progress') && <Link className="ui-button ui-button-secondary" to={`/bookings/sessions?booking=${selectedBooking.id}`}>Create/Open Session</Link>}
                {(selectedBooking.booking_status === 'scheduled' || selectedBooking.booking_status === 'confirmed') && <Button variant="secondary" disabled={saving || !canManageBookings} onClick={() => updateStatus('cancelled')}>Cancel</Button>}
                {(selectedBooking.booking_status === 'scheduled' || selectedBooking.booking_status === 'confirmed') && <Button variant="secondary" disabled={saving || !canManageBookings} onClick={() => updateStatus('no_show')}>No Show</Button>}
                {isTerminalBooking(selectedBooking.booking_status) && <StatusBadge tone="danger">Terminal booking</StatusBadge>}
                {(selectedBooking.booking_status === 'checked_in' || selectedBooking.booking_status === 'in_progress') && <StatusBadge tone="warning">Session workflow required</StatusBadge>}
              </div>
            </Card>
          )}

          {selectedBooking && (
            <Card className="patients-foundation-card">
              <span>Operational history</span>
              <div className="booking-history-grid">
                <div>
                  <strong>Status history</strong>
                  {selectedBookingStatusHistory.length === 0 ? (
                    <p>No status history recorded yet.</p>
                  ) : selectedBookingStatusHistory.map((history) => (
                    <article key={history.id}>
                      <strong>{formatLabel(history.event_type)}</strong>
                      <span>{formatLabel(history.from_status ?? 'none')} to {formatLabel(history.to_status)} · {formatDateTime(history.created_at)}</span>
                      {history.event_reason && <p>{history.event_reason}</p>}
                    </article>
                  ))}
                </div>
                <div>
                  <strong>Workflow events</strong>
                  {selectedBookingWorkflowEvents.length === 0 ? (
                    <p>No workflow events queued yet.</p>
                  ) : selectedBookingWorkflowEvents.map((event) => (
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

          {(saveError || successMessage) && (
            <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
              {saveError || successMessage}
            </div>
          )}

          {(patients.length === 0 || therapists.length === 0 || locations.length === 0) && (
            <Card className="patients-foundation-card">
              <span>Setup needed</span>
              <div className="patients-foundation-grid">
                {patients.length === 0 && <StatusBadge tone="warning">No patients available</StatusBadge>}
                {therapists.length === 0 && <StatusBadge tone="warning">No active therapists available</StatusBadge>}
                {locations.length === 0 && <StatusBadge tone="warning">No active locations available</StatusBadge>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
