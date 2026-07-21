import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import {
  ClinicalDocumentationWorkspace,
  type ClinicalCopyForwardEvent,
  type ClinicalDraftState,
  type ClinicalStructuredResponse,
  type ClinicalTemplateCalculationRule,
  type ClinicalTemplateField,
  type ClinicalTemplateFieldOption,
  type ClinicalTemplateSection,
  type ClinicalTemplateValidationRule,
  type CreateClinicalDraftInput,
} from '../components/clinical/ClinicalDocumentationWorkspace'
import {
  ClinicalAssessmentWorkspace,
  type AmendAssessmentInput,
  type AssessmentAmendment,
  type AssessmentAssignment,
  type AssessmentDefinition,
  type AssessmentDefinitionItem,
  type AssessmentDefinitionItemOption,
  type AssessmentDefinitionSection,
  type AssessmentDefinitionVersion,
  type AssessmentDraftState,
  type AssessmentGoalLink,
  type AssessmentImport,
  type AssessmentInterpretation,
  type AssessmentInvitation,
  type AssessmentNoteLink,
  type AssessmentPublication,
  type AssessmentResponse,
  type AssessmentScoreComponent,
  type RepeatedMeasureMember,
  type RepeatedMeasureSeries,
  type SaveAssessmentResponseInput,
  type StartAssessmentInput,
} from '../components/clinical-assessments/ClinicalAssessmentWorkspace'
import { Button, Card, SearchBar, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { formatFileSize, uploadDocumentFile } from '../lib/storageDocuments'
import type { Database, Json } from '../lib/database.types'

type PatientRow = Database['public']['Tables']['patients']['Row']
type TherapistRow = Database['public']['Tables']['therapist_profiles']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']

type ClinicalEncounter = {
  id: string
  tenant_id: string
  patient_id: string
  booking_id: string | null
  session_id: string | null
  responsible_therapist_profile_id: string | null
  practice_location_id: string | null
  encounter_type: string
  encounter_status: string
  clinical_visibility: string
  occurred_at: string | null
  started_at: string | null
  ended_at: string | null
  summary: string | null
  restricted_reason: string | null
  metadata: Json
  lock_version: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalNote = {
  id: string
  tenant_id: string
  patient_id: string
  clinical_encounter_id: string | null
  booking_id: string | null
  session_id: string | null
  responsible_therapist_profile_id: string | null
  author_profile_id: string | null
  note_type: string
  note_title: string | null
  note_status: string
  clinical_visibility: string
  patient_visible_allowed: boolean
  is_restricted: boolean
  latest_version_id: string | null
  finalised_at: string | null
  signed_at: string | null
  amended_at: string | null
  amendment_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalNoteVersion = {
  id: string
  tenant_id: string
  clinical_note_id: string
  version_number: number
  clinical_note_template_version_id: string | null
  free_text_content: string | null
  structured_content: Json
  version_status: string
  finalised_at: string | null
  signed_at: string | null
  signature_statement: string | null
  content_hash: string | null
  signature_hash: string | null
  change_reason: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalNoteAmendment = {
  id: string
  clinical_note_id: string
  clinical_note_version_id: string
  amendment_number: number
  amendment_reason: string
  amendment_free_text: string | null
  created_at: string
}

type ClinicalTemplate = {
  id: string
  tenant_id: string | null
  template_key: string
  name: string
  description: string | null
  template_status: string
  active_version_id: string | null
}

type ClinicalTemplateVersion = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  version_number: number
  version_status: string
  default_free_text: string | null
  default_structured_content: Json
  visibility_default: string
}

type TreatmentPlan = {
  id: string
  patient_id: string
  responsible_therapist_profile_id: string | null
  plan_title: string
  plan_status: string
  clinical_focus: string | null
  review_due_date: string | null
  patient_visible_allowed: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalGoal = {
  id: string
  patient_id: string
  treatment_plan_id: string | null
  goal_text: string
  goal_domain: string | null
  goal_status: string
  priority: string
  review_due_date: string | null
  patient_visible_allowed: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalGoalReview = {
  id: string
  clinical_goal_id: string
  review_status: string
  progress_rating: number | null
  evidence_summary: string | null
  reviewed_at: string
  created_at: string
}

type ClinicalAssessment = {
  id: string
  tenant_id: string
  patient_id: string
  clinical_encounter_id: string | null
  booking_id: string | null
  session_id: string | null
  treatment_plan_id: string | null
  clinical_goal_id: string | null
  outcome_measure_definition_id: string | null
  assessment_definition_version_id: string | null
  assessor_therapist_profile_id: string | null
  assessment_type: string
  assessment_status: string
  assessment_source: string | null
  assessment_phase: string | null
  assessment_date: string | null
  summary: string | null
  interpretation: string | null
  patient_visible_allowed: boolean
  is_restricted: boolean
  started_at: string | null
  completed_at: string | null
  finalised_at: string | null
  signed_at: string | null
  signature_statement: string | null
  amendment_count: number
  latest_result_id: string | null
  content_hash: string | null
  lock_version: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type OutcomeResult = {
  id: string
  tenant_id: string
  patient_id: string
  clinical_assessment_id: string | null
  outcome_measure_definition_id: string | null
  assessment_definition_version_id: string | null
  result_date: string | null
  result_key: string | null
  result_label: string | null
  raw_score: number | null
  numeric_score: number | null
  normalised_score: number | null
  percentage_score: number | null
  score_unit: string | null
  interpreted_score: string | null
  interpretation_band_id: string | null
  calculation_status: string | null
  calculated_classification: string | null
  partial_score: boolean
  missing_item_count: number
  response_set: Json
  clinical_visibility: string
  result_status: string
  patient_visible_allowed: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalDiagnosis = {
  id: string
  patient_id: string
  coding_system: string
  code: string
  label: string | null
  diagnosis_status: string
  is_primary: boolean
  onset_date: string | null
  resolved_date: string | null
  patient_visible_allowed: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalAttachment = {
  id: string
  patient_id: string
  clinical_encounter_id: string | null
  clinical_note_id: string | null
  clinical_assessment_id: string | null
  attachment_category: string
  storage_bucket: string | null
  storage_path: string | null
  file_name: string
  mime_type: string | null
  file_size_bytes: number | null
  description: string | null
  is_restricted: boolean
  patient_visible_allowed: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalRestriction = {
  id: string
  patient_id: string
  record_type: string
  record_id: string
  restriction_reason: string
  restriction_status: string
  applied_at: string
  removed_at: string | null
}

type ClinicalPublication = {
  id: string
  patient_id: string
  patient_link_id: string | null
  record_type: string
  record_id: string
  publication_status: string
  safe_title: string
  safe_summary: string | null
  published_at: string | null
  revoked_at: string | null
  revoke_reason: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ClinicalSection = 'overview' | 'documentation' | 'encounters' | 'notes' | 'plans' | 'assessments' | 'diagnoses' | 'attachments' | 'publications'

type EncounterForm = {
  encounter_type: string
  encounter_status: string
  clinical_visibility: string
  booking_id: string
  session_id: string
  responsible_therapist_profile_id: string
  occurred_at: string
  summary: string
  restricted_reason: string
}

type NoteForm = {
  clinical_encounter_id: string
  note_type: string
  note_title: string
  clinical_note_template_version_id: string
  free_text_content: string
  structured_content: string
  clinical_visibility: string
  patient_visible_allowed: boolean
  is_restricted: boolean
}

type PlanForm = {
  plan_title: string
  plan_status: string
  clinical_focus: string
  review_due_date: string
  patient_visible_allowed: boolean
}

type GoalForm = {
  treatment_plan_id: string
  goal_text: string
  goal_domain: string
  priority: string
  review_due_date: string
  patient_visible_allowed: boolean
}

type DiagnosisForm = {
  coding_system: string
  code: string
  label: string
  diagnosis_status: string
  is_primary: boolean
  onset_date: string
  resolved_date: string
  patient_visible_allowed: boolean
}

type AttachmentForm = {
  clinical_encounter_id: string
  clinical_note_id: string
  clinical_assessment_id: string
  attachment_category: string
  file_name: string
  mime_type: string
  file_size_bytes: string
  description: string
  is_restricted: boolean
  patient_visible_allowed: boolean
}

type PublicationForm = {
  record_type: string
  record_id: string
  safe_title: string
  safe_summary: string
}

const clinicalSections: Array<{ id: ClinicalSection; label: string }> = [
  { id: 'overview', label: 'Clinical overview' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'encounters', label: 'Encounters' },
  { id: 'notes', label: 'Clinical notes' },
  { id: 'plans', label: 'Plans and goals' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'diagnoses', label: 'Diagnoses' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'publications', label: 'Patient Link' },
]

const emptyEncounterForm: EncounterForm = {
  encounter_type: 'session',
  encounter_status: 'draft',
  clinical_visibility: 'internal',
  booking_id: '',
  session_id: '',
  responsible_therapist_profile_id: '',
  occurred_at: '',
  summary: '',
  restricted_reason: '',
}

const emptyNoteForm: NoteForm = {
  clinical_encounter_id: '',
  note_type: 'progress_note',
  note_title: '',
  clinical_note_template_version_id: '',
  free_text_content: '',
  structured_content: '{}',
  clinical_visibility: 'internal',
  patient_visible_allowed: false,
  is_restricted: false,
}

const emptyPlanForm: PlanForm = {
  plan_title: '',
  plan_status: 'draft',
  clinical_focus: '',
  review_due_date: '',
  patient_visible_allowed: false,
}

const emptyGoalForm: GoalForm = {
  treatment_plan_id: '',
  goal_text: '',
  goal_domain: '',
  priority: 'medium',
  review_due_date: '',
  patient_visible_allowed: false,
}

const emptyDiagnosisForm: DiagnosisForm = {
  coding_system: 'ICD-10',
  code: '',
  label: '',
  diagnosis_status: 'active',
  is_primary: false,
  onset_date: '',
  resolved_date: '',
  patient_visible_allowed: false,
}

const emptyAttachmentForm: AttachmentForm = {
  clinical_encounter_id: '',
  clinical_note_id: '',
  clinical_assessment_id: '',
  attachment_category: 'supporting_document',
  file_name: '',
  mime_type: '',
  file_size_bytes: '',
  description: '',
  is_restricted: false,
  patient_visible_allowed: false,
}

const emptyPublicationForm: PublicationForm = {
  record_type: 'clinical_note',
  record_id: '',
  safe_title: '',
  safe_summary: '',
}

const noteTypes = ['progress_note', 'process_note', 'session_feedback', 'assessment_note', 'case_management', 'report_note', 'treatment_plan_note', 'goal_review', 'other']
const encounterTypes = ['session', 'assessment', 'review', 'case_management', 'feedback', 'report_preparation', 'document_review', 'external_contact', 'other']
const visibilityOptions = ['internal', 'restricted', 'patient_facing']
const publicationRecordTypes = ['clinical_note', 'clinical_attachment', 'treatment_plan', 'clinical_assessment', 'outcome_measure_result']

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function formatLabel(value: string | null | undefined) {
  return (value ?? 'not_set').replaceAll('_', ' ')
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
}

function formatPatientName(patient: PatientRow | null | undefined) {
  if (!patient) return 'Unknown patient'
  return `${patient.first_name} ${patient.last_name}`.trim()
}

function parseJsonObject(value: string, label: string): Json {
  try {
    const parsed = JSON.parse(value || '{}')
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`${label} must be a JSON object.`)
    }
    return parsed as Json
  } catch (error) {
    if (error instanceof Error && error.message.includes('must be')) throw error
    throw new Error(`${label} must be valid JSON.`)
  }
}

function getBadgeTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['signed', 'completed', 'active', 'published', 'finalised'].includes(status)) return 'success'
  if (['draft', 'in_progress', 'pending'].includes(status)) return 'info'
  if (['amended', 'restricted', 'revoked'].includes(status)) return 'warning'
  if (['entered_in_error', 'archived', 'cancelled'].includes(status)) return 'danger'
  return 'neutral'
}

function isImmutableNoteStatus(status: string) {
  return ['finalised', 'signed', 'amended', 'locked'].includes(status)
}

function safeClinicalError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('permission')) {
      return 'Clinical record unavailable for your current role.'
    }
    return error.message
  }
  return 'Clinical action failed.'
}

export function ClinicalPage() {
  const { activeTenant, profile } = useAuth()
  const authorization = useAuthorization()
  const [searchParams, setSearchParams] = useSearchParams()
  const canViewClinical = authorization.hasPermission('tenant.clinical.view') && !authorization.isSuperAdmin
  const canManageClinical = authorization.hasPermission('tenant.clinical.manage') && !authorization.isSuperAdmin
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [therapists, setTherapists] = useState<TherapistRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([])
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [noteVersions, setNoteVersions] = useState<ClinicalNoteVersion[]>([])
  const [amendments, setAmendments] = useState<ClinicalNoteAmendment[]>([])
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([])
  const [templateVersions, setTemplateVersions] = useState<ClinicalTemplateVersion[]>([])
  const [templateSections, setTemplateSections] = useState<ClinicalTemplateSection[]>([])
  const [templateFields, setTemplateFields] = useState<ClinicalTemplateField[]>([])
  const [templateFieldOptions, setTemplateFieldOptions] = useState<ClinicalTemplateFieldOption[]>([])
  const [templateValidationRules, setTemplateValidationRules] = useState<ClinicalTemplateValidationRule[]>([])
  const [templateCalculationRules, setTemplateCalculationRules] = useState<ClinicalTemplateCalculationRule[]>([])
  const [structuredResponses, setStructuredResponses] = useState<ClinicalStructuredResponse[]>([])
  const [draftStates, setDraftStates] = useState<ClinicalDraftState[]>([])
  const [copyForwardEvents, setCopyForwardEvents] = useState<ClinicalCopyForwardEvent[]>([])
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [goals, setGoals] = useState<ClinicalGoal[]>([])
  const [goalReviews, setGoalReviews] = useState<ClinicalGoalReview[]>([])
  const [assessments, setAssessments] = useState<ClinicalAssessment[]>([])
  const [outcomeDefinitions, setOutcomeDefinitions] = useState<AssessmentDefinition[]>([])
  const [assessmentDefinitionVersions, setAssessmentDefinitionVersions] = useState<AssessmentDefinitionVersion[]>([])
  const [assessmentSections, setAssessmentSections] = useState<AssessmentDefinitionSection[]>([])
  const [assessmentItems, setAssessmentItems] = useState<AssessmentDefinitionItem[]>([])
  const [assessmentItemOptions, setAssessmentItemOptions] = useState<AssessmentDefinitionItemOption[]>([])
  const [assessmentAssignments, setAssessmentAssignments] = useState<AssessmentAssignment[]>([])
  const [assessmentDraftStates, setAssessmentDraftStates] = useState<AssessmentDraftState[]>([])
  const [assessmentResponses, setAssessmentResponses] = useState<AssessmentResponse[]>([])
  const [assessmentScoreComponents, setAssessmentScoreComponents] = useState<AssessmentScoreComponent[]>([])
  const [assessmentInterpretations, setAssessmentInterpretations] = useState<AssessmentInterpretation[]>([])
  const [assessmentAmendments, setAssessmentAmendments] = useState<AssessmentAmendment[]>([])
  const [assessmentRepeatedSeries, setAssessmentRepeatedSeries] = useState<RepeatedMeasureSeries[]>([])
  const [assessmentSeriesMembers, setAssessmentSeriesMembers] = useState<RepeatedMeasureMember[]>([])
  const [assessmentGoalLinks, setAssessmentGoalLinks] = useState<AssessmentGoalLink[]>([])
  const [assessmentNoteLinks, setAssessmentNoteLinks] = useState<AssessmentNoteLink[]>([])
  const [assessmentInvitations, setAssessmentInvitations] = useState<AssessmentInvitation[]>([])
  const [assessmentImports, setAssessmentImports] = useState<AssessmentImport[]>([])
  const [assessmentPublications, setAssessmentPublications] = useState<AssessmentPublication[]>([])
  const [outcomeResults, setOutcomeResults] = useState<OutcomeResult[]>([])
  const [diagnoses, setDiagnoses] = useState<ClinicalDiagnosis[]>([])
  const [attachments, setAttachments] = useState<ClinicalAttachment[]>([])
  const [restrictions, setRestrictions] = useState<ClinicalRestriction[]>([])
  const [publications, setPublications] = useState<ClinicalPublication[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState(searchParams.get('patient') ?? '')
  const [selectedSection, setSelectedSection] = useState<ClinicalSection>('overview')
  const [selectedEncounterId, setSelectedEncounterId] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [encounterForm, setEncounterForm] = useState<EncounterForm>(emptyEncounterForm)
  const [noteForm, setNoteForm] = useState<NoteForm>(emptyNoteForm)
  const [amendmentReason, setAmendmentReason] = useState('')
  const [amendmentText, setAmendmentText] = useState('')
  const [amendmentJson, setAmendmentJson] = useState('{}')
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm)
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoalForm)
  const [goalReviewText, setGoalReviewText] = useState('')
  const [goalReviewRating, setGoalReviewRating] = useState('')
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisForm>(emptyDiagnosisForm)
  const [attachmentForm, setAttachmentForm] = useState<AttachmentForm>(emptyAttachmentForm)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [publicationForm, setPublicationForm] = useState<PublicationForm>(emptyPublicationForm)

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  )
  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null,
    [encounters, selectedEncounterId],
  )
  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )
  const selectedVersions = useMemo(
    () => noteVersions.filter((version) => version.clinical_note_id === selectedNoteId).sort((left, right) => right.version_number - left.version_number),
    [noteVersions, selectedNoteId],
  )
  const selectedLatestVersion = selectedVersions[0] ?? null
  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId])
  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === selectedGoalId) ?? null, [goals, selectedGoalId])
  const selectedAssessment = useMemo(() => assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null, [assessments, selectedAssessmentId])
  const selectedPatientBookings = bookings.filter((booking) => booking.patient_id === selectedPatientId)
  const selectedPatientSessions = sessions.filter((session) => session.patient_id === selectedPatientId)
  const selectedPatientRestrictedCount = restrictions.filter((restriction) => restriction.patient_id === selectedPatientId && restriction.restriction_status === 'active').length

  const filteredPatients = useMemo(() => {
    const search = patientSearch.trim().toLowerCase()
    return patients.filter((patient) => {
      if (!search) return true
      return formatPatientName(patient).toLowerCase().includes(search)
        || (patient.patient_number ?? '').toLowerCase().includes(search)
        || (patient.active_icd10_code ?? '').toLowerCase().includes(search)
    })
  }, [patientSearch, patients])

  useEffect(() => {
    const patientId = searchParams.get('patient') ?? ''
    if (patientId && patientId !== selectedPatientId) setSelectedPatientId(patientId)
  }, [searchParams, selectedPatientId])

  const clearPatientClinicalState = () => {
    setBookings([])
    setSessions([])
    setEncounters([])
    setNotes([])
    setNoteVersions([])
    setAmendments([])
    setStructuredResponses([])
    setDraftStates([])
    setCopyForwardEvents([])
    setPlans([])
    setGoals([])
    setGoalReviews([])
    setAssessments([])
    setOutcomeResults([])
    setAssessmentDraftStates([])
    setAssessmentResponses([])
    setAssessmentScoreComponents([])
    setAssessmentInterpretations([])
    setAssessmentAmendments([])
    setAssessmentRepeatedSeries([])
    setAssessmentSeriesMembers([])
    setAssessmentGoalLinks([])
    setAssessmentNoteLinks([])
    setAssessmentInvitations([])
    setAssessmentImports([])
    setAssessmentPublications([])
    setDiagnoses([])
    setAttachments([])
    setRestrictions([])
    setPublications([])
  }

  const loadSelectedPatientClinicalData = async (patientId: string) => {
    if (!activeTenant?.id || !supabase || !patientId) {
      clearPatientClinicalState()
      return
    }

    const tenantId = activeTenant.id
    const client = supabase
    const [
      bookingsResult,
      sessionsResult,
      encountersResult,
      notesResult,
      plansResult,
      goalsResult,
      assessmentsResult,
      resultsResult,
      diagnosesResult,
      attachmentsResult,
      restrictionsResult,
      publicationsResult,
    ] = await Promise.all([
      client.from('bookings').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('start_at', { ascending: false }),
      client.from('sessions').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('scheduled_start_at', { ascending: false }),
      client.from('clinical_encounters').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('occurred_at', { ascending: false }),
      client.from('clinical_notes').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('updated_at', { ascending: false }),
      client.from('treatment_plans').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('updated_at', { ascending: false }),
      client.from('clinical_goals').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('updated_at', { ascending: false }),
      client.from('clinical_assessments').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('assessment_date', { ascending: false }),
      client.from('outcome_measure_results').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('result_date', { ascending: false }),
      client.from('clinical_diagnoses').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
      client.from('clinical_attachments').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
      client.from('clinical_record_restrictions').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('applied_at', { ascending: false }),
      client.from('clinical_patient_link_publications').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
    ])

    const patientScopedError = [
      bookingsResult.error,
      sessionsResult.error,
      encountersResult.error,
      notesResult.error,
      plansResult.error,
      goalsResult.error,
      assessmentsResult.error,
      resultsResult.error,
      diagnosesResult.error,
      attachmentsResult.error,
      restrictionsResult.error,
      publicationsResult.error,
    ].find(Boolean)

    if (patientScopedError) throw patientScopedError

    const noteIds = (notesResult.data ?? []).map((note) => note.id)
    const goalIds = (goalsResult.data ?? []).map((goal) => goal.id)

    const [versionsResult, amendmentsResult, goalReviewsResult] = await Promise.all([
      noteIds.length
        ? client.from('clinical_note_versions').select('*').eq('tenant_id', tenantId).in('clinical_note_id', noteIds).is('deleted_at', null).order('version_number', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      noteIds.length
        ? client.from('clinical_note_amendments').select('*').eq('tenant_id', tenantId).in('clinical_note_id', noteIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      goalIds.length
        ? client.from('clinical_goal_reviews').select('*').eq('tenant_id', tenantId).in('clinical_goal_id', goalIds).is('deleted_at', null).order('reviewed_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    const dependentError = [versionsResult.error, amendmentsResult.error, goalReviewsResult.error].find(Boolean)
    if (dependentError) throw dependentError

    const noteVersionIds = (versionsResult.data ?? []).map((version) => version.id)
    const [structuredResponsesResult, draftStatesResult, copyForwardEventsResult] = await Promise.all([
      noteVersionIds.length
        ? client.from('clinical_note_structured_responses').select('*').eq('tenant_id', tenantId).in('clinical_note_version_id', noteVersionIds).is('deleted_at', null).order('saved_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      noteVersionIds.length
        ? client.from('clinical_note_draft_states').select('*').eq('tenant_id', tenantId).in('clinical_note_version_id', noteVersionIds).is('deleted_at', null).order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      noteVersionIds.length
        ? client.from('clinical_note_copy_forward_events').select('*').eq('tenant_id', tenantId).in('target_clinical_note_version_id', noteVersionIds).is('deleted_at', null).order('copied_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    const documentationError = [structuredResponsesResult.error, draftStatesResult.error, copyForwardEventsResult.error].find(Boolean)
    if (documentationError) throw documentationError

    setBookings((bookingsResult.data ?? []) as BookingRow[])
    setSessions((sessionsResult.data ?? []) as SessionRow[])
    setEncounters((encountersResult.data ?? []) as unknown as ClinicalEncounter[])
    setNotes((notesResult.data ?? []) as unknown as ClinicalNote[])
    setNoteVersions((versionsResult.data ?? []) as unknown as ClinicalNoteVersion[])
    setAmendments((amendmentsResult.data ?? []) as unknown as ClinicalNoteAmendment[])
    setStructuredResponses((structuredResponsesResult.data ?? []) as unknown as ClinicalStructuredResponse[])
    setDraftStates((draftStatesResult.data ?? []) as unknown as ClinicalDraftState[])
    setCopyForwardEvents((copyForwardEventsResult.data ?? []) as unknown as ClinicalCopyForwardEvent[])
    setPlans((plansResult.data ?? []) as unknown as TreatmentPlan[])
    setGoals((goalsResult.data ?? []) as unknown as ClinicalGoal[])
    setGoalReviews((goalReviewsResult.data ?? []) as unknown as ClinicalGoalReview[])
    setAssessments((assessmentsResult.data ?? []) as unknown as ClinicalAssessment[])
    setOutcomeResults((resultsResult.data ?? []) as unknown as OutcomeResult[])

    const assessmentRows = (assessmentsResult.data ?? []) as Array<{ id: string }>
    const assessmentIds = assessmentRows.map((assessment) => assessment.id)

    const [
      assessmentDraftStatesResult,
      assessmentResponsesResult,
      assessmentScoreComponentsResult,
      assessmentInterpretationsResult,
      assessmentAmendmentsResult,
      repeatedSeriesResult,
      seriesMembersResult,
      assessmentGoalLinksResult,
      assessmentNoteLinksResult,
      assessmentInvitationsResult,
      assessmentImportsResult,
      assessmentPublicationsResult,
    ] = await Promise.all([
      assessmentIds.length
        ? client.from('clinical_assessment_draft_states').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('clinical_assessment_item_responses').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_score_components').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_practitioner_interpretations').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_amendments').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      client.from('assessment_repeated_measure_series').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId).is('deleted_at', null).order('opened_at', { ascending: false }),
      assessmentIds.length
        ? client.from('assessment_series_members').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_treatment_goal_links').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_clinical_note_links').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_patient_invitations').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_external_imports').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('imported_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? client.from('assessment_patient_link_publications').select('*').eq('tenant_id', tenantId).in('clinical_assessment_id', assessmentIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    const assessmentDependentError = [
      assessmentDraftStatesResult.error,
      assessmentResponsesResult.error,
      assessmentScoreComponentsResult.error,
      assessmentInterpretationsResult.error,
      assessmentAmendmentsResult.error,
      repeatedSeriesResult.error,
      seriesMembersResult.error,
      assessmentGoalLinksResult.error,
      assessmentNoteLinksResult.error,
      assessmentInvitationsResult.error,
      assessmentImportsResult.error,
      assessmentPublicationsResult.error,
    ].find(Boolean)
    if (assessmentDependentError) throw assessmentDependentError

    setAssessmentDraftStates((assessmentDraftStatesResult.data ?? []) as unknown as AssessmentDraftState[])
    setAssessmentResponses((assessmentResponsesResult.data ?? []) as unknown as AssessmentResponse[])
    setAssessmentScoreComponents((assessmentScoreComponentsResult.data ?? []) as unknown as AssessmentScoreComponent[])
    setAssessmentInterpretations((assessmentInterpretationsResult.data ?? []) as unknown as AssessmentInterpretation[])
    setAssessmentAmendments((assessmentAmendmentsResult.data ?? []) as unknown as AssessmentAmendment[])
    setAssessmentRepeatedSeries((repeatedSeriesResult.data ?? []) as unknown as RepeatedMeasureSeries[])
    setAssessmentSeriesMembers((seriesMembersResult.data ?? []) as unknown as RepeatedMeasureMember[])
    setAssessmentGoalLinks((assessmentGoalLinksResult.data ?? []) as unknown as AssessmentGoalLink[])
    setAssessmentNoteLinks((assessmentNoteLinksResult.data ?? []) as unknown as AssessmentNoteLink[])
    setAssessmentInvitations((assessmentInvitationsResult.data ?? []) as unknown as AssessmentInvitation[])
    setAssessmentImports((assessmentImportsResult.data ?? []) as unknown as AssessmentImport[])
    setAssessmentPublications((assessmentPublicationsResult.data ?? []) as unknown as AssessmentPublication[])

    setDiagnoses((diagnosesResult.data ?? []) as unknown as ClinicalDiagnosis[])
    setAttachments((attachmentsResult.data ?? []) as unknown as ClinicalAttachment[])
    setRestrictions((restrictionsResult.data ?? []) as unknown as ClinicalRestriction[])
    setPublications((publicationsResult.data ?? []) as unknown as ClinicalPublication[])
  }

  useEffect(() => {
    if (!activeTenant?.id || !canViewClinical || !supabase) {
      setLoading(false)
      setLoadError(!canViewClinical ? 'Clinical access is not available for your current role.' : 'Clinical workspace is not ready.')
      return
    }

    let isMounted = true
    const tenantId = activeTenant.id
    const client = supabase

    async function loadClinicalReferenceData() {
      setLoading(true)
      setLoadError('')
      setActionError('')
      setSuccessMessage('')
      clearPatientClinicalState()

      const [
        patientsResult,
        therapistsResult,
        templatesResult,
        templateVersionsResult,
        templateSectionsResult,
        templateFieldsResult,
        templateFieldOptionsResult,
        templateValidationRulesResult,
        templateCalculationRulesResult,
        definitionsResult,
        assessmentDefinitionVersionsResult,
        assessmentSectionsResult,
        assessmentItemsResult,
        assessmentItemOptionsResult,
        assessmentAssignmentsResult,
      ] = await Promise.all([
        client.from('patients').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('last_name'),
        client.from('therapist_profiles').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('display_name'),
        client.from('clinical_note_templates').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('name'),
        client.from('clinical_note_template_versions').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).in('version_status', ['active', 'retired']).order('version_number', { ascending: false }),
        client.from('clinical_template_sections').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('display_order'),
        client.from('clinical_template_fields').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('display_order'),
        client.from('clinical_template_field_options').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('display_order'),
        client.from('clinical_template_validation_rules').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).eq('is_active', true).order('created_at'),
        client.from('clinical_template_calculation_rules').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('created_at'),
        client.from('outcome_measure_definitions').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).eq('definition_status', 'active').order('name'),
        client.from('assessment_definition_versions').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).eq('version_status', 'active').order('version_number', { ascending: false }),
        client.from('assessment_definition_sections').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('display_order'),
        client.from('assessment_definition_items').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('display_order'),
        client.from('assessment_definition_item_options').select('*').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).is('deleted_at', null).order('display_order'),
        client.from('assessment_assignments').select('*').eq('tenant_id', tenantId).is('deleted_at', null).eq('is_active', true).order('assignment_priority'),
      ])

      const error = [
        patientsResult.error,
        therapistsResult.error,
        templatesResult.error,
        templateVersionsResult.error,
        templateSectionsResult.error,
        templateFieldsResult.error,
        templateFieldOptionsResult.error,
        templateValidationRulesResult.error,
        templateCalculationRulesResult.error,
        definitionsResult.error,
        assessmentDefinitionVersionsResult.error,
        assessmentSectionsResult.error,
        assessmentItemsResult.error,
        assessmentItemOptionsResult.error,
        assessmentAssignmentsResult.error,
      ].find(Boolean)

      if (!isMounted) return

      if (error) {
        setLoadError(safeClinicalError(error))
        setLoading(false)
        return
      }

      const patientRows = (patientsResult.data ?? []) as PatientRow[]
      const requestedPatientId = searchParams.get('patient')
      const requestedPatientIsValid = requestedPatientId ? patientRows.some((patient) => patient.id === requestedPatientId) : true

      setPatients(patientRows)
      setTherapists((therapistsResult.data ?? []) as TherapistRow[])
      setTemplates((templatesResult.data ?? []) as unknown as ClinicalTemplate[])
      setTemplateVersions((templateVersionsResult.data ?? []) as unknown as ClinicalTemplateVersion[])
      setTemplateSections((templateSectionsResult.data ?? []) as unknown as ClinicalTemplateSection[])
      setTemplateFields((templateFieldsResult.data ?? []) as unknown as ClinicalTemplateField[])
      setTemplateFieldOptions((templateFieldOptionsResult.data ?? []) as unknown as ClinicalTemplateFieldOption[])
      setTemplateValidationRules((templateValidationRulesResult.data ?? []) as unknown as ClinicalTemplateValidationRule[])
      setTemplateCalculationRules((templateCalculationRulesResult.data ?? []) as unknown as ClinicalTemplateCalculationRule[])
      setOutcomeDefinitions((definitionsResult.data ?? []) as unknown as AssessmentDefinition[])
      setAssessmentDefinitionVersions((assessmentDefinitionVersionsResult.data ?? []) as unknown as AssessmentDefinitionVersion[])
      setAssessmentSections((assessmentSectionsResult.data ?? []) as unknown as AssessmentDefinitionSection[])
      setAssessmentItems((assessmentItemsResult.data ?? []) as unknown as AssessmentDefinitionItem[])
      setAssessmentItemOptions((assessmentItemOptionsResult.data ?? []) as unknown as AssessmentDefinitionItemOption[])
      setAssessmentAssignments((assessmentAssignmentsResult.data ?? []) as unknown as AssessmentAssignment[])

      if (!requestedPatientIsValid) {
        setSelectedPatientId('')
        setActionError('Requested patient is not available in this workspace.')
        setLoading(false)
        return
      }

      setSelectedPatientId(requestedPatientId || patientRows[0]?.id || '')
      setLoading(false)
    }

    void loadClinicalReferenceData()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, canViewClinical])

  useEffect(() => {
    if (!selectedPatientId) {
      clearPatientClinicalState()
      return
    }

    let isMounted = true
    setActionError('')

    async function loadSelectedPatient() {
      try {
        await loadSelectedPatientClinicalData(selectedPatientId)
      } catch (error) {
        if (isMounted) setActionError(safeClinicalError(error))
      }
    }

    void loadSelectedPatient()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, selectedPatientId])

  const reloadClinicalData = async () => {
    if (!selectedPatientId) return
    try {
      await loadSelectedPatientClinicalData(selectedPatientId)
    } catch (error) {
      setActionError(safeClinicalError(error))
    }
  }

  const selectPatient = (patientId: string) => {
    setSelectedPatientId(patientId)
    setSelectedEncounterId('')
    setSelectedNoteId('')
    setSelectedPlanId('')
    setSelectedGoalId('')
    setSelectedAssessmentId('')
    setSearchParams(patientId ? { patient: patientId } : {})
  }

  const runClinicalAction = async (action: () => Promise<void>, success: string) => {
    if (!canManageClinical || saving) return
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await action()
      await reloadClinicalData()
      setSuccessMessage(success)
    } catch (error) {
      setActionError(safeClinicalError(error))
    } finally {
      setSaving(false)
    }
  }

  const createEncounter = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      const result = await client.from('clinical_encounters').insert({
        tenant_id: activeTenant.id,
        patient_id: selectedPatientId,
        booking_id: emptyToNull(encounterForm.booking_id),
        session_id: emptyToNull(encounterForm.session_id),
        responsible_therapist_profile_id: emptyToNull(encounterForm.responsible_therapist_profile_id),
        encounter_type: encounterForm.encounter_type,
        encounter_status: encounterForm.encounter_status,
        clinical_visibility: encounterForm.clinical_visibility,
        occurred_at: encounterForm.occurred_at || null,
        summary: emptyToNull(encounterForm.summary),
        restricted_reason: emptyToNull(encounterForm.restricted_reason),
        created_by_profile_id: profile?.id ?? null,
        updated_by_profile_id: profile?.id ?? null,
        metadata: {},
      }).select().single()
      if (result.error) throw result.error
      setEncounterForm(emptyEncounterForm)
      setSelectedEncounterId((result.data as unknown as ClinicalEncounter).id)
    }, 'Clinical encounter created.')
  }

  const createDraftNote = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      const structuredContent = parseJsonObject(noteForm.structured_content, 'Structured content')
      const result = await client.rpc('create_clinical_note_draft', {
        target_tenant_id: activeTenant.id,
        target_patient_id: selectedPatientId,
        clinical_encounter_id_input: emptyToNull(noteForm.clinical_encounter_id) ?? undefined,
        note_type_input: noteForm.note_type,
        note_title_input: emptyToNull(noteForm.note_title) ?? undefined,
        clinical_note_template_version_id_input: emptyToNull(noteForm.clinical_note_template_version_id) ?? undefined,
        free_text_content_input: emptyToNull(noteForm.free_text_content) ?? undefined,
        structured_content_input: structuredContent,
        clinical_visibility_input: noteForm.clinical_visibility,
        patient_visible_allowed_input: noteForm.patient_visible_allowed,
        is_restricted_input: noteForm.is_restricted,
        idempotency_key_input: `clinical-draft-${Date.now()}`,
      })
      if (result.error) throw result.error
      setNoteForm(emptyNoteForm)
      setSelectedNoteId(result.data?.[0]?.clinical_note_id ?? '')
    }, 'Draft clinical note created.')
  }

  const createDocumentationDraft = async (input: CreateClinicalDraftInput) => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('create_clinical_note_draft', {
        target_tenant_id: activeTenant.id,
        target_patient_id: selectedPatientId,
        clinical_encounter_id_input: input.encounterId ?? undefined,
        note_type_input: input.noteType,
        note_title_input: emptyToNull(input.noteTitle) ?? undefined,
        clinical_note_template_version_id_input: input.templateVersionId ?? undefined,
        free_text_content_input: emptyToNull(input.freeText) ?? undefined,
        structured_content_input: input.structuredContent,
        clinical_visibility_input: input.clinicalVisibility,
        patient_visible_allowed_input: input.patientVisibleAllowed,
        is_restricted_input: input.isRestricted,
        idempotency_key_input: `clinical-doc-${selectedPatientId}-${Date.now()}`,
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSelectedNoteId(result.data?.[0]?.clinical_note_id ?? '')
      setSuccessMessage('Draft clinical documentation created.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const updateDraftVersion = async () => {
    if (!activeTenant?.id || !supabase || !selectedLatestVersion || selectedLatestVersion.version_status !== 'draft') return
    const client = supabase
    await runClinicalAction(async () => {
      const structuredContent = parseJsonObject(noteForm.structured_content, 'Structured content')
      const result = await client.from('clinical_note_versions').update({
        free_text_content: emptyToNull(noteForm.free_text_content),
        structured_content: structuredContent,
        clinical_note_template_version_id: emptyToNull(noteForm.clinical_note_template_version_id),
        change_reason: 'Draft edited from Clinical workspace',
      }).eq('id', selectedLatestVersion.id).eq('tenant_id', activeTenant.id)
      if (result.error) throw result.error
    }, 'Draft note version saved.')
  }

  const finaliseNoteVersion = async () => {
    if (!supabase || !selectedLatestVersion || selectedLatestVersion.version_status !== 'draft') return
    const client = supabase
    await runClinicalAction(async () => {
      const validation = await client.rpc('validate_clinical_note_version_ready_for_finalisation', { target_note_version_id: selectedLatestVersion.id })
      if (validation.error) throw validation.error
      const validationData = validation.data as { valid?: boolean; errors?: unknown[] } | null
      if (validationData && validationData.valid === false) {
        throw new Error((validationData.errors ?? ['Clinical note is not ready for finalisation']).join(', '))
      }
      const result = await client.rpc('finalise_clinical_note_version', { target_note_version_id: selectedLatestVersion.id })
      if (result.error) throw result.error
    }, 'Clinical note finalised.')
  }

  const saveDocumentationFreeText = async (versionId: string, freeText: string, expectedDraftLockVersion: number | null) => {
    if (!activeTenant?.id || !supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('save_clinical_note_free_text_draft', {
        target_note_version_id: versionId,
        free_text_content_input: freeText,
        expected_draft_lock_version: expectedDraftLockVersion ?? undefined,
        idempotency_key_input: `free-text-${versionId}-${Date.now()}`,
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Draft free text saved.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const saveStructuredResponse = async (input: {
    field: ClinicalTemplateField
    payload: Json
    expectedLockVersion: number | null
  }) => {
    if (!supabase || saving || !selectedLatestVersion) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('save_clinical_note_structured_response', {
        target_note_version_id: selectedLatestVersion.id,
        target_template_field_id: input.field.id,
        response_payload: input.payload,
        expected_lock_version: input.expectedLockVersion ?? undefined,
        idempotency_key_input: `structured-${input.field.id}-${Date.now()}`,
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Structured response saved.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const validateNoteVersion = async (versionId: string) => {
    if (!supabase) return null
    const result = await supabase.rpc('validate_clinical_note_version_ready_for_finalisation', { target_note_version_id: versionId })
    if (result.error) throw result.error
    return result.data
  }

  const copyForwardResponse = async (sourceResponseId: string, targetVersionId: string, targetFieldId: string) => {
    if (!supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('copy_forward_clinical_response', {
        source_response_id_input: sourceResponseId,
        target_note_version_id: targetVersionId,
        target_template_field_id: targetFieldId,
        copy_reason_input: 'Selective copy-forward from Clinical documentation workspace',
        idempotency_key_input: `copy-forward-${sourceResponseId}-${Date.now()}`,
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Clinical field copied forward.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const signNoteVersion = async () => {
    if (!supabase || !selectedLatestVersion || selectedLatestVersion.version_status !== 'finalised') return
    const client = supabase
    await runClinicalAction(async () => {
      const result = await client.rpc('sign_clinical_note_version', {
        target_note_version_id: selectedLatestVersion.id,
        signature_statement_input: 'Signed electronically in AlliDesk.',
      })
      if (result.error) throw result.error
    }, 'Clinical note signed.')
  }

  const amendNote = async () => {
    if (!supabase || !selectedNote || !selectedLatestVersion || !isImmutableNoteStatus(selectedNote.note_status)) return
    const client = supabase
    await runClinicalAction(async () => {
      const amendmentStructured = parseJsonObject(amendmentJson, 'Amendment structured content')
      const result = await client.rpc('amend_clinical_note', {
        target_clinical_note_id: selectedNote.id,
        target_note_version_id: selectedLatestVersion.id,
        amendment_reason_input: amendmentReason,
        amendment_free_text_input: emptyToNull(amendmentText) ?? undefined,
        amendment_structured_content_input: amendmentStructured,
      })
      if (result.error) throw result.error
      setAmendmentReason('')
      setAmendmentText('')
      setAmendmentJson('{}')
    }, 'Clinical note amendment recorded.')
  }

  const createPlan = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      if (!planForm.plan_title.trim()) throw new Error('Treatment plan title is required.')
      const result = await client.from('treatment_plans').insert({
        tenant_id: activeTenant.id,
        patient_id: selectedPatientId,
        plan_title: planForm.plan_title.trim(),
        plan_status: planForm.plan_status,
        clinical_focus: emptyToNull(planForm.clinical_focus),
        review_due_date: planForm.review_due_date || null,
        patient_visible_allowed: planForm.patient_visible_allowed,
        created_by_profile_id: profile?.id ?? null,
        updated_by_profile_id: profile?.id ?? null,
        metadata: {},
      }).select().single()
      if (result.error) throw result.error
      setPlanForm(emptyPlanForm)
      setSelectedPlanId((result.data as unknown as TreatmentPlan).id)
    }, 'Treatment plan created.')
  }

  const createGoal = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      if (!goalForm.goal_text.trim()) throw new Error('Goal text is required.')
      const result = await client.from('clinical_goals').insert({
        tenant_id: activeTenant.id,
        patient_id: selectedPatientId,
        treatment_plan_id: emptyToNull(goalForm.treatment_plan_id),
        goal_text: goalForm.goal_text.trim(),
        goal_domain: emptyToNull(goalForm.goal_domain),
        priority: goalForm.priority,
        review_due_date: goalForm.review_due_date || null,
        patient_visible_allowed: goalForm.patient_visible_allowed,
        created_by_profile_id: profile?.id ?? null,
        updated_by_profile_id: profile?.id ?? null,
        metadata: {},
      }).select().single()
      if (result.error) throw result.error
      setGoalForm(emptyGoalForm)
      setSelectedGoalId((result.data as unknown as ClinicalGoal).id)
    }, 'Clinical goal created.')
  }

  const appendGoalReview = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || !selectedGoal) return
    const client = supabase
    await runClinicalAction(async () => {
      const rating = goalReviewRating ? Number(goalReviewRating) : null
      if (rating !== null && (rating < 0 || rating > 100)) throw new Error('Progress rating must be between 0 and 100.')
      const result = await client.from('clinical_goal_reviews').insert({
        tenant_id: activeTenant.id,
        patient_id: selectedPatientId,
        clinical_goal_id: selectedGoal.id,
        progress_rating: rating,
        evidence_summary: emptyToNull(goalReviewText),
        reviewed_by_profile_id: profile?.id ?? null,
        metadata: {},
      })
      if (result.error) throw result.error
      setGoalReviewText('')
      setGoalReviewRating('')
    }, 'Goal review recorded.')
  }

  const startAssessmentDraft = async (input: StartAssessmentInput) => {
    if (!activeTenant?.id || !supabase || !selectedPatientId || saving) return null
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('create_clinical_assessment_draft', {
        target_tenant_id: activeTenant.id,
        target_patient_id: selectedPatientId,
        assessment_definition_version_id_input: input.assessmentDefinitionVersionId,
        clinical_encounter_id_input: input.clinicalEncounterId ?? undefined,
        booking_id_input: input.bookingId ?? undefined,
        session_id_input: input.sessionId ?? undefined,
        treatment_plan_id_input: input.treatmentPlanId ?? undefined,
        clinical_goal_id_input: input.clinicalGoalId ?? undefined,
        assessment_phase_input: input.assessmentPhase ?? undefined,
        idempotency_key_input: input.idempotencyKey,
      })
      if (result.error) throw result.error
      const createdId = result.data?.[0]?.clinical_assessment_id ?? null
      await reloadClinicalData()
      if (createdId) setSelectedAssessmentId(createdId)
      setSuccessMessage('Assessment draft created.')
      return createdId
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const saveAssessmentResponse = async (input: SaveAssessmentResponseInput) => {
    if (!supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('save_clinical_assessment_response', {
        target_clinical_assessment_id: input.assessmentId,
        target_assessment_definition_item_id: input.item.id,
        response_payload: input.payload,
        repeat_index_input: input.repeatIndex,
        expected_lock_version: input.expectedLockVersion ?? undefined,
        idempotency_key_input: input.idempotencyKey,
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Assessment response saved.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const validateAssessment = async (assessmentId: string) => {
    if (!supabase) return null
    const result = await supabase.rpc('validate_clinical_assessment_ready_for_completion', {
      target_clinical_assessment_id: assessmentId,
    })
    if (result.error) throw result.error
    return result.data
  }

  const completeAssessment = async (assessmentId: string) => {
    if (!supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('complete_clinical_assessment', { target_clinical_assessment_id: assessmentId })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Assessment completed.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const finaliseAssessment = async (assessmentId: string) => {
    if (!supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('finalise_clinical_assessment', { target_clinical_assessment_id: assessmentId })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Assessment finalised.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const signAssessment = async (assessmentId: string) => {
    if (!supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('sign_clinical_assessment', {
        target_clinical_assessment_id: assessmentId,
        signature_statement_input: 'Signed electronically in AlliDesk.',
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Assessment signed.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const amendAssessment = async (input: AmendAssessmentInput) => {
    if (!supabase || saving) return
    const client = supabase
    setSaving(true)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await client.rpc('amend_clinical_assessment', {
        target_clinical_assessment_id: input.assessmentId,
        amendment_reason_input: input.reason,
        target_record_type_input: input.targetRecordType,
        target_record_id_input: input.targetRecordId ?? undefined,
        corrected_snapshot_input: input.correctedSnapshot,
      })
      if (result.error) throw result.error
      await reloadClinicalData()
      setSuccessMessage('Assessment amendment recorded.')
    } catch (error) {
      const message = safeClinicalError(error)
      setActionError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }

  const createDiagnosis = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      if (!diagnosisForm.code.trim()) throw new Error('Diagnosis code is required.')
      const result = await client.from('clinical_diagnoses').insert({
        tenant_id: activeTenant.id,
        patient_id: selectedPatientId,
        coding_system: diagnosisForm.coding_system,
        code: diagnosisForm.code.trim(),
        label: emptyToNull(diagnosisForm.label),
        diagnosis_status: diagnosisForm.diagnosis_status,
        is_primary: diagnosisForm.is_primary,
        onset_date: diagnosisForm.onset_date || null,
        resolved_date: diagnosisForm.resolved_date || null,
        patient_visible_allowed: diagnosisForm.patient_visible_allowed,
        created_by_profile_id: profile?.id ?? null,
        updated_by_profile_id: profile?.id ?? null,
        metadata: {},
      })
      if (result.error) throw result.error
      setDiagnosisForm(emptyDiagnosisForm)
    }, 'Clinical diagnosis saved.')
  }

  const createAttachmentMetadata = async () => {
    if (!activeTenant?.id || !supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      if (!attachmentForm.file_name.trim() && !attachmentFile) throw new Error('File name is required.')

      if (attachmentFile) {
        await uploadDocumentFile(client, {
          tenantId: activeTenant.id,
          bucketId: 'clinical-attachments',
          patientId: selectedPatientId,
          clinicalNoteId: emptyToNull(attachmentForm.clinical_note_id),
          documentCategory: 'clinical_attachment',
          file: attachmentFile,
          sharingScope: attachmentForm.patient_visible_allowed ? 'patient_link' : 'internal',
          metadata: {
            attachment_category: attachmentForm.attachment_category,
            clinical_encounter_id: emptyToNull(attachmentForm.clinical_encounter_id),
            clinical_assessment_id: emptyToNull(attachmentForm.clinical_assessment_id),
            description: emptyToNull(attachmentForm.description),
            is_restricted: attachmentForm.is_restricted,
            patient_visible_allowed: attachmentForm.patient_visible_allowed,
          },
        })
      } else {
        const result = await client.from('clinical_attachments').insert({
          tenant_id: activeTenant.id,
          patient_id: selectedPatientId,
          clinical_encounter_id: emptyToNull(attachmentForm.clinical_encounter_id),
          clinical_note_id: emptyToNull(attachmentForm.clinical_note_id),
          clinical_assessment_id: emptyToNull(attachmentForm.clinical_assessment_id),
          attachment_category: attachmentForm.attachment_category,
          file_name: attachmentForm.file_name.trim(),
          mime_type: emptyToNull(attachmentForm.mime_type),
          file_size_bytes: attachmentForm.file_size_bytes ? Number(attachmentForm.file_size_bytes) : null,
          description: emptyToNull(attachmentForm.description),
          is_restricted: attachmentForm.is_restricted,
          patient_visible_allowed: attachmentForm.patient_visible_allowed,
          uploaded_by_profile_id: profile?.id ?? null,
          metadata: {},
        })
        if (result.error) throw result.error
      }
      setAttachmentForm(emptyAttachmentForm)
      setAttachmentFile(null)
    }, attachmentFile ? 'Clinical attachment uploaded.' : 'Attachment metadata recorded.')
  }

  const publishRecord = async () => {
    if (!supabase || !selectedPatientId) return
    const client = supabase
    await runClinicalAction(async () => {
      const result = await client.rpc('publish_clinical_record_to_patient_link', {
        target_record_type: publicationForm.record_type,
        target_record_id: publicationForm.record_id,
        safe_title_input: publicationForm.safe_title,
        safe_summary_input: emptyToNull(publicationForm.safe_summary) ?? undefined,
        patient_link_id_input: undefined,
      })
      if (result.error) throw result.error
      setPublicationForm(emptyPublicationForm)
    }, 'Clinical publication metadata created.')
  }

  const revokePublication = async (publication: ClinicalPublication) => {
    if (!supabase) return
    const client = supabase
    const reason = window.confirm('Revoke this Patient Link clinical publication?')
    if (!reason) return
    await runClinicalAction(async () => {
      const result = await client.rpc('revoke_clinical_patient_link_publication', {
        target_publication_id: publication.id,
        revoke_reason_input: 'Revoked from Clinical workspace',
      })
      if (result.error) throw result.error
    }, 'Clinical publication revoked.')
  }

  useEffect(() => {
    if (!selectedLatestVersion) return
    setNoteForm((current) => ({
      ...current,
      clinical_note_template_version_id: selectedLatestVersion.clinical_note_template_version_id ?? '',
      free_text_content: selectedLatestVersion.free_text_content ?? '',
      structured_content: JSON.stringify(selectedLatestVersion.structured_content ?? {}, null, 2),
    }))
  }, [selectedLatestVersion?.id])

  const applyTemplateVersion = (templateVersionId: string) => {
    const version = templateVersions.find((item) => item.id === templateVersionId)
    setNoteForm((current) => ({
      ...current,
      clinical_note_template_version_id: templateVersionId,
      free_text_content: version?.default_free_text ?? current.free_text_content,
      structured_content: JSON.stringify(version?.default_structured_content ?? {}, null, 2),
      clinical_visibility: version?.visibility_default ?? current.clinical_visibility,
    }))
  }

  if (loading) {
    return <LoadingState title="Loading Clinical Engine" description="Preparing tenant clinical records and patient context." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Clinical workspace unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  const patientEncounters = encounters.filter((item) => item.patient_id === selectedPatientId)
  const patientNotes = notes.filter((item) => item.patient_id === selectedPatientId)
  const patientPlans = plans.filter((item) => item.patient_id === selectedPatientId)
  const patientGoals = goals.filter((item) => item.patient_id === selectedPatientId)
  const patientAssessments = assessments.filter((item) => item.patient_id === selectedPatientId)
  const patientResults = outcomeResults.filter((item) => item.patient_id === selectedPatientId)
  const patientDiagnoses = diagnoses.filter((item) => item.patient_id === selectedPatientId)
  const patientAttachments = attachments.filter((item) => item.patient_id === selectedPatientId)
  const patientPublications = publications.filter((item) => item.patient_id === selectedPatientId)
  const patientRestrictions = restrictions.filter((item) => item.patient_id === selectedPatientId && item.restriction_status === 'active')

  return (
    <div className="clinical-engine-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Clinical Engine</span>
          <h3>{selectedPatient ? formatPatientName(selectedPatient) : activeTenant?.practice_name ?? 'Clinical workspace'}</h3>
          <p>
            Clinical records are tenant-owned, practitioner-accountable and versioned. Finalised or signed note content is immutable; amendments and Patient Link publication use protected RPCs.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{patientNotes.length} notes</StatusBadge>
          <StatusBadge tone={selectedPatientRestrictedCount > 0 ? 'warning' : 'neutral'}>{selectedPatientRestrictedCount} restricted</StatusBadge>
          {!canManageClinical && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="practice-locations-layout clinical-workspace-layout">
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Patient context</span>
              <h3>Patients</h3>
            </div>
            <Link className="ui-button ui-button-secondary" to="/patients">Patient list</Link>
          </div>
          <SearchBar label="Search patients" value={patientSearch} placeholder="Name, number or ICD-10" onChange={setPatientSearch} />
          <div className="practice-location-cards">
            {filteredPatients.map((patient) => (
              <button
                className={selectedPatientId === patient.id ? 'active' : ''}
                type="button"
                onClick={() => selectPatient(patient.id)}
                key={patient.id}
              >
                <div>
                  <strong>{formatPatientName(patient)}</strong>
                  <span>{patient.patient_number || 'No patient number'} · ICD-10 {patient.active_icd10_code || 'not set'}</span>
                </div>
                <StatusBadge tone={patient.patient_status === 'active' ? 'success' : 'info'}>{formatLabel(patient.patient_status)}</StatusBadge>
              </button>
            ))}
          </div>
        </Card>

        <div className="practice-therapist-editor-stack">
          {!selectedPatient ? (
            <EmptyState title="Select a patient" description="Choose a patient to open the clinical workspace." />
          ) : (
            <>
              <Card className="patients-workspace-tabs-card">
                <div>
                  <span>Patient clinical workspace</span>
                  <h3>{formatPatientName(selectedPatient)}</h3>
                </div>
                <div className="patients-workspace-tabs">
                  {clinicalSections.map((section) => (
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
                  <span>Clinical overview</span>
                  <div className="patients-overview-grid">
                    <div><strong>{patientEncounters.length}</strong><span>Encounters</span></div>
                    <div><strong>{patientNotes.length}</strong><span>Clinical notes</span></div>
                    <div><strong>{patientPlans.length}</strong><span>Treatment plans</span></div>
                    <div><strong>{patientDiagnoses.filter((item) => item.diagnosis_status === 'active').length}</strong><span>Active diagnoses</span></div>
                  </div>
                  <div className="patients-foundation-grid">
                    <StatusBadge tone={patientRestrictions.length > 0 ? 'warning' : 'neutral'}>{patientRestrictions.length} restricted records</StatusBadge>
                    <StatusBadge tone="info">{patientAssessments.length} assessments</StatusBadge>
                    <StatusBadge tone="info">{patientPublications.filter((item) => item.publication_status === 'published').length} Patient Link publications</StatusBadge>
                  </div>
                </Card>
              )}

              {selectedSection === 'documentation' && (
                <ClinicalDocumentationWorkspace
                  patient={selectedPatient}
                  canManage={canManageClinical}
                  encounters={patientEncounters}
                  notes={patientNotes}
                  versions={noteVersions.filter((version) => patientNotes.some((note) => note.id === version.clinical_note_id))}
                  templates={templates}
                  templateVersions={templateVersions}
                  sections={templateSections}
                  fields={templateFields}
                  fieldOptions={templateFieldOptions}
                  validationRules={templateValidationRules}
                  calculationRules={templateCalculationRules}
                  responses={structuredResponses}
                  draftStates={draftStates}
                  copyForwardEvents={copyForwardEvents}
                  selectedNoteId={selectedNoteId}
                  saving={saving}
                  onSelectNote={setSelectedNoteId}
                  onCreateDraft={createDocumentationDraft}
                  onSaveFreeText={saveDocumentationFreeText}
                  onSaveStructuredResponse={saveStructuredResponse}
                  onValidate={validateNoteVersion}
                  onFinalise={finaliseNoteVersion}
                  onSign={signNoteVersion}
                  onCopyForward={copyForwardResponse}
                />
              )}

              {selectedSection === 'encounters' && (
                <ClinicalEncountersSection
                  canManage={canManageClinical}
                  encounters={patientEncounters}
                  bookings={selectedPatientBookings}
                  sessions={selectedPatientSessions}
                  therapists={therapists}
                  selectedEncounterId={selectedEncounterId}
                  selectedEncounter={selectedEncounter}
                  formState={encounterForm}
                  saving={saving}
                  onSelect={setSelectedEncounterId}
                  onChange={setEncounterForm}
                  onCreate={createEncounter}
                />
              )}

              {selectedSection === 'notes' && (
                <ClinicalNotesSection
                  canManage={canManageClinical}
                  notes={patientNotes}
                  versions={selectedVersions}
                  amendments={amendments.filter((item) => item.clinical_note_id === selectedNoteId)}
                  templates={templates}
                  templateVersions={templateVersions}
                  encounters={patientEncounters}
                  selectedNote={selectedNote}
                  selectedNoteId={selectedNoteId}
                  latestVersion={selectedLatestVersion}
                  formState={noteForm}
                  amendmentReason={amendmentReason}
                  amendmentText={amendmentText}
                  amendmentJson={amendmentJson}
                  saving={saving}
                  onSelect={setSelectedNoteId}
                  onChange={setNoteForm}
                  onTemplateChange={applyTemplateVersion}
                  onCreate={createDraftNote}
                  onSaveDraft={updateDraftVersion}
                  onFinalise={finaliseNoteVersion}
                  onSign={signNoteVersion}
                  onAmend={amendNote}
                  onAmendmentReasonChange={setAmendmentReason}
                  onAmendmentTextChange={setAmendmentText}
                  onAmendmentJsonChange={setAmendmentJson}
                />
              )}

              {selectedSection === 'plans' && (
                <PlansAndGoalsSection
                  canManage={canManageClinical}
                  plans={patientPlans}
                  goals={patientGoals}
                  goalReviews={goalReviews}
                  selectedPlanId={selectedPlanId}
                  selectedGoalId={selectedGoalId}
                  selectedPlan={selectedPlan}
                  selectedGoal={selectedGoal}
                  planForm={planForm}
                  goalForm={goalForm}
                  reviewText={goalReviewText}
                  reviewRating={goalReviewRating}
                  saving={saving}
                  onSelectPlan={setSelectedPlanId}
                  onSelectGoal={setSelectedGoalId}
                  onPlanChange={setPlanForm}
                  onGoalChange={setGoalForm}
                  onReviewTextChange={setGoalReviewText}
                  onReviewRatingChange={setGoalReviewRating}
                  onCreatePlan={createPlan}
                  onCreateGoal={createGoal}
                  onAppendReview={appendGoalReview}
                />
              )}

              {selectedSection === 'assessments' && (
                <ClinicalAssessmentWorkspace
                  patient={selectedPatient}
                  canManage={canManageClinical}
                  assessments={patientAssessments}
                  results={patientResults}
                  definitions={outcomeDefinitions}
                  definitionVersions={assessmentDefinitionVersions}
                  sections={assessmentSections}
                  items={assessmentItems}
                  itemOptions={assessmentItemOptions}
                  assignments={assessmentAssignments}
                  encounters={patientEncounters}
                  bookings={selectedPatientBookings}
                  sessions={selectedPatientSessions}
                  draftStates={assessmentDraftStates}
                  responses={assessmentResponses}
                  scoreComponents={assessmentScoreComponents}
                  interpretations={assessmentInterpretations}
                  amendments={assessmentAmendments}
                  repeatedSeries={assessmentRepeatedSeries}
                  seriesMembers={assessmentSeriesMembers}
                  goalLinks={assessmentGoalLinks}
                  noteLinks={assessmentNoteLinks}
                  invitations={assessmentInvitations}
                  imports={assessmentImports}
                  publications={assessmentPublications}
                  selectedAssessmentId={selectedAssessmentId}
                  saving={saving}
                  onSelectAssessment={setSelectedAssessmentId}
                  onStartAssessment={startAssessmentDraft}
                  onSaveResponse={saveAssessmentResponse}
                  onValidateAssessment={validateAssessment}
                  onCompleteAssessment={completeAssessment}
                  onFinaliseAssessment={finaliseAssessment}
                  onSignAssessment={signAssessment}
                  onAmendAssessment={amendAssessment}
                />
              )}

              {selectedSection === 'diagnoses' && (
                <DiagnosesSection
                  canManage={canManageClinical}
                  diagnoses={patientDiagnoses}
                  formState={diagnosisForm}
                  saving={saving}
                  onChange={setDiagnosisForm}
                  onCreate={createDiagnosis}
                />
              )}

              {selectedSection === 'attachments' && (
                <AttachmentsSection
                  canManage={canManageClinical}
                  attachments={patientAttachments}
                  encounters={patientEncounters}
                  notes={patientNotes}
                  assessments={patientAssessments}
                  formState={attachmentForm}
                  selectedFile={attachmentFile}
                  saving={saving}
                  onChange={setAttachmentForm}
                  onFileChange={setAttachmentFile}
                  onCreate={createAttachmentMetadata}
                />
              )}

              {selectedSection === 'publications' && (
                <PublicationsSection
                  canManage={canManageClinical}
                  publications={patientPublications}
                  notes={patientNotes}
                  plans={patientPlans}
                  assessments={patientAssessments}
                  results={patientResults}
                  attachments={patientAttachments}
                  restrictions={patientRestrictions}
                  formState={publicationForm}
                  saving={saving}
                  onChange={setPublicationForm}
                  onPublish={publishRecord}
                  onRevoke={revokePublication}
                />
              )}
            </>
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

function ClinicalEncountersSection(props: {
  canManage: boolean
  encounters: ClinicalEncounter[]
  bookings: BookingRow[]
  sessions: SessionRow[]
  therapists: TherapistRow[]
  selectedEncounterId: string
  selectedEncounter: ClinicalEncounter | null
  formState: EncounterForm
  saving: boolean
  onSelect: (id: string) => void
  onChange: (form: EncounterForm) => void
  onCreate: () => void
}) {
  return (
    <Card className="practice-profile-form-card">
      <div className="practice-profile-form-header">
        <div><span>Clinical encounters</span><h3>{props.selectedEncounter ? formatLabel(props.selectedEncounter.encounter_type) : 'New encounter'}</h3></div>
        {props.canManage && <Button disabled={props.saving} onClick={props.onCreate}>Create Encounter</Button>}
      </div>
      <div className="clinical-split-panel">
        <RecordList emptyTitle="No encounters yet" emptyDescription="Clinical contacts and session-linked encounters will appear here.">
          {props.encounters.map((encounter) => (
            <button className={props.selectedEncounterId === encounter.id ? 'active' : ''} type="button" onClick={() => props.onSelect(encounter.id)} key={encounter.id}>
              <strong>{formatLabel(encounter.encounter_type)}</strong>
              <span>{formatDateTime(encounter.occurred_at || encounter.created_at)} · {formatLabel(encounter.encounter_status)}</span>
            </button>
          ))}
        </RecordList>
        <div className="settings-form-grid patients-form-grid">
          <label><span>Type</span><select disabled={!props.canManage || props.saving} value={props.formState.encounter_type} onChange={(event) => props.onChange({ ...props.formState, encounter_type: event.target.value })}>{encounterTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
          <label><span>Status</span><select disabled={!props.canManage || props.saving} value={props.formState.encounter_status} onChange={(event) => props.onChange({ ...props.formState, encounter_status: event.target.value })}>{['draft', 'in_progress', 'completed', 'cancelled'].map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
          <label><span>Visibility</span><select disabled={!props.canManage || props.saving} value={props.formState.clinical_visibility} onChange={(event) => props.onChange({ ...props.formState, clinical_visibility: event.target.value })}>{visibilityOptions.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}</select></label>
          <label><span>Occurred at</span><input type="datetime-local" disabled={!props.canManage || props.saving} value={props.formState.occurred_at} onChange={(event) => props.onChange({ ...props.formState, occurred_at: event.target.value })} /></label>
          <label><span>Related booking</span><select disabled={!props.canManage || props.saving} value={props.formState.booking_id} onChange={(event) => props.onChange({ ...props.formState, booking_id: event.target.value })}><option value="">None</option>{props.bookings.map((booking) => <option value={booking.id} key={booking.id}>{formatDateTime(booking.start_at)} · {formatLabel(booking.booking_type)}</option>)}</select></label>
          <label><span>Related session</span><select disabled={!props.canManage || props.saving} value={props.formState.session_id} onChange={(event) => props.onChange({ ...props.formState, session_id: event.target.value })}><option value="">None</option>{props.sessions.map((session) => <option value={session.id} key={session.id}>{formatDateTime(session.scheduled_start_at)} · {formatLabel(session.session_status)}</option>)}</select></label>
          <label><span>Practitioner</span><select disabled={!props.canManage || props.saving} value={props.formState.responsible_therapist_profile_id} onChange={(event) => props.onChange({ ...props.formState, responsible_therapist_profile_id: event.target.value })}><option value="">Not assigned</option>{props.therapists.map((therapist) => <option value={therapist.id} key={therapist.id}>{therapist.display_name}</option>)}</select></label>
          <label className="wide-field"><span>Summary</span><textarea disabled={!props.canManage || props.saving} value={props.formState.summary} onChange={(event) => props.onChange({ ...props.formState, summary: event.target.value })} /></label>
        </div>
      </div>
      {props.selectedEncounter && <ClinicalDetailGrid rows={[
        ['Status', formatLabel(props.selectedEncounter.encounter_status)],
        ['Visibility', formatLabel(props.selectedEncounter.clinical_visibility)],
        ['Booking', props.selectedEncounter.booking_id ? 'Linked' : 'None'],
        ['Session', props.selectedEncounter.session_id ? 'Linked' : 'None'],
      ]} />}
    </Card>
  )
}

function ClinicalNotesSection(props: {
  canManage: boolean
  notes: ClinicalNote[]
  versions: ClinicalNoteVersion[]
  amendments: ClinicalNoteAmendment[]
  templates: ClinicalTemplate[]
  templateVersions: ClinicalTemplateVersion[]
  encounters: ClinicalEncounter[]
  selectedNote: ClinicalNote | null
  selectedNoteId: string
  latestVersion: ClinicalNoteVersion | null
  formState: NoteForm
  amendmentReason: string
  amendmentText: string
  amendmentJson: string
  saving: boolean
  onSelect: (id: string) => void
  onChange: (form: NoteForm) => void
  onTemplateChange: (templateVersionId: string) => void
  onCreate: () => void
  onSaveDraft: () => void
  onFinalise: () => void
  onSign: () => void
  onAmend: () => void
  onAmendmentReasonChange: (value: string) => void
  onAmendmentTextChange: (value: string) => void
  onAmendmentJsonChange: (value: string) => void
}) {
  const isDraft = props.latestVersion?.version_status === 'draft'
  const canEditDraft = props.canManage && isDraft
  const publishableTemplates = props.templateVersions.filter((version) => version.version_status === 'active' || version.version_status === 'draft')

  return (
    <Card className="practice-profile-form-card">
      <div className="practice-profile-form-header">
        <div><span>Clinical notes</span><h3>{props.selectedNote?.note_title || 'Draft note'}</h3></div>
        <div className="patients-action-row">
          {props.canManage && <Button disabled={props.saving} onClick={props.onCreate}>Create Draft</Button>}
          {canEditDraft && <Button variant="secondary" disabled={props.saving} onClick={props.onSaveDraft}>Save Draft</Button>}
          {props.canManage && props.latestVersion?.version_status === 'draft' && <Button variant="secondary" disabled={props.saving} onClick={props.onFinalise}>Finalise</Button>}
          {props.canManage && props.latestVersion?.version_status === 'finalised' && <Button variant="secondary" disabled={props.saving} onClick={props.onSign}>Sign</Button>}
        </div>
      </div>
      <div className="clinical-split-panel">
        <RecordList emptyTitle="No clinical notes yet" emptyDescription="Draft, finalised and signed notes will appear here.">
          {props.notes.map((note) => (
            <button className={props.selectedNoteId === note.id ? 'active' : ''} type="button" onClick={() => props.onSelect(note.id)} key={note.id}>
              <strong>{note.note_title || formatLabel(note.note_type)}</strong>
              <span>{formatLabel(note.note_status)} · {formatDateTime(note.updated_at)}</span>
            </button>
          ))}
        </RecordList>
        <div className="settings-form-grid patients-form-grid">
          <label><span>Note type</span><select disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} value={props.formState.note_type} onChange={(event) => props.onChange({ ...props.formState, note_type: event.target.value })}>{noteTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
          <label><span>Encounter</span><select disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} value={props.formState.clinical_encounter_id} onChange={(event) => props.onChange({ ...props.formState, clinical_encounter_id: event.target.value })}><option value="">None</option>{props.encounters.map((encounter) => <option value={encounter.id} key={encounter.id}>{formatLabel(encounter.encounter_type)} · {formatDateTime(encounter.occurred_at || encounter.created_at)}</option>)}</select></label>
          <label><span>Template version</span><select disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} value={props.formState.clinical_note_template_version_id} onChange={(event) => props.onTemplateChange(event.target.value)}><option value="">No template</option>{publishableTemplates.map((version) => {
            const template = props.templates.find((item) => item.id === version.clinical_note_template_id)
            return <option value={version.id} key={version.id}>{template?.name ?? 'Template'} v{version.version_number}</option>
          })}</select></label>
          <label><span>Title</span><input disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} value={props.formState.note_title} onChange={(event) => props.onChange({ ...props.formState, note_title: event.target.value })} /></label>
          <label><span>Visibility</span><select disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} value={props.formState.clinical_visibility} onChange={(event) => props.onChange({ ...props.formState, clinical_visibility: event.target.value })}>{visibilityOptions.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}</select></label>
          <label className="practice-number-toggle"><input type="checkbox" disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} checked={props.formState.patient_visible_allowed} onChange={(event) => props.onChange({ ...props.formState, patient_visible_allowed: event.target.checked, clinical_visibility: event.target.checked ? 'patient_facing' : props.formState.clinical_visibility })} /><span>Can be published to Patient Link</span></label>
          <label className="practice-number-toggle"><input type="checkbox" disabled={!props.canManage || props.saving || Boolean(props.selectedNote && !isDraft)} checked={props.formState.is_restricted} onChange={(event) => props.onChange({ ...props.formState, is_restricted: event.target.checked })} /><span>Restricted clinical note</span></label>
          <label className="wide-field"><span>Free-text content</span><textarea disabled={!canEditDraft && Boolean(props.selectedNote)} value={props.formState.free_text_content} onChange={(event) => props.onChange({ ...props.formState, free_text_content: event.target.value })} /></label>
          <label className="wide-field"><span>Structured content JSON</span><textarea disabled={!canEditDraft && Boolean(props.selectedNote)} value={props.formState.structured_content} onChange={(event) => props.onChange({ ...props.formState, structured_content: event.target.value })} /></label>
        </div>
      </div>
      {props.selectedNote && (
        <>
          <div className="clinical-status-row">
            <StatusBadge tone={getBadgeTone(props.selectedNote.note_status)}>{formatLabel(props.selectedNote.note_status)}</StatusBadge>
            {props.selectedNote.is_restricted && <StatusBadge tone="warning">Restricted</StatusBadge>}
            {isImmutableNoteStatus(props.selectedNote.note_status) && <StatusBadge tone="info">Immutable content</StatusBadge>}
          </div>
          <ClinicalTimeline title="Version history" items={props.versions.map((version) => ({
            id: version.id,
            title: `Version ${version.version_number} · ${formatLabel(version.version_status)}`,
            detail: `Created ${formatDateTime(version.created_at)}${version.signed_at ? ` · signed ${formatDateTime(version.signed_at)}` : ''}`,
          }))} />
          <ClinicalTimeline title="Amendments" empty="No amendments recorded." items={props.amendments.map((amendment) => ({
            id: amendment.id,
            title: `Amendment ${amendment.amendment_number}`,
            detail: `${amendment.amendment_reason} · ${formatDateTime(amendment.created_at)}`,
          }))} />
          {props.canManage && isImmutableNoteStatus(props.selectedNote.note_status) && (
            <div className="settings-form-grid patients-form-grid">
              <label><span>Amendment reason</span><input value={props.amendmentReason} onChange={(event) => props.onAmendmentReasonChange(event.target.value)} /></label>
              <label className="wide-field"><span>Amendment text</span><textarea value={props.amendmentText} onChange={(event) => props.onAmendmentTextChange(event.target.value)} /></label>
              <label className="wide-field"><span>Amendment structured JSON</span><textarea value={props.amendmentJson} onChange={(event) => props.onAmendmentJsonChange(event.target.value)} /></label>
              <Button disabled={props.saving || !props.amendmentReason.trim()} onClick={props.onAmend}>Append Amendment</Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function PlansAndGoalsSection(props: {
  canManage: boolean
  plans: TreatmentPlan[]
  goals: ClinicalGoal[]
  goalReviews: ClinicalGoalReview[]
  selectedPlanId: string
  selectedGoalId: string
  selectedPlan: TreatmentPlan | null
  selectedGoal: ClinicalGoal | null
  planForm: PlanForm
  goalForm: GoalForm
  reviewText: string
  reviewRating: string
  saving: boolean
  onSelectPlan: (id: string) => void
  onSelectGoal: (id: string) => void
  onPlanChange: (form: PlanForm) => void
  onGoalChange: (form: GoalForm) => void
  onReviewTextChange: (value: string) => void
  onReviewRatingChange: (value: string) => void
  onCreatePlan: () => void
  onCreateGoal: () => void
  onAppendReview: () => void
}) {
  return (
    <Card className="practice-profile-form-card">
      <div className="practice-profile-form-header">
        <div><span>Treatment plans and goals</span><h3>{props.selectedPlan?.plan_title || 'Clinical plan'}</h3></div>
      </div>
      <div className="clinical-two-column">
        <div>
          <PanelHeading title="Plans" action={props.canManage ? <Button disabled={props.saving} onClick={props.onCreatePlan}>Create Plan</Button> : null} />
          <RecordList emptyTitle="No treatment plans" emptyDescription="Treatment plans will appear here.">
            {props.plans.map((plan) => (
              <button className={props.selectedPlanId === plan.id ? 'active' : ''} type="button" onClick={() => props.onSelectPlan(plan.id)} key={plan.id}>
                <strong>{plan.plan_title}</strong>
                <span>{formatLabel(plan.plan_status)} · review {formatDate(plan.review_due_date)}</span>
              </button>
            ))}
          </RecordList>
          {props.canManage && <div className="settings-form-grid patients-form-grid">
            <label><span>Plan title</span><input value={props.planForm.plan_title} onChange={(event) => props.onPlanChange({ ...props.planForm, plan_title: event.target.value })} /></label>
            <label><span>Status</span><select value={props.planForm.plan_status} onChange={(event) => props.onPlanChange({ ...props.planForm, plan_status: event.target.value })}>{['draft', 'active', 'paused', 'completed', 'discontinued'].map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
            <label><span>Review due</span><input type="date" value={props.planForm.review_due_date} onChange={(event) => props.onPlanChange({ ...props.planForm, review_due_date: event.target.value })} /></label>
            <label className="wide-field"><span>Clinical focus</span><textarea value={props.planForm.clinical_focus} onChange={(event) => props.onPlanChange({ ...props.planForm, clinical_focus: event.target.value })} /></label>
          </div>}
        </div>
        <div>
          <PanelHeading title="Goals" action={props.canManage ? <Button disabled={props.saving} onClick={props.onCreateGoal}>Create Goal</Button> : null} />
          <RecordList emptyTitle="No clinical goals" emptyDescription="Goal status and review history will appear here.">
            {props.goals.map((goal) => (
              <button className={props.selectedGoalId === goal.id ? 'active' : ''} type="button" onClick={() => props.onSelectGoal(goal.id)} key={goal.id}>
                <strong>{goal.goal_text}</strong>
                <span>{formatLabel(goal.goal_status)} · {formatLabel(goal.priority)}</span>
              </button>
            ))}
          </RecordList>
          {props.canManage && <div className="settings-form-grid patients-form-grid">
            <label><span>Plan</span><select value={props.goalForm.treatment_plan_id} onChange={(event) => props.onGoalChange({ ...props.goalForm, treatment_plan_id: event.target.value })}><option value="">No plan</option>{props.plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.plan_title}</option>)}</select></label>
            <label><span>Domain</span><input value={props.goalForm.goal_domain} onChange={(event) => props.onGoalChange({ ...props.goalForm, goal_domain: event.target.value })} /></label>
            <label><span>Priority</span><select value={props.goalForm.priority} onChange={(event) => props.onGoalChange({ ...props.goalForm, priority: event.target.value })}>{['low', 'medium', 'high', 'urgent'].map((priority) => <option value={priority} key={priority}>{formatLabel(priority)}</option>)}</select></label>
            <label className="wide-field"><span>Goal</span><textarea value={props.goalForm.goal_text} onChange={(event) => props.onGoalChange({ ...props.goalForm, goal_text: event.target.value })} /></label>
          </div>}
          {props.selectedGoal && <ClinicalTimeline title="Goal reviews" empty="No reviews yet." items={props.goalReviews.filter((review) => review.clinical_goal_id === props.selectedGoal?.id).map((review) => ({
            id: review.id,
            title: `${formatLabel(review.review_status)} · ${review.progress_rating ?? 'No'}%`,
            detail: `${review.evidence_summary || 'No evidence summary'} · ${formatDateTime(review.reviewed_at)}`,
          }))} />}
          {props.canManage && props.selectedGoal && <div className="settings-form-grid patients-form-grid">
            <label><span>Progress rating</span><input type="number" min="0" max="100" value={props.reviewRating} onChange={(event) => props.onReviewRatingChange(event.target.value)} /></label>
            <label className="wide-field"><span>Evidence summary</span><textarea value={props.reviewText} onChange={(event) => props.onReviewTextChange(event.target.value)} /></label>
            <Button disabled={props.saving} onClick={props.onAppendReview}>Append Review</Button>
          </div>}
        </div>
      </div>
    </Card>
  )
}

function DiagnosesSection(props: {
  canManage: boolean
  diagnoses: ClinicalDiagnosis[]
  formState: DiagnosisForm
  saving: boolean
  onChange: (form: DiagnosisForm) => void
  onCreate: () => void
}) {
  return (
    <Card className="practice-profile-form-card">
      <div className="practice-profile-form-header">
        <div><span>Clinical diagnoses</span><h3>Clinical coding</h3></div>
        {props.canManage && <Button disabled={props.saving} onClick={props.onCreate}>Save Diagnosis</Button>}
      </div>
      <RecordList emptyTitle="No diagnoses" emptyDescription="Clinical diagnoses and coding references will appear here.">
        {props.diagnoses.map((diagnosis) => (
          <article className="clinical-static-record" key={diagnosis.id}>
            <strong>{diagnosis.code} {diagnosis.label ?? ''}</strong>
            <span>{diagnosis.coding_system} · {formatLabel(diagnosis.diagnosis_status)}{diagnosis.is_primary ? ' · primary' : ''}</span>
          </article>
        ))}
      </RecordList>
      {props.canManage && <div className="settings-form-grid patients-form-grid">
        <label><span>Coding system</span><input value={props.formState.coding_system} onChange={(event) => props.onChange({ ...props.formState, coding_system: event.target.value })} /></label>
        <label><span>Code</span><input value={props.formState.code} onChange={(event) => props.onChange({ ...props.formState, code: event.target.value })} /></label>
        <label><span>Label</span><input value={props.formState.label} onChange={(event) => props.onChange({ ...props.formState, label: event.target.value })} /></label>
        <label><span>Status</span><select value={props.formState.diagnosis_status} onChange={(event) => props.onChange({ ...props.formState, diagnosis_status: event.target.value })}>{['active', 'resolved', 'entered_in_error', 'archived'].map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></label>
        <label className="practice-number-toggle"><input type="checkbox" checked={props.formState.is_primary} onChange={(event) => props.onChange({ ...props.formState, is_primary: event.target.checked })} /><span>Primary diagnosis</span></label>
      </div>}
    </Card>
  )
}

function AttachmentsSection(props: {
  canManage: boolean
  attachments: ClinicalAttachment[]
  encounters: ClinicalEncounter[]
  notes: ClinicalNote[]
  assessments: ClinicalAssessment[]
  formState: AttachmentForm
  selectedFile: File | null
  saving: boolean
  onChange: (form: AttachmentForm) => void
  onFileChange: (file: File | null) => void
  onCreate: () => void
}) {
  return (
    <Card className="practice-profile-form-card">
      <div className="practice-profile-form-header">
        <div><span>Clinical attachments</span><h3>Clinical files</h3></div>
        {props.canManage && <Button disabled={props.saving} onClick={props.onCreate}>{props.selectedFile ? 'Upload Attachment' : 'Record Metadata'}</Button>}
      </div>
      <p className="clinical-subtle-note">Files are stored in a private tenant-scoped bucket. Patient-facing access still requires explicit publication metadata.</p>
      <RecordList emptyTitle="No clinical attachments" emptyDescription="Attachment metadata will appear here after it is recorded.">
        {props.attachments.map((attachment) => (
          <article className="clinical-static-record" key={attachment.id}>
            <strong>{attachment.file_name}</strong>
            <span>{formatLabel(attachment.attachment_category)} · {attachment.mime_type || 'type not set'} · {formatFileSize(attachment.file_size_bytes)}{attachment.storage_path ? ' · uploaded' : ' · metadata only'}{attachment.is_restricted ? ' · restricted' : ''}</span>
          </article>
        ))}
      </RecordList>
      {props.canManage && <div className="settings-form-grid patients-form-grid">
        <label className="wide-field">
          <span>Upload file</span>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              props.onFileChange(file)
              if (file) {
                props.onChange({
                  ...props.formState,
                  file_name: file.name,
                  mime_type: file.type,
                  file_size_bytes: String(file.size),
                })
              }
            }}
          />
          {props.selectedFile && <small>{props.selectedFile.name} selected ({formatFileSize(props.selectedFile.size)})</small>}
        </label>
        <label><span>File name</span><input value={props.formState.file_name} onChange={(event) => props.onChange({ ...props.formState, file_name: event.target.value })} /></label>
        <label><span>Category</span><select value={props.formState.attachment_category} onChange={(event) => props.onChange({ ...props.formState, attachment_category: event.target.value })}>{['assessment_file', 'clinical_image', 'report', 'external_document', 'supporting_document', 'other'].map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
        <label><span>Encounter</span><select value={props.formState.clinical_encounter_id} onChange={(event) => props.onChange({ ...props.formState, clinical_encounter_id: event.target.value })}><option value="">None</option>{props.encounters.map((encounter) => <option value={encounter.id} key={encounter.id}>{formatLabel(encounter.encounter_type)}</option>)}</select></label>
        <label><span>Note</span><select value={props.formState.clinical_note_id} onChange={(event) => props.onChange({ ...props.formState, clinical_note_id: event.target.value })}><option value="">None</option>{props.notes.map((note) => <option value={note.id} key={note.id}>{note.note_title || formatLabel(note.note_type)}</option>)}</select></label>
        <label><span>Assessment</span><select value={props.formState.clinical_assessment_id} onChange={(event) => props.onChange({ ...props.formState, clinical_assessment_id: event.target.value })}><option value="">None</option>{props.assessments.map((assessment) => <option value={assessment.id} key={assessment.id}>{formatLabel(assessment.assessment_type)}</option>)}</select></label>
        <label><span>MIME type</span><input value={props.formState.mime_type} onChange={(event) => props.onChange({ ...props.formState, mime_type: event.target.value })} /></label>
        <label className="wide-field"><span>Description</span><textarea value={props.formState.description} onChange={(event) => props.onChange({ ...props.formState, description: event.target.value })} /></label>
        <label className="practice-number-toggle"><input type="checkbox" checked={props.formState.is_restricted} onChange={(event) => props.onChange({ ...props.formState, is_restricted: event.target.checked })} /><span>Restricted attachment</span></label>
      </div>}
    </Card>
  )
}

function PublicationsSection(props: {
  canManage: boolean
  publications: ClinicalPublication[]
  notes: ClinicalNote[]
  plans: TreatmentPlan[]
  assessments: ClinicalAssessment[]
  results: OutcomeResult[]
  attachments: ClinicalAttachment[]
  restrictions: ClinicalRestriction[]
  formState: PublicationForm
  saving: boolean
  onChange: (form: PublicationForm) => void
  onPublish: () => void
  onRevoke: (publication: ClinicalPublication) => void
}) {
  const options = getPublicationOptions(props.formState.record_type, props)
  return (
    <Card className="practice-profile-form-card">
      <div className="practice-profile-form-header">
        <div><span>Patient Link publications</span><h3>Patient-facing clinical boundary</h3></div>
        {props.canManage && <Button disabled={props.saving || !props.formState.record_id || !props.formState.safe_title.trim()} onClick={props.onPublish}>Publish Metadata</Button>}
      </div>
      <p className="clinical-subtle-note">This publishes safe title and summary metadata only. Internal clinical content is not exposed by this workspace.</p>
      <RecordList emptyTitle="No clinical publications" emptyDescription="Published or revoked Patient Link clinical records will appear here.">
        {props.publications.map((publication) => (
          <article className="clinical-static-record clinical-publication-record" key={publication.id}>
            <div>
              <strong>{publication.safe_title}</strong>
              <span>{formatLabel(publication.record_type)} · {formatLabel(publication.publication_status)} · {formatDateTime(publication.published_at || publication.created_at)}</span>
            </div>
            {publication.publication_status === 'published' && props.canManage && (
              <Button variant="secondary" disabled={props.saving} onClick={() => props.onRevoke(publication)}>Revoke</Button>
            )}
          </article>
        ))}
      </RecordList>
      {props.canManage && <div className="settings-form-grid patients-form-grid">
        <label><span>Record type</span><select value={props.formState.record_type} onChange={(event) => props.onChange({ ...props.formState, record_type: event.target.value, record_id: '' })}>{publicationRecordTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}</select></label>
        <label><span>Record</span><select value={props.formState.record_id} onChange={(event) => props.onChange({ ...props.formState, record_id: event.target.value })}><option value="">Select patient-visible record</option>{options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>
        <label><span>Safe title</span><input value={props.formState.safe_title} onChange={(event) => props.onChange({ ...props.formState, safe_title: event.target.value })} /></label>
        <label className="wide-field"><span>Safe summary</span><textarea value={props.formState.safe_summary} onChange={(event) => props.onChange({ ...props.formState, safe_summary: event.target.value })} /></label>
      </div>}
    </Card>
  )
}

function getPublicationOptions(recordType: string, props: Pick<Parameters<typeof PublicationsSection>[0], 'notes' | 'plans' | 'assessments' | 'results' | 'attachments' | 'restrictions'>) {
  const isRestricted = (recordId: string) => props.restrictions.some((restriction) => restriction.record_type === recordType && restriction.record_id === recordId && restriction.restriction_status === 'active')
  if (recordType === 'clinical_note') {
    return props.notes
      .filter((note) => note.patient_visible_allowed && !note.is_restricted && !isRestricted(note.id) && ['finalised', 'signed', 'amended', 'locked'].includes(note.note_status))
      .map((note) => ({ id: note.id, label: `${note.note_title || formatLabel(note.note_type)} · ${formatLabel(note.note_status)}` }))
  }
  if (recordType === 'treatment_plan') {
    return props.plans.filter((plan) => plan.patient_visible_allowed && !isRestricted(plan.id)).map((plan) => ({ id: plan.id, label: plan.plan_title }))
  }
  if (recordType === 'clinical_assessment') {
    return props.assessments.filter((assessment) => assessment.patient_visible_allowed && !assessment.is_restricted && !isRestricted(assessment.id) && ['finalised', 'amended'].includes(assessment.assessment_status)).map((assessment) => ({ id: assessment.id, label: `${formatLabel(assessment.assessment_type)} · ${formatDate(assessment.assessment_date)}` }))
  }
  if (recordType === 'outcome_measure_result') {
    return props.results.filter((result) => result.patient_visible_allowed && !isRestricted(result.id) && ['finalised', 'amended'].includes(result.result_status)).map((result) => ({ id: result.id, label: `${result.interpreted_score || 'Outcome result'} · ${formatDate(result.result_date)}` }))
  }
  return props.attachments.filter((attachment) => attachment.patient_visible_allowed && !attachment.is_restricted && !isRestricted(attachment.id)).map((attachment) => ({ id: attachment.id, label: attachment.file_name }))
}

function RecordList({ children, emptyTitle, emptyDescription }: { children: ReactNode; emptyTitle: string; emptyDescription: string }) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0)
  if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return <div className="patients-record-list clinical-record-list">{children}</div>
}

function PanelHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="workspace-panel-header">
      <h3>{title}</h3>
      <div className="workspace-panel-actions">{action}</div>
    </div>
  )
}

function ClinicalDetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="booking-detail-grid clinical-detail-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function ClinicalTimeline({ title, items, empty = 'No records yet.' }: { title: string; items: Array<{ id: string; title: string; detail: string }>; empty?: string }) {
  return (
    <div className="clinical-timeline">
      <h3>{title}</h3>
      {items.length === 0 ? <p>{empty}</p> : items.map((item) => (
        <article key={item.id}>
          <strong>{item.title}</strong>
          <span>{item.detail}</span>
        </article>
      ))}
    </div>
  )
}
