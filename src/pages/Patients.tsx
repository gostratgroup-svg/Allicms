import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, SearchBar, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type PatientRow = Database['public']['Tables']['patients']['Row']
type PatientInsert = Database['public']['Tables']['patients']['Insert']
type PatientUpdate = Database['public']['Tables']['patients']['Update']
type ResponsiblePartyRow = Database['public']['Tables']['responsible_parties']['Row']
type ResponsiblePartyInsert = Database['public']['Tables']['responsible_parties']['Insert']
type ResponsiblePartyUpdate = Database['public']['Tables']['responsible_parties']['Update']
type PatientAddressRow = Database['public']['Tables']['patient_addresses']['Row']
type PatientAddressInsert = Database['public']['Tables']['patient_addresses']['Insert']
type PatientAddressUpdate = Database['public']['Tables']['patient_addresses']['Update']
type EmergencyContactRow = Database['public']['Tables']['patient_emergency_contacts']['Row']
type EmergencyContactInsert = Database['public']['Tables']['patient_emergency_contacts']['Insert']
type EmergencyContactUpdate = Database['public']['Tables']['patient_emergency_contacts']['Update']
type MedicalInfoRow = Database['public']['Tables']['patient_medical_information']['Row']
type MedicalInfoInsert = Database['public']['Tables']['patient_medical_information']['Insert']
type MedicalInfoUpdate = Database['public']['Tables']['patient_medical_information']['Update']
type PatientAlertRow = Database['public']['Tables']['patient_alerts']['Row']
type PatientAlertInsert = Database['public']['Tables']['patient_alerts']['Insert']
type PatientAlertUpdate = Database['public']['Tables']['patient_alerts']['Update']
type PatientConsentRow = Database['public']['Tables']['patient_consents']['Row']
type PatientConsentInsert = Database['public']['Tables']['patient_consents']['Insert']
type PatientConsentUpdate = Database['public']['Tables']['patient_consents']['Update']
type PatientHistoryEventRow = Database['public']['Tables']['patient_history_events']['Row']
type PatientHistoryEventInsert = Database['public']['Tables']['patient_history_events']['Insert']

type PatientFormState = {
  patient_number: string
  patient_status: string
  patient_type: string
  title: string
  first_name: string
  last_name: string
  preferred_name: string
  date_of_birth: string
  id_number: string
  gender: string
  language: string
  email: string
  phone: string
  referral_source: string
  active_icd10_code: string
}

type ResponsiblePartyFormState = {
  party_type: string
  relationship_to_patient: string
  full_name: string
  organisation_name: string
  id_number: string
  email: string
  phone: string
  is_primary: boolean
  is_billing_contact: boolean
  account_responsibility_status: string
  medical_aid_member_number: string
  medical_aid_dependant_code: string
}

type AddressFormState = {
  address_line_1: string
  address_line_2: string
  suburb: string
  city: string
  province: string
  postal_code: string
  country: string
}

type EmergencyContactFormState = {
  full_name: string
  phone: string
  relationship_to_patient: string
  email: string
  notes: string
}

type MedicalInfoFormState = {
  has_medical_aid: boolean
  medical_aid_name: string
  medical_aid_number: string
  medical_aid_dependant_code: string
  medical_aid_plan: string
  main_member_name: string
  main_member_id_number: string
  referring_professional: string
  referring_practice: string
  medical_conditions: string
  current_medication: string
  medical_notes: string
}

type AlertFormState = {
  alert_type: string
  severity: string
  title: string
  description: string
  is_active: boolean
  is_patient_visible: boolean
}

type ConsentFormState = {
  consent_type: string
  consent_status: string
  consent_version: string
  consent_text: string
  signed_by_name: string
  signed_by_relationship: string
  source: string
}

type PatientWorkspaceSection = 'overview' | 'contact' | 'responsible' | 'medical' | 'alerts' | 'consents' | 'history'

const emptyPatientForm: PatientFormState = {
  patient_number: '',
  patient_status: 'prospective',
  patient_type: 'unspecified',
  title: '',
  first_name: '',
  last_name: '',
  preferred_name: '',
  date_of_birth: '',
  id_number: '',
  gender: '',
  language: '',
  email: '',
  phone: '',
  referral_source: '',
  active_icd10_code: '',
}

const emptyResponsiblePartyForm: ResponsiblePartyFormState = {
  party_type: 'person',
  relationship_to_patient: '',
  full_name: '',
  organisation_name: '',
  id_number: '',
  email: '',
  phone: '',
  is_primary: true,
  is_billing_contact: true,
  account_responsibility_status: 'active',
  medical_aid_member_number: '',
  medical_aid_dependant_code: '',
}

const emptyAddressForm: AddressFormState = {
  address_line_1: '',
  address_line_2: '',
  suburb: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'South Africa',
}

const emptyEmergencyContactForm: EmergencyContactFormState = {
  full_name: '',
  phone: '',
  relationship_to_patient: '',
  email: '',
  notes: '',
}

const emptyMedicalInfoForm: MedicalInfoFormState = {
  has_medical_aid: false,
  medical_aid_name: '',
  medical_aid_number: '',
  medical_aid_dependant_code: '',
  medical_aid_plan: '',
  main_member_name: '',
  main_member_id_number: '',
  referring_professional: '',
  referring_practice: '',
  medical_conditions: '',
  current_medication: '',
  medical_notes: '',
}

const emptyAlertForm: AlertFormState = {
  alert_type: 'admin',
  severity: 'medium',
  title: '',
  description: '',
  is_active: true,
  is_patient_visible: false,
}

const emptyConsentForm: ConsentFormState = {
  consent_type: 'popia',
  consent_status: 'accepted',
  consent_version: '',
  consent_text: '',
  signed_by_name: '',
  signed_by_relationship: '',
  source: 'internal',
}

const patientStatuses = ['prospective', 'intake_sent', 'intake_in_progress', 'pending_review', 'registered', 'active', 'inactive', 'archived', 'merged']
const patientTypes = ['adult', 'teen', 'child', 'other', 'unspecified']
const partyTypes = ['person', 'organisation', 'employer', 'school', 'medical_aid_member', 'third_party']
const accountStatuses = ['active', 'inactive', 'pending_review']
const alertTypes = ['allergy', 'medical', 'risk', 'consent', 'intake', 'finance', 'admin', 'clinical', 'other']
const alertSeverities = ['info', 'low', 'medium', 'high', 'critical']
const consentStatuses = ['pending', 'accepted', 'declined', 'revoked', 'expired']
const consentTypes = ['popia', 'treatment', 'assessment', 'communication', 'financial_responsibility', 'other']
const consentSources = ['internal', 'patient_link', 'imported']
const patientWorkspaceSections: Array<{ id: PatientWorkspaceSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'contact', label: 'Contact and Address' },
  { id: 'responsible', label: 'Responsible Party' },
  { id: 'medical', label: 'Medical Information' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'consents', label: 'Consents' },
  { id: 'history', label: 'History' },
]

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function formatPatientName(patient: PatientRow) {
  return `${patient.first_name} ${patient.last_name}`.trim()
}

function isValidEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPhone(value: string) {
  return !value.trim() || /^[0-9+\-()\s]{7,}$/.test(value.trim())
}

function isFutureDate(value: string) {
  return Boolean(value) && new Date(value) > new Date()
}

function valuesMatch(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? '') === (right ?? '')
}

function formFromPatient(patient: PatientRow | null): PatientFormState {
  if (!patient) return emptyPatientForm

  return {
    patient_number: patient.patient_number ?? '',
    patient_status: patient.patient_status,
    patient_type: patient.patient_type,
    title: patient.title ?? '',
    first_name: patient.first_name,
    last_name: patient.last_name,
    preferred_name: patient.preferred_name ?? '',
    date_of_birth: patient.date_of_birth ?? '',
    id_number: patient.id_number ?? '',
    gender: patient.gender ?? '',
    language: patient.language ?? '',
    email: patient.email ?? '',
    phone: patient.phone ?? '',
    referral_source: patient.referral_source ?? '',
    active_icd10_code: patient.active_icd10_code ?? '',
  }
}

