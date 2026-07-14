import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, SearchBar, StatusBadge } from '../components/ui'
import type { Database, Json } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
type InvoiceLineRow = Database['public']['Tables']['invoice_lines']['Row']
type InvoiceLineInsert = Database['public']['Tables']['invoice_lines']['Insert']
type InvoiceLineUpdate = Database['public']['Tables']['invoice_lines']['Update']
type InvoicePartySnapshotRow = Database['public']['Tables']['invoice_party_snapshots']['Row']
type InvoicePartySnapshotUpdate = Database['public']['Tables']['invoice_party_snapshots']['Update']
type InvoiceIssuerSnapshotRow = Database['public']['Tables']['invoice_issuer_snapshots']['Row']
type InvoiceIssuerSnapshotUpdate = Database['public']['Tables']['invoice_issuer_snapshots']['Update']
type InvoiceStatusHistoryRow = Database['public']['Tables']['invoice_status_history']['Row']
type InvoiceStatusHistoryInsert = Database['public']['Tables']['invoice_status_history']['Insert']
type InvoiceWorkflowEventRow = Database['public']['Tables']['invoice_workflow_events']['Row']
type InvoiceWorkflowEventInsert = Database['public']['Tables']['invoice_workflow_events']['Insert']
type PatientRow = Database['public']['Tables']['patients']['Row']
type ResponsiblePartyRow = Database['public']['Tables']['responsible_parties']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionProcedureRow = Database['public']['Tables']['session_procedures']['Row']
type SessionWorkflowEventRow = Database['public']['Tables']['session_workflow_events']['Row']
type TherapistRow = Database['public']['Tables']['therapist_profiles']['Row']
type LocationRow = Database['public']['Tables']['practice_locations']['Row']

type DraftQueueItem = {
  session: SessionRow
  patient: PatientRow | null
  responsibleParty: ResponsiblePartyRow | null
  therapist: TherapistRow | null
  location: LocationRow | null
  procedures: SessionProcedureRow[]
  requestEvent: SessionWorkflowEventRow | null
  total: number
}

type InvoiceDetail = {
  invoice: InvoiceRow
  lines: InvoiceLineRow[]
  partySnapshot: InvoicePartySnapshotRow | null
  issuerSnapshot: InvoiceIssuerSnapshotRow | null
  statusHistory: InvoiceStatusHistoryRow[]
  workflowEvents: InvoiceWorkflowEventRow[]
}

type InvoiceDraftForm = {
  due_date: string
  payment_terms_days: string
  invoice_notes: string
  manual_edit_reason: string
  patient_full_name: string
  responsible_party_name: string
  relationship_to_patient: string
  billing_email: string
  billing_phone: string
  billing_address: string
  organisation_name: string
  practice_name: string
  practice_email: string
  practice_phone: string
  therapist_name: string
  therapist_practice_number: string
  payment_instructions: string
  invoice_footer: string
}

type LineDraft = {
  id?: string
  procedure_name: string
  procedure_code: string
  description: string
  service_date: string
  icd10_code: string
  quantity: string
  unit_price: string
  discount_amount: string
  adjustment_amount: string
  tax_rate: string
  line_order: string
  change_reason: string
  deleted_at?: string | null
}

const editableStatuses = ['draft', 'review_required', 'ready_to_confirm']
const confirmableStatuses = ['draft', 'ready_to_confirm']
const immutableStatuses = ['confirmed', 'issued', 'awaiting_payment', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided', 'written_off']
const statusOptions = ['all', 'draft', 'review_required', 'ready_to_confirm', 'confirmed', 'awaiting_payment', 'paid', 'cancelled', 'voided']
const dateRangeOptions = [
  { value: 'all', label: 'All dates' },
  { value: '30', label: 'Past 30 days' },
  { value: '90', label: 'Past 90 days' },
  { value: '180', label: 'Past 6 months' },
]

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Not set'
  return value.replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatMoney(value: number | null | undefined, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(Number(value ?? 0))
}

function formatPatientName(patient: PatientRow | null | undefined) {
  if (!patient) return 'Unknown patient'
  return `${patient.first_name} ${patient.last_name}`.trim()
}

function getStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'confirmed' || status === 'issued' || status === 'awaiting_payment') return 'success'
  if (status === 'draft' || status === 'ready_to_confirm') return 'info'
  if (status === 'review_required' || status === 'overdue' || status === 'partially_paid') return 'warning'
  if (status === 'cancelled' || status === 'voided' || status === 'written_off') return 'danger'
  if (status === 'paid') return 'success'
  return 'neutral'
}

function getEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    draft_invoice_requested: 'Draft Invoice Requested',
    draft_invoice_created: 'Draft Invoice Created',
    draft_invoice_updated: 'Draft Updated',
    draft_invoice_review_required: 'Review Required',
    invoice_ready_to_confirm: 'Ready to Confirm',
    invoice_number_allocated: 'Invoice Number Allocated',
    invoice_confirmed: 'Invoice Confirmed',
    invoice_reconciliation_required: 'Reconciliation Required',
    draft_invoice_cancelled: 'Draft Cancelled',
    patient_link_update_ready: 'Patient Link Update Ready',
    communication_ready: 'Communication Ready',
    pdf_generation_ready: 'PDF Generation Ready',
  }
  return labels[eventType] ?? formatLabel(eventType)
}

function getFriendlyFinanceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (message.includes('Not allowed')) return 'Your current role is not allowed to perform this finance action.'
  if (message.includes('Session not found')) return 'This session could not be found or is no longer accessible.'
  if (message.includes('Session has no draft invoice request')) return 'This session is not ready for draft invoice creation yet.'
  if (message.includes('At least one billable')) return 'At least one billable delivered procedure is required before a draft invoice can be created.'
  if (message.includes('Responsible party')) return 'The invoice needs responsible-party billing details before it can be completed.'
  if (message.includes('Billing settings')) return 'Practice billing settings need review before this invoice can be completed.'
  if (message.includes('Banking details')) return 'Practice banking details need review before this invoice can be completed.'
  if (message.includes('requires at least one line')) return 'The invoice needs at least one line item before confirmation.'
  if (message.includes('requires a due date')) return 'Add a due date before confirming this invoice.'
  if (message.includes('requires reconciliation')) return 'This invoice needs reconciliation before it can be confirmed.'
  if (message.includes('duplicate key') || message.includes('23505')) return 'This action was already recorded. Refreshing will show the latest invoice state.'
  return message
}

function getMetadataText(metadata: Json, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const value = metadata[key]
  return typeof value === 'string' ? value : ''
}

function parseAddress(value: string): Json {
  const trimmed = value.trim()
  if (!trimmed) return {}
  return { display: trimmed }
}

function formatJsonAddress(value: Json) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const display = value.display
  if (typeof display === 'string') return display
  return Object.entries(value)
    .filter(([, entry]) => typeof entry === 'string' && entry.trim())
    .map(([, entry]) => entry)
    .join(', ')
}

