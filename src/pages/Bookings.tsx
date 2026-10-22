import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { FinanceIcon, TrashIcon } from '../components/icons'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { showErrorNotice, showSuccessNotice } from '../lib/appNotice'
import { getMonthlyFinanceFlagsByPatient } from '../lib/financeFlags'
import type { Database, Json } from '../lib/database.types'
import { SessionsPage } from './Sessions'

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
type PatientInsert = Database['public']['Tables']['patients']['Insert']
type PatientHistoryEventInsert = Database['public']['Tables']['patient_history_events']['Insert']
type ResponsiblePartyRow = Database['public']['Tables']['responsible_parties']['Row']
type ResponsiblePartyInsert = Database['public']['Tables']['responsible_parties']['Insert']
type TherapistRow = Database['public']['Tables']['therapist_profiles']['Row']
type LocationRow = Database['public']['Tables']['practice_locations']['Row']
type PriceListRow = Database['public']['Tables']['price_lists']['Row']
type PriceListItemRow = Database['public']['Tables']['price_list_items']['Row']
type SessionStatusRow = Pick<Database['public']['Tables']['sessions']['Row'], 'id' | 'booking_id' | 'session_status'>
type InvoiceStatusRow = Pick<Database['public']['Tables']['invoices']['Row'], 'id' | 'session_id' | 'patient_id' | 'invoice_status' | 'payment_status' | 'balance_due' | 'invoice_date' | 'confirmed_at' | 'issued_at'>
type InvoiceLineStatusRow = Pick<Database['public']['Tables']['invoice_lines']['Row'], 'invoice_id' | 'source_session_procedure_id'>
type SessionProcedureStatusRow = Pick<Database['public']['Tables']['session_procedures']['Row'], 'id' | 'session_id' | 'is_billable'>
type ClinicalNoteTaskRow = Pick<Database['public']['Tables']['clinical_notes']['Row'], 'booking_id' | 'session_id' | 'note_type' | 'note_status'>
type SessionTaskDispositionRow = Pick<Database['public']['Tables']['session_notes']['Row'], 'session_id' | 'metadata'>
type BillingFlagSettingsRow = Pick<Database['public']['Tables']['billing_settings']['Row'], 'metadata'>

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
  metadata?: Json
}

type InlinePatientFormState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  internal_note: string
  guardian_first_name: string
  guardian_last_name: string
  guardian_email: string
  guardian_phone: string
}

const bookingStatuses = ['draft', 'scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']
const blockingBookingStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress']
const bookingTypes = ['standard', 'assessment', 'review', 'group', 'admin', 'other']
const bookingSources = ['internal', 'patient_link', 'phone', 'email', 'imported', 'external_calendar']
const appointmentModes = ['in_person', 'telehealth', 'home_visit', 'school_visit', 'other']
const bookingTimeOptions = Array.from({ length: 96 }, (_, index) => {
  const minutes = index * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
const bookingDurationOptions = Array.from({ length: 10 }, (_, index) => (index + 1) * 15)
const defaultCalendarStartHour = 7
const defaultCalendarEndHour = 19
const calendarHourHeight = 72
function isSkippedProcessNote(metadata: Json) {
  return Boolean(
    metadata
    && typeof metadata === 'object'
    && !Array.isArray(metadata)
    && metadata.task_type === 'process_note'
    && metadata.disposition === 'skipped',
  )
}

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

const emptyInlinePatientForm: InlinePatientFormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  internal_note: '',
  guardian_first_name: '',
  guardian_last_name: '',
  guardian_email: '',
  guardian_phone: '',
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function formatPatientName(patient: PatientRow | null | undefined) {
  if (!patient) return 'Unknown patient'
  return `${patient.first_name} ${patient.last_name}`.trim()
}

type PatientComboboxProps = {
  patients: PatientRow[]
  selectedPatientId: string
  canCreatePatient: boolean
  disabled?: boolean
  compact?: boolean
  onSelectPatient: (patient: PatientRow) => void
  onClearPatient?: () => void
  onCreatePatient: () => void
}

function PatientCombobox({
  patients,
  selectedPatientId,
  canCreatePatient,
  disabled = false,
  compact = false,
  onSelectPatient,
  onClearPatient,
  onCreatePatient,
}: PatientComboboxProps) {
  const listId = useId()
  const [search, setSearch] = useState(() => formatPatientName(patients.find((patient) => patient.id === selectedPatientId) ?? null).replace('Unknown patient', ''))
  const [open, setOpen] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(0)
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId)
  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return patients
    return patients.filter((patient) => [
      patient.first_name,
      patient.last_name,
      patient.preferred_name,
      patient.patient_number,
      patient.email,
      patient.phone,
    ].some((value) => value?.toLowerCase().includes(query)))
  }, [patients, search])
  const optionCount = filteredPatients.length + 1

  useEffect(() => {
    if (selectedPatient) setSearch(formatPatientName(selectedPatient))
  }, [selectedPatient])

  const choosePatient = (patient: PatientRow) => {
    onSelectPatient(patient)
    setSearch(formatPatientName(patient))
    setOpen(false)
    setActiveOptionIndex(0)
  }

  const chooseActiveOption = () => {
    if (activeOptionIndex === 0) {
      onCreatePatient()
      setSearch('')
      setOpen(false)
      return
    }
    const patient = filteredPatients[activeOptionIndex - 1]
    if (patient) choosePatient(patient)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveOptionIndex((current) => (current + 1) % optionCount)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveOptionIndex((current) => (current - 1 + optionCount) % optionCount)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      chooseActiveOption()
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className={`booking-patient-combobox${compact ? ' compact' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      {!compact && <span>Patient</span>}
      <div className="booking-patient-combobox-input">
        <input
          type="search"
          role="combobox"
          aria-label={compact ? 'Find patient for new booking' : 'Patient'}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-option-${activeOptionIndex}` : undefined}
          value={search}
          disabled={disabled}
          placeholder={compact ? 'Find patient' : 'Search or browse patients'}
          onFocus={() => { setOpen(true); setActiveOptionIndex(0) }}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setSearch(event.target.value)
            setOpen(true)
            setActiveOptionIndex(0)
            if (selectedPatientId) onClearPatient?.()
          }}
        />
        {search && (
          <button
            type="button"
            aria-label="Clear patient search"
            title="Clear patient search"
            onClick={() => { setSearch(''); onClearPatient?.(); setOpen(true) }}
          >x</button>
        )}
      </div>
      {open && (
        <div id={listId} className="booking-patient-options" role="listbox" aria-label="Patients">
          <button
            id={`${listId}-option-0`}
            className={activeOptionIndex === 0 ? 'active new-patient' : 'new-patient'}
            type="button"
            role="option"
            aria-selected={activeOptionIndex === 0}
            disabled={!canCreatePatient}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { onCreatePatient(); setSearch(''); setOpen(false) }}
          >
            <strong>+ New Patient</strong>
            {!canCreatePatient && <small>Patient-management permission required.</small>}
          </button>
          {filteredPatients.map((patient, index) => (
            <button
              id={`${listId}-option-${index + 1}`}
              className={activeOptionIndex === index + 1 ? 'active' : ''}
              type="button"
              role="option"
              aria-selected={selectedPatientId === patient.id}
              key={patient.id}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveOptionIndex(index + 1)}
              onClick={() => choosePatient(patient)}
            >
              <strong>{formatPatientName(patient)}</strong>
              <span>{patient.patient_number || 'No patient number'} · {formatLabel(patient.patient_status)}</span>
              {(patient.email || patient.phone) && <small>{patient.email || patient.phone}</small>}
            </button>
          ))}
          {filteredPatients.length === 0 && <p>No matching patients found.</p>}
        </div>
      )}
    </div>
  )
}