function formFromResponsibleParty(party: ResponsiblePartyRow | null): ResponsiblePartyFormState {
  if (!party) return emptyResponsiblePartyForm

  return {
    party_type: party.party_type,
    relationship_to_patient: party.relationship_to_patient ?? '',
    full_name: party.full_name,
    organisation_name: party.organisation_name ?? '',
    id_number: party.id_number ?? '',
    email: party.email ?? '',
    phone: party.phone ?? '',
    is_primary: party.is_primary,
    is_billing_contact: party.is_billing_contact,
    account_responsibility_status: party.account_responsibility_status,
    medical_aid_member_number: party.medical_aid_member_number ?? '',
    medical_aid_dependant_code: party.medical_aid_dependant_code ?? '',
  }
}

function formFromAddress(address: PatientAddressRow | null): AddressFormState {
  if (!address) return emptyAddressForm

  return {
    address_line_1: address.address_line_1 ?? '',
    address_line_2: address.address_line_2 ?? '',
    suburb: address.suburb ?? '',
    city: address.city ?? '',
    province: address.province ?? '',
    postal_code: address.postal_code ?? '',
    country: address.country,
  }
}

function formFromEmergencyContact(contact: EmergencyContactRow | null): EmergencyContactFormState {
  if (!contact) return emptyEmergencyContactForm

  return {
    full_name: contact.full_name,
    phone: contact.phone,
    relationship_to_patient: contact.relationship_to_patient ?? '',
    email: contact.email ?? '',
    notes: contact.notes ?? '',
  }
}

function formFromMedicalInfo(info: MedicalInfoRow | null): MedicalInfoFormState {
  if (!info) return emptyMedicalInfoForm

  return {
    has_medical_aid: info.has_medical_aid,
    medical_aid_name: info.medical_aid_name ?? '',
    medical_aid_number: info.medical_aid_number ?? '',
    medical_aid_dependant_code: info.medical_aid_dependant_code ?? '',
    medical_aid_plan: info.medical_aid_plan ?? '',
    main_member_name: info.main_member_name ?? '',
    main_member_id_number: info.main_member_id_number ?? '',
    referring_professional: info.referring_professional ?? '',
    referring_practice: info.referring_practice ?? '',
    medical_conditions: info.medical_conditions ?? '',
    current_medication: info.current_medication ?? '',
    medical_notes: info.medical_notes ?? '',
  }
}

function formFromAlert(alert: PatientAlertRow | null): AlertFormState {
  if (!alert) return emptyAlertForm

  return {
    alert_type: alert.alert_type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description ?? '',
    is_active: alert.is_active,
    is_patient_visible: alert.is_patient_visible,
  }
}

function formFromConsent(consent: PatientConsentRow | null): ConsentFormState {
  if (!consent) return emptyConsentForm

  return {
    consent_type: consent.consent_type,
    consent_status: consent.consent_status,
    consent_version: consent.consent_version ?? '',
    consent_text: consent.consent_text ?? '',
    signed_by_name: consent.signed_by_name ?? '',
    signed_by_relationship: consent.signed_by_relationship ?? '',
    source: consent.source,
  }
}

function toPatientPayload(formState: PatientFormState, actorProfileId: string | null): Omit<PatientInsert, 'tenant_id'> {
  return {
    patient_number: emptyToNull(formState.patient_number),
    patient_status: formState.patient_status,
    patient_type: formState.patient_type,
    title: emptyToNull(formState.title),
    first_name: formState.first_name.trim(),
    last_name: formState.last_name.trim(),
    preferred_name: emptyToNull(formState.preferred_name),
    date_of_birth: formState.date_of_birth || null,
    id_number: emptyToNull(formState.id_number),
    gender: emptyToNull(formState.gender),
    language: emptyToNull(formState.language),
    email: emptyToNull(formState.email),
    phone: emptyToNull(formState.phone),
    referral_source: emptyToNull(formState.referral_source),
    active_icd10_code: emptyToNull(formState.active_icd10_code),
    updated_by_profile_id: actorProfileId,
  }
}