function toNumber(value: string, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function toMoneyNumber(value: string, fallback = 0) {
  return Math.round(toNumber(value, fallback) * 100) / 100
}

function getInvoiceDisplay(invoice: InvoiceRow) {
  return invoice.invoice_number ?? invoice.draft_reference
}

function isDraftEditable(invoice: InvoiceRow | null, canManageFinance: boolean) {
  return Boolean(invoice && canManageFinance && editableStatuses.includes(invoice.invoice_status))
}

function getLinePreviewTotal(draft: LineDraft) {
  const quantity = toNumber(draft.quantity, 1)
  const unitPrice = toMoneyNumber(draft.unit_price)
  const discount = toMoneyNumber(draft.discount_amount)
  const adjustment = toMoneyNumber(draft.adjustment_amount)
  const taxRate = toNumber(draft.tax_rate)
  const taxable = quantity * unitPrice - discount + adjustment
  const tax = taxable * (taxRate / 100)
  return Math.max(0, Math.round((taxable + tax) * 100) / 100)
}

function hasMeaningfulInvoiceChanges(detail: InvoiceDetail, form: InvoiceDraftForm) {
  const invoice = detail.invoice
  const party = detail.partySnapshot
  const issuer = detail.issuerSnapshot
  return invoice.due_date !== (form.due_date || null)
    || String(invoice.payment_terms_days) !== String(Math.max(0, Math.round(toNumber(form.payment_terms_days, invoice.payment_terms_days))))
    || getMetadataText(invoice.metadata, 'invoice_notes') !== form.invoice_notes.trim()
    || (invoice.manual_edit_reason ?? '') !== form.manual_edit_reason.trim()
    || (party?.patient_full_name ?? '') !== form.patient_full_name.trim()
    || (party?.responsible_party_name ?? '') !== (form.responsible_party_name.trim() || '')
    || (party?.relationship_to_patient ?? '') !== (form.relationship_to_patient.trim() || '')
    || (party?.billing_email ?? '') !== (form.billing_email.trim() || '')
    || (party?.billing_phone ?? '') !== (form.billing_phone.trim() || '')
    || formatJsonAddress(party?.billing_address ?? {}) !== form.billing_address.trim()
    || (party?.organisation_name ?? '') !== (form.organisation_name.trim() || '')
    || (issuer?.practice_trading_name || issuer?.practice_legal_name || '') !== form.practice_name.trim()
    || (issuer?.practice_email ?? '') !== (form.practice_email.trim() || '')
    || (issuer?.practice_phone ?? '') !== (form.practice_phone.trim() || '')
    || (issuer?.therapist_name ?? '') !== (form.therapist_name.trim() || '')
    || (issuer?.therapist_practice_number ?? '') !== (form.therapist_practice_number.trim() || '')
    || (issuer?.payment_instructions ?? '') !== (form.payment_instructions.trim() || '')
    || (issuer?.invoice_footer ?? '') !== (form.invoice_footer.trim() || '')
}

function getDraftContextWarnings(item: DraftQueueItem) {
  const warnings: string[] = []
  if (!item.patient) warnings.push('Missing patient')
  if (!item.responsibleParty) warnings.push('Responsible party review')
  if (!item.therapist) warnings.push('Missing therapist')
  if (!item.location) warnings.push('Location review')
  if (!item.procedures.length) warnings.push('No billable procedures')
  if (!item.requestEvent) warnings.push('Missing draft request event')
  if (item.session.draft_invoice_request_status === 'failed') warnings.push('Previous creation failed')
  if (item.session.draft_invoice_request_status === 'stale_after_reopen') warnings.push('Session was reopened')
  return warnings
}

function validateLineDraft(draft: LineDraft) {
  if (!draft.procedure_name.trim()) return 'Procedure name is required.'
  const quantity = toNumber(draft.quantity)
  const unitPrice = toMoneyNumber(draft.unit_price)
  const discount = toMoneyNumber(draft.discount_amount)
  const adjustment = toMoneyNumber(draft.adjustment_amount)
  const taxRate = toNumber(draft.tax_rate)
  const order = Math.round(toNumber(draft.line_order))
  if (quantity <= 0) return 'Quantity must be greater than zero.'
  if (unitPrice < 0) return 'Unit price cannot be negative.'
  if (discount < 0) return 'Discount cannot be negative.'
  if (adjustment < 0) return 'Adjustment cannot be negative.'
  if (taxRate < 0 || taxRate > 100) return 'Tax rate must be between 0 and 100.'
  if (order <= 0) return 'Line order must be greater than zero.'
  if (discount > quantity * unitPrice + adjustment) return 'Discount cannot be larger than the line amount.'
  if (draft.id && !draft.change_reason.trim()) return 'Change reason is required when editing a draft invoice line.'
  return ''
}

function validateReadyToConfirm(detail: InvoiceDetail | null, form: InvoiceDraftForm, drafts: LineDraft[]) {
  if (!detail) return 'Invoice details are still loading.'
  const invoice = detail.invoice
  if (!editableStatuses.includes(invoice.invoice_status)) return 'Only draft invoices can be prepared for confirmation.'
  if (invoice.reconciliation_required) return 'Resolve reconciliation before confirming this invoice.'
  if (!form.due_date) return 'Due date is required.'
  if (toNumber(form.payment_terms_days, -1) < 0) return 'Payment terms must be zero or more days.'
  if (!invoice.currency_code || invoice.currency_code.length !== 3) return 'Invoice currency is required.'
  if (!form.patient_full_name.trim()) return 'Recipient patient name is required.'
  if (!form.responsible_party_name.trim() && !form.billing_email.trim()) return 'Responsible party or billing email is required.'
  if (!form.practice_name.trim() && !form.therapist_name.trim()) return 'Issuer practice or therapist name is required.'
  if (!form.practice_email.trim() && !form.practice_phone.trim()) return 'Issuer contact details are required.'
  if (!detail.issuerSnapshot?.bank_name || !detail.issuerSnapshot.bank_account_number) return 'Invoice banking snapshot requires review before confirmation.'
  if (!drafts.length) return 'At least one invoice line is required.'
  const invalidLine = drafts.find((draft) => validateLineDraft(draft))
  if (invalidLine) return validateLineDraft(invalidLine)
  if (invoice.total_amount < 0 || invoice.balance_due < 0) return 'Invoice totals require review before confirmation.'
  return ''
}

function getInitialLineDraft(line?: InvoiceLineRow, order = 1): LineDraft {
  return {
    id: line?.id,
    procedure_name: line?.procedure_name ?? '',
    procedure_code: line?.procedure_code ?? '',
    description: line?.description ?? '',
    service_date: line?.service_date ?? '',
    icd10_code: line?.icd10_code ?? '',
    quantity: String(line?.quantity ?? 1),
    unit_price: String(line?.unit_price ?? 0),
    discount_amount: String(line?.discount_amount ?? 0),
    adjustment_amount: String(line?.adjustment_amount ?? 0),
    tax_rate: String(line?.tax_rate ?? 0),
    line_order: String(line?.line_order ?? order),
    change_reason: line?.change_reason ?? '',
    deleted_at: line?.deleted_at,
  }
}

function hasMeaningfulLineChanges(line: InvoiceLineRow | undefined, draft: LineDraft) {
  if (!line) return true
  return line.procedure_name !== draft.procedure_name.trim()
    || (line.procedure_code ?? '') !== draft.procedure_code.trim()
    || (line.description ?? '') !== draft.description.trim()
    || (line.service_date ?? '') !== draft.service_date
    || (line.icd10_code ?? '') !== draft.icd10_code.trim()
    || Number(line.quantity) !== toNumber(draft.quantity, 1)
    || Number(line.unit_price) !== toMoneyNumber(draft.unit_price)
    || Number(line.discount_amount) !== toMoneyNumber(draft.discount_amount)
    || Number(line.adjustment_amount) !== toMoneyNumber(draft.adjustment_amount)
    || Number(line.tax_rate) !== toNumber(draft.tax_rate)
    || Number(line.line_order) !== Math.max(1, Math.round(toNumber(draft.line_order, line.line_order)))
    || (line.change_reason ?? '') !== draft.change_reason.trim()
}

function getEmptyInvoiceForm(detail: InvoiceDetail | null): InvoiceDraftForm {
  const invoice = detail?.invoice
  const party = detail?.partySnapshot
  const issuer = detail?.issuerSnapshot
  return {
    due_date: invoice?.due_date ?? '',
    payment_terms_days: String(invoice?.payment_terms_days ?? 7),
    invoice_notes: getMetadataText(invoice?.metadata ?? {}, 'invoice_notes'),
    manual_edit_reason: invoice?.manual_edit_reason ?? '',
    patient_full_name: party?.patient_full_name ?? '',
    responsible_party_name: party?.responsible_party_name ?? '',
    relationship_to_patient: party?.relationship_to_patient ?? '',
    billing_email: party?.billing_email ?? '',
    billing_phone: party?.billing_phone ?? '',
    billing_address: formatJsonAddress(party?.billing_address ?? {}),
    organisation_name: party?.organisation_name ?? '',
    practice_name: issuer?.practice_trading_name || issuer?.practice_legal_name || '',
    practice_email: issuer?.practice_email ?? '',
    practice_phone: issuer?.practice_phone ?? '',
    therapist_name: issuer?.therapist_name ?? '',
    therapist_practice_number: issuer?.therapist_practice_number ?? '',
    payment_instructions: issuer?.payment_instructions ?? '',
    invoice_footer: issuer?.invoice_footer ?? '',
  }
}

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeTenant, profile } = useAuth()
  const authorization = useAuthorization()
  const canViewFinance = authorization.hasPermission('tenant.finance.view', 'tenant.practice.configure')
  const canManageFinance = authorization.hasPermission('tenant.finance.manage')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [responsibleParties, setResponsibleParties] = useState<ResponsiblePartyRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionProcedures, setSessionProcedures] = useState<SessionProcedureRow[]>([])
  const [sessionEvents, setSessionEvents] = useState<SessionWorkflowEventRow[]>([])
  const [therapists, setTherapists] = useState<TherapistRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(searchParams.get('invoice') ?? '')
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<InvoiceDetail | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('90')
  const [therapistFilter, setTherapistFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [reconciliationOnly, setReconciliationOnly] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState<InvoiceDraftForm>(() => getEmptyInvoiceForm(null))
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([])
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false)

  const patientById = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients])
  const responsiblePartyById = useMemo(() => new Map(responsibleParties.map((party) => [party.id, party])), [responsibleParties])
  const therapistById = useMemo(() => new Map(therapists.map((therapist) => [therapist.id, therapist])), [therapists])
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations])
  const sessionById = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions])
  const invoiceBySessionId = useMemo(() => {
    const map = new Map<string, InvoiceRow>()
    invoices.forEach((invoice) => {
      if (invoice.session_id && !['cancelled', 'voided'].includes(invoice.invoice_status)) map.set(invoice.session_id, invoice)
    })
    return map
  }, [invoices])

  const draftQueue = useMemo<DraftQueueItem[]>(() => {
    return sessions
      .filter((session) => {
        if (session.session_status !== 'completed') return false
        if (!['requested', 'failed', 'stale_after_reopen'].includes(session.draft_invoice_request_status)) return false
        return Boolean(sessionEvents.some((event) => event.session_id === session.id && event.event_type === 'draft_invoice_requested'))
      })
      .map((session) => {
        const procedures = sessionProcedures.filter((procedure) => procedure.session_id === session.id && procedure.is_billable)
        return {
          session,
          patient: patientById.get(session.patient_id) ?? null,
          responsibleParty: responsibleParties.find((party) => party.patient_id === session.patient_id && (party.is_billing_contact || party.is_primary)) ?? null,
          therapist: session.therapist_profile_id ? therapistById.get(session.therapist_profile_id) ?? null : null,
          location: session.practice_location_id ? locationById.get(session.practice_location_id) ?? null : null,
          procedures,
          requestEvent: sessionEvents.find((event) => event.session_id === session.id && event.event_type === 'draft_invoice_requested') ?? null,
          total: procedures.reduce((total, procedure) => total + Number(procedure.line_total || procedure.unit_price * procedure.quantity), 0),
        }
      })
      .sort((a, b) => (b.session.completed_at ?? '').localeCompare(a.session.completed_at ?? ''))
  }, [locations, patientById, responsibleParties, sessionEvents, sessionProcedures, sessions, therapistById])

  const filteredInvoices = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    const dateCutoff = dateRange === 'all' ? null : new Date(Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000)
    return invoices.filter((invoice) => {
      const patient = patientById.get(invoice.patient_id)
      const responsibleParty = invoice.responsible_party_id ? responsiblePartyById.get(invoice.responsible_party_id) : null
      const display = getInvoiceDisplay(invoice)
      if (statusFilter !== 'all' && invoice.invoice_status !== statusFilter) return false
      if (therapistFilter !== 'all' && invoice.therapist_profile_id !== therapistFilter) return false
      if (locationFilter !== 'all' && invoice.practice_location_id !== locationFilter) return false
      if (reconciliationOnly && !invoice.reconciliation_required) return false
      if (dateCutoff && new Date(invoice.created_at) < dateCutoff) return false
      if (!searchTerm) return true
      return [
        display,
        invoice.invoice_status,
        formatPatientName(patient),
        responsibleParty?.full_name,
        invoice.draft_reference,
        invoice.invoice_number,
      ].filter(Boolean).join(' ').toLowerCase().includes(searchTerm)
    })
  }, [dateRange, invoices, locationFilter, patientById, reconciliationOnly, responsiblePartyById, search, statusFilter, therapistFilter])

  const selectedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null, [invoices, selectedInvoiceId])
  const selectedSession = selectedInvoice?.session_id ? sessionById.get(selectedInvoice.session_id) ?? null : null
  const selectedPatient = selectedInvoice ? patientById.get(selectedInvoice.patient_id) ?? null : null
  const selectedResponsibleParty = selectedInvoice?.responsible_party_id ? responsiblePartyById.get(selectedInvoice.responsible_party_id) ?? null : null
  const selectedTherapist = selectedInvoice?.therapist_profile_id ? therapistById.get(selectedInvoice.therapist_profile_id) ?? null : null
  const selectedLocation = selectedInvoice?.practice_location_id ? locationById.get(selectedInvoice.practice_location_id) ?? null : null
  const selectedIsEditable = isDraftEditable(selectedInvoice, canManageFinance)
  const confirmationBlocker = useMemo(
    () => validateReadyToConfirm(selectedInvoiceDetail, invoiceForm, lineDrafts),
    [invoiceForm, lineDrafts, selectedInvoiceDetail],
  )

  const refreshWorkspace = useCallback(async () => {
    if (!activeTenant?.id) {
      setLoadError('No active tenant workspace is selected.')
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoadError('Supabase is not configured for this environment.')
      setLoading(false)
      return
    }
    if (!canViewFinance) {
      setLoadError('Your current role cannot view finance records.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')
    try {
      const tenantId = activeTenant.id
      const [
        invoiceResult,
        patientResult,
        partyResult,
        sessionResult,
        procedureResult,
        eventResult,
        therapistResult,
        locationResult,
      ] = await Promise.all([
        supabase.from('invoices').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('patients').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('responsible_parties').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('sessions').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('completed_at', { ascending: false }),
        supabase.from('session_procedures').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('session_workflow_events').select('*').eq('tenant_id', tenantId).eq('event_type', 'draft_invoice_requested').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('therapist_profiles').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('practice_locations').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
      ])

      if (invoiceResult.error) throw invoiceResult.error
      if (patientResult.error) throw patientResult.error
      if (partyResult.error) throw partyResult.error
      if (sessionResult.error) throw sessionResult.error
      if (procedureResult.error) throw procedureResult.error
      if (eventResult.error) throw eventResult.error
      if (therapistResult.error) throw therapistResult.error
      if (locationResult.error) throw locationResult.error

      setInvoices(invoiceResult.data ?? [])
      setPatients(patientResult.data ?? [])
      setResponsibleParties(partyResult.data ?? [])
      setSessions(sessionResult.data ?? [])
      setSessionProcedures(procedureResult.data ?? [])
      setSessionEvents(eventResult.data ?? [])
      setTherapists(therapistResult.data ?? [])
      setLocations(locationResult.data ?? [])
    } catch (error) {
      setLoadError(getFriendlyFinanceError(error, 'Finance records could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [activeTenant?.id, canViewFinance])

  const loadInvoiceDetail = useCallback(async (invoiceId: string) => {
    if (!activeTenant?.id || !supabase || !invoiceId) {
      setSelectedInvoiceDetail(null)
      return
    }
    setDetailLoading(true)
    setActionError('')
    try {
      const tenantId = activeTenant.id
      const [
        invoiceResult,
        lineResult,
        partySnapshotResult,
        issuerSnapshotResult,
        historyResult,
        workflowResult,
      ] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', invoiceId).eq('tenant_id', tenantId).is('deleted_at', null).single(),
        supabase.from('invoice_lines').select('*').eq('invoice_id', invoiceId).eq('tenant_id', tenantId).is('deleted_at', null).order('line_order'),
        supabase.from('invoice_party_snapshots').select('*').eq('invoice_id', invoiceId).eq('tenant_id', tenantId).is('deleted_at', null).maybeSingle(),
        supabase.from('invoice_issuer_snapshots').select('*').eq('invoice_id', invoiceId).eq('tenant_id', tenantId).is('deleted_at', null).maybeSingle(),
        supabase.from('invoice_status_history').select('*').eq('invoice_id', invoiceId).eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('invoice_workflow_events').select('*').eq('invoice_id', invoiceId).eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
      ])

      if (invoiceResult.error) throw invoiceResult.error
      if (lineResult.error) throw lineResult.error
      if (partySnapshotResult.error) throw partySnapshotResult.error
      if (issuerSnapshotResult.error) throw issuerSnapshotResult.error
      if (historyResult.error) throw historyResult.error
      if (workflowResult.error) throw workflowResult.error

      const detail = {
        invoice: invoiceResult.data,
        lines: lineResult.data ?? [],
        partySnapshot: partySnapshotResult.data ?? null,
        issuerSnapshot: issuerSnapshotResult.data ?? null,
        statusHistory: historyResult.data ?? [],
        workflowEvents: workflowResult.data ?? [],
      }
      setSelectedInvoiceDetail(detail)
      setInvoiceForm(getEmptyInvoiceForm(detail))
      setLineDrafts((lineResult.data ?? []).map((line, index) => getInitialLineDraft(line, index + 1)))
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Invoice details could not be loaded.'))
    } finally {
      setDetailLoading(false)
    }
  }, [activeTenant?.id])

  useEffect(() => {
    refreshWorkspace()
  }, [refreshWorkspace])

  useEffect(() => {
    if (!selectedInvoiceId && invoices[0]) setSelectedInvoiceId(invoices[0].id)
    if (selectedInvoiceId && invoices.length && !invoices.some((invoice) => invoice.id === selectedInvoiceId)) setSelectedInvoiceId(invoices[0].id)
  }, [invoices, selectedInvoiceId])

  useEffect(() => {
    if (filteredInvoices.length && selectedInvoiceId && !filteredInvoices.some((invoice) => invoice.id === selectedInvoiceId)) {
      setSelectedInvoiceId(filteredInvoices[0].id)
    }
  }, [filteredInvoices, selectedInvoiceId])

  useEffect(() => {
    if (selectedInvoiceId) {
      setSearchParams({ invoice: selectedInvoiceId }, { replace: true })
      loadInvoiceDetail(selectedInvoiceId)
    } else {
      setSearchParams({}, { replace: true })
      setSelectedInvoiceDetail(null)
    }
  }, [loadInvoiceDetail, selectedInvoiceId, setSearchParams])

  const refreshSelectedInvoice = async (invoiceId = selectedInvoiceId) => {
    await refreshWorkspace()
    if (invoiceId) await loadInvoiceDetail(invoiceId)
  }

  const loadFreshInvoice = async (invoiceId: string) => {
    if (!supabase || !activeTenant?.id) throw new Error('Invoice workspace is not ready.')
    const result = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', activeTenant.id)
      .is('deleted_at', null)
      .single()
    if (result.error) throw result.error
    return result.data
  }

  const createDraftFromSession = async (sessionId: string) => {
    if (!supabase || !canManageFinance || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const sourceSession = sessions.find((session) => session.id === sessionId)
      if (!sourceSession || sourceSession.session_status !== 'completed') throw new Error('Only completed sessions can create draft invoices.')
      if (invoiceBySessionId.has(sessionId)) {
        const existingInvoice = invoiceBySessionId.get(sessionId)
        if (existingInvoice) {
          setSelectedInvoiceId(existingInvoice.id)
          setSuccessMessage('Existing draft invoice opened.')
          return
        }
      }
      const result = await supabase.rpc('create_draft_invoice_from_session', { target_session_id: sessionId })
      if (result.error) throw result.error
      const row = result.data?.[0]
      if (!row?.invoice_id) throw new Error('Draft invoice was not returned by Supabase.')
      await refreshWorkspace()
      setSelectedInvoiceId(row.invoice_id)
      setSuccessMessage(row.created_invoice ? 'Draft invoice created from completed session.' : 'Existing draft invoice opened.')
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Draft invoice could not be created.'))
    } finally {
      setSaving(false)
    }
  }

  const saveInvoiceDraft = async () => {
    if (!supabase || !activeTenant?.id || !selectedInvoiceDetail || !selectedIsEditable || saving) return
    const invoice = selectedInvoiceDetail.invoice
    const paymentTerms = Math.max(0, Math.round(toNumber(invoiceForm.payment_terms_days, invoice.payment_terms_days)))
    if (!invoiceForm.due_date) {
      setActionError('Add a due date before saving the draft invoice.')
      return
    }
    if (!invoiceForm.patient_full_name.trim()) {
      setActionError('Recipient snapshot requires a patient name.')
      return
    }
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const freshInvoice = await loadFreshInvoice(invoice.id)
      if (freshInvoice.updated_at !== invoice.updated_at || freshInvoice.invoice_status !== invoice.invoice_status) {
        await refreshSelectedInvoice(invoice.id)
        throw new Error('This invoice changed while you were reviewing it. The latest invoice has been loaded; please review before saving again.')
      }
      if (immutableStatuses.includes(freshInvoice.invoice_status)) throw new Error('Confirmed, cancelled or voided invoices cannot be edited.')
      if (!hasMeaningfulInvoiceChanges(selectedInvoiceDetail, invoiceForm)) {
        setSuccessMessage('No draft detail changes to save.')
        return
      }
      const metadata = {
        ...(invoice.metadata && typeof invoice.metadata === 'object' && !Array.isArray(invoice.metadata) ? invoice.metadata : {}),
        invoice_notes: invoiceForm.invoice_notes.trim(),
      } satisfies Json

      const invoicePayload: InvoiceUpdate = {
        due_date: invoiceForm.due_date,
        payment_terms_days: paymentTerms,
        metadata,
        manually_edited: true,
        manual_edit_reason: invoiceForm.manual_edit_reason.trim() || 'Draft invoice review',
        updated_by_profile_id: profile?.id ?? null,
      }

      const invoiceResult = await supabase.from('invoices').update(invoicePayload).eq('id', invoice.id).eq('tenant_id', activeTenant.id)
      if (invoiceResult.error) throw invoiceResult.error

      if (selectedInvoiceDetail.partySnapshot) {
        const partyPayload: InvoicePartySnapshotUpdate = {
          patient_full_name: invoiceForm.patient_full_name.trim(),
          responsible_party_name: invoiceForm.responsible_party_name.trim() || null,
          relationship_to_patient: invoiceForm.relationship_to_patient.trim() || null,
          billing_email: invoiceForm.billing_email.trim() || null,
          billing_phone: invoiceForm.billing_phone.trim() || null,
          billing_address: parseAddress(invoiceForm.billing_address),
          organisation_name: invoiceForm.organisation_name.trim() || null,
          updated_by_profile_id: profile?.id ?? null,
        }
        const partyResult = await supabase.from('invoice_party_snapshots').update(partyPayload).eq('id', selectedInvoiceDetail.partySnapshot.id).eq('tenant_id', activeTenant.id)
        if (partyResult.error) throw partyResult.error
      }

      if (selectedInvoiceDetail.issuerSnapshot) {
        const issuerPayload: InvoiceIssuerSnapshotUpdate = {
          practice_trading_name: invoiceForm.practice_name.trim() || null,
          practice_email: invoiceForm.practice_email.trim() || null,
          practice_phone: invoiceForm.practice_phone.trim() || null,
          therapist_name: invoiceForm.therapist_name.trim() || null,
          therapist_practice_number: invoiceForm.therapist_practice_number.trim() || null,
          payment_instructions: invoiceForm.payment_instructions.trim() || null,
          invoice_footer: invoiceForm.invoice_footer.trim() || null,
          payment_terms_days: paymentTerms,
          updated_by_profile_id: profile?.id ?? null,
        }
        const issuerResult = await supabase.from('invoice_issuer_snapshots').update(issuerPayload).eq('id', selectedInvoiceDetail.issuerSnapshot.id).eq('tenant_id', activeTenant.id)
        if (issuerResult.error) throw issuerResult.error
      }

      const historyPayload: InvoiceStatusHistoryInsert = {
        tenant_id: activeTenant.id,
        invoice_id: invoice.id,
        session_id: invoice.session_id,
        booking_id: invoice.booking_id,
        patient_id: invoice.patient_id,
        from_status: invoice.invoice_status,
        to_status: invoice.invoice_status,
        event_type: 'draft_invoice_updated',
        event_reason: invoiceForm.manual_edit_reason.trim() || 'Draft invoice reviewed',
        created_by_profile_id: profile?.id ?? null,
      }
      const historyResult = await supabase.from('invoice_status_history').insert(historyPayload)
      if (historyResult.error) throw historyResult.error

      await refreshSelectedInvoice(invoice.id)
      setSuccessMessage('Draft invoice saved. Totals remain database-authoritative.')
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Draft invoice could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const saveLineDraft = async (draft: LineDraft) => {
    if (!supabase || !activeTenant?.id || !selectedInvoiceDetail || !selectedIsEditable || saving) return
    const existingLine = draft.id ? selectedInvoiceDetail.lines.find((line) => line.id === draft.id) : undefined
    if (draft.id && !hasMeaningfulLineChanges(existingLine, draft)) {
      setSuccessMessage('No invoice line changes to save.')
      setActionError('')
      return
    }
    const validationMessage = validateLineDraft(draft)
    if (validationMessage) {
      setActionError(validationMessage)
      return
    }
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const freshInvoice = await loadFreshInvoice(selectedInvoiceDetail.invoice.id)
      if (freshInvoice.updated_at !== selectedInvoiceDetail.invoice.updated_at || freshInvoice.invoice_status !== selectedInvoiceDetail.invoice.invoice_status) {
        await refreshSelectedInvoice(selectedInvoiceDetail.invoice.id)
        throw new Error('This invoice changed while you were editing a line. The latest invoice has been loaded; please review before saving again.')
      }
      if (immutableStatuses.includes(freshInvoice.invoice_status)) throw new Error('Confirmed, cancelled or voided invoices cannot be edited.')
      const commonPayload = {
        tenant_id: activeTenant.id,
        invoice_id: selectedInvoiceDetail.invoice.id,
        service_date: draft.service_date || null,
        procedure_name: draft.procedure_name.trim(),
        procedure_code: draft.procedure_code.trim() || null,
        description: draft.description.trim() || null,
        icd10_code: draft.icd10_code.trim() || null,
        quantity: toNumber(draft.quantity, 1),
        unit_price: toMoneyNumber(draft.unit_price),
        discount_amount: toMoneyNumber(draft.discount_amount),
        adjustment_amount: toMoneyNumber(draft.adjustment_amount),
        tax_rate: toNumber(draft.tax_rate),
        line_order: Math.max(1, Math.round(toNumber(draft.line_order, selectedInvoiceDetail.lines.length + 1))),
        differs_from_source: true,
        change_reason: draft.change_reason.trim() || 'Draft invoice review',
        updated_by_profile_id: profile?.id ?? null,
      }

      const result = draft.id
        ? await supabase.from('invoice_lines').update(commonPayload satisfies InvoiceLineUpdate).eq('id', draft.id).eq('tenant_id', activeTenant.id)
        : await supabase.from('invoice_lines').insert({
            ...commonPayload,
            line_type: 'manual',
            currency_code: selectedInvoiceDetail.invoice.currency_code,
            created_by_profile_id: profile?.id ?? null,
          } satisfies InvoiceLineInsert)
      if (result.error) throw result.error

      await refreshSelectedInvoice(selectedInvoiceDetail.invoice.id)
      setSuccessMessage('Invoice line saved and totals refreshed from the database.')
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Invoice line could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const removeLineDraft = async (draft: LineDraft) => {
    if (!supabase || !activeTenant?.id || !selectedInvoiceDetail || !selectedIsEditable || saving) return
    if (!draft.id) {
      setLineDrafts((current) => current.filter((item) => item !== draft))
      return
    }
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const freshInvoice = await loadFreshInvoice(selectedInvoiceDetail.invoice.id)
      if (freshInvoice.updated_at !== selectedInvoiceDetail.invoice.updated_at || freshInvoice.invoice_status !== selectedInvoiceDetail.invoice.invoice_status) {
        await refreshSelectedInvoice(selectedInvoiceDetail.invoice.id)
        throw new Error('This invoice changed while you were removing a line. The latest invoice has been loaded; please review before saving again.')
      }
      if (immutableStatuses.includes(freshInvoice.invoice_status)) throw new Error('Confirmed, cancelled or voided invoices cannot be edited.')
      const result = await supabase.from('invoice_lines').update({
        deleted_at: new Date().toISOString(),
        differs_from_source: true,
        change_reason: draft.change_reason.trim() || 'Draft invoice line removed',
        updated_by_profile_id: profile?.id ?? null,
      } satisfies InvoiceLineUpdate).eq('id', draft.id).eq('tenant_id', activeTenant.id)
      if (result.error) throw result.error
      await refreshSelectedInvoice(selectedInvoiceDetail.invoice.id)
      setSuccessMessage('Invoice line removed from the draft and totals refreshed.')
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Invoice line could not be removed.'))
    } finally {
      setSaving(false)
    }
  }

  const markReadyToConfirm = async () => {
    if (!supabase || !activeTenant?.id || !selectedInvoice || !selectedIsEditable || saving) return
    if (!['draft', 'review_required'].includes(selectedInvoice.invoice_status)) {
      setActionError('Only draft or review-required invoices can be marked ready to confirm.')
      return
    }
    if (!selectedInvoiceDetail?.lines.length) {
      setActionError('At least one invoice line is required before the invoice can be marked ready.')
      return
    }
    const validationMessage = validateReadyToConfirm(selectedInvoiceDetail, invoiceForm, lineDrafts)
    if (validationMessage) {
      setActionError(validationMessage)
      return
    }
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const freshInvoice = await loadFreshInvoice(selectedInvoice.id)
      if (freshInvoice.updated_at !== selectedInvoice.updated_at || freshInvoice.invoice_status !== selectedInvoice.invoice_status) {
        await refreshSelectedInvoice(selectedInvoice.id)
        throw new Error('This invoice changed while you were reviewing it. The latest invoice has been loaded; please review before marking ready.')
      }
      if (!['draft', 'review_required'].includes(freshInvoice.invoice_status)) throw new Error('Only draft or review-required invoices can be marked ready to confirm.')
      const result = await supabase.from('invoices').update({
        invoice_status: 'ready_to_confirm',
        ready_to_confirm_at: new Date().toISOString(),
        updated_by_profile_id: profile?.id ?? null,
      } satisfies InvoiceUpdate).eq('id', selectedInvoice.id).eq('tenant_id', activeTenant.id)
      if (result.error) throw result.error

      const historyPayload: InvoiceStatusHistoryInsert = {
        tenant_id: activeTenant.id,
        invoice_id: selectedInvoice.id,
        session_id: selectedInvoice.session_id,
        booking_id: selectedInvoice.booking_id,
        patient_id: selectedInvoice.patient_id,
        from_status: selectedInvoice.invoice_status,
        to_status: 'ready_to_confirm',
        event_type: 'invoice_ready_to_confirm',
        event_reason: 'Draft invoice reviewed and marked ready to confirm',
        created_by_profile_id: profile?.id ?? null,
      }
      const workflowPayload: InvoiceWorkflowEventInsert = {
        tenant_id: activeTenant.id,
        invoice_id: selectedInvoice.id,
        session_id: selectedInvoice.session_id,
        booking_id: selectedInvoice.booking_id,
        patient_id: selectedInvoice.patient_id,
        event_type: 'invoice_ready_to_confirm',
        idempotency_key: `invoice:${selectedInvoice.id}:invoice_ready_to_confirm:v1`,
        payload: {},
        created_by_profile_id: profile?.id ?? null,
      }
      const historyResult = await supabase.from('invoice_status_history').insert(historyPayload)
      if (historyResult.error) throw historyResult.error
      const workflowResult = await supabase.from('invoice_workflow_events').insert(workflowPayload)
      if (workflowResult.error && !workflowResult.error.message.includes('duplicate key')) throw workflowResult.error
      await refreshSelectedInvoice(selectedInvoice.id)
      setSuccessMessage('Draft invoice marked ready to confirm.')
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Invoice could not be marked ready.'))
    } finally {
      setSaving(false)
    }
  }

  const confirmInvoice = async () => {
    if (!supabase || !selectedInvoice || !canManageFinance || saving) return
    const validationMessage = validateReadyToConfirm(selectedInvoiceDetail, invoiceForm, lineDrafts)
    if (validationMessage) {
      setActionError(validationMessage)
      return
    }
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const freshInvoice = await loadFreshInvoice(selectedInvoice.id)
      if (freshInvoice.updated_at !== selectedInvoice.updated_at || freshInvoice.invoice_status !== selectedInvoice.invoice_status) {
        await refreshSelectedInvoice(selectedInvoice.id)
        throw new Error('This invoice changed before confirmation. The latest invoice has been loaded; please review and confirm again.')
      }
      if (!confirmableStatuses.includes(freshInvoice.invoice_status)) throw new Error('Only draft or ready-to-confirm invoices can be confirmed.')
      if (freshInvoice.reconciliation_required) throw new Error('Invoice requires reconciliation before confirmation.')
      const result = await supabase.rpc('confirm_invoice', { target_invoice_id: selectedInvoice.id })
      if (result.error) throw result.error
      const row = result.data?.[0]
      if (!row?.invoice_id) throw new Error('Invoice confirmation did not return an invoice.')
      const confirmedInvoice = await loadFreshInvoice(row.invoice_id)
      if (!confirmedInvoice.invoice_number || confirmedInvoice.invoice_status !== 'confirmed') {
        await refreshSelectedInvoice(row.invoice_id)
        throw new Error('The invoice confirmation response was received, but the invoice is not confirmed yet. Please refresh and review the invoice status.')
      }
      await refreshSelectedInvoice(row.invoice_id)
      setConfirmReviewOpen(false)
      setSuccessMessage(row.confirmed_invoice ? `Invoice confirmed as ${row.invoice_number}.` : `Invoice already confirmed as ${row.invoice_number}.`)
    } catch (error) {
      setActionError(getFriendlyFinanceError(error, 'Invoice could not be confirmed.'))
    } finally {
      setSaving(false)
    }
  }

  const addManualLine = () => {
    setLineDrafts((current) => [...current, getInitialLineDraft(undefined, current.length + 1)])
  }

  const updateLineDraft = (index: number, field: keyof LineDraft, value: string) => {
    setLineDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, [field]: value } : draft))
  }

  if (loading) return <LoadingState title="Loading finance workspace" description="Preparing invoices, draft queue and billing context." />
  if (loadError) return <ErrorState description={loadError} actions={<Button variant="secondary" onClick={refreshWorkspace}>Try again</Button>} />
  if (!canViewFinance) return <ErrorState title="Finance access required" description="Your current role cannot view invoice records." />

  return (
    <div className="finance-workspace">
      <PageHeader
        title="Finance"
        description="Create draft invoices from completed sessions, review billing snapshots and confirm official invoice records."
        breadcrumbs={[{ label: 'Finance' }]}
        actions={<Button variant="secondary" onClick={refreshWorkspace} disabled={saving}>Refresh</Button>}
      />

      {(actionError || successMessage) && (
        <div className={`finance-message ${actionError ? 'error' : 'success'}`}>
          {actionError || successMessage}
        </div>
      )}

      <div className="finance-grid">
        <div className="finance-left-column">
          <Card className="finance-panel">
            <div className="finance-panel-header">
              <div>
                <p>Billing queue</p>
                <h3>Completed sessions awaiting draft invoice</h3>
              </div>
              <StatusBadge tone={draftQueue.length ? 'warning' : 'success'}>{draftQueue.length}</StatusBadge>
            </div>
            <div className="draft-invoice-queue">
              {draftQueue.length ? draftQueue.map((item) => {
                const existingInvoice = invoiceBySessionId.get(item.session.id)
                const contextWarnings = getDraftContextWarnings(item)
                return (
                  <article key={item.session.id} className="draft-queue-item">
                    <button type="button" onClick={() => existingInvoice ? setSelectedInvoiceId(existingInvoice.id) : createDraftFromSession(item.session.id)} disabled={saving || !canManageFinance}>
                      <strong>{formatPatientName(item.patient)}</strong>
                      <span>{formatDateTime(item.session.actual_start_at ?? item.session.scheduled_start_at)} · {item.therapist?.display_name ?? 'No therapist'}</span>
                      <small>{item.location?.location_name ?? item.session.room_label ?? 'No location'} · {item.procedures.length} procedure(s) · {formatMoney(item.total)}</small>
                      {contextWarnings.length > 0 && <em>{contextWarnings.join(' · ')}</em>}
                    </button>
                    <div>
                      <StatusBadge tone={item.session.draft_invoice_request_status === 'failed' ? 'danger' : contextWarnings.length ? 'warning' : 'info'}>{formatLabel(item.session.draft_invoice_request_status)}</StatusBadge>
                      {existingInvoice ? (
                        <Button variant="secondary" onClick={() => setSelectedInvoiceId(existingInvoice.id)}>Open invoice</Button>
                      ) : (
                        <Button onClick={() => createDraftFromSession(item.session.id)} disabled={saving || !canManageFinance}>Create draft</Button>
                      )}
                    </div>
                  </article>
                )
              }) : (
                <EmptyState title="No draft invoices waiting" description="Completed sessions with draft invoice requests will appear here." />
              )}
            </div>
          </Card>

          <Card className="finance-panel">
            <div className="finance-panel-header">
              <div>
                <p>Invoices</p>
                <h3>Invoice records</h3>
              </div>
              <StatusBadge tone="neutral">{filteredInvoices.length}</StatusBadge>
            </div>
            <div className="finance-filters">
              <SearchBar label="Search invoices" value={search} placeholder="Patient, responsible party or invoice number" onChange={setSearch} />
              <label>
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {statusOptions.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
                </select>
              </label>
              <label>
                <span>Date range</span>
                <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
                  {dateRangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Therapist</span>
                <select value={therapistFilter} onChange={(event) => setTherapistFilter(event.target.value)}>
                  <option value="all">All therapists</option>
                  {therapists.map((therapist) => <option key={therapist.id} value={therapist.id}>{therapist.display_name}</option>)}
                </select>
              </label>
              <label>
                <span>Location</span>
                <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                  <option value="all">All locations</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.location_name}</option>)}
                </select>
              </label>
              <label className="finance-checkbox">
                <input type="checkbox" checked={reconciliationOnly} onChange={(event) => setReconciliationOnly(event.target.checked)} />
                <span>Reconciliation only</span>
              </label>
            </div>
            <div className="invoice-record-list">
              {filteredInvoices.length ? filteredInvoices.map((invoice) => {
                const patient = patientById.get(invoice.patient_id)
                const responsibleParty = invoice.responsible_party_id ? responsiblePartyById.get(invoice.responsible_party_id) : null
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    className={invoice.id === selectedInvoiceId ? 'active' : ''}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    <div>
                      <strong>{getInvoiceDisplay(invoice)}</strong>
                      <span>{formatPatientName(patient)}{responsibleParty ? ` · ${responsibleParty.full_name}` : ''}</span>
                      <small>{formatDate(invoice.service_date ?? invoice.invoice_date)} · Created {formatDate(invoice.created_at)}</small>
                    </div>
                    <div>
                      <StatusBadge tone={getStatusTone(invoice.invoice_status)}>{formatLabel(invoice.invoice_status)}</StatusBadge>
                      {invoice.reconciliation_required && <StatusBadge tone="warning">Reconcile</StatusBadge>}
                      <b>{formatMoney(invoice.total_amount, invoice.currency_code)}</b>
                      <small>Balance {formatMoney(invoice.balance_due, invoice.currency_code)}</small>
                    </div>
                  </button>
                )
              }) : (
                <EmptyState title="No invoices found" description="Create a draft invoice from the billing queue or adjust the invoice filters." />
              )}
            </div>
          </Card>
        </div>

        <div className="finance-detail-column">
          {!selectedInvoice ? (
            <Card className="finance-panel">
              <EmptyState title="Select an invoice" description="Choose an invoice to review recipient, issuer, lines, totals and history." />
            </Card>
          ) : detailLoading || !selectedInvoiceDetail ? (
            <Card className="finance-panel">
              <LoadingState title="Loading invoice" description="Preparing the invoice workspace." />
            </Card>
          ) : (
            <>
              <Card className="finance-panel invoice-detail-panel">
                <div className="invoice-detail-header">
                  <div>
                    <p>Invoice overview</p>
                    <h3>{getInvoiceDisplay(selectedInvoice)}</h3>
                    <span>{formatPatientName(selectedPatient)} · {selectedResponsibleParty?.full_name ?? 'No responsible party linked'}</span>
                  </div>
                  <div>
                    <StatusBadge tone={getStatusTone(selectedInvoice.invoice_status)}>{formatLabel(selectedInvoice.invoice_status)}</StatusBadge>
                    {selectedInvoice.reconciliation_required && <StatusBadge tone="warning">Reconciliation required</StatusBadge>}
                  </div>
                </div>
                <div className="invoice-overview-grid">
                  <div><span>Draft reference</span><strong>{selectedInvoice.draft_reference}</strong></div>
                  <div><span>Final number</span><strong>{selectedInvoice.invoice_number ?? 'Not allocated'}</strong></div>
                  <div><span>Session</span><strong>{selectedSession ? <Link to={`/bookings/sessions?session=${selectedSession.id}`}>View source session</Link> : 'No session'}</strong></div>
                  <div><span>Booking</span><strong>{selectedInvoice.booking_id ? selectedInvoice.booking_id.slice(0, 8) : 'No booking'}</strong></div>
                  <div><span>Source workflow</span><strong>{selectedInvoice.source_workflow_event_id ? selectedInvoice.source_workflow_event_id.slice(0, 8) : 'Not recorded'}</strong></div>
                  <div><span>Patient</span><strong><Link to="/patients">{formatPatientName(selectedPatient)}</Link></strong></div>
                  <div><span>Therapist</span><strong>{selectedTherapist?.display_name ?? selectedInvoiceDetail.issuerSnapshot?.therapist_name ?? 'Not set'}</strong></div>
                  <div><span>Location</span><strong>{selectedLocation?.location_name ?? selectedInvoiceDetail.issuerSnapshot?.location_name ?? 'Not set'}</strong></div>
                  <div><span>Currency</span><strong>{selectedInvoice.currency_code}</strong></div>
                  <div><span>Created</span><strong>{formatDateTime(selectedInvoice.created_at)}</strong></div>
                  <div><span>Updated</span><strong>{formatDateTime(selectedInvoice.updated_at)}</strong></div>
                  <div><span>Confirmed</span><strong>{formatDateTime(selectedInvoice.confirmed_at)}</strong></div>
                  <div><span>Due date</span><strong>{formatDate(selectedInvoice.due_date)}</strong></div>
                  <div><span>Manual edit</span><strong>{selectedInvoice.manually_edited ? selectedInvoice.manual_edit_reason ?? 'Yes' : 'No'}</strong></div>
                </div>
                {selectedInvoice.reconciliation_required && (
                  <div className="finance-warning-box">
                    <strong>Reconciliation required</strong>
                    <span>{selectedInvoice.reconciliation_reason ?? 'The source session changed after invoice creation. Review before confirmation.'}</span>
                  </div>
                )}
                <div className="finance-trace-note">
                  <strong>Traceability boundary</strong>
                  <span>Session procedures remain the delivered-care source. Invoice line edits change this invoice snapshot only and never rewrite the source session.</span>
                </div>
              </Card>

              <Card className="finance-panel">
                <div className="finance-panel-header">
                  <div>
                    <p>Draft review</p>
                    <h3>Recipient, issuer and terms</h3>
                  </div>
                  {!selectedIsEditable && <StatusBadge tone="neutral">Read only</StatusBadge>}
                </div>
                <div className="invoice-edit-grid">
                  <label><span>Due date</span><input type="date" value={invoiceForm.due_date} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, due_date: event.target.value }))} /></label>
                  <label><span>Payment terms days</span><input type="number" min="0" value={invoiceForm.payment_terms_days} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, payment_terms_days: event.target.value }))} /></label>
                  <label><span>Patient snapshot</span><input value={invoiceForm.patient_full_name} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, patient_full_name: event.target.value }))} /></label>
                  <label><span>Responsible party snapshot</span><input value={invoiceForm.responsible_party_name} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, responsible_party_name: event.target.value }))} /></label>
                  <label><span>Relationship</span><input value={invoiceForm.relationship_to_patient} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, relationship_to_patient: event.target.value }))} /></label>
                  <label><span>Billing email</span><input type="email" value={invoiceForm.billing_email} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, billing_email: event.target.value }))} /></label>
                  <label><span>Billing phone</span><input value={invoiceForm.billing_phone} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, billing_phone: event.target.value }))} /></label>
                  <label><span>Organisation</span><input value={invoiceForm.organisation_name} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, organisation_name: event.target.value }))} /></label>
                  <label className="wide-field"><span>Billing address snapshot</span><textarea value={invoiceForm.billing_address} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, billing_address: event.target.value }))} /></label>
                  <label><span>Practice display</span><input value={invoiceForm.practice_name} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, practice_name: event.target.value }))} /></label>
                  <label><span>Practice email</span><input type="email" value={invoiceForm.practice_email} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, practice_email: event.target.value }))} /></label>
                  <label><span>Practice phone</span><input value={invoiceForm.practice_phone} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, practice_phone: event.target.value }))} /></label>
                  <label><span>Therapist name</span><input value={invoiceForm.therapist_name} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, therapist_name: event.target.value }))} /></label>
                  <label><span>Therapist practice number</span><input value={invoiceForm.therapist_practice_number} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, therapist_practice_number: event.target.value }))} /></label>
                  <label className="wide-field"><span>Payment instructions</span><textarea value={invoiceForm.payment_instructions} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, payment_instructions: event.target.value }))} /></label>
                  <label className="wide-field"><span>Invoice notes</span><textarea value={invoiceForm.invoice_notes} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, invoice_notes: event.target.value }))} /></label>
                  <label className="wide-field"><span>Draft edit reason</span><input value={invoiceForm.manual_edit_reason} disabled={!selectedIsEditable} onChange={(event) => setInvoiceForm((current) => ({ ...current, manual_edit_reason: event.target.value }))} /></label>
                </div>
                {selectedIsEditable && (
                  <div className="finance-actions-row">
                    <Button variant="secondary" onClick={saveInvoiceDraft} disabled={saving}>Save draft details</Button>
                    <Button variant="secondary" onClick={markReadyToConfirm} disabled={saving || !['draft', 'review_required'].includes(selectedInvoice.invoice_status)}>Mark ready</Button>
                    <Button onClick={() => setConfirmReviewOpen(true)} disabled={saving || !confirmableStatuses.includes(selectedInvoice.invoice_status)}>Review and confirm</Button>
                  </div>
                )}
                {selectedIsEditable && confirmationBlocker && (
                  <div className="finance-warning-box">
                    <strong>Before confirmation</strong>
                    <span>{confirmationBlocker}</span>
                  </div>
                )}
              </Card>

              <Card className="finance-panel">
                <div className="finance-panel-header">
                  <div>
                    <p>Invoice lines</p>
                    <h3>Delivered procedures and invoice-only adjustments</h3>
                  </div>
                  {selectedIsEditable && <Button variant="secondary" onClick={addManualLine}>Add line</Button>}
                </div>
                <div className="invoice-line-list">
                  {lineDrafts.length ? lineDrafts.map((draft, index) => (
                    <article key={draft.id ?? `new-${index}`} className="invoice-line-editor">
                      <div className="invoice-line-fields">
                        <label><span>Procedure</span><input value={draft.procedure_name} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'procedure_name', event.target.value)} /></label>
                        <label><span>Code</span><input value={draft.procedure_code} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'procedure_code', event.target.value)} /></label>
                        <label><span>Service date</span><input type="date" value={draft.service_date} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'service_date', event.target.value)} /></label>
                        <label><span>ICD-10</span><input value={draft.icd10_code} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'icd10_code', event.target.value)} /></label>
                        <label><span>Qty</span><input type="number" min="0.01" step="0.01" value={draft.quantity} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'quantity', event.target.value)} /></label>
                        <label><span>Unit price</span><input type="number" min="0" step="0.01" value={draft.unit_price} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'unit_price', event.target.value)} /></label>
                        <label><span>Discount</span><input type="number" min="0" step="0.01" value={draft.discount_amount} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'discount_amount', event.target.value)} /></label>
                        <label><span>Adjustment</span><input type="number" step="0.01" value={draft.adjustment_amount} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'adjustment_amount', event.target.value)} /></label>
                        <label><span>Tax %</span><input type="number" min="0" step="0.01" value={draft.tax_rate} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'tax_rate', event.target.value)} /></label>
                        <label><span>Order</span><input type="number" min="1" value={draft.line_order} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'line_order', event.target.value)} /></label>
                        <label className="wide-field"><span>Description</span><textarea value={draft.description} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'description', event.target.value)} /></label>
                        <label className="wide-field"><span>Change reason</span><input value={draft.change_reason} disabled={!selectedIsEditable} onChange={(event) => updateLineDraft(index, 'change_reason', event.target.value)} /></label>
                      </div>
                      <div className="invoice-line-actions">
                        <strong>{formatMoney(selectedInvoiceDetail.lines.find((line) => line.id === draft.id)?.line_total ?? getLinePreviewTotal(draft), selectedInvoice.currency_code)}</strong>
                        {selectedIsEditable && (
                          <>
                            <Button variant="secondary" onClick={() => saveLineDraft(draft)} disabled={saving}>Save line</Button>
                            <Button variant="ghost" onClick={() => removeLineDraft(draft)} disabled={saving}>Remove</Button>
                          </>
                        )}
                      </div>
                    </article>
                  )) : (
                    <EmptyState title="No invoice lines" description="Draft invoices require at least one invoice line before confirmation." />
                  )}
                </div>
              </Card>

              <Card className="finance-panel totals-panel">
                <div className="finance-panel-header">
                  <div>
                    <p>Authoritative totals</p>
                    <h3>Database-calculated values</h3>
                  </div>
                  <StatusBadge tone="info">{selectedInvoice.currency_code}</StatusBadge>
                </div>
                <div className="totals-grid">
                  <div><span>Subtotal</span><strong>{formatMoney(selectedInvoice.subtotal_amount, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Discount</span><strong>{formatMoney(selectedInvoice.discount_total, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Adjustment</span><strong>{formatMoney(selectedInvoice.adjustment_total, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Taxable</span><strong>{formatMoney(selectedInvoice.taxable_amount, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Tax</span><strong>{formatMoney(selectedInvoice.tax_total, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Rounding</span><strong>{formatMoney(selectedInvoice.rounding_adjustment, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Total</span><strong>{formatMoney(selectedInvoice.total_amount, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Paid</span><strong>{formatMoney(selectedInvoice.amount_paid, selectedInvoice.currency_code)}</strong></div>
                  <div><span>Balance due</span><strong>{formatMoney(selectedInvoice.balance_due, selectedInvoice.currency_code)}</strong></div>
                </div>
              </Card>

              <div className="finance-history-grid">
                <Card className="finance-panel">
                  <div className="finance-panel-header">
                    <div>
                      <p>Status history</p>
                      <h3>Invoice lifecycle</h3>
                    </div>
                  </div>
                  <div className="finance-event-list">
                    {selectedInvoiceDetail.statusHistory.length ? selectedInvoiceDetail.statusHistory.map((event) => (
                      <article key={event.id}>
                        <strong>{getEventLabel(event.event_type)}</strong>
                        <span>{formatLabel(event.from_status)} {'->'} {formatLabel(event.to_status)}</span>
                        <small>{formatDateTime(event.created_at)}{event.event_reason ? ` · ${event.event_reason}` : ''}</small>
                      </article>
                    )) : <EmptyState title="No history yet" description="Invoice status changes will appear here." />}
                  </div>
                </Card>

                <Card className="finance-panel">
                  <div className="finance-panel-header">
                    <div>
                      <p>Workflow events</p>
                      <h3>Automation readiness</h3>
                    </div>
                  </div>
                  <div className="finance-event-list">
                    {selectedInvoiceDetail.workflowEvents.length ? selectedInvoiceDetail.workflowEvents.map((event) => (
                      <article key={event.id}>
                        <strong>{getEventLabel(event.event_type)}</strong>
                        <span>{formatLabel(event.event_status)}</span>
                        <small>{formatDateTime(event.created_at)}{event.error_message ? ` · ${event.error_message}` : ''}</small>
                      </article>
                    )) : <EmptyState title="No workflow events yet" description="Invoice automation markers will appear here." />}
                  </div>
                </Card>
              </div>

              {confirmReviewOpen && (
                <div className="modal-backdrop" role="presentation" onClick={() => setConfirmReviewOpen(false)}>
                  <section className="modal-card invoice-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-confirm-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="modal-close" onClick={() => setConfirmReviewOpen(false)}>X</button>
                    <p>Confirm invoice</p>
                    <h2 id="invoice-confirm-title">{getInvoiceDisplay(selectedInvoice)}</h2>
                    <div className="invoice-confirm-summary">
                      <div><span>Recipient</span><strong>{invoiceForm.responsible_party_name || invoiceForm.patient_full_name}</strong></div>
                      <div><span>Issuer</span><strong>{invoiceForm.practice_name || invoiceForm.therapist_name || 'Not set'}</strong></div>
                      <div><span>Lines</span><strong>{selectedInvoiceDetail.lines.length}</strong></div>
                      <div><span>Total</span><strong>{formatMoney(selectedInvoice.total_amount, selectedInvoice.currency_code)}</strong></div>
                      <div><span>Due date</span><strong>{formatDate(invoiceForm.due_date)}</strong></div>
                      <div><span>Status</span><strong>{formatLabel(selectedInvoice.invoice_status)}</strong></div>
                    </div>
                    {confirmationBlocker && (
                      <div className="finance-warning-box">
                        <strong>Not ready yet</strong>
                        <span>{confirmationBlocker}</span>
                      </div>
                    )}
                    {selectedInvoice.reconciliation_required && (
                      <div className="finance-warning-box">
                        <strong>Reconciliation required</strong>
                        <span>{selectedInvoice.reconciliation_reason ?? 'Review the reopened session before confirming this invoice.'}</span>
                      </div>
                    )}
                    <p className="quiet">Confirmation allocates the official invoice number. PDF delivery, Patient Link rendering, payment capture and statements remain deferred.</p>
                    <div className="finance-actions-row">
                      <Button variant="secondary" onClick={() => setConfirmReviewOpen(false)} disabled={saving}>Cancel</Button>
                      <Button onClick={confirmInvoice} disabled={saving || Boolean(confirmationBlocker) || selectedInvoice.reconciliation_required}>Confirm invoice</Button>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