type ProcedureComboboxProps = {
  items: PriceListItemRow[]
  selectedItemId: string
  disabled?: boolean
  onSelect: (item: PriceListItemRow) => void
  onClear: () => void
}

function ProcedureCombobox({ items, selectedItemId, disabled = false, onSelect, onClear }: ProcedureComboboxProps) {
  const listId = useId()
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectedLabel = selectedItem?.procedure_code ?? ''
  const [search, setSearch] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(0)
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query || search === selectedLabel) return items
    return items.filter((item) => [
      item.procedure_code,
      item.procedure_name,
      icd10CodeFromMetadata(item.metadata),
    ].some((value) => value?.toLowerCase().includes(query)))
  }, [items, search, selectedLabel])

  useEffect(() => {
    setSearch(selectedLabel)
  }, [selectedLabel])

  const chooseItem = (item: PriceListItemRow) => {
    onSelect(item)
    setSearch(item.procedure_code ?? '')
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
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
          if (!selectedItemId) setSearch('')
        }
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-label="Procedure code"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filteredItems.length > 0 ? `${listId}-option-${activeOptionIndex}` : undefined}
        value={search}
        disabled={disabled}
        placeholder="Type procedure code"
        onFocus={(event) => { event.currentTarget.select(); setOpen(true); setActiveOptionIndex(0) }}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setSearch(event.target.value)
          setOpen(true)
          setActiveOptionIndex(0)
          if (selectedItemId) onClear()
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
              aria-selected={selectedItemId === item.id}
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

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateInTimeZone(date: Date, timeZone?: string) {
  if (!timeZone) return formatDateInput(date)
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return formatDateInput(date)
  }
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

type CalendarBookingLayout = {
  booking: BookingRow
  top: number
  height: number
  left: number
  width: number
}

type CalendarHoverSlot = {
  date: string
  time: string
  top: number
}

function getCalendarSlot(clientY: number, rect: DOMRect, calendarStartHour: number, calendarEndHour: number) {
  const calendarMinutes = (calendarEndHour - calendarStartHour) * 60
  const pointerMinutes = ((clientY - rect.top) / calendarHourHeight) * 60
  const boundedMinutes = Math.max(0, Math.min(calendarMinutes - 15, pointerMinutes))
  const intervalMinutes = Math.floor(boundedMinutes / 15) * 15
  const absoluteMinutes = calendarStartHour * 60 + intervalMinutes

  return {
    time: `${String(Math.floor(absoluteMinutes / 60)).padStart(2, '0')}:${String(absoluteMinutes % 60).padStart(2, '0')}`,
    top: (intervalMinutes / 60) * calendarHourHeight,
  }
}

function layoutCalendarBookings(bookings: BookingRow[], calendarStartHour: number, calendarEndHour: number): CalendarBookingLayout[] {
  const positioned: Array<{ booking: BookingRow; start: number; end: number; column: number }> = []
  const columnEnds: number[] = []

  bookings
    .filter((booking) => booking.start_at && booking.end_at)
    .filter((booking) => {
      const startDate = new Date(booking.start_at as string)
      const endDate = new Date(booking.end_at as string)
      const start = startDate.getHours() * 60 + startDate.getMinutes()
      const end = endDate.getHours() * 60 + endDate.getMinutes()
      return end > calendarStartHour * 60 && start < calendarEndHour * 60
    })
    .sort((left, right) => (left.start_at ?? '').localeCompare(right.start_at ?? ''))
    .forEach((booking) => {
      const startDate = new Date(booking.start_at as string)
      const endDate = new Date(booking.end_at as string)
      const start = startDate.getHours() * 60 + startDate.getMinutes()
      const end = endDate.getHours() * 60 + endDate.getMinutes()
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= start)
      if (column === -1) column = columnEnds.length
      columnEnds[column] = end
      positioned.push({ booking, start, end, column })
    })

  return positioned.map((item) => {
    const concurrent = positioned.filter((other) => other.start < item.end && other.end > item.start)
    const columnCount = Math.max(1, ...concurrent.map((other) => other.column + 1))
    const visibleStart = Math.max(item.start, calendarStartHour * 60)
    const visibleEnd = Math.min(item.end, calendarEndHour * 60)
    return {
      booking: item.booking,
      top: ((visibleStart - calendarStartHour * 60) / 60) * calendarHourHeight,
      height: Math.max(1, ((visibleEnd - visibleStart) / 60) * calendarHourHeight),
      left: (item.column / columnCount) * 100,
      width: 100 / columnCount,
    }
  })
}