export function PatientsPage() {
  const { activeTenant, profile } = useAuth()
  const authorization = useAuthorization()
  const canEditPatients = authorization.hasPermission('tenant.patients.manage')
  const canEditFinanceContact = authorization.hasPermission('tenant.patients.manage', 'tenant.finance.manage')
  const canEditMedical = authorization.hasPermission('tenant.clinical.manage')
  const canViewClinical = authorization.hasPermission('tenant.clinical.view') && !authorization.isSuperAdmin
  const canReadCareDetails = authorization.hasRole('admin', 'receptionist', 'therapist')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [responsibleParties, setResponsibleParties] = useState<ResponsiblePartyRow[]>([])
  const [addresses, setAddresses] = useState<PatientAddressRow[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactRow[]>([])
  const [medicalInformation, setMedicalInformation] = useState<MedicalInfoRow[]>([])
  const [alerts, setAlerts] = useState<PatientAlertRow[]>([])
  const [consents, setConsents] = useState<PatientConsentRow[]>([])
  const [historyEvents, setHistoryEvents] = useState<PatientHistoryEventRow[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<PatientWorkspaceSection>('overview')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [selectedConsentId, setSelectedConsentId] = useState<string | null>(null)
  const [patientForm, setPatientForm] = useState<PatientFormState>(emptyPatientForm)
  const [responsiblePartyForm, setResponsiblePartyForm] = useState<ResponsiblePartyFormState>(emptyResponsiblePartyForm)
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm)
  const [emergencyForm, setEmergencyForm] = useState<EmergencyContactFormState>(emptyEmergencyContactForm)
  const [medicalForm, setMedicalForm] = useState<MedicalInfoFormState>(emptyMedicalInfoForm)
  const [alertForm, setAlertForm] = useState<AlertFormState>(emptyAlertForm)
  const [consentForm, setConsentForm] = useState<ConsentFormState>(emptyConsentForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [savingPatient, setSavingPatient] = useState(false)
  const [savingRelated, setSavingRelated] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  )
  const selectedResponsibleParty = useMemo(
    () => responsibleParties.find((party) => party.patient_id === selectedPatientId && party.is_primary) ?? responsibleParties.find((party) => party.patient_id === selectedPatientId) ?? null,
    [responsibleParties, selectedPatientId],
  )
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.patient_id === selectedPatientId && address.is_primary) ?? addresses.find((address) => address.patient_id === selectedPatientId) ?? null,
    [addresses, selectedPatientId],
  )
  const selectedEmergencyContact = useMemo(
    () => emergencyContacts.find((contact) => contact.patient_id === selectedPatientId && contact.is_primary) ?? emergencyContacts.find((contact) => contact.patient_id === selectedPatientId) ?? null,
    [emergencyContacts, selectedPatientId],
  )
  const selectedMedicalInfo = useMemo(
    () => medicalInformation.find((info) => info.patient_id === selectedPatientId) ?? null,
    [medicalInformation, selectedPatientId],
  )
  const selectedPatientAlerts = useMemo(
    () => alerts.filter((alert) => alert.patient_id === selectedPatientId),
    [alerts, selectedPatientId],
  )
  const selectedPatientConsents = useMemo(
    () => consents.filter((consent) => consent.patient_id === selectedPatientId),
    [consents, selectedPatientId],
  )
  const selectedPatientHistory = useMemo(
    () => historyEvents.filter((event) => event.patient_id === selectedPatientId),
    [historyEvents, selectedPatientId],
  )
  const selectedAlert = useMemo(
    () => selectedPatientAlerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [selectedAlertId, selectedPatientAlerts],
  )
  const selectedConsent = useMemo(
    () => selectedPatientConsents.find((consent) => consent.id === selectedConsentId) ?? null,
    [selectedConsentId, selectedPatientConsents],
  )
  const selectedAlertCount = useMemo(
    () => alerts.filter((alert) => alert.patient_id === selectedPatientId && alert.is_active).length,
    [alerts, selectedPatientId],
  )
  const selectedConsentCount = useMemo(
    () => consents.filter((consent) => consent.patient_id === selectedPatientId && consent.consent_status === 'accepted').length,
    [consents, selectedPatientId],
  )
  const filteredPatients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return patients.filter((patient) => {
      const matchesStatus = statusFilter === 'all' || patient.patient_status === statusFilter
      const matchesSearch = !normalizedSearch
        || formatPatientName(patient).toLowerCase().includes(normalizedSearch)
        || (patient.patient_number ?? '').toLowerCase().includes(normalizedSearch)
        || (patient.phone ?? '').toLowerCase().includes(normalizedSearch)
        || (patient.email ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [patients, searchTerm, statusFilter])
  const isPatientReadOnly = !canEditPatients || savingPatient
  const isRelatedReadOnly = !canEditFinanceContact || savingRelated || !selectedPatientId
  const isMedicalReadOnly = !canEditMedical || savingRelated || !selectedPatientId

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
    const supabaseClient = supabase
    const tenantId = activeTenant.id

    async function loadPatientData() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const restrictedEmptyResult = Promise.resolve({ data: [], error: null })
      const [patientsResult, responsiblePartiesResult, addressesResult, emergencyContactsResult, medicalResult, alertsResult, consentsResult, historyResult] = await Promise.all([
        supabaseClient
          .from('patients')
          .select('id, tenant_id, patient_number, patient_status, patient_type, title, first_name, last_name, preferred_name, date_of_birth, id_number, gender, language, email, phone, referral_source, active_icd10_code, assigned_therapist_profile_id, intake_sent_at, intake_started_at, intake_completed_at, reviewed_at, archived_at, archive_reason, merged_into_patient_id, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true }),
        supabaseClient
          .from('responsible_parties')
          .select('id, tenant_id, patient_id, party_type, relationship_to_patient, full_name, organisation_name, id_number, email, phone, is_primary, is_billing_contact, account_responsibility_status, medical_aid_member_number, medical_aid_dependant_code, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        supabaseClient
          .from('patient_addresses')
          .select('id, tenant_id, patient_id, responsible_party_id, address_owner_type, address_type, address_line_1, address_line_2, suburb, city, province, postal_code, country, is_primary, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .eq('address_owner_type', 'patient')
          .is('deleted_at', null),
        supabaseClient
          .from('patient_emergency_contacts')
          .select('id, tenant_id, patient_id, full_name, phone, relationship_to_patient, email, notes, is_primary, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
        canReadCareDetails
          ? supabaseClient
              .from('patient_medical_information')
              .select('id, tenant_id, patient_id, has_medical_aid, medical_aid_name, medical_aid_number, medical_aid_dependant_code, medical_aid_plan, main_member_name, main_member_id_number, referring_professional, referring_practice, medical_conditions, current_medication, medical_notes, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : restrictedEmptyResult,
        canReadCareDetails
          ? supabaseClient
              .from('patient_alerts')
              .select('id, tenant_id, patient_id, alert_type, severity, title, description, is_active, is_patient_visible, resolved_at, resolved_by_profile_id, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : restrictedEmptyResult,
        canReadCareDetails
          ? supabaseClient
              .from('patient_consents')
              .select('id, tenant_id, patient_id, responsible_party_id, consent_type, consent_status, consent_version, consent_text, signed_by_name, signed_by_relationship, signature_url, accepted_at, revoked_at, source, metadata, created_by_profile_id, updated_by_profile_id, deleted_at, created_at, updated_at')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
          : restrictedEmptyResult,
        supabaseClient
          .from('patient_history_events')
          .select('id, tenant_id, patient_id, event_type, event_title, event_body, source_table, source_id, is_patient_visible, patient_visible_title, patient_visible_body, occurred_at, created_by_profile_id, metadata, deleted_at, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('occurred_at', { ascending: false }),
      ])

      if (!isMounted) return

      const firstError = patientsResult.error || responsiblePartiesResult.error || addressesResult.error || emergencyContactsResult.error || medicalResult.error || alertsResult.error || consentsResult.error || historyResult.error
      if (firstError) {
        setLoadError(firstError.message)
        setLoading(false)
        return
      }

      const nextPatients = (patientsResult.data ?? []) as PatientRow[]
      setPatients(nextPatients)
      setResponsibleParties((responsiblePartiesResult.data ?? []) as ResponsiblePartyRow[])
      setAddresses((addressesResult.data ?? []) as PatientAddressRow[])
      setEmergencyContacts((emergencyContactsResult.data ?? []) as EmergencyContactRow[])
      setMedicalInformation((medicalResult.data ?? []) as MedicalInfoRow[])
      setAlerts((alertsResult.data ?? []) as PatientAlertRow[])
      setConsents((consentsResult.data ?? []) as PatientConsentRow[])
      setHistoryEvents((historyResult.data ?? []) as PatientHistoryEventRow[])
      const firstPatient = nextPatients[0] ?? null
      setSelectedPatientId(firstPatient?.id ?? null)
      setPatientForm(formFromPatient(firstPatient))
      setLoading(false)
    }

    loadPatientData()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, canReadCareDetails])

  useEffect(() => {
    setPatientForm(formFromPatient(selectedPatient))
    setResponsiblePartyForm(formFromResponsibleParty(selectedResponsibleParty))
    setAddressForm(formFromAddress(selectedAddress))
    setEmergencyForm(formFromEmergencyContact(selectedEmergencyContact))
    setMedicalForm(formFromMedicalInfo(selectedMedicalInfo))
    setAlertForm(formFromAlert(selectedAlert))
    setConsentForm(formFromConsent(selectedConsent))
  }, [selectedAddress, selectedAlert, selectedConsent, selectedEmergencyContact, selectedMedicalInfo, selectedPatient, selectedResponsibleParty])

  const updatePatientField = <Field extends keyof PatientFormState>(field: Field, value: PatientFormState[Field]) => {
    setPatientForm((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const startCreatePatient = () => {
    setSelectedPatientId(null)
    setPatientForm(emptyPatientForm)
    setResponsiblePartyForm(emptyResponsiblePartyForm)
    setAddressForm(emptyAddressForm)
    setEmergencyForm(emptyEmergencyContactForm)
    setMedicalForm(emptyMedicalInfoForm)
    setAlertForm(emptyAlertForm)
    setConsentForm(emptyConsentForm)
    setSelectedAlertId(null)
    setSelectedConsentId(null)
    setSelectedSection('overview')
    setSaveError('')
    setSuccessMessage('')
  }

  const selectPatient = (patient: PatientRow) => {
    setSelectedPatientId(patient.id)
    setSelectedSection('overview')
    setSelectedAlertId(null)
    setSelectedConsentId(null)
    setSaveError('')
    setSuccessMessage('')
  }

  const recordHistoryEvent = async (
    patientId: string,
    event: Omit<PatientHistoryEventInsert, 'tenant_id' | 'patient_id'>,
  ) => {
    if (!activeTenant?.id || !supabase) return

    const result = await supabase
      .from('patient_history_events')
      .insert({
        ...event,
        tenant_id: activeTenant.id,
        patient_id: patientId,
        created_by_profile_id: profile?.id ?? null,
      })
      .select()
      .single()

    if (!result.error && result.data) {
      setHistoryEvents((currentEvents) => [result.data as PatientHistoryEventRow, ...currentEvents])
    }
  }

  const savePatient = async () => {
    if (!activeTenant?.id || !supabase || !canEditPatients) return

    if (!patientForm.first_name.trim() || !patientForm.last_name.trim()) {
      setSaveError('Patient first name and last name are required.')
      return
    }
    if (!isValidEmail(patientForm.email)) {
      setSaveError('Please enter a valid patient email address.')
      return
    }
    if (!isValidPhone(patientForm.phone)) {
      setSaveError('Please enter a valid patient phone number.')
      return
    }
    if (isFutureDate(patientForm.date_of_birth)) {
      setSaveError('Date of birth cannot be in the future.')
      return
    }

    setSavingPatient(true)
    setSaveError('')
    setSuccessMessage('')

    const previousStatus = selectedPatient?.patient_status ?? null
    const payload = toPatientPayload(patientForm, profile?.id ?? null)
    if (selectedPatient && valuesMatch(payload.patient_number, selectedPatient.patient_number)
      && valuesMatch(payload.patient_status, selectedPatient.patient_status)
      && valuesMatch(payload.patient_type, selectedPatient.patient_type)
      && valuesMatch(payload.title, selectedPatient.title)
      && valuesMatch(payload.first_name, selectedPatient.first_name)
      && valuesMatch(payload.last_name, selectedPatient.last_name)
      && valuesMatch(payload.preferred_name, selectedPatient.preferred_name)
      && valuesMatch(payload.date_of_birth, selectedPatient.date_of_birth)
      && valuesMatch(payload.id_number, selectedPatient.id_number)
      && valuesMatch(payload.gender, selectedPatient.gender)
      && valuesMatch(payload.language, selectedPatient.language)
      && valuesMatch(payload.email, selectedPatient.email)
      && valuesMatch(payload.phone, selectedPatient.phone)
      && valuesMatch(payload.referral_source, selectedPatient.referral_source)
      && valuesMatch(payload.active_icd10_code, selectedPatient.active_icd10_code)) {
      setSuccessMessage('No patient changes to save.')
      setSavingPatient(false)
      return
    }

    const result = selectedPatient?.id
      ? await supabase
          .from('patients')
          .update(payload satisfies PatientUpdate)
          .eq('id', selectedPatient.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('patients')
          .insert({ ...payload, tenant_id: activeTenant.id, created_by_profile_id: profile?.id ?? null })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingPatient(false)
      return
    }

    const savedPatient = result.data as PatientRow
    setPatients((currentPatients) => {
      const nextPatients = selectedPatient?.id
        ? currentPatients.map((patient) => (patient.id === savedPatient.id ? savedPatient : patient))
        : [...currentPatients, savedPatient]

      return nextPatients.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
    })
    setSelectedPatientId(savedPatient.id)
    setPatientForm(formFromPatient(savedPatient))
    setSuccessMessage(selectedPatient?.id ? 'Patient updated.' : 'Patient created.')
    await recordHistoryEvent(savedPatient.id, {
      event_type: selectedPatient?.id ? (previousStatus !== savedPatient.patient_status ? 'patient_status_changed' : 'patient_updated') : 'patient_created',
      event_title: selectedPatient?.id ? (previousStatus !== savedPatient.patient_status ? 'Patient status changed' : 'Patient updated') : 'Patient created',
      event_body: selectedPatient?.id && previousStatus !== savedPatient.patient_status
        ? `Status changed from ${formatLabel(previousStatus ?? 'unknown')} to ${formatLabel(savedPatient.patient_status)}.`
        : `${formatPatientName(savedPatient)} was ${selectedPatient?.id ? 'updated' : 'created'}.`,
      source_table: 'patients',
      source_id: savedPatient.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingPatient(false)
  }

  const archivePatient = async () => {
    if (!activeTenant?.id || !supabase || !canEditPatients || !selectedPatient) return
    const confirmed = window.confirm(`Archive ${formatPatientName(selectedPatient)}? This keeps the record but removes it from active patient work.`)
    if (!confirmed) return

    setSavingPatient(true)
    setSaveError('')
    setSuccessMessage('')

    const result = await supabase
      .from('patients')
      .update({
        patient_status: 'archived',
        archived_at: new Date().toISOString(),
        archive_reason: 'Archived from patient management foundation.',
        updated_by_profile_id: profile?.id ?? null,
      } satisfies PatientUpdate)
      .eq('id', selectedPatient.id)
      .eq('tenant_id', activeTenant.id)
      .select()
      .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingPatient(false)
      return
    }

    const archivedPatient = result.data as PatientRow
    setPatients((currentPatients) => currentPatients.map((patient) => (patient.id === archivedPatient.id ? archivedPatient : patient)))
    setSelectedPatientId(archivedPatient.id)
    setPatientForm(formFromPatient(archivedPatient))
    setSuccessMessage('Patient archived.')
    await recordHistoryEvent(archivedPatient.id, {
      event_type: 'patient_archived',
      event_title: 'Patient archived',
      event_body: `${formatPatientName(archivedPatient)} was archived.`,
      source_table: 'patients',
      source_id: archivedPatient.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingPatient(false)
  }

  const saveResponsibleParty = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditFinanceContact) return

    if (!responsiblePartyForm.full_name.trim()) {
      setSaveError('Responsible party name is required.')
      return
    }
    if (!isValidEmail(responsiblePartyForm.email)) {
      setSaveError('Please enter a valid responsible party email address.')
      return
    }
    if (!isValidPhone(responsiblePartyForm.phone)) {
      setSaveError('Please enter a valid responsible party phone number.')
      return
    }

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const payload: Omit<ResponsiblePartyInsert, 'tenant_id' | 'patient_id'> = {
      party_type: responsiblePartyForm.party_type,
      relationship_to_patient: emptyToNull(responsiblePartyForm.relationship_to_patient),
      full_name: responsiblePartyForm.full_name.trim(),
      organisation_name: emptyToNull(responsiblePartyForm.organisation_name),
      id_number: emptyToNull(responsiblePartyForm.id_number),
      email: emptyToNull(responsiblePartyForm.email),
      phone: emptyToNull(responsiblePartyForm.phone),
      is_primary: responsiblePartyForm.is_primary,
      is_billing_contact: responsiblePartyForm.is_billing_contact,
      account_responsibility_status: responsiblePartyForm.account_responsibility_status,
      medical_aid_member_number: emptyToNull(responsiblePartyForm.medical_aid_member_number),
      medical_aid_dependant_code: emptyToNull(responsiblePartyForm.medical_aid_dependant_code),
      updated_by_profile_id: profile?.id ?? null,
    }

    const result = selectedResponsibleParty?.id
      ? await supabase.from('responsible_parties').update(payload satisfies ResponsiblePartyUpdate).eq('id', selectedResponsibleParty.id).eq('tenant_id', activeTenant.id).select().single()
      : await supabase.from('responsible_parties').insert({ ...payload, tenant_id: activeTenant.id, patient_id: selectedPatientId, created_by_profile_id: profile?.id ?? null }).select().single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    const savedParty = result.data as ResponsiblePartyRow
    setResponsibleParties((currentParties) => selectedResponsibleParty?.id
      ? currentParties.map((party) => (party.id === savedParty.id ? savedParty : party))
      : [...currentParties, savedParty])
    setSuccessMessage(selectedResponsibleParty?.id ? 'Responsible party updated.' : 'Responsible party created.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: selectedResponsibleParty?.id ? 'responsible_party_updated' : 'responsible_party_added',
      event_title: selectedResponsibleParty?.id ? 'Responsible party updated' : 'Responsible party added',
      event_body: `${savedParty.full_name} was ${selectedResponsibleParty?.id ? 'updated' : 'added'} as responsible party.`,
      source_table: 'responsible_parties',
      source_id: savedParty.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const saveAddress = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditFinanceContact) return

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const payload: Omit<PatientAddressInsert, 'tenant_id'> = {
      patient_id: selectedPatientId,
      responsible_party_id: null,
      address_owner_type: 'patient',
      address_type: 'residential',
      address_line_1: emptyToNull(addressForm.address_line_1),
      address_line_2: emptyToNull(addressForm.address_line_2),
      suburb: emptyToNull(addressForm.suburb),
      city: emptyToNull(addressForm.city),
      province: emptyToNull(addressForm.province),
      postal_code: emptyToNull(addressForm.postal_code),
      country: addressForm.country,
      is_primary: true,
      updated_by_profile_id: profile?.id ?? null,
    }

    const result = selectedAddress?.id
      ? await supabase.from('patient_addresses').update(payload satisfies PatientAddressUpdate).eq('id', selectedAddress.id).eq('tenant_id', activeTenant.id).select().single()
      : await supabase.from('patient_addresses').insert({ ...payload, tenant_id: activeTenant.id, created_by_profile_id: profile?.id ?? null }).select().single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    const savedAddress = result.data as PatientAddressRow
    setAddresses((currentAddresses) => selectedAddress?.id
      ? currentAddresses.map((address) => (address.id === savedAddress.id ? savedAddress : address))
      : [...currentAddresses, savedAddress])
    setSuccessMessage(selectedAddress?.id ? 'Address updated.' : 'Address created.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: selectedAddress?.id ? 'patient_address_updated' : 'patient_address_added',
      event_title: selectedAddress?.id ? 'Address updated' : 'Address added',
      event_body: 'Residential address was updated.',
      source_table: 'patient_addresses',
      source_id: savedAddress.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const saveEmergencyContact = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditPatients) return

    if (!emergencyForm.full_name.trim() || !emergencyForm.phone.trim()) {
      setSaveError('Emergency contact name and phone are required.')
      return
    }
    if (!isValidPhone(emergencyForm.phone)) {
      setSaveError('Please enter a valid emergency contact phone number.')
      return
    }
    if (!isValidEmail(emergencyForm.email)) {
      setSaveError('Please enter a valid emergency contact email address.')
      return
    }

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const payload: Omit<EmergencyContactInsert, 'tenant_id' | 'patient_id'> = {
      full_name: emergencyForm.full_name.trim(),
      phone: emergencyForm.phone.trim(),
      relationship_to_patient: emptyToNull(emergencyForm.relationship_to_patient),
      email: emptyToNull(emergencyForm.email),
      notes: emptyToNull(emergencyForm.notes),
      is_primary: true,
      updated_by_profile_id: profile?.id ?? null,
    }

    const result = selectedEmergencyContact?.id
      ? await supabase.from('patient_emergency_contacts').update(payload satisfies EmergencyContactUpdate).eq('id', selectedEmergencyContact.id).eq('tenant_id', activeTenant.id).select().single()
      : await supabase.from('patient_emergency_contacts').insert({ ...payload, tenant_id: activeTenant.id, patient_id: selectedPatientId, created_by_profile_id: profile?.id ?? null }).select().single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    const savedContact = result.data as EmergencyContactRow
    setEmergencyContacts((currentContacts) => selectedEmergencyContact?.id
      ? currentContacts.map((contact) => (contact.id === savedContact.id ? savedContact : contact))
      : [...currentContacts, savedContact])
    setSuccessMessage(selectedEmergencyContact?.id ? 'Emergency contact updated.' : 'Emergency contact created.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: selectedEmergencyContact?.id ? 'emergency_contact_updated' : 'emergency_contact_added',
      event_title: selectedEmergencyContact?.id ? 'Emergency contact updated' : 'Emergency contact added',
      event_body: `${savedContact.full_name} was ${selectedEmergencyContact?.id ? 'updated' : 'added'} as emergency contact.`,
      source_table: 'patient_emergency_contacts',
      source_id: savedContact.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const saveMedicalInfo = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditMedical) return

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const payload: Omit<MedicalInfoInsert, 'tenant_id' | 'patient_id'> = {
      has_medical_aid: medicalForm.has_medical_aid,
      medical_aid_name: emptyToNull(medicalForm.medical_aid_name),
      medical_aid_number: emptyToNull(medicalForm.medical_aid_number),
      medical_aid_dependant_code: emptyToNull(medicalForm.medical_aid_dependant_code),
      medical_aid_plan: emptyToNull(medicalForm.medical_aid_plan),
      main_member_name: emptyToNull(medicalForm.main_member_name),
      main_member_id_number: emptyToNull(medicalForm.main_member_id_number),
      referring_professional: emptyToNull(medicalForm.referring_professional),
      referring_practice: emptyToNull(medicalForm.referring_practice),
      medical_conditions: emptyToNull(medicalForm.medical_conditions),
      current_medication: emptyToNull(medicalForm.current_medication),
      medical_notes: emptyToNull(medicalForm.medical_notes),
      updated_by_profile_id: profile?.id ?? null,
    }

    const result = selectedMedicalInfo?.id
      ? await supabase.from('patient_medical_information').update(payload satisfies MedicalInfoUpdate).eq('id', selectedMedicalInfo.id).eq('tenant_id', activeTenant.id).select().single()
      : await supabase.from('patient_medical_information').insert({ ...payload, tenant_id: activeTenant.id, patient_id: selectedPatientId, created_by_profile_id: profile?.id ?? null }).select().single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    const savedInfo = result.data as MedicalInfoRow
    setMedicalInformation((currentInfo) => selectedMedicalInfo?.id
      ? currentInfo.map((info) => (info.id === savedInfo.id ? savedInfo : info))
      : [...currentInfo, savedInfo])
    setSuccessMessage(selectedMedicalInfo?.id ? 'Medical information updated.' : 'Medical information created.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: selectedMedicalInfo?.id ? 'medical_information_updated' : 'medical_information_added',
      event_title: selectedMedicalInfo?.id ? 'Medical information updated' : 'Medical information added',
      event_body: 'Medical aid and clinical context were updated.',
      source_table: 'patient_medical_information',
      source_id: savedInfo.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const startNewAlert = () => {
    setSelectedAlertId(null)
    setAlertForm(emptyAlertForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const saveAlert = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditMedical) return

    if (!alertForm.title.trim()) {
      setSaveError('Alert title is required.')
      return
    }

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const payload: Omit<PatientAlertInsert, 'tenant_id' | 'patient_id'> = {
      alert_type: alertForm.alert_type,
      severity: alertForm.severity,
      title: alertForm.title.trim(),
      description: emptyToNull(alertForm.description),
      is_active: alertForm.is_active,
      is_patient_visible: alertForm.is_patient_visible,
      updated_by_profile_id: profile?.id ?? null,
    }

    const result = selectedAlert?.id
      ? await supabase.from('patient_alerts').update(payload satisfies PatientAlertUpdate).eq('id', selectedAlert.id).eq('tenant_id', activeTenant.id).select().single()
      : await supabase.from('patient_alerts').insert({ ...payload, tenant_id: activeTenant.id, patient_id: selectedPatientId, created_by_profile_id: profile?.id ?? null }).select().single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    const savedAlert = result.data as PatientAlertRow
    setAlerts((currentAlerts) => selectedAlert?.id
      ? currentAlerts.map((alert) => (alert.id === savedAlert.id ? savedAlert : alert))
      : [...currentAlerts, savedAlert])
    setSelectedAlertId(savedAlert.id)
    setSuccessMessage(selectedAlert?.id ? 'Alert updated.' : 'Alert added.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: selectedAlert?.id ? 'patient_alert_updated' : 'patient_alert_added',
      event_title: selectedAlert?.id ? 'Alert updated' : 'Alert added',
      event_body: `${formatLabel(savedAlert.alert_type)} alert: ${savedAlert.title}`,
      source_table: 'patient_alerts',
      source_id: savedAlert.id,
      is_patient_visible: savedAlert.is_patient_visible,
      patient_visible_title: savedAlert.is_patient_visible ? savedAlert.title : null,
      patient_visible_body: savedAlert.is_patient_visible ? savedAlert.description : null,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const archiveAlert = async (alert: PatientAlertRow) => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditMedical) return

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const result = await supabase
      .from('patient_alerts')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_by_profile_id: profile?.id ?? null,
      } satisfies PatientAlertUpdate)
      .eq('id', alert.id)
      .eq('tenant_id', activeTenant.id)
      .select()
      .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    setAlerts((currentAlerts) => currentAlerts.filter((currentAlert) => currentAlert.id !== alert.id))
    setSelectedAlertId(null)
    setAlertForm(emptyAlertForm)
    setSuccessMessage('Alert archived.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: 'patient_alert_archived',
      event_title: 'Alert archived',
      event_body: `${formatLabel(alert.alert_type)} alert archived: ${alert.title}`,
      source_table: 'patient_alerts',
      source_id: alert.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const startNewConsent = () => {
    setSelectedConsentId(null)
    setConsentForm(emptyConsentForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const saveConsent = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditPatients) return

    if (!consentForm.consent_type.trim()) {
      setSaveError('Consent type is required.')
      return
    }
    if (!consentForm.signed_by_name.trim() && consentForm.consent_status === 'accepted') {
      setSaveError('Signed by name is required for accepted consent.')
      return
    }

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const acceptedAt = consentForm.consent_status === 'accepted'
      ? selectedConsent?.accepted_at ?? new Date().toISOString()
      : null
    const revokedAt = consentForm.consent_status === 'revoked'
      ? selectedConsent?.revoked_at ?? new Date().toISOString()
      : null
    const payload: Omit<PatientConsentInsert, 'tenant_id' | 'patient_id'> = {
      responsible_party_id: selectedResponsibleParty?.id ?? null,
      consent_type: consentForm.consent_type.trim(),
      consent_status: consentForm.consent_status,
      consent_version: emptyToNull(consentForm.consent_version),
      consent_text: emptyToNull(consentForm.consent_text),
      signed_by_name: emptyToNull(consentForm.signed_by_name),
      signed_by_relationship: emptyToNull(consentForm.signed_by_relationship),
      source: consentForm.source,
      accepted_at: acceptedAt,
      revoked_at: revokedAt,
      updated_by_profile_id: profile?.id ?? null,
    }

    const result = selectedConsent?.id
      ? await supabase.from('patient_consents').update(payload satisfies PatientConsentUpdate).eq('id', selectedConsent.id).eq('tenant_id', activeTenant.id).select().single()
      : await supabase.from('patient_consents').insert({ ...payload, tenant_id: activeTenant.id, patient_id: selectedPatientId, created_by_profile_id: profile?.id ?? null }).select().single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    const savedConsent = result.data as PatientConsentRow
    setConsents((currentConsents) => selectedConsent?.id
      ? currentConsents.map((consent) => (consent.id === savedConsent.id ? savedConsent : consent))
      : [...currentConsents, savedConsent])
    setSelectedConsentId(savedConsent.id)
    setSuccessMessage(selectedConsent?.id ? 'Consent updated.' : 'Consent recorded.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: selectedConsent?.id ? 'patient_consent_updated' : 'patient_consent_recorded',
      event_title: selectedConsent?.id ? 'Consent updated' : 'Consent recorded',
      event_body: `${formatLabel(savedConsent.consent_type)} consent is ${formatLabel(savedConsent.consent_status)}.`,
      source_table: 'patient_consents',
      source_id: savedConsent.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  const archiveConsent = async (consent: PatientConsentRow) => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !canEditPatients) return

    setSavingRelated(true)
    setSaveError('')
    setSuccessMessage('')

    const result = await supabase
      .from('patient_consents')
      .update({
        consent_status: 'revoked',
        revoked_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
        updated_by_profile_id: profile?.id ?? null,
      } satisfies PatientConsentUpdate)
      .eq('id', consent.id)
      .eq('tenant_id', activeTenant.id)
      .select()
      .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRelated(false)
      return
    }

    setConsents((currentConsents) => currentConsents.filter((currentConsent) => currentConsent.id !== consent.id))
    setSelectedConsentId(null)
    setConsentForm(emptyConsentForm)
    setSuccessMessage('Consent archived.')
    await recordHistoryEvent(selectedPatientId, {
      event_type: 'patient_consent_archived',
      event_title: 'Consent archived',
      event_body: `${formatLabel(consent.consent_type)} consent was archived.`,
      source_table: 'patient_consents',
      source_id: consent.id,
      is_patient_visible: false,
      metadata: {},
    })
    setSavingRelated(false)
  }

  if (loading) {
    return <LoadingState title="Loading patients" description="Checking active tenant patient records." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Patients unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="patients-engine-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Patient Engine</span>
          <h3>{activeTenant?.practice_name ?? 'Patients'}</h3>
          <p>
            Manage tenant-owned patient records, responsible parties and core intake details. Bookings, finance, clinical notes and Patient Link workflows are not connected yet.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{patients.length} patients</StatusBadge>
          {!canEditPatients && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="practice-locations-layout patients-engine-layout">
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Patient database</span>
              <h3>Patients</h3>
            </div>
            {canEditPatients && (
              <Button variant="secondary" onClick={startCreatePatient}>
                New Patient
              </Button>
            )}
          </div>

          <div className="patients-filter-row">
            <SearchBar label="Search patients" value={searchTerm} placeholder="Name, number, phone or email" onChange={setSearchTerm} />
            <label>
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {patientStatuses.map((status) => (
                  <option value={status} key={status}>{formatLabel(status)}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredPatients.length === 0 ? (
            <EmptyState title="No patients found" description="Create a patient or adjust the search and status filters." />
          ) : (
            <div className="practice-location-cards">
              {filteredPatients.map((patient) => (
                <button
                  className={selectedPatientId === patient.id ? 'active' : ''}
                  type="button"
                  onClick={() => selectPatient(patient)}
                  key={patient.id}
                >
                  <div>
                    <strong>{formatPatientName(patient)}</strong>
                    <span>{patient.patient_number || 'No patient number'} · {formatLabel(patient.patient_type)}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    <StatusBadge tone={patient.patient_status === 'active' ? 'success' : patient.patient_status === 'archived' ? 'neutral' : 'info'}>
                      {formatLabel(patient.patient_status)}
                    </StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="practice-therapist-editor-stack">
          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header">
              <div>
                <span>{selectedPatient ? 'Edit patient' : 'Create patient'}</span>
                <h3>{selectedPatient ? formatPatientName(selectedPatient) : 'New patient'}</h3>
              </div>
              <div className="patients-action-row">
                {canEditPatients && selectedPatient && selectedPatient.patient_status !== 'archived' && (
                  <Button variant="secondary" disabled={savingPatient} onClick={archivePatient}>
                    Archive
                  </Button>
                )}
                {canEditPatients && (
                  <Button disabled={savingPatient} onClick={savePatient}>
                    {savingPatient ? 'Saving' : 'Save Patient'}
                  </Button>
                )}
              </div>
            </div>

            <div className="settings-form-grid patients-form-grid">
              <label>
                <span>Patient number</span>
                <input value={patientForm.patient_number} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('patient_number', event.target.value)} />
              </label>
              <label>
                <span>Status</span>
                <select value={patientForm.patient_status} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('patient_status', event.target.value)}>
                  {patientStatuses.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}
                </select>
              </label>
              <label>
                <span>Patient type</span>
                <select value={patientForm.patient_type} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('patient_type', event.target.value)}>
                  {patientTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span>Title</span>
                <input value={patientForm.title} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('title', event.target.value)} />
              </label>
              <label>
                <span>First name</span>
                <input value={patientForm.first_name} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('first_name', event.target.value)} />
              </label>
              <label>
                <span>Last name</span>
                <input value={patientForm.last_name} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('last_name', event.target.value)} />
              </label>
              <label>
                <span>Preferred name</span>
                <input value={patientForm.preferred_name} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('preferred_name', event.target.value)} />
              </label>
              <label>
                <span>Date of birth</span>
                <input type="date" value={patientForm.date_of_birth} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('date_of_birth', event.target.value)} />
              </label>
              <label>
                <span>ID number</span>
                <input value={patientForm.id_number} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('id_number', event.target.value)} />
              </label>
              <label>
                <span>Cell number</span>
                <input value={patientForm.phone} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('phone', event.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={patientForm.email} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('email', event.target.value)} />
              </label>
              <label>
                <span>Active ICD-10</span>
                <input value={patientForm.active_icd10_code} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('active_icd10_code', event.target.value)} />
              </label>
              <label>
                <span>Gender</span>
                <input value={patientForm.gender} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('gender', event.target.value)} />
              </label>
              <label>
                <span>Language</span>
                <input value={patientForm.language} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('language', event.target.value)} />
              </label>
              <label>
                <span>Referral source</span>
                <input value={patientForm.referral_source} disabled={isPatientReadOnly} onChange={(event) => updatePatientField('referral_source', event.target.value)} />
              </label>
            </div>
          </Card>

          {selectedPatientId ? (
            <>
              <Card className="patients-workspace-tabs-card">
                <div>
                  <span>Patient workspace</span>
                  <h3>{selectedPatient ? formatPatientName(selectedPatient) : 'Patient details'}</h3>
                </div>
                {canViewClinical && (
                  <Link className="ui-button ui-button-secondary patients-clinical-link" to={`/patients/clinical?patient=${selectedPatientId}`}>
                    Clinical Workspace
                  </Link>
                )}
                <div className="patients-workspace-tabs">
                  {patientWorkspaceSections.map((section) => (
                    <button
                      className={selectedSection === section.id ? 'active' : ''}
                      type="button"
                      onClick={() => setSelectedSection(section.id)}
                      key={section.id}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              </Card>

              {selectedSection === 'overview' && (
                <Card className="patients-foundation-card">
                  <span>Overview</span>
                  <div className="patients-overview-grid">
                    <div>
                      <strong>{selectedPatient?.patient_number || 'No patient number'}</strong>
                      <span>Patient number</span>
                    </div>
                    <div>
                      <strong>{formatLabel(selectedPatient?.patient_status ?? 'unknown')}</strong>
                      <span>Lifecycle status</span>
                    </div>
                    <div>
                      <strong>{selectedResponsibleParty?.full_name || 'Not captured'}</strong>
                      <span>Responsible party</span>
                    </div>
                    <div>
                      <strong>{selectedPatient?.active_icd10_code || 'Not captured'}</strong>
                      <span>Active ICD-10</span>
                    </div>
                  </div>
                  <div className="patients-foundation-grid">
                    <StatusBadge tone={selectedAlertCount > 0 ? 'warning' : 'neutral'}>{selectedAlertCount} active alerts</StatusBadge>
                    <StatusBadge tone={selectedConsentCount > 0 ? 'success' : 'neutral'}>{selectedConsentCount} accepted consents</StatusBadge>
                    <StatusBadge tone="info">{selectedPatientHistory.length} history events</StatusBadge>
                  </div>
                </Card>
              )}

              {selectedSection === 'responsible' && (
              <Card className="practice-profile-form-card">
                <div className="practice-profile-form-header">
                  <div>
                    <span>Responsible party</span>
                    <h3>{selectedResponsibleParty ? selectedResponsibleParty.full_name : 'Account contact'}</h3>
                  </div>
                  {canEditFinanceContact && <Button disabled={savingRelated} onClick={saveResponsibleParty}>{selectedResponsibleParty ? 'Save Contact' : 'Add Contact'}</Button>}
                </div>
                <div className="settings-form-grid patients-form-grid">
                  <label><span>Full name</span><input value={responsiblePartyForm.full_name} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, full_name: event.target.value }))} /></label>
                  <label><span>Relationship</span><input value={responsiblePartyForm.relationship_to_patient} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, relationship_to_patient: event.target.value }))} /></label>
                  <label><span>Party type</span><select value={responsiblePartyForm.party_type} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, party_type: event.target.value }))}>{partyTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
                  <label><span>ID number</span><input value={responsiblePartyForm.id_number} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, id_number: event.target.value }))} /></label>
                  <label><span>Phone</span><input value={responsiblePartyForm.phone} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label><span>Email</span><input type="email" value={responsiblePartyForm.email} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label><span>Account status</span><select value={responsiblePartyForm.account_responsibility_status} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, account_responsibility_status: event.target.value }))}>{accountStatuses.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
                  <label><span>Medical aid member no.</span><input value={responsiblePartyForm.medical_aid_member_number} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, medical_aid_member_number: event.target.value }))} /></label>
                  <label><span>Dependent code</span><input value={responsiblePartyForm.medical_aid_dependant_code} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, medical_aid_dependant_code: event.target.value }))} /></label>
                  <label className="practice-number-toggle"><input type="checkbox" checked={responsiblePartyForm.is_billing_contact} disabled={isRelatedReadOnly} onChange={(event) => setResponsiblePartyForm((current) => ({ ...current, is_billing_contact: event.target.checked }))} /><span>Billing contact</span></label>
                </div>
              </Card>
              )}

              {selectedSection === 'contact' && (
              <>
              <Card className="practice-profile-form-card">
                <div className="practice-profile-form-header">
                  <div><span>Address</span><h3>Residential address</h3></div>
                  {canEditFinanceContact && <Button disabled={savingRelated} onClick={saveAddress}>{selectedAddress ? 'Save Address' : 'Add Address'}</Button>}
                </div>
                <div className="settings-form-grid patients-form-grid">
                  <label><span>Street address</span><input value={addressForm.address_line_1} disabled={isRelatedReadOnly} onChange={(event) => setAddressForm((current) => ({ ...current, address_line_1: event.target.value }))} /></label>
                  <label><span>Address line 2</span><input value={addressForm.address_line_2} disabled={isRelatedReadOnly} onChange={(event) => setAddressForm((current) => ({ ...current, address_line_2: event.target.value }))} /></label>
                  <label><span>Suburb / area</span><input value={addressForm.suburb} disabled={isRelatedReadOnly} onChange={(event) => setAddressForm((current) => ({ ...current, suburb: event.target.value }))} /></label>
                  <label><span>City</span><input value={addressForm.city} disabled={isRelatedReadOnly} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} /></label>
                  <label><span>Province</span><input value={addressForm.province} disabled={isRelatedReadOnly} onChange={(event) => setAddressForm((current) => ({ ...current, province: event.target.value }))} /></label>
                  <label><span>Code</span><input value={addressForm.postal_code} disabled={isRelatedReadOnly} onChange={(event) => setAddressForm((current) => ({ ...current, postal_code: event.target.value }))} /></label>
                </div>
              </Card>

              <Card className="practice-profile-form-card">
                <div className="practice-profile-form-header">
                  <div><span>Emergency contact</span><h3>{selectedEmergencyContact ? selectedEmergencyContact.full_name : 'Primary emergency contact'}</h3></div>
                  {canEditPatients && <Button disabled={savingRelated} onClick={saveEmergencyContact}>{selectedEmergencyContact ? 'Save Emergency' : 'Add Emergency'}</Button>}
                </div>
                <div className="settings-form-grid patients-form-grid">
                  <label><span>Emergency contact</span><input value={emergencyForm.full_name} disabled={!canEditPatients || savingRelated} onChange={(event) => setEmergencyForm((current) => ({ ...current, full_name: event.target.value }))} /></label>
                  <label><span>Cell</span><input value={emergencyForm.phone} disabled={!canEditPatients || savingRelated} onChange={(event) => setEmergencyForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label><span>Relation</span><input value={emergencyForm.relationship_to_patient} disabled={!canEditPatients || savingRelated} onChange={(event) => setEmergencyForm((current) => ({ ...current, relationship_to_patient: event.target.value }))} /></label>
                  <label><span>Email</span><input type="email" value={emergencyForm.email} disabled={!canEditPatients || savingRelated} onChange={(event) => setEmergencyForm((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label className="wide-field"><span>Notes</span><textarea value={emergencyForm.notes} disabled={!canEditPatients || savingRelated} onChange={(event) => setEmergencyForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                </div>
              </Card>
              </>
              )}

              {selectedSection === 'medical' && (
              <Card className="practice-profile-form-card">
                <div className="practice-profile-form-header">
                  <div><span>Medical information</span><h3>Medical aid and clinical context</h3></div>
                  {canEditMedical && <Button disabled={savingRelated} onClick={saveMedicalInfo}>{selectedMedicalInfo ? 'Save Medical' : 'Add Medical'}</Button>}
                </div>
                <div className="settings-form-grid patients-form-grid">
                  <label className="practice-number-toggle"><input type="checkbox" checked={medicalForm.has_medical_aid} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, has_medical_aid: event.target.checked }))} /><span>Has medical aid</span></label>
                  <label><span>Medical aid</span><input value={medicalForm.medical_aid_name} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, medical_aid_name: event.target.value }))} /></label>
                  <label><span>Medical aid no.</span><input value={medicalForm.medical_aid_number} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, medical_aid_number: event.target.value }))} /></label>
                  <label><span>Dependent code</span><input value={medicalForm.medical_aid_dependant_code} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, medical_aid_dependant_code: event.target.value }))} /></label>
                  <label><span>Main member</span><input value={medicalForm.main_member_name} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, main_member_name: event.target.value }))} /></label>
                  <label><span>Main member ID</span><input value={medicalForm.main_member_id_number} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, main_member_id_number: event.target.value }))} /></label>
                  <label><span>Referring professional</span><input value={medicalForm.referring_professional} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, referring_professional: event.target.value }))} /></label>
                  <label className="wide-field"><span>Medical notes</span><textarea value={medicalForm.medical_notes} disabled={isMedicalReadOnly} onChange={(event) => setMedicalForm((current) => ({ ...current, medical_notes: event.target.value }))} /></label>
                </div>
              </Card>
              )}

              {selectedSection === 'alerts' && (
                <Card className="practice-profile-form-card">
                  <div className="practice-profile-form-header">
                    <div><span>Alerts and allergies</span><h3>{selectedAlert ? selectedAlert.title : 'New alert'}</h3></div>
                    <div className="patients-action-row">
                      {canEditMedical && <Button variant="secondary" disabled={savingRelated} onClick={startNewAlert}>New Alert</Button>}
                      {canEditMedical && selectedAlert && <Button variant="secondary" disabled={savingRelated} onClick={() => archiveAlert(selectedAlert)}>Archive</Button>}
                      {canEditMedical && <Button disabled={savingRelated} onClick={saveAlert}>{selectedAlert ? 'Save Alert' : 'Add Alert'}</Button>}
                    </div>
                  </div>
                  <div className="patients-record-list">
                    {selectedPatientAlerts.length === 0 ? (
                      <EmptyState title="No alerts captured" description="Patient alerts and allergies will appear here." />
                    ) : selectedPatientAlerts.map((alert) => (
                      <button className={selectedAlertId === alert.id ? 'active' : ''} type="button" onClick={() => setSelectedAlertId(alert.id)} key={alert.id}>
                        <strong>{alert.title}</strong>
                        <span>{formatLabel(alert.alert_type)} · {formatLabel(alert.severity)} · {alert.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="settings-form-grid patients-form-grid">
                    <label><span>Alert type</span><select value={alertForm.alert_type} disabled={isMedicalReadOnly} onChange={(event) => setAlertForm((current) => ({ ...current, alert_type: event.target.value }))}>{alertTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
                    <label><span>Severity</span><select value={alertForm.severity} disabled={isMedicalReadOnly} onChange={(event) => setAlertForm((current) => ({ ...current, severity: event.target.value }))}>{alertSeverities.map((severity) => <option value={severity} key={severity}>{formatLabel(severity)}</option>)}</select></label>
                    <label><span>Title</span><input value={alertForm.title} disabled={isMedicalReadOnly} onChange={(event) => setAlertForm((current) => ({ ...current, title: event.target.value }))} /></label>
                    <label className="wide-field"><span>Description</span><textarea value={alertForm.description} disabled={isMedicalReadOnly} onChange={(event) => setAlertForm((current) => ({ ...current, description: event.target.value }))} /></label>
                    <label className="practice-number-toggle"><input type="checkbox" checked={alertForm.is_active} disabled={isMedicalReadOnly} onChange={(event) => setAlertForm((current) => ({ ...current, is_active: event.target.checked }))} /><span>Active alert</span></label>
                    <label className="practice-number-toggle"><input type="checkbox" checked={alertForm.is_patient_visible} disabled={isMedicalReadOnly} onChange={(event) => setAlertForm((current) => ({ ...current, is_patient_visible: event.target.checked }))} /><span>Patient visible later</span></label>
                  </div>
                </Card>
              )}

              {selectedSection === 'consents' && (
                <Card className="practice-profile-form-card">
                  <div className="practice-profile-form-header">
                    <div><span>Consents</span><h3>{selectedConsent ? formatLabel(selectedConsent.consent_type) : 'Record consent'}</h3></div>
                    <div className="patients-action-row">
                      {canEditPatients && <Button variant="secondary" disabled={savingRelated} onClick={startNewConsent}>New Consent</Button>}
                      {canEditPatients && selectedConsent && <Button variant="secondary" disabled={savingRelated} onClick={() => archiveConsent(selectedConsent)}>Archive</Button>}
                      {canEditPatients && <Button disabled={savingRelated} onClick={saveConsent}>{selectedConsent ? 'Save Consent' : 'Record Consent'}</Button>}
                    </div>
                  </div>
                  <div className="patients-record-list">
                    {selectedPatientConsents.length === 0 ? (
                      <EmptyState title="No consents recorded" description="POPIA, intake and treatment consents will appear here." />
                    ) : selectedPatientConsents.map((consent) => (
                      <button className={selectedConsentId === consent.id ? 'active' : ''} type="button" onClick={() => setSelectedConsentId(consent.id)} key={consent.id}>
                        <strong>{formatLabel(consent.consent_type)}</strong>
                        <span>{formatLabel(consent.consent_status)} · {consent.signed_by_name || 'No signer captured'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="settings-form-grid patients-form-grid">
                    <label><span>Consent type</span><select value={consentForm.consent_type} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, consent_type: event.target.value }))}>{consentTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
                    <label><span>Status</span><select value={consentForm.consent_status} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, consent_status: event.target.value }))}>{consentStatuses.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
                    <label><span>Version</span><input value={consentForm.consent_version} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, consent_version: event.target.value }))} /></label>
                    <label><span>Signed by</span><input value={consentForm.signed_by_name} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, signed_by_name: event.target.value }))} /></label>
                    <label><span>Relationship</span><input value={consentForm.signed_by_relationship} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, signed_by_relationship: event.target.value }))} /></label>
                    <label><span>Source</span><select value={consentForm.source} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, source: event.target.value }))}>{consentSources.map((source) => <option value={source} key={source}>{formatLabel(source)}</option>)}</select></label>
                    <label className="wide-field"><span>Consent text</span><textarea value={consentForm.consent_text} disabled={!canEditPatients || savingRelated} onChange={(event) => setConsentForm((current) => ({ ...current, consent_text: event.target.value }))} /></label>
                  </div>
                </Card>
              )}

              {selectedSection === 'history' && (
                <Card className="patients-foundation-card">
                  <span>Patient history</span>
                  {selectedPatientHistory.length === 0 ? (
                    <EmptyState title="No history yet" description="Meaningful patient, consent, alert and administrative events will appear here." />
                  ) : (
                    <div className="patients-history-list">
                      {selectedPatientHistory.map((event) => (
                        <article key={event.id}>
                          <div>
                            <strong>{event.event_title}</strong>
                            <span>{new Date(event.occurred_at).toLocaleString()}</span>
                          </div>
                          {event.event_body && <p>{event.event_body}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
          ) : (
            <EmptyState title="Create or select a patient" description="Patient details and related foundation records appear here." />
          )}

          {(saveError || successMessage) && (
            <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
              {saveError || successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
