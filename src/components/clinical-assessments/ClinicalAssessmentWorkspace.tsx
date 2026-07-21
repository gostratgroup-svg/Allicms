import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { EmptyState } from '../UiState'
import { Button, Card, SearchBar, StatusBadge } from '../ui'
import type { Json } from '../../lib/database.types'

export type AssessmentPatient = {
  id: string
  first_name: string | null
  last_name: string | null
  patient_number: string | null
  active_icd10_code: string | null
}

export type AssessmentEncounter = {
  id: string
  encounter_type: string
  encounter_status: string
  occurred_at: string | null
  summary: string | null
}

export type AssessmentSession = {
  id: string
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  session_status: string
}

export type AssessmentBooking = {
  id: string
  start_at: string | null
  end_at: string | null
  booking_status: string
  booking_type: string
}

export type AssessmentDefinition = {
  id: string
  tenant_id: string | null
  measure_key: string
  name: string
  description: string | null
  definition_status: string
  active_definition_version_id?: string | null
  definition_scope?: string | null
  discipline_tags?: string[]
  is_restricted?: boolean
  is_restricted_definition?: boolean
  is_licensed?: boolean
  is_licensed_definition?: boolean
  license_status?: string | null
  licence_metadata?: Json | null
  available_for_encounter_types?: string[]
  available_for_session_types?: string[]
  supports_patient_reported?: boolean
  supports_clinician_administered?: boolean
  supports_external_import?: boolean
  effective_from?: string | null
  effective_until?: string | null
}

export type AssessmentDefinitionVersion = {
  id: string
  tenant_id: string | null
  outcome_measure_definition_id: string
  version_number: number
  version_status: string
  response_mode: string
  scoring_method: string | null
  expected_completion_context: string | null
  discipline_tags: string[]
  patient_reported_allowed: boolean
  clinician_administered_allowed: boolean
  external_import_allowed: boolean
  is_restricted: boolean
  is_licensed: boolean
  license_status: string | null
  effective_from: string | null
  effective_until: string | null
  published_at: string | null
  retired_at: string | null
  lock_version: number
}

export type AssessmentDefinitionSection = {
  id: string
  assessment_definition_version_id: string
  section_key: string
  section_label: string
  description: string | null
  help_text: string | null
  display_order: number
  section_type: string
  is_repeating: boolean
  is_required_for_completion: boolean
  patient_visible_eligible: boolean
  practitioner_only: boolean
  is_restricted: boolean
}

export type AssessmentDefinitionItem = {
  id: string
  assessment_definition_version_id: string
  assessment_definition_section_id: string
  item_key: string
  item_label: string
  item_type: string
  display_order: number
  help_text: string | null
  placeholder: string | null
  item_config: Json
  validation_config: Json
  allowed_units: string[]
  is_required: boolean
  is_required_for_completion: boolean
  is_read_only: boolean
  is_calculated: boolean
  is_informational: boolean
  patient_visible_eligible: boolean
  practitioner_only: boolean
  is_restricted: boolean
  score_weight: number | null
  score_min: number | null
  score_max: number | null
}

export type AssessmentDefinitionItemOption = {
  id: string
  assessment_definition_item_id: string
  option_key: string
  option_label: string
  option_value: Json
  score_value: number | null
  display_order: number
  is_default: boolean
}

export type AssessmentAssignment = {
  id: string
  assessment_definition_version_id: string
  outcome_measure_definition_id: string
  assignment_scope: string
  discipline: string | null
  encounter_type: string | null
  session_type: string | null
  practice_location_id: string | null
  therapist_profile_id: string | null
  assessment_phase: string | null
  patient_reported_eligible: boolean
  is_default: boolean
  is_recommended: boolean
  assignment_priority: number
  is_active: boolean
  effective_from: string | null
  effective_until: string | null
}