function formatCalendarHeading(date: Date, mode: CalendarMode) {
  return date.toLocaleDateString([], mode === 'day'
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric' })
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

function jsonObject(value: Json | undefined): { [key: string]: Json | undefined } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function icd10CodeFromMetadata(metadata: Json | undefined) {
  const value = jsonObject(metadata).icd10_code
  return typeof value === 'string' ? value : ''
}

function getProcedureSignature(procedure: Pick<BookingProcedureRow, 'price_list_item_id' | 'procedure_name' | 'procedure_code' | 'description' | 'unit_price' | 'quantity' | 'line_total' | 'duration_minutes' | 'currency_code' | 'metadata'>) {
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
    icd10CodeFromMetadata(procedure.metadata),
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
    icd10CodeFromMetadata(selection.booking_procedure_id ? selection.metadata ?? item?.metadata : item?.metadata),
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
  const { activeTenant, profile, user } = useAuth()
  const authorization = useAuthorization()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManageBookings = authorization.hasPermission('tenant.bookings.manage')
  const canManagePatients = authorization.hasPermission('tenant.patients.manage')
  const canReadPricing = authorization.hasPermission('tenant.finance.view', 'tenant.practice.configure')
  const canReadInternalNotes = authorization.hasRole('admin', 'receptionist', 'therapist')
  const canReadInvoiceStatus = authorization.hasRole('admin', 'finance')
  const canReadClinicalTaskStatus = authorization.hasPermission('tenant.clinical.view') && !authorization.isSuperAdmin
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [therapists, setTherapists] = useState<TherapistRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [priceLists, setPriceLists] = useState<PriceListRow[]>([])
  const [priceListItems, setPriceListItems] = useState<PriceListItemRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [sessionStatuses, setSessionStatuses] = useState<SessionStatusRow[]>([])
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatusRow[]>([])
  const [billingFlagSettings, setBillingFlagSettings] = useState<BillingFlagSettingsRow | null>(null)
  const [invoiceLineStatuses, setInvoiceLineStatuses] = useState<InvoiceLineStatusRow[]>([])
  const [sessionProcedureStatuses, setSessionProcedureStatuses] = useState<SessionProcedureStatusRow[]>([])
  const [clinicalNoteTaskStatuses, setClinicalNoteTaskStatuses] = useState<ClinicalNoteTaskRow[]>([])
  const [skippedProcessNoteSessionIds, setSkippedProcessNoteSessionIds] = useState<Set<string>>(new Set())
  const [bookingProcedures, setBookingProcedures] = useState<BookingProcedureRow[]>([])
  const [bookingNotes, setBookingNotes] = useState<BookingNoteRow[]>([])
  const [bookingStatusHistory, setBookingStatusHistory] = useState<BookingStatusHistoryRow[]>([])
  const [bookingWorkflowEvents, setBookingWorkflowEvents] = useState<BookingWorkflowEventRow[]>([])
  const [responsibleParties, setResponsibleParties] = useState<ResponsiblePartyRow[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => formatDateInTimeZone(new Date(), activeTenant?.time_zone))
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week')
  const [therapistFilter, setTherapistFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formState, setFormState] = useState<BookingFormState>(emptyBookingForm)
  const [procedureSelections, setProcedureSelections] = useState<ProcedureSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isEditorDirty, setIsEditorDirty] = useState(false)
  const [sessionPanelBookingId, setSessionPanelBookingId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [hoveredCalendarSlot, setHoveredCalendarSlot] = useState<CalendarHoverSlot | null>(null)
  const [inlinePatientOpen, setInlinePatientOpen] = useState(false)
  const [includeGuardian, setIncludeGuardian] = useState(false)
  const [includePatientNote, setIncludePatientNote] = useState(false)
  const [inlinePatientForm, setInlinePatientForm] = useState<InlinePatientFormState>(emptyInlinePatientForm)
  const [savingInlinePatient, setSavingInlinePatient] = useState(false)
  const [pendingGuardianPatientId, setPendingGuardianPatientId] = useState<string | null>(null)
  const [inlinePatientError, setInlinePatientError] = useState('')
  const [inlinePatientSuccess, setInlinePatientSuccess] = useState('')
  const pendingCreatedBookingId = useRef<string | null>(null)
  const lastPublishedNotice = useRef('')

  useEffect(() => {
    const message = saveError || inlinePatientError || successMessage || inlinePatientSuccess
    if (!message) {
      lastPublishedNotice.current = ''
      return
    }
    const tone = saveError || inlinePatientError ? 'error' : 'success'
    const noticeKey = `${tone}:${message}`
    if (lastPublishedNotice.current === noticeKey) return
    lastPublishedNotice.current = noticeKey
    if (tone === 'error') showErrorNotice(message)
    else showSuccessNotice(message)
  }, [inlinePatientError, inlinePatientSuccess, saveError, successMessage])

  const handleSessionStatusChange = useCallback((session: SessionStatusRow) => {
    setSessionStatuses((current) => current.some((item) => item.id === session.id)
      ? current.map((item) => (item.id === session.id ? session : item))
      : [...current, session])
  }, [])

  const handleSessionBookingChange = useCallback((booking: BookingRow) => {
    setBookings((current) => current.map((item) => (item.id === booking.id ? booking : item)))
  }, [])

  const handleSessionClinicalNoteChange = useCallback((note: ClinicalNoteTaskRow) => {
    setClinicalNoteTaskStatuses((current) => {
      const existingIndex = current.findIndex((item) => item.session_id === note.session_id && item.note_type === note.note_type)
      if (existingIndex === -1) return [...current, note]
      return current.map((item, index) => (index === existingIndex ? note : item))
    })
  }, [])

  const handleProcessNoteSkipChange = useCallback((sessionId: string) => {
    setSkippedProcessNoteSessionIds((current) => new Set(current).add(sessionId))
  }, [])

  const handleSessionInvoiceChange = useCallback((invoice: InvoiceStatusRow) => {
    setInvoiceStatuses((current) => current.some((item) => item.id === invoice.id)
      ? current.map((item) => (item.id === invoice.id ? invoice : item))
      : [...current, invoice])
  }, [])

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
  const authenticatedTherapist = useMemo(
    () => therapists.find((therapist) => therapist.user_id === user?.id && therapist.is_active) ?? null,
    [therapists, user?.id],
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
  const practiceToday = formatDateInTimeZone(new Date(), activeTenant?.time_zone)
  const filteredBookings = useMemo(() => {
    const dateKeys = new Set(visibleDates.map((date) => formatDateInput(date)))

    return bookings
      .filter((booking) => {
        if (booking.booking_status === 'cancelled') return false
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
  const visibleCalendarHours = useMemo(() => {
    const starts = filteredBookings.filter((booking) => booking.start_at).map((booking) => new Date(booking.start_at as string).getHours())
    const ends = filteredBookings.filter((booking) => booking.end_at).map((booking) => {
      const end = new Date(booking.end_at as string)
      return Math.min(24, end.getHours() + (end.getMinutes() > 0 ? 1 : 0))
    })
    return {
      start: Math.max(0, Math.min(defaultCalendarStartHour, ...starts)),
      end: Math.min(24, Math.max(defaultCalendarEndHour, ...ends)),
    }
  }, [filteredBookings])
  const billableSessionIds = useMemo(
    () => new Set(sessionProcedureStatuses.filter((procedure) => procedure.is_billable).map((procedure) => procedure.session_id)),
    [sessionProcedureStatuses],
  )
  const issuedInvoiceSessionIds = useMemo(() => {
    const issuedInvoices = invoiceStatuses.filter((invoice) => (
      Boolean(invoice.issued_at)
      && invoice.invoice_status !== 'cancelled'
      && invoice.invoice_status !== 'voided'
    ))
    const issuedInvoiceIds = new Set(issuedInvoices.map((invoice) => invoice.id))
    const sessionProcedureById = new Map(sessionProcedureStatuses.map((procedure) => [procedure.id, procedure]))
    const sessionIds = new Set(issuedInvoices.flatMap((invoice) => invoice.session_id ? [invoice.session_id] : []))

    invoiceLineStatuses.forEach((line) => {
      if (!issuedInvoiceIds.has(line.invoice_id) || !line.source_session_procedure_id) return
      const procedure = sessionProcedureById.get(line.source_session_procedure_id)
      if (procedure?.is_billable) sessionIds.add(procedure.session_id)
    })

    return sessionIds
  }, [invoiceLineStatuses, invoiceStatuses, sessionProcedureStatuses])
  const financeFlagByPatientId = useMemo(() => {
    return getMonthlyFinanceFlagsByPatient({
      invoices: invoiceStatuses,
      billingMetadata: billingFlagSettings?.metadata,
      timeZone: activeTenant?.time_zone,
    })
  }, [activeTenant?.time_zone, billingFlagSettings?.metadata, invoiceStatuses])
  const savedClinicalTaskKeys = useMemo(() => {
    const keys = new Set<string>()
    clinicalNoteTaskStatuses.forEach((note) => {
      if (note.session_id) keys.add(`session:${note.session_id}:${note.note_type}`)
      if (note.booking_id) keys.add(`booking:${note.booking_id}:${note.note_type}`)
    })
    return keys
  }, [clinicalNoteTaskStatuses])
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
    const financeEmptyResult = Promise.resolve({ data: [], error: null })
    const billingSettingsEmptyResult = Promise.resolve({ data: null, error: null })

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
        sessionsResult,
        invoiceStatusesResult,
        billingFlagSettingsResult,
        invoiceLineStatusesResult,
        sessionProcedureStatusesResult,
        proceduresResult,
        statusHistoryResult,
        workflowEventsResult,
        notesResult,
        clinicalNotesResult,
        taskDispositionsResult,
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
          .from('sessions')
          .select('id, booking_id, session_status')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        canReadInvoiceStatus
          ? supabaseClient
              .from('invoices')
              .select('id, session_id, patient_id, invoice_status, payment_status, balance_due, invoice_date, confirmed_at, issued_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : financeEmptyResult,
        canReadInvoiceStatus
          ? supabaseClient
              .from('billing_settings')
              .select('metadata')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .maybeSingle()
          : billingSettingsEmptyResult,
        canReadInvoiceStatus
          ? supabaseClient
              .from('invoice_lines')
              .select('invoice_id, source_session_procedure_id')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : financeEmptyResult,
        canReadInvoiceStatus
          ? supabaseClient
              .from('session_procedures')
              .select('id, session_id, is_billable')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : financeEmptyResult,
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
        canReadClinicalTaskStatus
          ? supabaseClient
              .from('clinical_notes')
              .select('booking_id, session_id, note_type, note_status')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .eq('note_type', 'process_note')
          : notesEmptyResult,
        canReadClinicalTaskStatus
          ? supabaseClient
              .from('session_notes')
              .select('session_id, metadata')
              .eq('tenant_id', tenantId)
              .eq('note_type', 'other')
              .is('deleted_at', null)
              .contains('metadata', { task_type: 'process_note', disposition: 'skipped' })
          : notesEmptyResult,
      ])

      if (!isMounted) return

      const firstError = patientsResult.error || responsiblePartiesResult.error || therapistsResult.error || locationsResult.error || priceListsResult.error || priceListItemsResult.error || bookingsResult.error || sessionsResult.error || invoiceStatusesResult.error || billingFlagSettingsResult.error || invoiceLineStatusesResult.error || sessionProcedureStatusesResult.error || proceduresResult.error || statusHistoryResult.error || workflowEventsResult.error || notesResult.error || clinicalNotesResult.error || taskDispositionsResult.error
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
      setSessionStatuses((sessionsResult.data ?? []) as SessionStatusRow[])
      setInvoiceStatuses((invoiceStatusesResult.data ?? []) as InvoiceStatusRow[])
      setBillingFlagSettings(billingFlagSettingsResult.data as BillingFlagSettingsRow | null)
      setInvoiceLineStatuses((invoiceLineStatusesResult.data ?? []) as InvoiceLineStatusRow[])
      setSessionProcedureStatuses((sessionProcedureStatusesResult.data ?? []) as SessionProcedureStatusRow[])
      setBookingProcedures((proceduresResult.data ?? []) as BookingProcedureRow[])
      setBookingStatusHistory((statusHistoryResult.data ?? []) as BookingStatusHistoryRow[])
      setBookingWorkflowEvents((workflowEventsResult.data ?? []) as BookingWorkflowEventRow[])
      setBookingNotes((notesResult.data ?? []) as BookingNoteRow[])
      setClinicalNoteTaskStatuses((clinicalNotesResult.data ?? []) as ClinicalNoteTaskRow[])
      setSkippedProcessNoteSessionIds(new Set(
        ((taskDispositionsResult.data ?? []) as SessionTaskDispositionRow[])
          .filter((note) => isSkippedProcessNote(note.metadata))
          .map((note) => note.session_id),
      ))

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
  }, [activeTenant?.id, canReadInternalNotes, canReadInvoiceStatus, canReadPricing])

  useEffect(() => {
    if (!selectedBookingId) return
    const note = bookingNotes.find((bookingNote) => bookingNote.booking_id === selectedBookingId && bookingNote.note_type === 'internal_admin') ?? null
    const booking = bookings.find((currentBooking) => currentBooking.id === selectedBookingId) ?? null
    if (!booking) return
    setFormState(formFromBooking(booking, note))
    setProcedureSelections(
      bookingProcedures
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
          metadata: procedure.metadata,
        })),
    )
  }, [bookingNotes, bookingProcedures, bookings, selectedBookingId])

  useEffect(() => {
    if (!isEditorOpen || selectedBookingId || !authenticatedTherapist) return
    setFormState((current) => (
      current.therapist_profile_id
        ? current
        : { ...current, therapist_profile_id: authenticatedTherapist.id }
    ))
  }, [authenticatedTherapist, isEditorOpen, selectedBookingId])

  useEffect(() => {
    if (!selectedBookingId) return
    if (filteredBookings.some((booking) => booking.id === selectedBookingId)) return
    setSelectedBookingId(filteredBookings[0]?.id ?? null)
  }, [filteredBookings, selectedBookingId])

  const startNewBooking = (requestedDate?: string, requestedTime?: string, requestedPatientId?: string) => {
    if (isEditorOpen && isEditorDirty && !window.confirm('Discard unsaved booking changes?')) return false
    const defaultPriceList = priceLists.find((priceList) => priceList.is_default) ?? priceLists[0] ?? null
    const activeLocations = locations.filter((location) => location.is_active)
    const defaultLocation = activeLocations.find((location) => location.is_main_location)
      ?? (activeLocations.length === 1 ? activeLocations[0] : null)
    const requestedPatient = requestedPatientId ? patients.find((patient) => patient.id === requestedPatientId) ?? null : null
    setSelectedBookingId(null)
    pendingCreatedBookingId.current = null
    setFormState({
      ...emptyBookingForm,
      patient_id: requestedPatient?.id ?? '',
      therapist_profile_id: authenticatedTherapist?.id ?? '',
      practice_location_id: defaultLocation?.id ?? '',
      booking_date: requestedDate ?? selectedDate,
      start_time: requestedTime ?? emptyBookingForm.start_time,
      price_list_id: defaultPriceList?.id ?? '',
    })
    setProcedureSelections([])
    setInlinePatientOpen(false)
    setIncludeGuardian(false)
    setIncludePatientNote(false)
    setInlinePatientForm(emptyInlinePatientForm)
    setPendingGuardianPatientId(null)
    setInlinePatientError('')
    setInlinePatientSuccess('')
    setSaveError('')
    setSuccessMessage('')
    setIsEditorDirty(false)
    setSessionPanelBookingId(null)
    setIsEditorOpen(true)
    return true
  }

  useEffect(() => {
    if (loading || searchParams.get('new') !== '1') return

    const requestedDate = searchParams.get('date')
    const requestedPatientId = searchParams.get('patient')
    if (requestedDate) setSelectedDate(requestedDate)
    startNewBooking(requestedDate ?? undefined, searchParams.get('time') ?? undefined, requestedPatientId ?? undefined)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('new')
    nextParams.delete('date')
    nextParams.delete('time')
    nextParams.delete('patient')
    setSearchParams(nextParams, { replace: true })
  }, [loading, searchParams, setSearchParams])

  const selectBooking = (booking: BookingRow) => {
    if (isEditorOpen && isEditorDirty && !window.confirm('Discard unsaved booking changes?')) return
    setSelectedBookingId(booking.id)
    pendingCreatedBookingId.current = null
    setSaveError('')
    setSuccessMessage('')
    setIsEditorDirty(false)
    setSessionPanelBookingId(null)
    setInlinePatientOpen(false)
    setIsEditorOpen(true)
  }

  const selectPatientForBooking = (patient: PatientRow) => {
    updateFormField('patient_id', patient.id)
    setInlinePatientOpen(false)
  }

  const openInlinePatientForm = () => {
    if (!canManagePatients || selectedBooking) return
    updateFormField('patient_id', '')
    setInlinePatientOpen(true)
    setIncludeGuardian(false)
    setIncludePatientNote(false)
    setInlinePatientForm(emptyInlinePatientForm)
    setPendingGuardianPatientId(null)
    setInlinePatientError('')
    setInlinePatientSuccess('')
  }

  const updateInlinePatientField = <Field extends keyof InlinePatientFormState>(field: Field, value: InlinePatientFormState[Field]) => {
    setInlinePatientForm((current) => ({ ...current, [field]: value }))
    setInlinePatientError('')
    setInlinePatientSuccess('')
    setIsEditorDirty(true)
  }

  const saveInlinePatient = async () => {
    if (!activeTenant?.id || !supabase || !canManagePatients || savingInlinePatient) return

    const firstName = inlinePatientForm.first_name.trim()
    const lastName = inlinePatientForm.last_name.trim()
    const patientEmail = inlinePatientForm.email.trim()
    const patientPhone = inlinePatientForm.phone.trim()
    const guardianFirstName = inlinePatientForm.guardian_first_name.trim()
    const guardianLastName = inlinePatientForm.guardian_last_name.trim()
    const guardianEmail = inlinePatientForm.guardian_email.trim()
    const guardianPhone = inlinePatientForm.guardian_phone.trim()
    const internalNote = inlinePatientForm.internal_note.trim()

    if (!pendingGuardianPatientId && (!firstName || !lastName)) {
      setInlinePatientError('Patient first name and surname are required.')
      return
    }
    if (!pendingGuardianPatientId && patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
      setInlinePatientError('Please enter a valid patient email address.')
      return
    }
    if (!pendingGuardianPatientId && patientPhone && !/^[0-9+\-()\s]{7,}$/.test(patientPhone)) {
      setInlinePatientError('Please enter a valid patient cellphone number.')
      return
    }
    if (includeGuardian && (!guardianFirstName || !guardianLastName)) {
      setInlinePatientError('Guardian first name and surname are required.')
      return
    }
    if (includeGuardian && guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      setInlinePatientError('Please enter a valid guardian email address.')
      return
    }
    if (includeGuardian && guardianPhone && !/^[0-9+\-()\s]{7,}$/.test(guardianPhone)) {
      setInlinePatientError('Please enter a valid guardian cellphone number.')
      return
    }

    setSavingInlinePatient(true)
    setInlinePatientError('')
    setInlinePatientSuccess('')

    let savedPatient = pendingGuardianPatientId
      ? patients.find((patient) => patient.id === pendingGuardianPatientId) ?? null
      : null

    if (!savedPatient) {
      const patientPayload: PatientInsert = {
        tenant_id: activeTenant.id,
        first_name: firstName,
        last_name: lastName,
        email: patientEmail || null,
        phone: patientPhone || null,
        patient_status: 'prospective',
        patient_type: 'unspecified',
        created_by_profile_id: profile?.id ?? null,
        updated_by_profile_id: profile?.id ?? null,
      }
      const patientResult = await supabase.from('patients').insert(patientPayload).select().single()
      if (patientResult.error) {
        setInlinePatientError(patientResult.error.message)
        setSavingInlinePatient(false)
        return
      }

      savedPatient = patientResult.data as PatientRow
      setPatients((current) => [...current, savedPatient as PatientRow].sort((left, right) => left.last_name.localeCompare(right.last_name) || left.first_name.localeCompare(right.first_name)))
      setPendingGuardianPatientId(savedPatient.id)
      updateFormField('patient_id', savedPatient.id)

      await supabase.from('patient_history_events').insert({
        tenant_id: activeTenant.id,
        patient_id: savedPatient.id,
        event_type: 'patient_created',
        event_title: 'Patient created',
        event_body: `${formatPatientName(savedPatient)} was created from New Booking.`,
        source_table: 'patients',
        source_id: savedPatient.id,
        is_patient_visible: false,
        metadata: { source: 'booking_panel' },
        created_by_profile_id: profile?.id ?? null,
      } satisfies PatientHistoryEventInsert)
    }

    if (internalNote) {
      const existingNoteResult = await supabase
        .from('patient_history_events')
        .select('id')
        .eq('tenant_id', activeTenant.id)
        .eq('patient_id', savedPatient.id)
        .eq('event_type', 'internal_patient_note')
        .eq('source_table', 'patients')
        .eq('source_id', savedPatient.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (existingNoteResult.error) {
        setInlinePatientError(`Patient created and selected, but the internal note could not be checked: ${existingNoteResult.error.message}. Try again; the patient will not be duplicated.`)
        setSavingInlinePatient(false)
        return
      }

      if (!existingNoteResult.data) {
        const noteResult = await supabase.from('patient_history_events').insert({
          tenant_id: activeTenant.id,
          patient_id: savedPatient.id,
          event_type: 'internal_patient_note',
          event_title: 'Internal patient note',
          event_body: internalNote,
          source_table: 'patients',
          source_id: savedPatient.id,
          is_patient_visible: false,
          metadata: {
            source: 'booking_panel',
            note_kind: 'initial_patient_note',
            visibility: 'internal',
          },
          created_by_profile_id: profile?.id ?? null,
        } satisfies PatientHistoryEventInsert)

        if (noteResult.error) {
          setInlinePatientError(`Patient created and selected, but the internal note could not be saved: ${noteResult.error.message}. Try again; the patient and note will not be duplicated.`)
          setSavingInlinePatient(false)
          return
        }
      }
    }

    if (includeGuardian) {
      const guardianPayload: ResponsiblePartyInsert = {
        tenant_id: activeTenant.id,
        patient_id: savedPatient.id,
        party_type: 'person',
        relationship_to_patient: 'parent_guardian',
        full_name: `${guardianFirstName} ${guardianLastName}`,
        email: guardianEmail || null,
        phone: guardianPhone || null,
        is_primary: true,
        is_billing_contact: true,
        account_responsibility_status: 'active',
        metadata: { source: 'booking_panel' },
        created_by_profile_id: profile?.id ?? null,
        updated_by_profile_id: profile?.id ?? null,
      }
      const guardianResult = await supabase.from('responsible_parties').insert(guardianPayload).select().single()
      if (guardianResult.error) {
        setInlinePatientError(`Patient created and selected, but the guardian could not be saved: ${guardianResult.error.message}. Correct the details and try again; the patient will not be duplicated.`)
        setSavingInlinePatient(false)
        return
      }
      const savedGuardian = guardianResult.data as ResponsiblePartyRow
      setResponsibleParties((current) => [...current, savedGuardian])
      await supabase.from('patient_history_events').insert({
        tenant_id: activeTenant.id,
        patient_id: savedPatient.id,
        event_type: 'responsible_party_added',
        event_title: 'Responsible party added',
        event_body: `${savedGuardian.full_name} was added as parent or guardian.`,
        source_table: 'responsible_parties',
        source_id: savedGuardian.id,
        is_patient_visible: false,
        metadata: { source: 'booking_panel' },
        created_by_profile_id: profile?.id ?? null,
      } satisfies PatientHistoryEventInsert)
    }

    setPendingGuardianPatientId(null)
    setInlinePatientOpen(false)
    setIncludeGuardian(false)
    setIncludePatientNote(false)
    setInlinePatientForm(emptyInlinePatientForm)
    setInlinePatientSuccess(`${formatPatientName(savedPatient)} was created and selected.`)
    setSuccessMessage(`${formatPatientName(savedPatient)} was created and selected. Save the booking when the appointment details are ready.`)
    setSavingInlinePatient(false)
  }

  const closeBookingEditor = () => {
    if (saving || savingInlinePatient) return
    if (isEditorDirty && !window.confirm('Discard unsaved booking changes?')) return
    setIsEditorOpen(false)
    setIsEditorDirty(false)
  }

  const openSessionPanel = (booking: BookingRow) => {
    if (isEditorOpen && isEditorDirty && !window.confirm('Discard unsaved booking changes?')) return
    setIsEditorOpen(false)
    setIsEditorDirty(false)
    setSessionPanelBookingId(booking.id)
  }

  const closeSessionPanel = () => {
    setSessionPanelBookingId(null)
  }

  useEffect(() => {
    if (!isEditorOpen && !sessionPanelBookingId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isEditorOpen) closeBookingEditor()
      if (sessionPanelBookingId) closeSessionPanel()
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isEditorDirty) return
      event.preventDefault()
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isEditorDirty, isEditorOpen, saving, savingInlinePatient, sessionPanelBookingId])

  const updateFormField = <Field extends keyof BookingFormState>(field: Field, value: BookingFormState[Field]) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setIsEditorDirty(true)
    setSaveError('')
    setSuccessMessage('')
  }

  const activePriceListItems = useMemo(
    () => priceListItems.filter((item) => item.price_list_id === formState.price_list_id),
    [formState.price_list_id, priceListItems],
  )

  const removeProcedureSelection = (index: number) => {
    setProcedureSelections((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setIsEditorDirty(true)
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
        if (seenProcedures.has(selection.price_list_item_id)) return 'This procedure has already been added.'
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
    const isNewBooking = !selectedBooking

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

    const bookingIdToUpdate = selectedBooking?.id ?? pendingCreatedBookingId.current
    const bookingResult = bookingIdToUpdate
      ? await supabase
          .from('bookings')
          .update({ ...bookingPayload, patient_id: formState.patient_id } satisfies BookingUpdate)
          .eq('id', bookingIdToUpdate)
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
    if (isNewBooking) pendingCreatedBookingId.current = savedBooking.id

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
            metadata: selection.booking_procedure_id ? selection.metadata ?? item?.metadata ?? {} : item?.metadata ?? {},
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
      const bookingAlreadyLoaded = currentBookings.some((booking) => booking.id === savedBooking.id)
      const nextBookings = bookingAlreadyLoaded
        ? currentBookings.map((booking) => (booking.id === savedBooking.id ? savedBooking : booking))
        : [...currentBookings, savedBooking]
      return nextBookings.sort((left, right) => (left.start_at ?? '').localeCompare(right.start_at ?? ''))
    })
    setBookingProcedures((currentProcedures) => [
      ...currentProcedures.filter((procedure) => procedure.booking_id !== savedBooking.id),
      ...savedProcedures,
    ])
    setSelectedBookingId(savedBooking.id)
    setSuccessMessage(isNewBooking ? 'Booking created.' : 'Booking updated.')
    setIsEditorDirty(false)
    pendingCreatedBookingId.current = null
    setSaving(false)
    if (isNewBooking) setIsEditorOpen(false)
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
      <header className="practice-calendar-header">
        <div className="practice-calendar-heading">
          <h1>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], { month: 'long', year: 'numeric' })}</h1>
          <div className="practice-calendar-period-navigation" aria-label="Calendar date navigation">
            <button type="button" onClick={() => setSelectedDate(formatDateInput(addDays(new Date(`${selectedDate}T00:00:00`), calendarMode === 'day' ? -1 : -7)))} aria-label="Previous period" title="Previous period">&lsaquo;</button>
            <button type="button" onClick={() => setSelectedDate(formatDateInput(addDays(new Date(`${selectedDate}T00:00:00`), calendarMode === 'day' ? 1 : 7)))} aria-label="Next period" title="Next period">&rsaquo;</button>
          </div>
        </div>
        <div className="practice-calendar-actions">
          <div className="practice-calendar-segmented" aria-label="Calendar view">
            <button className={calendarMode === 'day' ? 'active' : ''} type="button" onClick={() => setCalendarMode('day')}>Day</button>
            <button className={calendarMode === 'week' ? 'active' : ''} type="button" onClick={() => setCalendarMode('week')}>Week</button>
          </div>
          <button className={filtersOpen ? 'active' : ''} type="button" onClick={() => setFiltersOpen((current) => !current)}>Filters</button>
          {canManageBookings && <Button onClick={() => startNewBooking()}>Add Booking</Button>}
        </div>
        {!canManageBookings && <span className="practice-calendar-readonly">Read only</span>}
      </header>

      {filtersOpen && (
        <div className="practice-calendar-filters">
          <label><span>Therapist</span><select value={therapistFilter} onChange={(event) => setTherapistFilter(event.target.value)}><option value="all">All therapists</option>{therapists.map((therapist) => <option value={therapist.id} key={therapist.id}>{therapist.display_name}</option>)}</select></label>
          <label><span>Location</span><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="all">All locations</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.location_name}</option>)}</select></label>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Active bookings</option><option value="all">All visible statuses</option>{bookingStatuses.filter((status) => status !== 'cancelled').map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
        </div>
      )}

      <section className="practice-time-calendar" aria-label={`${calendarMode} calendar`}>
        <div className="practice-calendar-days" style={{ gridTemplateColumns: `60px repeat(${visibleDates.length}, minmax(${calendarMode === 'day' ? '520px' : '150px'}, 1fr))` }}>
          <div className="practice-calendar-corner" />
          {visibleDates.map((date) => {
            const dateKey = formatDateInput(date)
            const isToday = dateKey === practiceToday
            return (
              <div className={`practice-calendar-day-heading${isToday ? ' today' : ''}`} key={dateKey}>
                <div className="practice-calendar-day-label">
                  <span>{date.toLocaleDateString([], { weekday: 'short' })}</span>
                  <strong>{date.getDate()}</strong>
                </div>
              </div>
            )
          })}
        </div>
        <div className="practice-calendar-scroll">
          <div className="practice-calendar-grid" style={{ gridTemplateColumns: `60px repeat(${visibleDates.length}, minmax(${calendarMode === 'day' ? '520px' : '150px'}, 1fr))`, height: `${(visibleCalendarHours.end - visibleCalendarHours.start) * calendarHourHeight}px` }}>
            <div className="practice-calendar-times">
              {Array.from({ length: visibleCalendarHours.end - visibleCalendarHours.start + 1 }, (_, index) => visibleCalendarHours.start + index).map((hour) => (
                <span style={{ top: `${(hour - visibleCalendarHours.start) * calendarHourHeight}px` }} key={hour}>{String(hour).padStart(2, '0')}:00</span>
              ))}
            </div>
            {visibleDates.map((date) => {
              const dateKey = formatDateInput(date)
              const dayBookings = filteredBookings.filter((booking) => booking.start_at && formatDateInput(new Date(booking.start_at)) === dateKey)
              const layout = layoutCalendarBookings(dayBookings, visibleCalendarHours.start, visibleCalendarHours.end)
              return (
                <div className="practice-calendar-day-column" key={dateKey}>
                  <button
                    className="practice-calendar-empty-space"
                    type="button"
                    aria-label={`Create booking on ${formatCalendarHeading(date, 'day')}`}
                    onMouseMove={(event) => {
                      if (!canManageBookings) return
                      const slot = getCalendarSlot(event.clientY, event.currentTarget.getBoundingClientRect(), visibleCalendarHours.start, visibleCalendarHours.end)
                      setHoveredCalendarSlot({ date: dateKey, ...slot })
                    }}
                    onMouseLeave={() => setHoveredCalendarSlot((current) => current?.date === dateKey ? null : current)}
                    onClick={(event) => {
                      if (!canManageBookings || event.detail > 1) return
                      const slot = getCalendarSlot(event.clientY, event.currentTarget.getBoundingClientRect(), visibleCalendarHours.start, visibleCalendarHours.end)
                      setSelectedDate(dateKey)
                      startNewBooking(dateKey, slot.time)
                    }}
                  >
                    {hoveredCalendarSlot?.date === dateKey && (
                      <span className="practice-calendar-hover-slot" style={{ top: `${hoveredCalendarSlot.top}px` }} aria-hidden="true">
                        <span>{hoveredCalendarSlot.time}</span>
                      </span>
                    )}
                  </button>
                  {layout.map(({ booking, top, height, left, width }) => {
                    const patient = patients.find((item) => item.id === booking.patient_id)
                    const procedure = bookingProcedures.find((item) => item.booking_id === booking.id)
                    const linkedSession = sessionStatuses.find((session) => session.booking_id === booking.id)
                    const isCompletedSession = linkedSession?.session_status === 'completed'
                    const isBillableSession = Boolean(linkedSession && billableSessionIds.has(linkedSession.id))
                    const financeFlag = financeFlagByPatientId.get(booking.patient_id) ?? null
                    const isElapsedBooking = Boolean(booking.end_at && new Date(booking.end_at).getTime() < Date.now())
                    const isPostSessionTime = Boolean(
                      linkedSession
                      && isElapsedBooking
                      && !['cancelled', 'no_show'].includes(linkedSession.session_status)
                      && !['cancelled', 'no_show'].includes(booking.booking_status),
                    )
                    const isPastOrCompleted = isCompletedSession
                      || booking.booking_status === 'completed'
                      || (isElapsedBooking && booking.booking_status !== 'cancelled' && booking.booking_status !== 'no_show')
                    const hasResolvedProcessNote = Boolean(linkedSession && (
                      savedClinicalTaskKeys.has(`session:${linkedSession.id}:process_note`)
                      || savedClinicalTaskKeys.has(`booking:${booking.id}:process_note`)
                      || skippedProcessNoteSessionIds.has(linkedSession.id)
                    ))
                    const outstandingTasks: string[] = []
                    if (isPostSessionTime && canReadClinicalTaskStatus && !hasResolvedProcessNote) {
                      outstandingTasks.push('Process Note')
                    }
                    if (isPostSessionTime && linkedSession && isBillableSession && canReadInvoiceStatus && !issuedInvoiceSessionIds.has(linkedSession.id)) {
                      outstandingTasks.push('invoice issuing')
                    }
                    const actionLabel = outstandingTasks.length > 0
                      ? `Outstanding: ${outstandingTasks.join(', ')}`
                      : null
                    const terminalStatusLabel = booking.booking_status === 'cancelled'
                      ? 'Cancelled'
                      : booking.booking_status === 'no_show'
                        ? 'No show'
                        : null
                    const accessibleStatusLabel = isCompletedSession ? 'Completed' : terminalStatusLabel ?? formatLabel(booking.booking_status)
                    const renderedMinutes = Math.round((height / calendarHourHeight) * 60)
                    const density = renderedMinutes < 30
                      ? 'single-line'
                      : renderedMinutes < 45
                        ? 'two-line'
                        : renderedMinutes < 60
                          ? 'three-line'
                          : 'full'
                    const showTime = renderedMinutes >= 30
                    const showService = renderedMinutes >= 45
                    const showControls = renderedMinutes >= 60
                    const patientName = formatPatientName(patient)
                    const serviceName = procedure?.procedure_name ?? booking.patient_facing_title ?? formatLabel(booking.booking_type)
                    const appointmentLabel = `${patientName}, ${formatTime(booking.start_at)} to ${formatTime(booking.end_at)}, ${serviceName}, ${accessibleStatusLabel}`
                    return (
                      <article className={`practice-calendar-event density-${density} status-${booking.booking_status}${isCompletedSession ? ' completed-session' : ''}${isPastOrCompleted ? ' past-or-completed' : ''}${terminalStatusLabel && showControls ? ' has-status-label' : ''}${actionLabel ? ' has-action-marker' : ''}${financeFlag ? ' has-finance-flag' : ''}`} style={{ top, height, left: `calc(${left}% + 3px)`, width: `calc(${width}% - 6px)` }} title={appointmentLabel} key={booking.id}>
                        <button className="practice-calendar-event-open" type="button" onClick={() => { setSelectedDate(dateKey); openSessionPanel(booking) }} aria-label={`Open session for ${appointmentLabel}`}>
                          <strong>{patientName}</strong>
                          {showTime && <span className="practice-calendar-event-time">{formatTime(booking.start_at)} – {formatTime(booking.end_at)}</span>}
                          {showService && <small className="practice-calendar-event-service">{serviceName}</small>}
                        </button>
                        {showControls && terminalStatusLabel && <span className="practice-calendar-event-status-label">{terminalStatusLabel}</span>}
                        {actionLabel && (
                          <span
                            className="practice-calendar-action-indicator"
                            role="img"
                            aria-label={actionLabel}
                            title={actionLabel}
                          />
                        )}
                        {financeFlag && canReadInvoiceStatus && (
                          <span className={`practice-calendar-event-indicators${showService ? '' : ' compact'}`}>
                            <span
                              className={`practice-calendar-finance-indicator finance-flag-${financeFlag}`}
                              role="img"
                              aria-label={`${financeFlag} finance flag: patient statement has an unpaid balance`}
                              title={`${financeFlag[0].toUpperCase()}${financeFlag.slice(1)} finance flag · unpaid monthly statement balance`}
                            >
                              <FinanceIcon size={13} />
                            </span>
                          </span>
                        )}
                      </article>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {isEditorOpen && (
        <div className="practice-side-panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeBookingEditor() }}>
          <section className="practice-side-panel practice-booking-panel" role="dialog" aria-modal="true" aria-label={selectedBooking ? 'Edit booking' : 'New booking'}>
            <div className="modal-header">
              <div><h2>{selectedBooking ? 'Edit Booking' : 'New Booking'}</h2></div>
              <button type="button" className="modal-close" onClick={closeBookingEditor} disabled={saving || savingInlinePatient} aria-label="Close booking editor">x</button>
            </div>
            <div className="modal-body booking-editor-stack">
          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header booking-editor-header">
              <div className="booking-editor-patient-search">
                <PatientCombobox
                  patients={patients}
                  selectedPatientId={formState.patient_id}
                  canCreatePatient={canManagePatients && !Boolean(selectedBooking)}
                  disabled={!canEditSelectedBooking || saving}
                  onSelectPatient={selectPatientForBooking}
                  onClearPatient={() => updateFormField('patient_id', '')}
                  onCreatePatient={openInlinePatientForm}
                />
              </div>
              <div className="patients-action-row">
                {canManageBookings && <Button disabled={saving || savingInlinePatient || inlinePatientOpen || !canEditSelectedBooking} onClick={saveBooking}>{saving ? 'Saving' : selectedBooking ? 'Save Booking' : 'Create Booking'}</Button>}
              </div>
            </div>

            <div className="settings-form-grid booking-form-grid">
              {inlinePatientOpen && (
                <section className="wide-field booking-inline-patient" aria-label="New patient">
                  <div className="booking-inline-patient-heading">
                    <div><span>New patient</span><strong>Basic patient details</strong></div>
                    <button type="button" disabled={savingInlinePatient} onClick={() => { setInlinePatientOpen(false); setIncludeGuardian(false); setIncludePatientNote(false); setPendingGuardianPatientId(null); setInlinePatientError('') }}>Cancel</button>
                  </div>
                  <div className="booking-inline-patient-grid">
                    <label><span>First name *</span><input autoFocus value={inlinePatientForm.first_name} disabled={savingInlinePatient || Boolean(pendingGuardianPatientId)} onChange={(event) => updateInlinePatientField('first_name', event.target.value)} /></label>
                    <label><span>Surname *</span><input value={inlinePatientForm.last_name} disabled={savingInlinePatient || Boolean(pendingGuardianPatientId)} onChange={(event) => updateInlinePatientField('last_name', event.target.value)} /></label>
                    <label><span>Email</span><input type="email" value={inlinePatientForm.email} disabled={savingInlinePatient || Boolean(pendingGuardianPatientId)} onChange={(event) => updateInlinePatientField('email', event.target.value)} /></label>
                    <label><span>Cellphone</span><input type="tel" value={inlinePatientForm.phone} disabled={savingInlinePatient || Boolean(pendingGuardianPatientId)} onChange={(event) => updateInlinePatientField('phone', event.target.value)} /></label>
                  </div>
                  <div className="booking-inline-optional-actions">
                    {!includeGuardian && <button className="booking-add-guardian" type="button" disabled={savingInlinePatient} onClick={() => { setIncludeGuardian(true); setIsEditorDirty(true) }}>+ Add Parent / Guardian</button>}
                    {!includePatientNote && <button className="booking-add-guardian" type="button" disabled={savingInlinePatient} onClick={() => { setIncludePatientNote(true); setIsEditorDirty(true) }}>+ Add Note</button>}
                  </div>
                  {includeGuardian && (
                    <div className="booking-inline-guardian">
                      <div className="booking-inline-patient-heading"><strong>Parent / Guardian</strong><button type="button" disabled={savingInlinePatient} onClick={() => { setIncludeGuardian(false); setInlinePatientError('') }}>Remove</button></div>
                      <div className="booking-inline-patient-grid">
                        <label><span>Guardian first name *</span><input value={inlinePatientForm.guardian_first_name} disabled={savingInlinePatient} onChange={(event) => updateInlinePatientField('guardian_first_name', event.target.value)} /></label>
                        <label><span>Guardian surname *</span><input value={inlinePatientForm.guardian_last_name} disabled={savingInlinePatient} onChange={(event) => updateInlinePatientField('guardian_last_name', event.target.value)} /></label>
                        <label><span>Guardian email</span><input type="email" value={inlinePatientForm.guardian_email} disabled={savingInlinePatient} onChange={(event) => updateInlinePatientField('guardian_email', event.target.value)} /></label>
                        <label><span>Guardian cellphone</span><input type="tel" value={inlinePatientForm.guardian_phone} disabled={savingInlinePatient} onChange={(event) => updateInlinePatientField('guardian_phone', event.target.value)} /></label>
                      </div>
                    </div>
                  )}
                  {includePatientNote && (
                    <div className="booking-inline-note">
                      <label>
                        <span>Internal patient note</span>
                        <textarea
                          rows={3}
                          value={inlinePatientForm.internal_note}
                          disabled={savingInlinePatient}
                          placeholder="Add a quick internal note"
                          onChange={(event) => updateInlinePatientField('internal_note', event.target.value)}
                        />
                      </label>
                      <button type="button" disabled={savingInlinePatient} onClick={() => { setIncludePatientNote(false); updateInlinePatientField('internal_note', '') }}>Remove note</button>
                    </div>
                  )}
                  <div className="booking-inline-patient-actions">
                    <Button disabled={savingInlinePatient} onClick={saveInlinePatient}>{savingInlinePatient ? 'Saving Patient' : pendingGuardianPatientId && includeGuardian ? 'Retry Guardian' : pendingGuardianPatientId ? 'Continue' : 'Save New Patient'}</Button>
                  </div>
                </section>
              )}
              <label><span>Therapist</span><select value={formState.therapist_profile_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('therapist_profile_id', event.target.value)}><option value="">Select therapist</option>{therapists.map((therapist) => <option value={therapist.id} key={therapist.id}>{therapist.display_name}{therapist.is_active ? '' : ' · inactive'}</option>)}</select></label>
              <label><span>Location</span><select value={formState.practice_location_id} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('practice_location_id', event.target.value)}><option value="">Select location</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.location_name}{location.is_active ? '' : ' · inactive'}</option>)}</select></label>
              <label><span>Date</span><input type="date" value={formState.booking_date} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_date', event.target.value)} /></label>
              <label><span>Start time</span><select value={formState.start_time} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('start_time', event.target.value)}>{bookingTimeOptions.map((time) => <option value={time} key={time}>{time}</option>)}</select></label>
              <label><span>Duration</span><select value={formState.duration_minutes} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('duration_minutes', event.target.value)}>{bookingDurationOptions.map((duration) => <option value={duration} key={duration}>{duration} minutes</option>)}</select></label>
              <label><span>Mode</span><select value={formState.appointment_mode} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('appointment_mode', event.target.value)}>{appointmentModes.map((mode) => <option value={mode} key={mode}>{formatLabel(mode)}</option>)}</select></label>
              {selectedBooking && <label><span>Status</span><select value={formState.booking_status} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_status', event.target.value)}>{editableStatusOptions.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>}
              {selectedBooking && <label><span>Booking type</span><select value={formState.booking_type} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_type', event.target.value)}>{bookingTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>}
              {selectedBooking && <label><span>Source</span><select value={formState.booking_source} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('booking_source', event.target.value)}>{bookingSources.map((source) => <option value={source} key={source}>{formatLabel(source)}</option>)}</select></label>}
              {selectedBooking && <label className="wide-field"><span>Patient-facing title</span><input value={formState.patient_facing_title} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('patient_facing_title', event.target.value)} /></label>}
              {selectedBooking && <label className="wide-field"><span>Patient-facing notes</span><textarea value={formState.patient_facing_notes} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('patient_facing_notes', event.target.value)} /></label>}
              {selectedBooking && canReadInternalNotes && <label className="wide-field"><span>Internal administrative note</span><textarea value={formState.internal_admin_note} disabled={!canEditSelectedBooking || saving} onChange={(event) => updateFormField('internal_admin_note', event.target.value)} /></label>}
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
                <span>Services &amp; Expected Charges</span>
                <h3>{formatMoney(procedureTotal)}</h3>
              </div>
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
                {selectedPatient?.active_icd10_code && <div className="booking-diagnosis-context"><span>Patient ICD-10</span><strong>{selectedPatient.active_icd10_code}</strong><small>Clinical context only. It is not automatically applied to this service.</small></div>}
                <div className="booking-procedure-list">
                  {canEditSelectedBooking && (
                    <label className="booking-procedure-search">
                      <span>Add procedure</span>
                      <ProcedureCombobox
                        key={`new-procedure-${procedureSelections.length}`}
                        items={activePriceListItems}
                        selectedItemId=""
                        disabled={saving || activePriceListItems.length === 0}
                        onSelect={(priceItem) => {
                          setProcedureSelections((current) => [...current, {
                            price_list_item_id: priceItem.id,
                            quantity: '1',
                          }])
                          setIsEditorDirty(true)
                        }}
                        onClear={() => undefined}
                      />
                    </label>
                  )}
                  <div className="session-procedure-table-wrap">
                    <table className="session-procedure-table booking-procedure-table">
                      <thead>
                        <tr>
                          <th>Procedure code</th>
                          <th>Name</th>
                          <th>ICD-10 code</th>
                          <th>Price</th>
                          {canEditSelectedBooking && <th aria-label="Actions" />}
                        </tr>
                      </thead>
                      <tbody>
                        {procedureSelections.map((selection, index) => {
                          const item = priceListItems.find((priceItem) => priceItem.id === selection.price_list_item_id)
                          const quantity = Number(selection.quantity)
                          const procedureCode = selection.booking_procedure_id ? selection.procedure_code ?? item?.procedure_code : item?.procedure_code
                          const procedureName = selection.booking_procedure_id ? selection.procedure_name ?? item?.procedure_name : item?.procedure_name
                          const icd10Code = icd10CodeFromMetadata(selection.booking_procedure_id ? selection.metadata ?? item?.metadata : item?.metadata)
                          const price = (selection.unit_price ?? item?.price ?? 0) * (Number.isFinite(quantity) ? quantity : 0)
                          return (
                            <tr key={selection.booking_procedure_id ?? `procedure-row-${index}`}>
                              <td className="session-procedure-code">{procedureCode || '—'}</td>
                              <td className="session-procedure-name">{procedureName || '—'}</td>
                              <td className="session-procedure-icd10">{icd10Code || '—'}</td>
                              <td className="session-procedure-price">{selection.price_list_item_id ? formatMoney(price) : '—'}</td>
                              {canEditSelectedBooking && (
                                <td className="session-procedure-remove-cell">
                                  <button className="ui-icon-action" type="button" disabled={saving} onClick={() => removeProcedureSelection(index)} aria-label="Remove procedure" title="Remove procedure"><TrashIcon /></button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
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
                {(selectedBooking.booking_status === 'confirmed' || selectedBooking.booking_status === 'checked_in' || selectedBooking.booking_status === 'in_progress') && <Button variant="secondary" disabled={saving} onClick={() => openSessionPanel(selectedBooking)}>Create/Open Session</Button>}
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
          </section>
        </div>
      )}

      {sessionPanelBookingId && (
        <div className="practice-side-panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeSessionPanel() }}>
          <section className="practice-side-panel practice-session-panel" role="dialog" aria-modal="true" aria-label="Session workspace">
            <div className="modal-header">
              <div><p>Session</p><h2>Session Workspace</h2></div>
              <button
                type="button"
                className="modal-close session-panel-close"
                onClick={(event) => {
                  event.stopPropagation()
                  closeSessionPanel()
                }}
                aria-label="Close session workspace"
              >x</button>
            </div>
            <div className="practice-session-panel-body">
              <SessionsPage
                embeddedBookingId={sessionPanelBookingId}
                onSessionStatusChange={handleSessionStatusChange}
                onBookingChange={handleSessionBookingChange}
                onClinicalNoteChange={handleSessionClinicalNoteChange}
                onProcessNoteSkipChange={handleProcessNoteSkipChange}
                onInvoiceChange={handleSessionInvoiceChange}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