export type ClinicalAssessmentRecord = {
  id: string
  tenant_id: string
  patient_id: string
  clinical_encounter_id: string | null
  booking_id?: string | null
  session_id: string | null
  treatment_plan_id?: string | null
  clinical_goal_id?: string | null
  outcome_measure_definition_id: string | null
  assessment_definition_version_id?: string | null
  assessor_therapist_profile_id?: string | null
  assessment_type: string
  assessment_status: string
  assessment_source?: string | null
  assessment_phase?: string | null
  assessment_date: string | null
  summary: string | null
  interpretation: string | null
  patient_visible_allowed: boolean
  is_restricted: boolean
  started_at?: string | null
  completed_at?: string | null
  finalised_at?: string | null
  signed_at?: string | null
  signature_statement?: string | null
  amendment_count?: number
  latest_result_id?: string | null
  content_hash?: string | null
  lock_version?: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type OutcomeResultRecord = {
  id: string
  patient_id: string
  clinical_assessment_id: string | null
  outcome_measure_definition_id: string | null
  assessment_definition_version_id?: string | null
  result_date: string | null
  result_key?: string | null
  result_label?: string | null
  raw_score: number | null
  numeric_score?: number | null
  normalised_score?: number | null
  percentage_score?: number | null
  score_unit?: string | null
  interpreted_score: string | null
  interpretation_band_id?: string | null
  calculation_status?: string | null
  calculated_classification?: string | null
  partial_score?: boolean
  missing_item_count?: number
  clinical_visibility: string
  result_status: string
  patient_visible_allowed: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type AssessmentDraftState = {
  id: string
  clinical_assessment_id: string
  assessment_definition_version_id: string
  draft_status: string
  last_saved_at: string
  active_editor_profile_id: string | null
  last_saved_by_profile_id: string | null
  conflict_detected: boolean
  conflict_reason: string | null
  lock_version: number
}

export type AssessmentResponse = {
  id: string
  clinical_assessment_id: string
  assessment_definition_version_id: string
  assessment_definition_item_id: string
  item_key: string
  response_value: Json
  text_value: string | null
  numeric_value: number | null
  boolean_value: boolean | null
  selected_option_keys: string[]
  validation_status: string
  validation_errors: Json
  is_restricted: boolean
  lock_version: number
  created_at: string
  updated_at: string
}

export type AssessmentScoreComponent = {
  id: string
  clinical_assessment_id: string
  outcome_measure_result_id: string | null
  score_key: string
  score_label: string
  score_type: string
  raw_score: number | null
  numeric_score: number | null
  percentage_score: number | null
  score_unit: string | null
  calculation_status: string
  partial_score: boolean
  missing_item_count: number
  created_at: string
}

export type AssessmentInterpretation = {
  id: string
  clinical_assessment_id: string
  outcome_measure_result_id: string | null
  interpretation_title: string
  interpretation_text: string
  clinical_significance: string | null
  limitations: string | null
  follow_up_recommendation: string | null
  treatment_plan_relevance: string | null
  clinical_goal_relevance: string | null
  patient_visible_eligible: boolean
  is_restricted: boolean
  interpretation_status: string
  created_at: string
  updated_at: string
}

export type AssessmentAmendment = {
  id: string
  clinical_assessment_id: string
  amendment_number: number
  amendment_reason: string
  target_record_type: string
  target_record_id: string
  created_at: string
}

export type RepeatedMeasureSeries = {
  id: string
  patient_id: string
  outcome_measure_definition_id: string | null
  measure_family_key: string
  treatment_plan_id: string | null
  clinical_goal_id: string | null
  baseline_assessment_id: string | null
  series_status: string
  comparison_policy: string
  opened_at: string
  closed_at: string | null
}

export type RepeatedMeasureMember = {
  id: string
  assessment_repeated_measure_series_id: string
  clinical_assessment_id: string
  outcome_measure_result_id: string | null
  series_role: string
  comparison_eligible: boolean
  comparison_exclusion_reason: string | null
  created_at: string
}

export type AssessmentGoalLink = {
  id: string
  clinical_assessment_id: string
  outcome_measure_result_id: string | null
  treatment_plan_id: string | null
  clinical_goal_id: string | null
  clinical_goal_review_id: string | null
  link_type: string
  evidence_summary: string | null
  created_at: string
}

export type AssessmentNoteLink = {
  id: string
  clinical_assessment_id: string
  clinical_note_id: string
  clinical_note_version_id: string | null
  link_type: string
  summary: string | null
  created_at: string
}

export type AssessmentInvitation = {
  id: string
  clinical_assessment_id: string
  invitation_status: string
  delivery_status: string
  sent_at: string | null
  expires_at: string | null
  submitted_at: string | null
  reviewed_at: string | null
}

export type AssessmentImport = {
  id: string
  clinical_assessment_id: string
  source_type: string
  vendor_name: string | null
  device_name: string | null
  import_status: string
  validation_status: string
  duplicate_status: string
  imported_at: string
  reviewed_at: string | null
}

export type AssessmentPublication = {
  id: string
  clinical_assessment_id: string
  publication_status: string
  patient_facing_title: string
  patient_facing_summary: string | null
  published_at: string | null
  expires_at: string | null
  revoked_at: string | null
  revoke_reason: string | null
  created_at: string
}

type ValidationResult = {
  valid?: boolean
  errors?: unknown[]
}

type Props = {
  patient: AssessmentPatient
  canManage: boolean
  assessments: ClinicalAssessmentRecord[]
  results: OutcomeResultRecord[]
  definitions: AssessmentDefinition[]
  definitionVersions: AssessmentDefinitionVersion[]
  sections: AssessmentDefinitionSection[]
  items: AssessmentDefinitionItem[]
  itemOptions: AssessmentDefinitionItemOption[]
  assignments: AssessmentAssignment[]
  encounters: AssessmentEncounter[]
  bookings: AssessmentBooking[]
  sessions: AssessmentSession[]
  draftStates: AssessmentDraftState[]
  responses: AssessmentResponse[]
  scoreComponents: AssessmentScoreComponent[]
  interpretations: AssessmentInterpretation[]
  amendments: AssessmentAmendment[]
  repeatedSeries: RepeatedMeasureSeries[]
  seriesMembers: RepeatedMeasureMember[]
  goalLinks: AssessmentGoalLink[]
  noteLinks: AssessmentNoteLink[]
  invitations: AssessmentInvitation[]
  imports: AssessmentImport[]
  publications: AssessmentPublication[]
  selectedAssessmentId: string
  saving: boolean
  onSelectAssessment: (assessmentId: string) => void
  onStartAssessment: (input: StartAssessmentInput) => Promise<string | null>
  onSaveResponse: (input: SaveAssessmentResponseInput) => Promise<void>
  onValidateAssessment: (assessmentId: string) => Promise<Json>
  onCompleteAssessment: (assessmentId: string) => Promise<void>
  onFinaliseAssessment: (assessmentId: string) => Promise<void>
  onSignAssessment: (assessmentId: string) => Promise<void>
  onAmendAssessment: (input: AmendAssessmentInput) => Promise<void>
}

export type StartAssessmentInput = {
  assessmentDefinitionVersionId: string
  clinicalEncounterId: string | null
  bookingId: string | null
  sessionId: string | null
  treatmentPlanId: string | null
  clinicalGoalId: string | null
  assessmentPhase: string | null
  idempotencyKey: string
}

export type SaveAssessmentResponseInput = {
  assessmentId: string
  item: AssessmentDefinitionItem
  payload: Json
  expectedLockVersion: number | null
  repeatIndex: number
  idempotencyKey: string
}

export type AmendAssessmentInput = {
  assessmentId: string
  reason: string
  targetRecordType: string
  targetRecordId: string | null
  correctedSnapshot: Json
}

const editableAssessmentStatuses = new Set(['draft', 'in_progress', 'completed'])
const immutableAssessmentStatuses = new Set(['finalised', 'signed', 'amended', 'locked', 'invalidated', 'archived'])
const readOnlyItemTypes = new Set(['calculated', 'attachment_reference', 'clinical_record_reference'])
const informationalItemTypes = new Set(['heading', 'instruction'])

function formatLabel(value: string | null | undefined) {
  return (value ?? 'not_set').replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function isWithinEffectiveDates(effectiveFrom: string | null | undefined, effectiveUntil: string | null | undefined, today: string) {
  if (effectiveFrom && effectiveFrom > today) return false
  if (effectiveUntil && effectiveUntil < today) return false
  return true
}

function normaliseStringList(values: string[]) {
  return [...values].sort().join('|')
}

function getLicenseStatus(definition: AssessmentDefinition) {
  if (definition.license_status) return definition.license_status
  const metadata = definition.licence_metadata
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata) && 'license_status' in metadata) {
    const status = metadata.license_status
    return typeof status === 'string' ? status : null
  }
  return null
}

function formatPatientName(patient: AssessmentPatient) {
  return `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || 'Patient'
}

function getBadgeTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['active', 'completed', 'finalised', 'signed', 'published', 'accepted'].includes(status)) return 'success'
  if (['draft', 'in_progress', 'pending', 'not_run'].includes(status)) return 'info'
  if (['amended', 'partial', 'review_required', 'restricted', 'revoked'].includes(status)) return 'warning'
  if (['cancelled', 'invalidated', 'rejected', 'failed', 'archived', 'retired', 'expired'].includes(status)) return 'danger'
  return 'neutral'
}

function jsonToInputValue(value: Json): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.join(', ')
  return ''
}

function buildPayloadForItem(item: AssessmentDefinitionItem, inputValue: string, multiValues: string[]): Json {
  if (item.item_type === 'integer') {
    const parsed = Number.parseInt(inputValue, 10)
    if (Number.isNaN(parsed)) throw new Error(`${item.item_label} must be a whole number.`)
    return parsed
  }
  if (['decimal', 'scale', 'measurement'].includes(item.item_type)) {
    const parsed = Number(inputValue)
    if (Number.isNaN(parsed)) throw new Error(`${item.item_label} must be a number.`)
    return parsed
  }
  if (item.item_type === 'boolean') return inputValue === 'true'
  if (['multiple_choice', 'checklist'].includes(item.item_type)) return multiValues
  return inputValue
}

function validationErrorsText(result: Json) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return ''
  const maybe = result as ValidationResult
  return (maybe.errors ?? []).map(String).join(', ')
}

export function ClinicalAssessmentWorkspace(props: Props) {
  const [definitionSearch, setDefinitionSearch] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [historicalFilter, setHistoricalFilter] = useState<'available' | 'all'>('available')
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [contextForm, setContextForm] = useState({
    clinicalEncounterId: '',
    bookingId: '',
    sessionId: '',
    assessmentPhase: '',
  })
  const [localResponses, setLocalResponses] = useState<Record<string, string>>({})
  const [multiResponses, setMultiResponses] = useState<Record<string, string[]>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed' | 'stale'>('idle')
  const [localMessage, setLocalMessage] = useState('')
  const [validationResult, setValidationResult] = useState<Json>(null)
  const [amendmentReason, setAmendmentReason] = useState('')
  const [amendmentTargetType, setAmendmentTargetType] = useState('assessment')

  const selectedAssessment = props.assessments.find((assessment) => assessment.id === props.selectedAssessmentId) ?? props.assessments[0] ?? null
  const selectedDefinition = selectedAssessment
    ? props.definitions.find((definition) => definition.id === selectedAssessment.outcome_measure_definition_id) ?? null
    : null
  const selectedVersion = selectedAssessment?.assessment_definition_version_id
    ? props.definitionVersions.find((version) => version.id === selectedAssessment.assessment_definition_version_id) ?? null
    : selectedDefinition?.active_definition_version_id
      ? props.definitionVersions.find((version) => version.id === selectedDefinition.active_definition_version_id) ?? null
      : null
  const selectedDraft = selectedAssessment
    ? props.draftStates.find((draft) => draft.clinical_assessment_id === selectedAssessment.id) ?? null
    : null
  const selectedResults = selectedAssessment
    ? props.results.filter((result) => result.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedResponses = selectedAssessment
    ? props.responses.filter((response) => response.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedScores = selectedAssessment
    ? props.scoreComponents.filter((score) => score.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedInterpretations = selectedAssessment
    ? props.interpretations.filter((interpretation) => interpretation.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedAmendments = selectedAssessment
    ? props.amendments.filter((amendment) => amendment.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedGoalLinks = selectedAssessment
    ? props.goalLinks.filter((link) => link.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedNoteLinks = selectedAssessment
    ? props.noteLinks.filter((link) => link.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedInvitations = selectedAssessment
    ? props.invitations.filter((invitation) => invitation.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedImports = selectedAssessment
    ? props.imports.filter((importRecord) => importRecord.clinical_assessment_id === selectedAssessment.id)
    : []
  const selectedPublications = selectedAssessment
    ? props.publications.filter((publication) => publication.clinical_assessment_id === selectedAssessment.id)
    : []

  const availableDefinitions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const search = definitionSearch.trim().toLowerCase()
    return props.definitions
      .filter((definition) => definition.definition_status === 'active')
      .map((definition) => {
        const version = props.definitionVersions.find((item) => item.id === definition.active_definition_version_id)
          ?? props.definitionVersions.find((item) => item.outcome_measure_definition_id === definition.id && item.version_status === 'active')
        const assignment = version
          ? props.assignments
            .filter((item) =>
              item.assessment_definition_version_id === version.id
              && item.is_active
              && isWithinEffectiveDates(item.effective_from, item.effective_until, today),
            )
            .sort((left, right) => left.assignment_priority - right.assignment_priority)[0] ?? null
          : null
        return { definition, version, assignment }
      })
      .filter(({ definition, version, assignment }) => {
        if (!version || version.version_status !== 'active') return false
        if (version.retired_at) return false
        if (!isWithinEffectiveDates(version.effective_from, version.effective_until, today)) return false
        if (!isWithinEffectiveDates(definition.effective_from, definition.effective_until, today)) return false
        const licenseStatus = getLicenseStatus(definition)
        if (historicalFilter === 'available' && (definition.is_licensed || definition.is_licensed_definition) && !['active', 'not_required'].includes(licenseStatus ?? '')) return false
        if (disciplineFilter && ![...(definition.discipline_tags ?? []), ...(version.discipline_tags ?? []), assignment?.discipline ?? ''].includes(disciplineFilter)) return false
        if (typeFilter === 'clinician' && !version.clinician_administered_allowed) return false
        if (typeFilter === 'patient' && !version.patient_reported_allowed) return false
        if (search && !`${definition.name} ${definition.description ?? ''} ${definition.measure_key}`.toLowerCase().includes(search)) return false
        return true
      })
  }, [definitionSearch, disciplineFilter, historicalFilter, props.assignments, props.definitions, props.definitionVersions, typeFilter])

  const disciplines = useMemo(() => {
    const values = new Set<string>()
    props.definitions.forEach((definition) => (definition.discipline_tags ?? []).forEach((tag) => values.add(tag)))
    props.definitionVersions.forEach((version) => (version.discipline_tags ?? []).forEach((tag) => values.add(tag)))
    props.assignments.forEach((assignment) => {
      if (assignment.discipline) values.add(assignment.discipline)
    })
    return Array.from(values).sort()
  }, [props.assignments, props.definitions, props.definitionVersions])

  const selectedSections = selectedVersion
    ? props.sections.filter((section) => section.assessment_definition_version_id === selectedVersion.id).sort((left, right) => left.display_order - right.display_order)
    : []
  const selectedItems = selectedVersion
    ? props.items.filter((item) => item.assessment_definition_version_id === selectedVersion.id).sort((left, right) => left.display_order - right.display_order)
    : []

  const isEditable = Boolean(selectedAssessment && props.canManage && editableAssessmentStatuses.has(selectedAssessment.assessment_status))
  const isImmutable = Boolean(selectedAssessment && immutableAssessmentStatuses.has(selectedAssessment.assessment_status))
  const hasUnsavedChanges = saveState === 'saving' || saveState === 'failed' || Object.keys(localResponses).some((itemId) => {
    const item = props.items.find((candidate) => candidate.id === itemId)
    const response = selectedResponses.find((stored) => stored.assessment_definition_item_id === itemId)
    if (item && ['multiple_choice', 'checklist'].includes(item.item_type)) {
      return normaliseStringList(multiResponses[itemId] ?? []) !== normaliseStringList(response?.selected_option_keys ?? [])
    }
    return localResponses[itemId] !== jsonToInputValue(response?.response_value ?? '')
  })

  useEffect(() => {
    if (!selectedVersionId && availableDefinitions[0]?.version?.id) setSelectedVersionId(availableDefinitions[0].version.id)
  }, [availableDefinitions, selectedVersionId])

  useEffect(() => {
    const nextLocal: Record<string, string> = {}
    const nextMulti: Record<string, string[]> = {}
    selectedResponses.forEach((response) => {
      const item = props.items.find((candidate) => candidate.id === response.assessment_definition_item_id)
      if (item && ['multiple_choice', 'checklist'].includes(item.item_type)) {
        nextMulti[item.id] = response.selected_option_keys ?? []
      } else {
        nextLocal[response.assessment_definition_item_id] = jsonToInputValue(response.response_value)
      }
    })
    setLocalResponses(nextLocal)
    setMultiResponses(nextMulti)
    setSaveState('idle')
    setValidationResult(null)
    setLocalMessage('')
  }, [props.selectedAssessmentId, selectedResponses.length])

  const startSelectedAssessment = async () => {
    const versionId = selectedVersionId || availableDefinitions[0]?.version?.id
    if (!versionId || props.saving) return
    setLocalMessage('')
    const createdId = await props.onStartAssessment({
      assessmentDefinitionVersionId: versionId,
      clinicalEncounterId: contextForm.clinicalEncounterId || null,
      bookingId: contextForm.bookingId || null,
      sessionId: contextForm.sessionId || null,
      treatmentPlanId: null,
      clinicalGoalId: null,
      assessmentPhase: contextForm.assessmentPhase || null,
      idempotencyKey: `assessment-${props.patient.id}-${versionId}-${Date.now()}`,
    })
    if (createdId) {
      props.onSelectAssessment(createdId)
      setLocalMessage('Assessment draft created.')
    }
  }

  const saveItem = async (item: AssessmentDefinitionItem) => {
    if (!selectedAssessment || !isEditable || props.saving) return
    const existing = selectedResponses.find((response) => response.assessment_definition_item_id === item.id)
    const repeatIndex = 1
    try {
      setSaveState('saving')
      const payload = buildPayloadForItem(item, localResponses[item.id] ?? '', multiResponses[item.id] ?? [])
      await props.onSaveResponse({
        assessmentId: selectedAssessment.id,
        item,
        payload,
        expectedLockVersion: existing?.lock_version ?? null,
        repeatIndex,
        idempotencyKey: `assessment-response-${selectedAssessment.id}-${item.id}-${Date.now()}`,
      })
      setSaveState('saved')
      setLocalMessage(`${item.item_label} saved.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assessment response could not be saved.'
      setSaveState(message.toLowerCase().includes('changed since') ? 'stale' : 'failed')
      setLocalMessage(message)
    }
  }

  const validateAssessment = async () => {
    if (!selectedAssessment) return
    const validation = await props.onValidateAssessment(selectedAssessment.id)
    setValidationResult(validation)
  }

  const completeAssessment = async () => {
    if (!selectedAssessment || props.saving) return
    await props.onCompleteAssessment(selectedAssessment.id)
    setLocalMessage('Assessment completed.')
  }

  const finaliseAssessment = async () => {
    if (!selectedAssessment || props.saving) return
    await props.onFinaliseAssessment(selectedAssessment.id)
    setLocalMessage('Assessment finalised.')
  }

  const signAssessment = async () => {
    if (!selectedAssessment || props.saving) return
    await props.onSignAssessment(selectedAssessment.id)
    setLocalMessage('Assessment signed.')
  }

  const amendAssessment = async () => {
    if (!selectedAssessment || props.saving || !amendmentReason.trim()) return
    await props.onAmendAssessment({
      assessmentId: selectedAssessment.id,
      reason: amendmentReason,
      targetRecordType: amendmentTargetType,
      targetRecordId: selectedAssessment.id,
      correctedSnapshot: { note: 'Amendment payload is intentionally limited from the frontend foundation.' },
    })
    setAmendmentReason('')
    setLocalMessage('Assessment amendment recorded.')
  }

  return (
    <div className="clinical-assessment-workspace">
      <Card className="practice-profile-form-card">
        <div className="practice-profile-form-header">
          <div>
            <span>Assessments and outcomes</span>
            <h3>{formatPatientName(props.patient)}</h3>
          </div>
          <div className="workspace-panel-actions">
            <StatusBadge tone="info">{props.assessments.length} assessments</StatusBadge>
            <StatusBadge tone="info">{props.results.length} results</StatusBadge>
            {!props.canManage && <StatusBadge tone="warning">Read only</StatusBadge>}
          </div>
        </div>
        <div className="patients-overview-grid">
          <div><strong>{props.assessments.filter((item) => ['draft', 'in_progress'].includes(item.assessment_status)).length}</strong><span>Draft or in progress</span></div>
          <div><strong>{props.assessments.filter((item) => item.assessment_status === 'completed').length}</strong><span>Completed</span></div>
          <div><strong>{props.assessments.filter((item) => ['finalised', 'signed'].includes(item.assessment_status)).length}</strong><span>Finalised or signed</span></div>
          <div><strong>{props.repeatedSeries.length}</strong><span>Repeated measures</span></div>
        </div>
      </Card>

      <div className="clinical-assessment-grid">
        <Card className="clinical-assessment-picker-card">
          <div className="practice-profile-form-header">
            <div><span>Available assessments</span><h3>Picker</h3></div>
            {props.canManage && <Button disabled={props.saving || !selectedVersionId} onClick={startSelectedAssessment}>Start Assessment</Button>}
          </div>
          <SearchBar label="Search assessments" value={definitionSearch} placeholder="Search name, key or description" onChange={setDefinitionSearch} />
          <div className="workflow-filter-row clinical-template-filter-row">
            <label>
              <span>Discipline</span>
              <select value={disciplineFilter} onChange={(event) => setDisciplineFilter(event.target.value)}>
                <option value="">All</option>
                {disciplines.map((discipline) => <option value={discipline} key={discipline}>{formatLabel(discipline)}</option>)}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">All</option>
                <option value="clinician">Clinician-administered</option>
                <option value="patient">Patient-reported</option>
              </select>
            </label>
            <label>
              <span>Availability</span>
              <select value={historicalFilter} onChange={(event) => setHistoricalFilter(event.target.value as 'available' | 'all')}>
                <option value="available">Available</option>
                <option value="all">Include historical metadata</option>
              </select>
            </label>
          </div>
          <RecordList emptyTitle="No available assessments" emptyDescription="Published active assessment versions available to this tenant will appear here.">
            {availableDefinitions.map(({ definition, version, assignment }) => (
              <button
                className={selectedVersionId === version?.id ? 'active' : ''}
                type="button"
                key={version?.id ?? definition.id}
                onClick={() => setSelectedVersionId(version?.id ?? '')}
              >
                <div>
                  <strong>{definition.name}</strong>
                  <span>v{version?.version_number ?? '-'} · {formatLabel(version?.response_mode)} · {assignment?.is_default ? 'default' : assignment?.is_recommended ? 'recommended' : 'available'}</span>
                </div>
                <div className="clinical-assessment-badges">
                  {definition.is_restricted || version?.is_restricted ? <StatusBadge tone="warning">Restricted</StatusBadge> : null}
                  {definition.is_licensed || version?.is_licensed ? <StatusBadge tone="info">Licensed</StatusBadge> : null}
                </div>
              </button>
            ))}
          </RecordList>
          {props.canManage && (
            <div className="settings-form-grid patients-form-grid">
              <label>
                <span>Encounter</span>
                <select value={contextForm.clinicalEncounterId} onChange={(event) => setContextForm({ ...contextForm, clinicalEncounterId: event.target.value })}>
                  <option value="">No encounter</option>
                  {props.encounters.map((encounter) => <option value={encounter.id} key={encounter.id}>{formatLabel(encounter.encounter_type)} · {formatDateTime(encounter.occurred_at)}</option>)}
                </select>
              </label>
              <label>
                <span>Session</span>
                <select value={contextForm.sessionId} onChange={(event) => setContextForm({ ...contextForm, sessionId: event.target.value })}>
                  <option value="">No session</option>
                  {props.sessions.map((session) => <option value={session.id} key={session.id}>{formatDateTime(session.scheduled_start_at)} · {formatLabel(session.session_status)}</option>)}
                </select>
              </label>
              <label>
                <span>Booking</span>
                <select value={contextForm.bookingId} onChange={(event) => setContextForm({ ...contextForm, bookingId: event.target.value })}>
                  <option value="">No booking</option>
                  {props.bookings.map((booking) => <option value={booking.id} key={booking.id}>{formatDateTime(booking.start_at)} · {formatLabel(booking.booking_type)}</option>)}
                </select>
              </label>
              <label>
                <span>Phase</span>
                <select value={contextForm.assessmentPhase} onChange={(event) => setContextForm({ ...contextForm, assessmentPhase: event.target.value })}>
                  <option value="">Not set</option>
                  {['baseline', 'progress_review', 'discharge', 'screening', 'follow_up'].map((phase) => <option value={phase} key={phase}>{formatLabel(phase)}</option>)}
                </select>
              </label>
            </div>
          )}
        </Card>

        <Card className="clinical-assessment-list-card">
          <div className="practice-profile-form-header">
            <div><span>Patient records</span><h3>Assessment history</h3></div>
          </div>
          <RecordList emptyTitle="No assessments yet" emptyDescription="Started, completed, finalised and signed assessments will appear here.">
            {props.assessments.map((assessment) => {
              const definition = props.definitions.find((item) => item.id === assessment.outcome_measure_definition_id)
              const result = props.results.find((item) => item.clinical_assessment_id === assessment.id)
              return (
                <button className={props.selectedAssessmentId === assessment.id ? 'active' : ''} type="button" onClick={() => props.onSelectAssessment(assessment.id)} key={assessment.id}>
                  <div>
                    <strong>{definition?.name ?? formatLabel(assessment.assessment_type)}</strong>
                    <span>{formatLabel(assessment.assessment_status)} · {formatDate(assessment.assessment_date || assessment.created_at)} · score {result?.numeric_score ?? result?.raw_score ?? 'not available'}</span>
                  </div>
                  <StatusBadge tone={getBadgeTone(assessment.assessment_status)}>{formatLabel(assessment.assessment_status)}</StatusBadge>
                </button>
              )
            })}
          </RecordList>
        </Card>
      </div>

      <Card className="clinical-assessment-runner-card">
        {!selectedAssessment || !selectedVersion ? (
          <EmptyState title="Select or start an assessment" description="Choose an assessment record to review responses, lifecycle state, scores, history and publication boundaries." />
        ) : (
          <>
            <div className="practice-profile-form-header">
              <div>
                <span>Assessment runner</span>
                <h3>{selectedDefinition?.name ?? formatLabel(selectedAssessment.assessment_type)}</h3>
                <p className="clinical-subtle-note">Definition v{selectedVersion.version_number} · {formatLabel(selectedAssessment.assessment_status)} · ICD-10 {props.patient.active_icd10_code || 'not set'}</p>
              </div>
              <div className="workspace-panel-actions">
                <StatusBadge tone={getBadgeTone(selectedAssessment.assessment_status)}>{formatLabel(selectedAssessment.assessment_status)}</StatusBadge>
                {selectedAssessment.is_restricted && <StatusBadge tone="warning">Restricted</StatusBadge>}
                {selectedDefinition?.is_licensed || selectedVersion.is_licensed ? <StatusBadge tone="info">Licensed</StatusBadge> : null}
                {isImmutable && <StatusBadge tone="success">Immutable</StatusBadge>}
              </div>
            </div>

            <div className="clinical-assessment-state-row">
              <div><span>Draft state</span><strong>{formatLabel(selectedDraft?.draft_status ?? 'not tracked')}</strong></div>
              <div><span>Last saved</span><strong>{formatDateTime(selectedDraft?.last_saved_at)}</strong></div>
              <div><span>Last editor</span><strong>{selectedDraft?.last_saved_by_profile_id ? 'Recorded' : 'Not set'}</strong></div>
              <div><span>Unsaved changes</span><strong>{hasUnsavedChanges ? 'Yes' : 'No'}</strong></div>
            </div>

            {localMessage && <div className={`practice-profile-message ${saveState === 'failed' || saveState === 'stale' ? 'error' : 'success'}`}>{localMessage}</div>}
            {validationResult && (
              <div className={`practice-profile-message ${validationErrorsText(validationResult) ? 'error' : 'success'}`}>
                {validationErrorsText(validationResult) || 'Assessment validation passed.'}
              </div>
            )}

            <div className="clinical-assessment-lifecycle-actions">
              <Button variant="secondary" disabled={props.saving} onClick={validateAssessment}>Validate</Button>
              {props.canManage && ['draft', 'in_progress', 'completed'].includes(selectedAssessment.assessment_status) && (
                <Button variant="secondary" disabled={props.saving} onClick={completeAssessment}>Complete</Button>
              )}
              {props.canManage && selectedAssessment.assessment_status === 'completed' && (
                <Button disabled={props.saving} onClick={finaliseAssessment}>Finalise</Button>
              )}
              {props.canManage && selectedAssessment.assessment_status === 'finalised' && (
                <Button disabled={props.saving} onClick={signAssessment}>Sign</Button>
              )}
            </div>

            <div className="clinical-assessment-section-stack">
              {selectedSections.length === 0 && <EmptyState title="No sections in this definition" description="The selected definition version has no renderable assessment sections." />}
              {selectedSections.map((section) => (
                <section className="clinical-assessment-section" key={section.id}>
                  <div className="clinical-assessment-section-heading">
                    <div>
                      <span>{formatLabel(section.section_type)}</span>
                      <h4>{section.section_label}</h4>
                      {section.help_text && <p>{section.help_text}</p>}
                    </div>
                    <div className="clinical-assessment-badges">
                      {section.is_required_for_completion && <StatusBadge tone="info">Required</StatusBadge>}
                      {section.is_restricted && <StatusBadge tone="warning">Restricted</StatusBadge>}
                    </div>
                  </div>
                  <div className="clinical-assessment-items">
                    {selectedItems.filter((item) => item.assessment_definition_section_id === section.id).map((item) => (
                      <AssessmentItemRenderer
                        key={item.id}
                        item={item}
                        options={props.itemOptions.filter((option) => option.assessment_definition_item_id === item.id).sort((left, right) => left.display_order - right.display_order)}
                        storedResponse={selectedResponses.find((response) => response.assessment_definition_item_id === item.id) ?? null}
                        inputValue={localResponses[item.id] ?? ''}
                        multiValues={multiResponses[item.id] ?? []}
                        editable={isEditable && !props.saving}
                        onChange={(value) => setLocalResponses((current) => ({ ...current, [item.id]: value }))}
                        onMultiChange={(values) => setMultiResponses((current) => ({ ...current, [item.id]: values }))}
                        onSave={() => saveItem(item)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </Card>

      {selectedAssessment && (
        <div className="clinical-assessment-grid">
          <ScoreSummary results={selectedResults} scores={selectedScores} />
          <InterpretationPanel interpretations={selectedInterpretations} />
          <RepeatedMeasurePanel series={props.repeatedSeries} members={props.seriesMembers} selectedAssessmentId={selectedAssessment.id} results={props.results} definitions={props.definitions} />
          <LinksAndPublicationPanel
            goalLinks={selectedGoalLinks}
            noteLinks={selectedNoteLinks}
            invitations={selectedInvitations}
            imports={selectedImports}
            publications={selectedPublications}
            amendments={selectedAmendments}
          />
          {props.canManage && immutableAssessmentStatuses.has(selectedAssessment.assessment_status) && (
            <Card className="clinical-assessment-amendment-card">
              <div className="practice-profile-form-header">
                <div><span>Amendments</span><h3>Append correction</h3></div>
                <Button disabled={props.saving || !amendmentReason.trim()} onClick={amendAssessment}>Record Amendment</Button>
              </div>
              <div className="settings-form-grid patients-form-grid">
                <label>
                  <span>Target</span>
                  <select value={amendmentTargetType} onChange={(event) => setAmendmentTargetType(event.target.value)}>
                    {['assessment', 'response', 'score', 'interpretation'].map((target) => <option value={target} key={target}>{formatLabel(target)}</option>)}
                  </select>
                </label>
                <label className="wide-field">
                  <span>Reason</span>
                  <textarea value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} placeholder="Required medico-legal correction reason" />
                </label>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function AssessmentItemRenderer(props: {
  item: AssessmentDefinitionItem
  options: AssessmentDefinitionItemOption[]
  storedResponse: AssessmentResponse | null
  inputValue: string
  multiValues: string[]
  editable: boolean
  onChange: (value: string) => void
  onMultiChange: (values: string[]) => void
  onSave: () => void
}) {
  const item = props.item
  const isInformational = informationalItemTypes.has(item.item_type) || item.is_informational
  const isReadOnly = isInformational || readOnlyItemTypes.has(item.item_type) || item.is_read_only || item.is_calculated
  const canEdit = props.editable && !isReadOnly
  const validationState = props.storedResponse?.validation_status ?? 'not saved'

  return (
    <article className={`clinical-assessment-item ${isReadOnly ? 'read-only' : ''}`}>
      <div className="clinical-assessment-item-header">
        <div>
          <strong>{item.item_label}</strong>
          <span>{formatLabel(item.item_type)}{item.is_required_for_completion ? ' · required for completion' : ''}</span>
        </div>
        <div className="clinical-assessment-badges">
          {item.is_restricted && <StatusBadge tone="warning">Restricted</StatusBadge>}
          {item.is_calculated && <StatusBadge tone="info">Calculated</StatusBadge>}
          <StatusBadge tone={getBadgeTone(validationState)}>{formatLabel(validationState)}</StatusBadge>
        </div>
      </div>
      {item.help_text && <p className="clinical-subtle-note">{item.help_text}</p>}
      {isInformational ? (
        <p className="clinical-assessment-instruction">{item.placeholder || 'Information item. No response is saved.'}</p>
      ) : readOnlyItemTypes.has(item.item_type) || item.is_calculated ? (
        <p className="clinical-assessment-instruction">Read-only item. Calculation, attachment, and record-reference handling is deferred to protected database/runtime services.</p>
      ) : (
        <div className="clinical-assessment-response-row">
          {renderResponseInput({ item, options: props.options, inputValue: props.inputValue, multiValues: props.multiValues, editable: canEdit, onChange: props.onChange, onMultiChange: props.onMultiChange })}
          <Button variant="secondary" disabled={!canEdit} onClick={props.onSave}>Save</Button>
        </div>
      )}
      {props.storedResponse && (
        <small className="clinical-assessment-stored-value">Persisted {formatDateTime(props.storedResponse.updated_at)} · lock {props.storedResponse.lock_version}</small>
      )}
    </article>
  )
}

function renderResponseInput(args: {
  item: AssessmentDefinitionItem
  options: AssessmentDefinitionItemOption[]
  inputValue: string
  multiValues: string[]
  editable: boolean
  onChange: (value: string) => void
  onMultiChange: (values: string[]) => void
}) {
  const { item, options, inputValue, multiValues, editable, onChange, onMultiChange } = args
  if (item.item_type === 'long_text' || item.item_type === 'observation') {
    return <textarea disabled={!editable} value={inputValue} placeholder={item.placeholder ?? ''} onChange={(event) => onChange(event.target.value)} />
  }
  if (['integer', 'decimal', 'scale', 'measurement'].includes(item.item_type)) {
    return <input disabled={!editable} type="number" value={inputValue} placeholder={item.placeholder ?? ''} min={item.score_min ?? undefined} max={item.score_max ?? undefined} onChange={(event) => onChange(event.target.value)} />
  }
  if (item.item_type === 'boolean') {
    return (
      <select disabled={!editable} value={inputValue} onChange={(event) => onChange(event.target.value)}>
        <option value="">Not set</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }
  if (item.item_type === 'single_choice' || item.item_type === 'laterality' || item.item_type === 'body_area') {
    return (
      <select disabled={!editable} value={inputValue} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option value={option.option_key} key={option.id}>{option.option_label}</option>)}
      </select>
    )
  }
  if (item.item_type === 'multiple_choice' || item.item_type === 'checklist') {
    return (
      <div className="clinical-assessment-checkbox-list">
        {options.map((option) => (
          <label key={option.id}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={multiValues.includes(option.option_key)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...multiValues, option.option_key]
                  : multiValues.filter((value) => value !== option.option_key)
                onMultiChange(next)
              }}
            />
            <span>{option.option_label}</span>
          </label>
        ))}
      </div>
    )
  }
  if (item.item_type === 'date') return <input disabled={!editable} type="date" value={inputValue} onChange={(event) => onChange(event.target.value)} />
  if (item.item_type === 'time') return <input disabled={!editable} type="time" value={inputValue} onChange={(event) => onChange(event.target.value)} />
  if (item.item_type === 'datetime') return <input disabled={!editable} type="datetime-local" value={inputValue} onChange={(event) => onChange(event.target.value)} />
  return <input disabled={!editable} value={inputValue} placeholder={item.placeholder ?? ''} onChange={(event) => onChange(event.target.value)} />
}

function RecordList({ children, emptyTitle, emptyDescription }: { children: ReactNode; emptyTitle: string; emptyDescription: string }) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0)
  if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return <div className="patients-record-list clinical-record-list">{children}</div>
}

function ScoreSummary(props: { results: OutcomeResultRecord[]; scores: AssessmentScoreComponent[] }) {
  return (
    <Card className="clinical-assessment-support-card">
      <div className="practice-profile-form-header"><div><span>Scores</span><h3>Authoritative results</h3></div></div>
      {props.results.length === 0 && props.scores.length === 0 ? (
        <EmptyState title="No calculated score" description="Calculation runtime is deferred. No browser-calculated score is shown as authoritative." />
      ) : (
        <div className="clinical-assessment-mini-list">
          {props.results.map((result) => (
            <article key={result.id}>
              <strong>{result.result_label || result.result_key || 'Outcome result'}</strong>
              <span>{formatLabel(result.result_status)} · raw {result.raw_score ?? 'n/a'} · numeric {result.numeric_score ?? 'n/a'} · {formatLabel(result.calculation_status)}</span>
              {result.partial_score && <StatusBadge tone="warning">{result.missing_item_count ?? 0} missing</StatusBadge>}
            </article>
          ))}
          {props.scores.map((score) => (
            <article key={score.id}>
              <strong>{score.score_label}</strong>
              <span>{formatLabel(score.score_type)} · raw {score.raw_score ?? 'n/a'} · {score.percentage_score ?? 'n/a'}%</span>
              <StatusBadge tone={getBadgeTone(score.calculation_status)}>{formatLabel(score.calculation_status)}</StatusBadge>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}

function InterpretationPanel(props: { interpretations: AssessmentInterpretation[] }) {
  return (
    <Card className="clinical-assessment-support-card">
      <div className="practice-profile-form-header"><div><span>Practitioner interpretation</span><h3>Clinical meaning</h3></div></div>
      {props.interpretations.length === 0 ? (
        <EmptyState title="No practitioner interpretation" description="Automated classification and clinician interpretation remain separate. Editing is deferred until a protected interpretation RPC exists." />
      ) : (
        <div className="clinical-assessment-mini-list">
          {props.interpretations.map((interpretation) => (
            <article key={interpretation.id}>
              <strong>{interpretation.interpretation_title}</strong>
              <span>{interpretation.interpretation_text}</span>
              <small>{interpretation.clinical_significance || 'No significance noted'} · {interpretation.follow_up_recommendation || 'No follow-up recommendation'}</small>
              <div className="clinical-assessment-badges">
                <StatusBadge tone={getBadgeTone(interpretation.interpretation_status)}>{formatLabel(interpretation.interpretation_status)}</StatusBadge>
                {interpretation.is_restricted && <StatusBadge tone="warning">Restricted</StatusBadge>}
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}

function RepeatedMeasurePanel(props: {
  series: RepeatedMeasureSeries[]
  members: RepeatedMeasureMember[]
  selectedAssessmentId: string
  results: OutcomeResultRecord[]
  definitions: AssessmentDefinition[]
}) {
  const linkedMembers = props.members.filter((member) => member.clinical_assessment_id === props.selectedAssessmentId)
  return (
    <Card className="clinical-assessment-support-card">
      <div className="practice-profile-form-header"><div><span>Repeated measures</span><h3>Longitudinal outcome</h3></div></div>
      {linkedMembers.length === 0 ? (
        <EmptyState title="No repeated-measure series" description="Comparable baseline and follow-up series will appear here when explicitly linked." />
      ) : (
        <div className="clinical-assessment-mini-list">
          {linkedMembers.map((member) => {
            const series = props.series.find((item) => item.id === member.assessment_repeated_measure_series_id)
            const definition = props.definitions.find((item) => item.id === series?.outcome_measure_definition_id)
            const result = props.results.find((item) => item.id === member.outcome_measure_result_id)
            return (
              <article key={member.id}>
                <strong>{definition?.name ?? series?.measure_family_key ?? 'Repeated measure'}</strong>
                <span>{formatLabel(member.series_role)} · current {result?.numeric_score ?? result?.raw_score ?? 'n/a'} · {series?.comparison_policy ? formatLabel(series.comparison_policy) : 'comparison policy not set'}</span>
                {!member.comparison_eligible && <StatusBadge tone="warning">Incomparable</StatusBadge>}
              </article>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function LinksAndPublicationPanel(props: {
  goalLinks: AssessmentGoalLink[]
  noteLinks: AssessmentNoteLink[]
  invitations: AssessmentInvitation[]
  imports: AssessmentImport[]
  publications: AssessmentPublication[]
  amendments: AssessmentAmendment[]
}) {
  return (
    <Card className="clinical-assessment-support-card">
      <div className="practice-profile-form-header"><div><span>Links and boundaries</span><h3>Context and Patient Link</h3></div></div>
      <div className="clinical-assessment-mini-list">
        {props.goalLinks.map((link) => (
          <article key={link.id}><strong>{formatLabel(link.link_type)}</strong><span>{link.evidence_summary || 'Linked treatment-plan or goal evidence'} · {formatDateTime(link.created_at)}</span></article>
        ))}
        {props.noteLinks.map((link) => (
          <article key={link.id}><strong>{formatLabel(link.link_type)}</strong><span>{link.summary || 'Linked clinical note'} · {formatDateTime(link.created_at)}</span></article>
        ))}
        {props.publications.map((publication) => (
          <article key={publication.id}><strong>{publication.patient_facing_title}</strong><span>{formatLabel(publication.publication_status)} · eligible is not the same as published · {formatDateTime(publication.published_at || publication.created_at)}</span></article>
        ))}
        {props.invitations.map((invitation) => (
          <article key={invitation.id}><strong>Patient-reported invitation</strong><span>{formatLabel(invitation.invitation_status)} · delivery {formatLabel(invitation.delivery_status)} · expires {formatDateTime(invitation.expires_at)}</span></article>
        ))}
        {props.imports.map((importRecord) => (
          <article key={importRecord.id}><strong>{importRecord.vendor_name || importRecord.source_type}</strong><span>{formatLabel(importRecord.import_status)} · validation {formatLabel(importRecord.validation_status)} · duplicate {formatLabel(importRecord.duplicate_status)}</span></article>
        ))}
        {props.amendments.map((amendment) => (
          <article key={amendment.id}><strong>Amendment {amendment.amendment_number}</strong><span>{amendment.amendment_reason} · {formatLabel(amendment.target_record_type)} · {formatDateTime(amendment.created_at)}</span></article>
        ))}
        {props.goalLinks.length + props.noteLinks.length + props.publications.length + props.invitations.length + props.imports.length + props.amendments.length === 0 && (
          <EmptyState title="No linked metadata" description="Treatment-goal links, note links, patient invitations, imports, amendments and Patient Link publication metadata will appear here when present." />
        )}
      </div>
    </Card>
  )
}
