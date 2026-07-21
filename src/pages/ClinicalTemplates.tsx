import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, SearchBar, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database, Json } from '../lib/database.types'

type TemplateRow = {
  id: string
  tenant_id: string | null
  template_key: string
  name: string
  description: string | null
  discipline_tags: string[]
  template_status: string
  active_version_id: string | null
  is_system_template: boolean
  template_owner_type: string
  metadata: Json
  deleted_at: string | null
  created_at: string
  lock_version: number
  updated_at: string
}

type TemplateVersionRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  version_number: number
  version_status: string
  visibility_default: string
  release_notes: string | null
  review_status: string
  validation_status: string
  publication_ready: boolean
  effective_from: string | null
  effective_until: string | null
  published_at: string | null
  published_by_profile_id: string | null
  retired_at: string | null
  retirement_reason: string | null
  source_template_version_id: string | null
  metadata: Json
  deleted_at: string | null
  lock_version: number
  updated_at: string
  created_at: string
}

type SectionRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_version_id: string
  section_key: string
  section_label: string
  description: string | null
  display_order: number
  section_type: string
  patient_visible_eligible: boolean
  practitioner_only: boolean
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
  lock_version: number
}

type FieldRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_version_id: string
  clinical_template_section_id: string
  field_key: string
  field_label: string
  field_type: string
  display_order: number
  help_text: string | null
  placeholder: string | null
  allowed_units: string[]
  is_required: boolean
  is_required_on_finalise: boolean
  is_read_only: boolean
  is_calculated: boolean
  patient_visible_eligible: boolean
  practitioner_only: boolean
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
  lock_version: number
}

type OptionRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_version_id: string
  clinical_template_field_id: string
  option_key: string
  option_label: string
  display_order: number
  is_default: boolean
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
  lock_version: number
}

type ValidationRuleRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_version_id: string
  clinical_template_section_id: string | null
  clinical_template_field_id: string | null
  rule_key: string
  rule_type: string
  severity: string
  applies_on: string
  rule_config: Json
  message: string | null
  is_active: boolean
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
  lock_version: number
}

type CalculationRuleRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_version_id: string
  target_clinical_template_field_id: string
  calculation_key: string
  calculation_type: string
  input_field_keys: string[]
  calculation_status: string
  is_required_for_finalise: boolean
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type AssignmentRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  clinical_note_template_version_id: string | null
  assignment_scope: string
  discipline: string | null
  encounter_type: string | null
  session_type: string | null
  is_default: boolean
  is_active: boolean
  assignment_priority: number
  effective_from: string | null
  effective_until: string | null
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
  lock_version: number
}

type DraftStateRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  clinical_note_template_version_id: string
  draft_status: string
  validation_status: string
  review_status: string
  publication_ready: boolean
  last_saved_at: string
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
  lock_version: number
}

type ReviewRequestRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  clinical_note_template_version_id: string
  review_status: string
  requested_at: string
  decision_at: string | null
  decision_reason: string | null
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type ValidationResultRow = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  clinical_note_template_version_id: string
  validation_status: string
  validation_scope: string
  finding_count: number
  error_count: number
  warning_count: number
  info_count: number
  findings: Json
  validated_at: string
  metadata: Json
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type UsageSummaryRow = Database['public']['Views']['clinical_template_usage_summary']['Row']

type TemplateTab = 'metadata' | 'structure' | 'validation' | 'preview' | 'versions' | 'assignments' | 'review' | 'usage'

type TemplateFilters = {
  search: string
  lifecycle: string
  ownership: string
  discipline: string
}

type TemplateCreateForm = {
  name: string
  description: string
  templateKey: string
  scope: string
  disciplineTags: string
  defaultNoteType: string
}

type MetadataForm = {
  name: string
  description: string
  disciplineTags: string
  releaseNotes: string
}

type SectionForm = {
  id: string | null
  sectionKey: string
  sectionLabel: string
  displayOrder: string
  sectionType: string
  patientVisibleEligible: boolean
  practitionerOnly: boolean
  lockVersion: number | null
}

type FieldForm = {
  id: string | null
  sectionId: string
  fieldKey: string
  fieldLabel: string
  fieldType: string
  displayOrder: string
  isRequired: boolean
  isRequiredOnFinalise: boolean
  patientVisibleEligible: boolean
  practitionerOnly: boolean
  allowedUnits: string
  lockVersion: number | null
}

type OptionForm = {
  id: string | null
  fieldId: string
  optionKey: string
  optionLabel: string
  displayOrder: string
  isDefault: boolean
  lockVersion: number | null
}

type ValidationRuleForm = {
  id: string | null
  ruleKey: string
  ruleType: string
  severity: string
  appliesOn: string
  targetSectionId: string
  targetFieldId: string
  message: string
  isActive: boolean
  lockVersion: number | null
}

type AssignmentForm = {
  id: string | null
  assignmentScope: string
  discipline: string
  encounterType: string
  sessionType: string
  isDefault: boolean
  assignmentPriority: string
  effectiveFrom: string
  effectiveUntil: string
  lockVersion: number | null
}

const tabs: Array<{ id: TemplateTab; label: string }> = [
  { id: 'metadata', label: 'Metadata' },
  { id: 'structure', label: 'Sections & Fields' },
  { id: 'validation', label: 'Validation' },
  { id: 'preview', label: 'Preview' },
  { id: 'versions', label: 'Versions' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'review', label: 'Review' },
  { id: 'usage', label: 'Usage' },
]

const lifecycleFilters = ['all', 'draft', 'active', 'retired', 'archived']
const ownershipFilters = ['all', 'tenant', 'system']
const sectionTypeOptions = ['standard', 'group', 'heading', 'instructions']
const editableFieldTypes = [
  'short_text',
  'long_text',
  'number',
  'decimal',
  'date',
  'time',
  'datetime',
  'boolean',
  'single_choice',
  'multiple_choice',
  'checklist',
  'scale',
  'measurement',
  'laterality',
  'body_area',
  'heading',
  'instruction',
]
const readOnlyFieldTypes = ['calculated', 'table', 'repeating_group', 'outcome_measure_reference', 'diagnosis_reference', 'treatment_goal_reference', 'attachment_reference']
const choiceFieldTypes = ['single_choice', 'multiple_choice', 'checklist', 'scale', 'laterality', 'body_area']
const validationRuleTypes = ['required', 'character_limit', 'numeric_range', 'allowed_units', 'allowed_options', 'date_restriction', 'conditional_required', 'finalisation_requirement']
const assignmentScopes = ['tenant', 'discipline', 'encounter_type', 'session_type']

const emptyCreateForm: TemplateCreateForm = {
  name: '',
  description: '',
  templateKey: '',
  scope: 'tenant',
  disciplineTags: '',
  defaultNoteType: 'progress_note',
}

const emptySectionForm: SectionForm = {
  id: null,
  sectionKey: '',
  sectionLabel: '',
  displayOrder: '1',
  sectionType: 'standard',
  patientVisibleEligible: false,
  practitionerOnly: false,
  lockVersion: null,
}

const emptyFieldForm: FieldForm = {
  id: null,
  sectionId: '',
  fieldKey: '',
  fieldLabel: '',
  fieldType: 'short_text',
  displayOrder: '1',
  isRequired: false,
  isRequiredOnFinalise: false,
  patientVisibleEligible: false,
  practitionerOnly: false,
  allowedUnits: '',
  lockVersion: null,
}

const emptyOptionForm: OptionForm = {
  id: null,
  fieldId: '',
  optionKey: '',
  optionLabel: '',
  displayOrder: '1',
  isDefault: false,
  lockVersion: null,
}

const emptyValidationRuleForm: ValidationRuleForm = {
  id: null,
  ruleKey: '',
  ruleType: 'required',
  severity: 'error',
  appliesOn: 'finalise',
  targetSectionId: '',
  targetFieldId: '',
  message: '',
  isActive: true,
  lockVersion: null,
}

const emptyAssignmentForm: AssignmentForm = {
  id: null,
  assignmentScope: 'tenant',
  discipline: '',
  encounterType: '',
  sessionType: '',
  isDefault: false,
  assignmentPriority: '100',
  effectiveFrom: '',
  effectiveUntil: '',
  lockVersion: null,
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Not set'
  return value.replaceAll('_', ' ')
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(value))
}

function statusTone(status: string | null | undefined): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (!status) return 'neutral'
  if (['active', 'valid', 'approved', 'published'].includes(status)) return 'success'
  if (['invalid', 'changes_requested', 'retired', 'archived'].includes(status)) return 'danger'
  if (['draft', 'review_requested', 'in_review', 'warning', 'not_run'].includes(status)) return 'warning'
  return 'info'
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'The template action could not be completed.'
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('row-level security') || lowerMessage.includes('not allowed')) {
    return 'Your current role cannot complete this clinical template action.'
  }
  if (lowerMessage.includes('changed since it was loaded')) {
    return 'This draft changed after you loaded it. Reload the latest draft before saving.'
  }
  if (lowerMessage.includes('invalid')) {
    return message
  }
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    return message
  }
  return message.replace(/SQLSTATE.*$/i, '').trim()
}

function validationSummary(value: Json) {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.map((item) => String(item))
  const record = value as Record<string, Json>
  const findings = record.findings
  if (Array.isArray(findings)) return findings.map((item) => JSON.stringify(item))
  return Object.entries(record).map(([key, item]) => `${formatLabel(key)}: ${typeof item === 'string' ? item : JSON.stringify(item)}`)
}

function metadataFormFrom(template: TemplateRow | null, version: TemplateVersionRow | null): MetadataForm {
  return {
    name: template?.name ?? '',
    description: template?.description ?? '',
    disciplineTags: template?.discipline_tags?.join(', ') ?? '',
    releaseNotes: version?.release_notes ?? '',
  }
}

function sectionFormFrom(section: SectionRow): SectionForm {
  return {
    id: section.id,
    sectionKey: section.section_key,
    sectionLabel: section.section_label,
    displayOrder: String(section.display_order),
    sectionType: section.section_type,
    patientVisibleEligible: section.patient_visible_eligible,
    practitionerOnly: section.practitioner_only,
    lockVersion: section.lock_version,
  }
}

function fieldFormFrom(field: FieldRow): FieldForm {
  return {
    id: field.id,
    sectionId: field.clinical_template_section_id,
    fieldKey: field.field_key,
    fieldLabel: field.field_label,
    fieldType: field.field_type,
    displayOrder: String(field.display_order),
    isRequired: field.is_required,
    isRequiredOnFinalise: field.is_required_on_finalise,
    patientVisibleEligible: field.patient_visible_eligible,
    practitionerOnly: field.practitioner_only,
    allowedUnits: field.allowed_units.join(', '),
    lockVersion: field.lock_version,
  }
}

function optionFormFrom(option: OptionRow): OptionForm {
  return {
    id: option.id,
    fieldId: option.clinical_template_field_id,
    optionKey: option.option_key,
    optionLabel: option.option_label,
    displayOrder: String(option.display_order),
    isDefault: option.is_default,
    lockVersion: option.lock_version,
  }
}

function validationRuleFormFrom(rule: ValidationRuleRow): ValidationRuleForm {
  return {
    id: rule.id,
    ruleKey: rule.rule_key,
    ruleType: rule.rule_type,
    severity: rule.severity,
    appliesOn: rule.applies_on,
    targetSectionId: rule.clinical_template_section_id ?? '',
    targetFieldId: rule.clinical_template_field_id ?? '',
    message: rule.message ?? '',
    isActive: rule.is_active,
    lockVersion: rule.lock_version,
  }
}

function assignmentFormFrom(assignment: AssignmentRow): AssignmentForm {
  return {
    id: assignment.id,
    assignmentScope: assignment.assignment_scope,
    discipline: assignment.discipline ?? '',
    encounterType: assignment.encounter_type ?? '',
    sessionType: assignment.session_type ?? '',
    isDefault: assignment.is_default,
    assignmentPriority: String(assignment.assignment_priority),
    effectiveFrom: assignment.effective_from ?? '',
    effectiveUntil: assignment.effective_until ?? '',
    lockVersion: assignment.lock_version,
  }
}

export function ClinicalTemplatesPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canViewTemplates = authorization.hasPermission('tenant.clinical.view', 'tenant.clinical.manage', 'tenant.practice.configure')
  const canEditTemplates = authorization.hasPermission('tenant.clinical.manage', 'tenant.practice.configure')
  const canAdministerTemplates = authorization.hasRole('admin') && authorization.hasPermission('tenant.practice.configure')

  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [versions, setVersions] = useState<TemplateVersionRow[]>([])
  const [sections, setSections] = useState<SectionRow[]>([])
  const [fields, setFields] = useState<FieldRow[]>([])
  const [options, setOptions] = useState<OptionRow[]>([])
  const [validationRules, setValidationRules] = useState<ValidationRuleRow[]>([])
  const [calculationRules, setCalculationRules] = useState<CalculationRuleRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [draftStates, setDraftStates] = useState<DraftStateRow[]>([])
  const [reviewRequests, setReviewRequests] = useState<ReviewRequestRow[]>([])
  const [validationResults, setValidationResults] = useState<ValidationResultRow[]>([])
  const [usageSummary, setUsageSummary] = useState<UsageSummaryRow[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TemplateTab>('metadata')
  const [filters, setFilters] = useState<TemplateFilters>({ search: '', lifecycle: 'all', ownership: 'all', discipline: '' })
  const [createForm, setCreateForm] = useState<TemplateCreateForm>(emptyCreateForm)
  const [metadataForm, setMetadataForm] = useState<MetadataForm>(metadataFormFrom(null, null))
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm)
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyFieldForm)
  const [optionForm, setOptionForm] = useState<OptionForm>(emptyOptionForm)
  const [validationRuleForm, setValidationRuleForm] = useState<ValidationRuleForm>(emptyValidationRuleForm)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm)
  const [loading, setLoading] = useState(true)
  const [actionName, setActionName] = useState('')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [retirementReason, setRetirementReason] = useState('')
  const [duplicateName, setDuplicateName] = useState('')
  const [duplicateKey, setDuplicateKey] = useState('')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  )
  const selectedTemplateVersions = useMemo(
    () => versions
      .filter((version) => version.clinical_note_template_id === selectedTemplateId)
      .sort((left, right) => right.version_number - left.version_number),
    [versions, selectedTemplateId],
  )
  const selectedVersion = useMemo(
    () => selectedTemplateVersions.find((version) => version.id === selectedVersionId) ?? selectedTemplateVersions[0] ?? null,
    [selectedTemplateVersions, selectedVersionId],
  )
  const currentDraftState = useMemo(
    () => draftStates.find((draftState) => draftState.clinical_note_template_version_id === selectedVersion?.id) ?? null,
    [draftStates, selectedVersion?.id],
  )
  const currentUsage = useMemo(
    () => usageSummary.find((usage) => usage.clinical_note_template_version_id === selectedVersion?.id) ?? null,
    [usageSummary, selectedVersion?.id],
  )
  const selectedSections = useMemo(
    () => sections
      .filter((section) => section.clinical_note_template_version_id === selectedVersion?.id)
      .sort((left, right) => left.display_order - right.display_order),
    [sections, selectedVersion?.id],
  )
  const selectedFields = useMemo(
    () => fields
      .filter((field) => field.clinical_note_template_version_id === selectedVersion?.id)
      .sort((left, right) => left.display_order - right.display_order),
    [fields, selectedVersion?.id],
  )
  const selectedValidationRules = useMemo(
    () => validationRules.filter((rule) => rule.clinical_note_template_version_id === selectedVersion?.id),
    [validationRules, selectedVersion?.id],
  )
  const selectedCalculationRules = useMemo(
    () => calculationRules.filter((rule) => rule.clinical_note_template_version_id === selectedVersion?.id),
    [calculationRules, selectedVersion?.id],
  )
  const selectedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.clinical_note_template_id === selectedTemplateId),
    [assignments, selectedTemplateId],
  )
  const selectedReviewRequests = useMemo(
    () => reviewRequests.filter((request) => request.clinical_note_template_version_id === selectedVersion?.id),
    [reviewRequests, selectedVersion?.id],
  )
  const selectedValidationResults = useMemo(
    () => validationResults
      .filter((result) => result.clinical_note_template_version_id === selectedVersion?.id)
      .sort((left, right) => right.validated_at.localeCompare(left.validated_at)),
    [validationResults, selectedVersion?.id],
  )

  const disciplines = useMemo(() => {
    const allTags = new Set<string>()
    templates.forEach((template) => template.discipline_tags.forEach((tag) => allTags.add(tag)))
    return Array.from(allTags).sort((left, right) => left.localeCompare(right))
  }, [templates])

  const filteredTemplates = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return templates.filter((template) => {
      const templateVersions = versions.filter((version) => version.clinical_note_template_id === template.id)
      const hasDraft = templateVersions.some((version) => version.version_status === 'draft')
      const owner = template.is_system_template || template.tenant_id === null ? 'system' : 'tenant'
      const latestVersion = templateVersions.sort((left, right) => right.version_number - left.version_number)[0] ?? null
      const matchesSearch = !search || `${template.name} ${template.template_key} ${template.description ?? ''}`.toLowerCase().includes(search)
      const matchesLifecycle = filters.lifecycle === 'all'
        || template.template_status === filters.lifecycle
        || (filters.lifecycle === 'draft' && hasDraft)
      const matchesOwnership = filters.ownership === 'all' || owner === filters.ownership
      const matchesDiscipline = !filters.discipline || template.discipline_tags.includes(filters.discipline)

      return matchesSearch && matchesLifecycle && matchesOwnership && matchesDiscipline && latestVersion
    })
  }, [filters, templates, versions])

  const isDraft = selectedVersion?.version_status === 'draft'
  const isImmutable = Boolean(selectedVersion && selectedVersion.version_status !== 'draft')
  const canEditDraft = Boolean(canEditTemplates && isDraft && selectedTemplate?.tenant_id === activeTenant?.id)
  const canPublishDraft = Boolean(canAdministerTemplates && isDraft && selectedTemplate?.tenant_id === activeTenant?.id)
  const canAssignTemplate = Boolean(canAdministerTemplates && selectedVersion?.version_status === 'active' && selectedTemplate?.tenant_id === activeTenant?.id)

  useEffect(() => {
    void loadTemplateData()
  }, [activeTenant?.id])

  useEffect(() => {
    setMetadataForm(metadataFormFrom(selectedTemplate, selectedVersion))
    setRetirementReason('')
    setDuplicateName(selectedTemplate ? `${selectedTemplate.name} copy` : '')
    setDuplicateKey(selectedTemplate ? `${selectedTemplate.template_key}_copy` : '')
    setSectionForm(emptySectionForm)
    setFieldForm((current) => ({ ...emptyFieldForm, sectionId: selectedSections[0]?.id ?? current.sectionId ?? '' }))
    setOptionForm(emptyOptionForm)
    setValidationRuleForm(emptyValidationRuleForm)
    setAssignmentForm(emptyAssignmentForm)
    setActionError('')
    setSuccessMessage('')
  }, [selectedTemplate?.id, selectedVersion?.id])

  useEffect(() => {
    if (!fieldForm.sectionId && selectedSections[0]?.id) {
      setFieldForm((current) => ({ ...current, sectionId: selectedSections[0].id }))
    }
  }, [selectedSections, fieldForm.sectionId])

  async function loadTemplateData(preferredTemplateId?: string, preferredVersionId?: string) {
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
    if (!canViewTemplates) {
      setLoading(false)
      setLoadError('Your current role cannot view clinical template management.')
      return
    }

    const tenantId = activeTenant.id
    setLoading(true)
    setLoadError('')
    setActionError('')

    const templateResult = await supabase
      .from('clinical_note_templates')
      .select(`
        id,
        tenant_id,
        template_owner_type,
        template_key,
        name,
        description,
        discipline_tags,
        template_status,
        active_version_id,
        is_system_template,
        metadata,
        lock_version,
        deleted_at,
        created_at,
        updated_at
      `)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (templateResult.error) {
      setLoadError(safeErrorMessage(templateResult.error))
      setLoading(false)
      return
    }

    const loadedTemplates = (templateResult.data ?? []) as TemplateRow[]
    const versionResult = await supabase
      .from('clinical_note_template_versions')
      .select(`
        id,
        tenant_id,
        clinical_note_template_id,
        version_number,
        version_status,
        visibility_default,
        release_notes,
        review_status,
        validation_status,
        publication_ready,
        effective_from,
        effective_until,
        published_at,
        published_by_profile_id,
        retired_at,
        retirement_reason,
        source_template_version_id,
        metadata,
        lock_version,
        deleted_at,
        created_at,
        updated_at
      `)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('version_number', { ascending: false })

    if (versionResult.error) {
      setLoadError(safeErrorMessage(versionResult.error))
      setTemplates(loadedTemplates)
      setLoading(false)
      return
    }

    const loadedVersions = (versionResult.data ?? []) as TemplateVersionRow[]
    const versionIds = loadedVersions.map((version) => version.id)
    const templateIds = loadedTemplates.map((template) => template.id)

    const [
      sectionsResult,
      fieldsResult,
      optionsResult,
      validationRulesResult,
      calculationRulesResult,
      assignmentsResult,
      draftStatesResult,
      reviewRequestsResult,
      validationResultsResult,
      usageSummaryResult,
    ] = await Promise.all([
      versionIds.length
        ? supabase.from('clinical_template_sections').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('display_order')
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_fields').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('display_order')
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_field_options').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('display_order')
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_validation_rules').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_calculation_rules').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      templateIds.length
        ? supabase.from('clinical_template_assignments').select('*').in('clinical_note_template_id', templateIds).is('deleted_at', null).order('assignment_priority')
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_draft_states').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null)
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_review_requests').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('requested_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      versionIds.length
        ? supabase.from('clinical_template_validation_results').select('*').in('clinical_note_template_version_id', versionIds).is('deleted_at', null).order('validated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('clinical_template_usage_summary').select('*').eq('tenant_id', tenantId),
    ])

    const queryError = [
      sectionsResult.error,
      fieldsResult.error,
      optionsResult.error,
      validationRulesResult.error,
      calculationRulesResult.error,
      assignmentsResult.error,
      draftStatesResult.error,
      reviewRequestsResult.error,
      validationResultsResult.error,
      usageSummaryResult.error,
    ].find(Boolean)

    if (queryError) {
      setLoadError(safeErrorMessage(queryError))
      setLoading(false)
      return
    }

    const nextTemplateId = preferredTemplateId ?? selectedTemplateId ?? loadedTemplates[0]?.id ?? null
    const nextVersions = loadedVersions.filter((version) => version.clinical_note_template_id === nextTemplateId)
    const nextVersionId = preferredVersionId ?? selectedVersionId ?? nextVersions[0]?.id ?? null

    setTemplates(loadedTemplates)
    setVersions(loadedVersions)
    setSections((sectionsResult.data ?? []) as SectionRow[])
    setFields((fieldsResult.data ?? []) as FieldRow[])
    setOptions((optionsResult.data ?? []) as OptionRow[])
    setValidationRules((validationRulesResult.data ?? []) as ValidationRuleRow[])
    setCalculationRules((calculationRulesResult.data ?? []) as CalculationRuleRow[])
    setAssignments((assignmentsResult.data ?? []) as AssignmentRow[])
    setDraftStates((draftStatesResult.data ?? []) as DraftStateRow[])
    setReviewRequests((reviewRequestsResult.data ?? []) as ReviewRequestRow[])
    setValidationResults((validationResultsResult.data ?? []) as ValidationResultRow[])
    setUsageSummary((usageSummaryResult.data ?? []) as UsageSummaryRow[])
    setSelectedTemplateId(nextTemplateId)
    setSelectedVersionId(nextVersionId)
    setLoading(false)
  }

  const updateFilter = <Field extends keyof TemplateFilters>(field: Field, value: TemplateFilters[Field]) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const updateCreateForm = <Field extends keyof TemplateCreateForm>(field: Field, value: TemplateCreateForm[Field]) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
      templateKey: field === 'name' && !current.templateKey.trim() ? slugify(String(value)) : current.templateKey,
    }))
    setActionError('')
  }

  async function runAction<T>(name: string, callback: () => Promise<T>, successText: string, preferredTemplateId?: string, preferredVersionId?: string) {
    if (!supabase || !activeTenant?.id) return null
    setActionName(name)
    setActionError('')
    setSuccessMessage('')
    try {
      const result = await callback()
      setSuccessMessage(successText)
      await loadTemplateData(preferredTemplateId, preferredVersionId)
      return result
    } catch (error) {
      setActionError(safeErrorMessage(error))
      return null
    } finally {
      setActionName('')
    }
  }

  async function createTemplate() {
    if (!supabase || !activeTenant?.id || !canEditTemplates) return
    if (!createForm.name.trim()) {
      setActionError('Template name is required.')
      return
    }
    const templateKey = createForm.templateKey.trim() || slugify(createForm.name)
    if (!templateKey) {
      setActionError('Template key is required.')
      return
    }

    const idempotencyKey = crypto.randomUUID()
    const result = await runAction(
      'create',
      async () => {
        const response = await supabase!.rpc('create_clinical_template_draft', {
          target_tenant_id: activeTenant.id,
          template_key_input: templateKey,
          template_name_input: createForm.name.trim(),
          description_input: emptyToNull(createForm.description) ?? undefined,
          discipline_tags_input: splitTags(createForm.disciplineTags),
          default_note_type_input: createForm.defaultNoteType,
          idempotency_key_input: idempotencyKey,
        })
        if (response.error) throw response.error
        return response.data?.[0] ?? null
      },
      'Draft template created.',
    )

    if (result) {
      setCreateForm(emptyCreateForm)
      setSelectedTemplateId(result.clinical_note_template_id)
      setSelectedVersionId(result.clinical_note_template_version_id)
      setActiveTab('metadata')
      await loadTemplateData(result.clinical_note_template_id, result.clinical_note_template_version_id)
    }
  }

  async function saveMetadata() {
    if (!supabase || !selectedTemplate || !selectedVersion || !canEditDraft) return
    if (!metadataForm.name.trim()) {
      setActionError('Template name is required.')
      return
    }

    await runAction(
      'metadata',
      async () => {
        const response = await supabase!.rpc('update_clinical_template_draft_metadata', {
          target_template_version_id: selectedVersion.id,
          template_name_input: metadataForm.name.trim(),
          description_input: emptyToNull(metadataForm.description) ?? undefined,
          discipline_tags_input: splitTags(metadataForm.disciplineTags),
          release_notes_input: emptyToNull(metadataForm.releaseNotes) ?? undefined,
          expected_template_lock_version: selectedTemplate.lock_version,
          expected_version_lock_version: selectedVersion.lock_version,
          idempotency_key_input: crypto.randomUUID(),
        })
        if (response.error) throw response.error
        return response.data
      },
      'Template metadata saved.',
      selectedTemplate.id,
      selectedVersion.id,
    )
  }

  async function saveSection() {
    if (!supabase || !selectedVersion || !canEditDraft) return
    if (!sectionForm.sectionKey.trim() || !sectionForm.sectionLabel.trim()) {
      setActionError('Section key and label are required.')
      return
    }

    await runAction(
      'section',
      async () => {
        const response = await supabase!.rpc('upsert_clinical_template_section', {
          target_template_version_id: selectedVersion.id,
          section_id_input: sectionForm.id ?? undefined,
          section_key_input: sectionForm.sectionKey.trim(),
          section_label_input: sectionForm.sectionLabel.trim(),
          display_order_input: Number(sectionForm.displayOrder || 1),
          section_type_input: sectionForm.sectionType,
          patient_visible_eligible_input: sectionForm.patientVisibleEligible,
          practitioner_only_input: sectionForm.practitionerOnly,
          expected_lock_version: sectionForm.lockVersion ?? undefined,
          idempotency_key_input: crypto.randomUUID(),
        })
        if (response.error) throw response.error
        return response.data
      },
      'Section saved.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
    setSectionForm(emptySectionForm)
  }

  async function saveField() {
    if (!supabase || !selectedVersion || !canEditDraft) return
    if (!fieldForm.sectionId || !fieldForm.fieldKey.trim() || !fieldForm.fieldLabel.trim()) {
      setActionError('Field section, key and label are required.')
      return
    }
    if (readOnlyFieldTypes.includes(fieldForm.fieldType)) {
      setActionError('This field type is currently inspection-only and cannot be authored from the safe template editor yet.')
      return
    }

    await runAction(
      'field',
      async () => {
        const response = await supabase!.rpc('upsert_clinical_template_field', {
          target_template_version_id: selectedVersion.id,
          target_section_id: fieldForm.sectionId,
          field_id_input: fieldForm.id ?? undefined,
          field_key_input: fieldForm.fieldKey.trim(),
          field_label_input: fieldForm.fieldLabel.trim(),
          field_type_input: fieldForm.fieldType,
          display_order_input: Number(fieldForm.displayOrder || 1),
          is_required_input: fieldForm.isRequired,
          is_required_on_finalise_input: fieldForm.isRequiredOnFinalise,
          patient_visible_eligible_input: fieldForm.patientVisibleEligible,
          practitioner_only_input: fieldForm.practitionerOnly,
          allowed_units_input: splitTags(fieldForm.allowedUnits),
          expected_lock_version: fieldForm.lockVersion ?? undefined,
          idempotency_key_input: crypto.randomUUID(),
        })
        if (response.error) throw response.error
        return response.data
      },
      'Field saved.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
    setFieldForm((current) => ({ ...emptyFieldForm, sectionId: current.sectionId }))
  }

  async function saveOption() {
    if (!supabase || !selectedVersion || !canEditDraft) return
    if (!optionForm.fieldId || !optionForm.optionKey.trim() || !optionForm.optionLabel.trim()) {
      setActionError('Option field, key and label are required.')
      return
    }

    await runAction(
      'option',
      async () => {
        const response = await supabase!.rpc('upsert_clinical_template_field_option', {
          target_template_version_id: selectedVersion.id,
          target_field_id: optionForm.fieldId,
          option_id_input: optionForm.id ?? undefined,
          option_key_input: optionForm.optionKey.trim(),
          option_label_input: optionForm.optionLabel.trim(),
          display_order_input: Number(optionForm.displayOrder || 1),
          is_default_input: optionForm.isDefault,
          expected_lock_version: optionForm.lockVersion ?? undefined,
          idempotency_key_input: crypto.randomUUID(),
        })
        if (response.error) throw response.error
        return response.data
      },
      'Option saved.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
    setOptionForm((current) => ({ ...emptyOptionForm, fieldId: current.fieldId }))
  }

  async function saveValidationRule() {
    if (!supabase || !selectedVersion || !canEditDraft) return
    if (!validationRuleForm.ruleKey.trim()) {
      setActionError('Validation rule key is required.')
      return
    }
    if (!validationRuleForm.targetSectionId && !validationRuleForm.targetFieldId) {
      setActionError('Validation rules must target a section or field.')
      return
    }

    await runAction(
      'validation-rule',
      async () => {
        const response = await supabase!.rpc('upsert_clinical_template_validation_rule', {
          target_template_version_id: selectedVersion.id,
          rule_id_input: validationRuleForm.id ?? undefined,
          rule_key_input: validationRuleForm.ruleKey.trim(),
          rule_type_input: validationRuleForm.ruleType,
          severity_input: validationRuleForm.severity,
          applies_on_input: validationRuleForm.appliesOn,
          target_section_id: emptyToNull(validationRuleForm.targetSectionId) ?? undefined,
          target_field_id: emptyToNull(validationRuleForm.targetFieldId) ?? undefined,
          rule_config_input: {},
          message_input: emptyToNull(validationRuleForm.message) ?? undefined,
          is_active_input: validationRuleForm.isActive,
          expected_lock_version: validationRuleForm.lockVersion ?? undefined,
          idempotency_key_input: crypto.randomUUID(),
        })
        if (response.error) throw response.error
        return response.data
      },
      'Validation rule saved.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
    setValidationRuleForm(emptyValidationRuleForm)
  }

  async function runValidation() {
    if (!supabase || !selectedVersion || !canEditTemplates) return
    await runAction(
      'validate',
      async () => {
        const response = await supabase!.rpc('run_clinical_template_validation', {
          target_template_version_id: selectedVersion.id,
          validation_scope_input: 'publish',
        })
        if (response.error) throw response.error
        return response.data
      },
      'Database-authoritative validation completed.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
  }

  async function publishVersion() {
    if (!supabase || !selectedVersion || !canPublishDraft) return
    const confirmed = window.confirm('Publish this clinical template version? Published versions are immutable and the current active version will be retired.')
    if (!confirmed) return

    await runAction(
      'publish',
      async () => {
        const response = await supabase!.rpc('publish_clinical_template_version', {
          target_template_version_id: selectedVersion.id,
        })
        if (response.error) throw response.error
        return response.data
      },
      'Template version published.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
  }

  async function retireVersion() {
    if (!supabase || !selectedVersion || !canAdministerTemplates || selectedVersion.version_status !== 'active') return
    const confirmed = window.confirm('Retire this clinical template version? Historical notes remain readable and unchanged.')
    if (!confirmed) return

    await runAction(
      'retire',
      async () => {
        const response = await supabase!.rpc('retire_clinical_template_version', {
          target_template_version_id: selectedVersion.id,
          retirement_reason_input: emptyToNull(retirementReason) ?? undefined,
        })
        if (response.error) throw response.error
        return response.data
      },
      'Template version retired.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
  }

  async function createVersionFromCurrent() {
    if (!supabase || !selectedVersion || !canEditTemplates || selectedTemplate?.tenant_id !== activeTenant?.id) return
    await runAction(
      'new-version',
      async () => {
        const response = await supabase!.rpc('create_clinical_template_version_from', {
          source_template_version_id: selectedVersion.id,
          change_reason_input: 'New draft version created from template management workspace',
        })
        if (response.error) throw response.error
        return response.data
      },
      'New draft version created.',
      selectedTemplate?.id,
    )
  }

  async function duplicateTemplate() {
    if (!supabase || !selectedVersion || !activeTenant?.id || !canEditTemplates) return
    if (!duplicateName.trim() || !duplicateKey.trim()) {
      setActionError('Duplicate template name and key are required.')
      return
    }

    const result = await runAction(
      'duplicate',
      async () => {
        const response = await supabase!.rpc('duplicate_clinical_template', {
          source_template_version_id: selectedVersion.id,
          target_tenant_id: activeTenant.id,
          new_template_key_input: duplicateKey.trim(),
          new_template_name_input: duplicateName.trim(),
          idempotency_key_input: crypto.randomUUID(),
        })
        if (response.error) throw response.error
        return response.data?.[0] ?? null
      },
      'Template duplicated into a new tenant draft.',
    )

    if (result) {
      setSelectedTemplateId(result.clinical_note_template_id)
      setSelectedVersionId(result.clinical_note_template_version_id)
      await loadTemplateData(result.clinical_note_template_id, result.clinical_note_template_version_id)
    }
  }

  async function saveAssignment() {
    if (!supabase || !selectedVersion || !canAssignTemplate) return

    await runAction(
      'assignment',
      async () => {
        const response = await supabase!.rpc('upsert_clinical_template_assignment', {
          target_template_version_id: selectedVersion.id,
          assignment_id_input: assignmentForm.id ?? undefined,
          assignment_scope_input: assignmentForm.assignmentScope,
          discipline_input: emptyToNull(assignmentForm.discipline) ?? undefined,
          encounter_type_input: emptyToNull(assignmentForm.encounterType) ?? undefined,
          session_type_input: emptyToNull(assignmentForm.sessionType) ?? undefined,
          practice_location_id_input: undefined,
          therapist_profile_id_input: undefined,
          is_default_input: assignmentForm.isDefault,
          assignment_priority_input: Number(assignmentForm.assignmentPriority || 100),
          effective_from_input: emptyToNull(assignmentForm.effectiveFrom) ?? undefined,
          effective_until_input: emptyToNull(assignmentForm.effectiveUntil) ?? undefined,
          expected_lock_version: assignmentForm.lockVersion ?? undefined,
        })
        if (response.error) throw response.error
        return response.data
      },
      'Template assignment saved.',
      selectedTemplate?.id,
      selectedVersion.id,
    )
    setAssignmentForm(emptyAssignmentForm)
  }

  if (loading) {
    return <LoadingState title="Loading clinical templates" description="Checking tenant templates, draft state, validation and usage metadata." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Clinical template management unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => void loadTemplateData()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="clinical-template-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Clinical configuration</span>
          <h3>{activeTenant?.practice_name ?? 'Clinical Templates'}</h3>
          <p>
            Manage draft documentation templates using protected authoring RPCs. Patient-visible eligibility is metadata only and does not publish clinical content.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{templates.length} templates</StatusBadge>
          {!canEditTemplates && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      {(actionError || successMessage) && (
        <div className={`workflow-alert ${actionError ? 'workflow-alert-error' : 'workflow-alert-success'}`}>
          <strong>{actionError ? 'Template action needs attention' : 'Template action complete'}</strong>
          <span>{actionError || successMessage}</span>
        </div>
      )}

      <div className="clinical-template-layout">
        <Card className="clinical-template-list-card">
          <div className="workflow-panel-header">
            <div>
              <span className="workflow-muted">Template library</span>
              <h3>Clinical Templates</h3>
            </div>
            <StatusBadge tone="info">{filteredTemplates.length} shown</StatusBadge>
          </div>

          <div className="workflow-filter-row clinical-template-filter-row">
            <SearchBar
              label="Search"
              value={filters.search}
              placeholder="Search templates"
              onChange={(value) => updateFilter('search', value)}
            />
            <label>
              <span>Lifecycle</span>
              <select value={filters.lifecycle} onChange={(event) => updateFilter('lifecycle', event.target.value)}>
                {lifecycleFilters.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}
              </select>
            </label>
            <label>
              <span>Ownership</span>
              <select value={filters.ownership} onChange={(event) => updateFilter('ownership', event.target.value)}>
                {ownershipFilters.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}
              </select>
            </label>
            <label>
              <span>Discipline</span>
              <select value={filters.discipline} onChange={(event) => updateFilter('discipline', event.target.value)}>
                <option value="">All disciplines</option>
                {disciplines.map((discipline) => <option value={discipline} key={discipline}>{discipline}</option>)}
              </select>
            </label>
          </div>

          {canEditTemplates && (
            <TemplateCreatePanel
              form={createForm}
              disabled={Boolean(actionName)}
              onChange={updateCreateForm}
              onCreate={createTemplate}
            />
          )}

          {filteredTemplates.length === 0 ? (
            <EmptyState title="No templates found" description="Create a tenant draft template or change the filters." />
          ) : (
            <div className="workflow-definition-list">
              {filteredTemplates.map((template) => (
                <TemplateListItem
                  template={template}
                  versions={versions.filter((version) => version.clinical_note_template_id === template.id)}
                  usage={usageSummary.filter((usage) => usage.clinical_note_template_id === template.id)}
                  assignmentCount={assignments.filter((assignment) => assignment.clinical_note_template_id === template.id && assignment.is_active).length}
                  selected={selectedTemplateId === template.id}
                  onSelect={() => {
                    const nextVersions = versions.filter((version) => version.clinical_note_template_id === template.id)
                    setSelectedTemplateId(template.id)
                    setSelectedVersionId(nextVersions[0]?.id ?? null)
                    setActiveTab('metadata')
                  }}
                  key={template.id}
                />
              ))}
            </div>
          )}
        </Card>

        <div className="clinical-template-editor-stack">
          {!selectedTemplate || !selectedVersion ? (
            <EmptyState title="Select a template" description="Choose a template from the library to manage its draft, publication, assignment and usage state." />
          ) : (
            <>
              <TemplateEditorHeader
                template={selectedTemplate}
                version={selectedVersion}
                draftState={currentDraftState}
                isImmutable={isImmutable}
                canPublish={canPublishDraft}
                actionName={actionName}
                onValidate={runValidation}
                onPublish={publishVersion}
                onCreateVersion={createVersionFromCurrent}
              />

              <div className="workflow-tabs" role="tablist" aria-label="Clinical template editor sections">
                {tabs.map((tab) => (
                  <button
                    className={activeTab === tab.id ? 'active' : ''}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    key={tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'metadata' && (
                <TemplateMetadataPanel
                  form={metadataForm}
                  template={selectedTemplate}
                  version={selectedVersion}
                  canEdit={canEditDraft}
                  saving={actionName === 'metadata'}
                  onChange={setMetadataForm}
                  onSave={saveMetadata}
                  duplicateName={duplicateName}
                  duplicateKey={duplicateKey}
                  onDuplicateNameChange={setDuplicateName}
                  onDuplicateKeyChange={setDuplicateKey}
                  onDuplicate={duplicateTemplate}
                  canDuplicate={canEditTemplates}
                />
              )}
              {activeTab === 'structure' && (
                <TemplateStructurePanel
                  sections={selectedSections}
                  fields={selectedFields}
                  options={options.filter((option) => option.clinical_note_template_version_id === selectedVersion.id)}
                  sectionForm={sectionForm}
                  fieldForm={fieldForm}
                  optionForm={optionForm}
                  canEdit={canEditDraft}
                  actionName={actionName}
                  onSectionFormChange={setSectionForm}
                  onFieldFormChange={setFieldForm}
                  onOptionFormChange={setOptionForm}
                  onEditSection={setSectionForm}
                  onEditField={setFieldForm}
                  onEditOption={setOptionForm}
                  onSaveSection={saveSection}
                  onSaveField={saveField}
                  onSaveOption={saveOption}
                />
              )}
              {activeTab === 'validation' && (
                <TemplateValidationPanel
                  rules={selectedValidationRules}
                  fields={selectedFields}
                  sections={selectedSections}
                  calculations={selectedCalculationRules}
                  results={selectedValidationResults}
                  form={validationRuleForm}
                  canEdit={canEditDraft}
                  canValidate={canEditTemplates}
                  actionName={actionName}
                  onFormChange={setValidationRuleForm}
                  onEditRule={setValidationRuleForm}
                  onSaveRule={saveValidationRule}
                  onValidate={runValidation}
                />
              )}
              {activeTab === 'preview' && (
                <TemplatePreviewPanel
                  sections={selectedSections}
                  fields={selectedFields}
                  options={options.filter((option) => option.clinical_note_template_version_id === selectedVersion.id)}
                />
              )}
              {activeTab === 'versions' && (
                <TemplateVersionHistoryPanel
                  versions={selectedTemplateVersions}
                  selectedVersionId={selectedVersion.id}
                  onSelectVersion={setSelectedVersionId}
                  canCreateVersion={canEditTemplates && selectedTemplate.tenant_id === activeTenant?.id}
                  onCreateVersion={createVersionFromCurrent}
                  retirementReason={retirementReason}
                  onRetirementReasonChange={setRetirementReason}
                  onRetire={retireVersion}
                  canRetire={canAdministerTemplates && selectedVersion.version_status === 'active'}
                  actionName={actionName}
                />
              )}
              {activeTab === 'assignments' && (
                <TemplateAssignmentPanel
                  assignments={selectedAssignments}
                  form={assignmentForm}
                  canEdit={canAssignTemplate}
                  actionName={actionName}
                  onFormChange={setAssignmentForm}
                  onEditAssignment={setAssignmentForm}
                  onSaveAssignment={saveAssignment}
                />
              )}
              {activeTab === 'review' && (
                <TemplateReviewPanel
                  version={selectedVersion}
                  reviewRequests={selectedReviewRequests}
                  canAdminister={canAdministerTemplates}
                />
              )}
              {activeTab === 'usage' && (
                <TemplateUsagePanel
                  usage={usageSummary.filter((usage) => usage.clinical_note_template_id === selectedTemplate.id)}
                  currentUsage={currentUsage}
                  assignments={selectedAssignments}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplateCreatePanel({
  form,
  disabled,
  onChange,
  onCreate,
}: {
  form: TemplateCreateForm
  disabled: boolean
  onChange: <Field extends keyof TemplateCreateForm>(field: Field, value: TemplateCreateForm[Field]) => void
  onCreate: () => void
}) {
  return (
    <Card className="clinical-template-create-card">
      <div className="workflow-panel-header">
        <div>
          <span className="workflow-muted">Transactional draft</span>
          <h4>New Template</h4>
        </div>
        <Button disabled={disabled} onClick={onCreate}>{disabled ? 'Working' : 'Create Draft'}</Button>
      </div>
      <div className="workflow-form-grid">
        <label>
          <span>Name</span>
          <input value={form.name} disabled={disabled} onChange={(event) => onChange('name', event.target.value)} />
        </label>
        <label>
          <span>Stable key</span>
          <input value={form.templateKey} disabled={disabled} onChange={(event) => onChange('templateKey', event.target.value)} />
        </label>
        <label>
          <span>Default note type</span>
          <input value={form.defaultNoteType} disabled={disabled} onChange={(event) => onChange('defaultNoteType', event.target.value)} />
        </label>
        <label>
          <span>Discipline tags</span>
          <input value={form.disciplineTags} disabled={disabled} placeholder="OT, speech, physio" onChange={(event) => onChange('disciplineTags', event.target.value)} />
        </label>
        <label className="workflow-form-wide">
          <span>Description</span>
          <textarea value={form.description} disabled={disabled} onChange={(event) => onChange('description', event.target.value)} />
        </label>
      </div>
    </Card>
  )
}

function TemplateListItem({
  template,
  versions,
  usage,
  assignmentCount,
  selected,
  onSelect,
}: {
  template: TemplateRow
  versions: TemplateVersionRow[]
  usage: UsageSummaryRow[]
  assignmentCount: number
  selected: boolean
  onSelect: () => void
}) {
  const sortedVersions = [...versions].sort((left, right) => right.version_number - left.version_number)
  const latestVersion = sortedVersions[0] ?? null
  const publishedVersion = sortedVersions.find((version) => version.version_status === 'active') ?? null
  const draftVersion = sortedVersions.find((version) => version.version_status === 'draft') ?? null
  const usageCount = usage.reduce((total, item) => total + (item.note_count ?? 0), 0)
  const lastUsedValues = usage
    .map((item) => item.last_used_at)
    .filter(Boolean)
    .sort()
  const lastUsed = lastUsedValues.length > 0 ? lastUsedValues[lastUsedValues.length - 1] : null

  return (
    <button className={selected ? 'active' : ''} type="button" onClick={onSelect}>
      <div>
        <strong>{template.name}</strong>
        <span>{template.description || 'No description'} · {template.template_key}</span>
        <span>
          Latest v{latestVersion?.version_number ?? '-'} · Published {publishedVersion ? `v${publishedVersion.version_number}` : 'none'} · Draft {draftVersion ? `v${draftVersion.version_number}` : 'none'}
        </span>
        <span>{assignmentCount} assignments · {usageCount} notes · Last used {formatDateTime(lastUsed)}</span>
      </div>
      <div className="workflow-definition-badges">
        <StatusBadge tone={template.is_system_template ? 'info' : 'neutral'}>{template.is_system_template ? 'System' : 'Tenant'}</StatusBadge>
        <StatusBadge tone={statusTone(template.template_status)}>{formatLabel(template.template_status)}</StatusBadge>
        <StatusBadge tone={statusTone(latestVersion?.validation_status)}>{formatLabel(latestVersion?.validation_status)}</StatusBadge>
      </div>
    </button>
  )
}

function TemplateEditorHeader({
  template,
  version,
  draftState,
  isImmutable,
  canPublish,
  actionName,
  onValidate,
  onPublish,
  onCreateVersion,
}: {
  template: TemplateRow
  version: TemplateVersionRow
  draftState: DraftStateRow | null
  isImmutable: boolean
  canPublish: boolean
  actionName: string
  onValidate: () => void
  onPublish: () => void
  onCreateVersion: () => void
}) {
  return (
    <Card className="workflow-detail-card">
      <div className="workflow-panel-header">
        <div>
          <span className="workflow-muted">Template editor</span>
          <h3>{template.name}</h3>
          <p className="workflow-description">
            {template.template_key} · Version {version.version_number} · {isImmutable ? 'Immutable view' : 'Draft editor'}
          </p>
        </div>
        <div className="workflow-header-actions">
          <StatusBadge tone={statusTone(version.version_status)}>{formatLabel(version.version_status)}</StatusBadge>
          <StatusBadge tone={statusTone(version.validation_status)}>{formatLabel(version.validation_status)}</StatusBadge>
          {canPublish && <Button variant="secondary" disabled={Boolean(actionName)} onClick={onValidate}>Run Validation</Button>}
          {canPublish && <Button disabled={Boolean(actionName)} onClick={onPublish}>Publish</Button>}
          {isImmutable && <Button variant="secondary" disabled={Boolean(actionName)} onClick={onCreateVersion}>New Draft Version</Button>}
        </div>
      </div>
      <div className="workflow-detail-grid">
        <InfoBlock label="Draft lock" value={`Template ${template.lock_version} · Version ${version.lock_version}`} />
        <InfoBlock label="Last saved" value={formatDateTime(draftState?.last_saved_at ?? version.updated_at)} />
        <InfoBlock label="Review" value={formatLabel(version.review_status)} />
        <InfoBlock label="Publication" value={version.publication_ready ? 'Ready' : 'Not ready'} />
      </div>
    </Card>
  )
}

function TemplateMetadataPanel(props: {
  form: MetadataForm
  template: TemplateRow
  version: TemplateVersionRow
  canEdit: boolean
  saving: boolean
  onChange: (form: MetadataForm) => void
  onSave: () => void
  duplicateName: string
  duplicateKey: string
  onDuplicateNameChange: (value: string) => void
  onDuplicateKeyChange: (value: string) => void
  onDuplicate: () => void
  canDuplicate: boolean
}) {
  return (
    <div className="workflow-two-column">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Draft metadata</span>
            <h3>Template Metadata</h3>
          </div>
          {props.canEdit && <Button disabled={props.saving} onClick={props.onSave}>{props.saving ? 'Saving' : 'Save'}</Button>}
        </div>
        <div className="workflow-form-grid">
          <label>
            <span>Name</span>
            <input value={props.form.name} disabled={!props.canEdit} onChange={(event) => props.onChange({ ...props.form, name: event.target.value })} />
          </label>
          <label>
            <span>Discipline tags</span>
            <input value={props.form.disciplineTags} disabled={!props.canEdit} onChange={(event) => props.onChange({ ...props.form, disciplineTags: event.target.value })} />
          </label>
          <label className="workflow-form-wide">
            <span>Description</span>
            <textarea value={props.form.description} disabled={!props.canEdit} onChange={(event) => props.onChange({ ...props.form, description: event.target.value })} />
          </label>
          <label className="workflow-form-wide">
            <span>Release notes</span>
            <textarea value={props.form.releaseNotes} disabled={!props.canEdit} onChange={(event) => props.onChange({ ...props.form, releaseNotes: event.target.value })} />
          </label>
        </div>
      </Card>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Duplicate safely</span>
            <h3>Duplicate Template</h3>
          </div>
          {props.canDuplicate && <Button variant="secondary" onClick={props.onDuplicate}>Duplicate</Button>}
        </div>
        <p className="workflow-description">
          Duplication creates a new tenant-owned draft template. Assignments, usage history, clinical notes and response data are not copied.
        </p>
        <div className="workflow-form-grid">
          <label>
            <span>New name</span>
            <input value={props.duplicateName} disabled={!props.canDuplicate} onChange={(event) => props.onDuplicateNameChange(event.target.value)} />
          </label>
          <label>
            <span>New stable key</span>
            <input value={props.duplicateKey} disabled={!props.canDuplicate} onChange={(event) => props.onDuplicateKeyChange(event.target.value)} />
          </label>
        </div>
      </Card>
    </div>
  )
}

function TemplateStructurePanel(props: {
  sections: SectionRow[]
  fields: FieldRow[]
  options: OptionRow[]
  sectionForm: SectionForm
  fieldForm: FieldForm
  optionForm: OptionForm
  canEdit: boolean
  actionName: string
  onSectionFormChange: (form: SectionForm) => void
  onFieldFormChange: (form: FieldForm) => void
  onOptionFormChange: (form: OptionForm) => void
  onEditSection: (form: SectionForm) => void
  onEditField: (form: FieldForm) => void
  onEditOption: (form: OptionForm) => void
  onSaveSection: () => void
  onSaveField: () => void
  onSaveOption: () => void
}) {
  const choiceFields = props.fields.filter((field) => choiceFieldTypes.includes(field.field_type))
  const selectedField = choiceFields.find((field) => field.id === props.optionForm.fieldId) ?? choiceFields[0] ?? null
  const choiceFieldOptions = props.options.filter((option) => choiceFields.some((field) => field.id === option.clinical_template_field_id))

  return (
    <div className="workflow-detail-card">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Structure</span>
            <h3>Sections and Fields</h3>
            <p className="workflow-description">Use move controls by editing display order. Published versions open as immutable views.</p>
          </div>
          {!props.canEdit && <StatusBadge tone="warning">Immutable or read only</StatusBadge>}
        </div>
      </Card>

      <div className="workflow-two-column">
        <Card className="workflow-detail-card">
          <div className="workflow-panel-header">
            <h4>Sections</h4>
            {props.canEdit && <Button variant="secondary" onClick={() => props.onSectionFormChange(emptySectionForm)}>New Section</Button>}
          </div>
          <div className="workflow-table-list">
            {props.sections.length === 0 ? (
              <EmptyState title="No sections" description="Add a section before adding fields." />
            ) : props.sections.map((section) => (
              <button className="workflow-table-row" type="button" onClick={() => props.onEditSection(sectionFormFrom(section))} key={section.id}>
                <div>
                  <strong>{section.display_order}. {section.section_label}</strong>
                  <span>{section.section_key} · {formatLabel(section.section_type)}</span>
                </div>
                <StatusBadge tone={section.patient_visible_eligible ? 'info' : 'neutral'}>
                  {section.patient_visible_eligible ? 'Patient eligible' : 'Internal'}
                </StatusBadge>
              </button>
            ))}
          </div>
          <SectionFormEditor form={props.sectionForm} canEdit={props.canEdit} saving={props.actionName === 'section'} onChange={props.onSectionFormChange} onSave={props.onSaveSection} />
        </Card>

        <Card className="workflow-detail-card">
          <div className="workflow-panel-header">
            <h4>Fields</h4>
            {props.canEdit && <Button variant="secondary" onClick={() => props.onFieldFormChange({ ...emptyFieldForm, sectionId: props.sections[0]?.id ?? '' })}>New Field</Button>}
          </div>
          <div className="workflow-table-list">
            {props.fields.length === 0 ? (
              <EmptyState title="No fields" description="Fields render in the clinical documentation preview and note workspace." />
            ) : props.fields.map((field) => (
              <button className="workflow-table-row" type="button" onClick={() => props.onEditField(fieldFormFrom(field))} key={field.id}>
                <div>
                  <strong>{field.display_order}. {field.field_label}</strong>
                  <span>{field.field_key} · {formatLabel(field.field_type)} · {field.is_required ? 'Required' : 'Optional'}</span>
                </div>
                <StatusBadge tone={field.patient_visible_eligible ? 'info' : field.practitioner_only ? 'warning' : 'neutral'}>
                  {field.patient_visible_eligible ? 'Patient eligible' : field.practitioner_only ? 'Practitioner only' : 'Internal'}
                </StatusBadge>
              </button>
            ))}
          </div>
          <FieldFormEditor sections={props.sections} form={props.fieldForm} canEdit={props.canEdit} saving={props.actionName === 'field'} onChange={props.onFieldFormChange} onSave={props.onSaveField} />
        </Card>
      </div>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Choice field options</span>
            <h4>Options</h4>
          </div>
          {props.canEdit && <Button variant="secondary" disabled={!selectedField} onClick={() => props.onOptionFormChange({ ...emptyOptionForm, fieldId: selectedField?.id ?? '' })}>New Option</Button>}
        </div>
        <div className="workflow-two-column">
          <div className="workflow-table-list">
            {choiceFieldOptions.length === 0 ? (
              <EmptyState title="No options" description="Options are only needed for choice, checklist, scale, laterality and body-area fields." />
            ) : choiceFieldOptions.map((option) => (
              <button className="workflow-table-row" type="button" onClick={() => props.onEditOption(optionFormFrom(option))} key={option.id}>
                <div>
                  <strong>{option.display_order}. {option.option_label}</strong>
                  <span>{option.option_key} · {choiceFields.find((field) => field.id === option.clinical_template_field_id)?.field_label ?? 'Unknown field'}</span>
                </div>
                {option.is_default && <StatusBadge tone="info">Default</StatusBadge>}
              </button>
            ))}
          </div>
          <OptionFormEditor fields={choiceFields} form={props.optionForm} canEdit={props.canEdit} saving={props.actionName === 'option'} onChange={props.onOptionFormChange} onSave={props.onSaveOption} />
        </div>
      </Card>
    </div>
  )
}

function SectionFormEditor({ form, canEdit, saving, onChange, onSave }: { form: SectionForm; canEdit: boolean; saving: boolean; onChange: (form: SectionForm) => void; onSave: () => void }) {
  return (
    <div className="workflow-form-grid">
      <label>
        <span>Section key</span>
        <input value={form.sectionKey} disabled={!canEdit || Boolean(form.id)} onChange={(event) => onChange({ ...form, sectionKey: event.target.value })} />
      </label>
      <label>
        <span>Label</span>
        <input value={form.sectionLabel} disabled={!canEdit} onChange={(event) => onChange({ ...form, sectionLabel: event.target.value })} />
      </label>
      <label>
        <span>Order</span>
        <input type="number" min="1" value={form.displayOrder} disabled={!canEdit} onChange={(event) => onChange({ ...form, displayOrder: event.target.value })} />
      </label>
      <label>
        <span>Section type</span>
        <select value={form.sectionType} disabled={!canEdit} onChange={(event) => onChange({ ...form, sectionType: event.target.value })}>
          {sectionTypeOptions.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}
        </select>
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.patientVisibleEligible} disabled={!canEdit || form.practitionerOnly} onChange={(event) => onChange({ ...form, patientVisibleEligible: event.target.checked })} />
        <span>Patient-visible eligible</span>
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.practitionerOnly} disabled={!canEdit || form.patientVisibleEligible} onChange={(event) => onChange({ ...form, practitionerOnly: event.target.checked })} />
        <span>Practitioner only</span>
      </label>
      {canEdit && <Button disabled={saving} onClick={onSave}>{saving ? 'Saving' : 'Save Section'}</Button>}
    </div>
  )
}

function FieldFormEditor({ sections, form, canEdit, saving, onChange, onSave }: { sections: SectionRow[]; form: FieldForm; canEdit: boolean; saving: boolean; onChange: (form: FieldForm) => void; onSave: () => void }) {
  const isUnsupported = readOnlyFieldTypes.includes(form.fieldType)

  return (
    <div className="workflow-form-grid">
      <label>
        <span>Section</span>
        <select value={form.sectionId} disabled={!canEdit || Boolean(form.id)} onChange={(event) => onChange({ ...form, sectionId: event.target.value })}>
          <option value="">Choose section</option>
          {sections.map((section) => <option value={section.id} key={section.id}>{section.section_label}</option>)}
        </select>
      </label>
      <label>
        <span>Field type</span>
        <select value={form.fieldType} disabled={!canEdit || Boolean(form.id)} onChange={(event) => onChange({ ...form, fieldType: event.target.value })}>
          {editableFieldTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}
          <optgroup label="Inspection only">
            {readOnlyFieldTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}
          </optgroup>
        </select>
      </label>
      <label>
        <span>Field key</span>
        <input value={form.fieldKey} disabled={!canEdit || Boolean(form.id)} onChange={(event) => onChange({ ...form, fieldKey: event.target.value })} />
      </label>
      <label>
        <span>Label</span>
        <input value={form.fieldLabel} disabled={!canEdit} onChange={(event) => onChange({ ...form, fieldLabel: event.target.value })} />
      </label>
      <label>
        <span>Order</span>
        <input type="number" min="1" value={form.displayOrder} disabled={!canEdit} onChange={(event) => onChange({ ...form, displayOrder: event.target.value })} />
      </label>
      <label>
        <span>Allowed units</span>
        <input value={form.allowedUnits} disabled={!canEdit} placeholder="cm, kg, sec" onChange={(event) => onChange({ ...form, allowedUnits: event.target.value })} />
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.isRequired} disabled={!canEdit} onChange={(event) => onChange({ ...form, isRequired: event.target.checked })} />
        <span>Required</span>
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.isRequiredOnFinalise} disabled={!canEdit} onChange={(event) => onChange({ ...form, isRequiredOnFinalise: event.target.checked })} />
        <span>Required on finalise</span>
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.patientVisibleEligible} disabled={!canEdit || form.practitionerOnly} onChange={(event) => onChange({ ...form, patientVisibleEligible: event.target.checked })} />
        <span>Patient-visible eligible</span>
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.practitionerOnly} disabled={!canEdit || form.patientVisibleEligible} onChange={(event) => onChange({ ...form, practitionerOnly: event.target.checked })} />
        <span>Practitioner only</span>
      </label>
      {isUnsupported && <p className="workflow-description workflow-form-wide">This field type is visible for inspection but not fully configurable in the safe frontend editor yet.</p>}
      {canEdit && <Button disabled={saving || isUnsupported} onClick={onSave}>{saving ? 'Saving' : 'Save Field'}</Button>}
    </div>
  )
}

function OptionFormEditor({ fields, form, canEdit, saving, onChange, onSave }: { fields: FieldRow[]; form: OptionForm; canEdit: boolean; saving: boolean; onChange: (form: OptionForm) => void; onSave: () => void }) {
  const selectedFieldIsValid = fields.some((field) => field.id === form.fieldId)
  return (
    <div className="workflow-form-grid">
      <label>
        <span>Field</span>
        <select value={form.fieldId} disabled={!canEdit || Boolean(form.id)} onChange={(event) => onChange({ ...form, fieldId: event.target.value })}>
          <option value="">Choose field</option>
          {fields.map((field) => <option value={field.id} key={field.id}>{field.field_label}</option>)}
        </select>
      </label>
      <label>
        <span>Option key</span>
        <input value={form.optionKey} disabled={!canEdit || Boolean(form.id)} onChange={(event) => onChange({ ...form, optionKey: event.target.value })} />
      </label>
      <label>
        <span>Label</span>
        <input value={form.optionLabel} disabled={!canEdit} onChange={(event) => onChange({ ...form, optionLabel: event.target.value })} />
      </label>
      <label>
        <span>Order</span>
        <input type="number" min="1" value={form.displayOrder} disabled={!canEdit} onChange={(event) => onChange({ ...form, displayOrder: event.target.value })} />
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={form.isDefault} disabled={!canEdit} onChange={(event) => onChange({ ...form, isDefault: event.target.checked })} />
        <span>Default option</span>
      </label>
      {fields.length === 0 && <p className="workflow-description workflow-form-wide">Add a choice, checklist, scale, laterality or body-area field before creating options.</p>}
      {canEdit && <Button disabled={saving || !selectedFieldIsValid} onClick={onSave}>{saving ? 'Saving' : 'Save Option'}</Button>}
    </div>
  )
}

function TemplateValidationPanel(props: {
  rules: ValidationRuleRow[]
  fields: FieldRow[]
  sections: SectionRow[]
  calculations: CalculationRuleRow[]
  results: ValidationResultRow[]
  form: ValidationRuleForm
  canEdit: boolean
  canValidate: boolean
  actionName: string
  onFormChange: (form: ValidationRuleForm) => void
  onEditRule: (form: ValidationRuleForm) => void
  onSaveRule: () => void
  onValidate: () => void
}) {
  return (
    <div className="workflow-two-column">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Database validation</span>
            <h3>Validation Results</h3>
          </div>
          {props.canValidate && <Button disabled={props.actionName === 'validate'} onClick={props.onValidate}>{props.actionName === 'validate' ? 'Running' : 'Run Validation'}</Button>}
        </div>
        <div className="workflow-table-list">
          {props.results.length === 0 ? (
            <EmptyState title="No validation results" description="Run validation before publication." />
          ) : props.results.map((result) => (
            <article className="workflow-table-row" key={result.id}>
              <div>
                <strong>{formatLabel(result.validation_status)} · {formatDateTime(result.validated_at)}</strong>
                <span>{result.error_count} errors · {result.warning_count} warnings · {result.info_count} info</span>
                {validationSummary(result.findings).slice(0, 3).map((finding) => <span key={finding}>{finding}</span>)}
              </div>
              <StatusBadge tone={statusTone(result.validation_status)}>{formatLabel(result.validation_status)}</StatusBadge>
            </article>
          ))}
        </div>
      </Card>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Declarative rules</span>
            <h3>Validation Rules</h3>
          </div>
          {!props.canEdit && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
        <div className="workflow-table-list">
          {props.rules.map((rule) => (
            <button className="workflow-table-row" type="button" onClick={() => props.onEditRule(validationRuleFormFrom(rule))} key={rule.id}>
              <div>
                <strong>{rule.rule_key}</strong>
                <span>{formatLabel(rule.rule_type)} · {formatLabel(rule.severity)} · {formatLabel(rule.applies_on)}</span>
              </div>
              <StatusBadge tone={rule.is_active ? 'success' : 'neutral'}>{rule.is_active ? 'Active' : 'Inactive'}</StatusBadge>
            </button>
          ))}
          {props.rules.length === 0 && <EmptyState title="No validation rules" description="Add required, range, units or finalisation rules where needed." />}
        </div>
        <ValidationRuleFormEditor {...props} />
      </Card>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Advanced boundary</span>
            <h3>Calculation Rules</h3>
          </div>
          <StatusBadge tone="warning">Inspection only</StatusBadge>
        </div>
        <div className="workflow-table-list">
          {props.calculations.length === 0 ? (
            <EmptyState title="No calculation rules" description="Calculation execution and free-form formula authoring are intentionally deferred." />
          ) : props.calculations.map((rule) => (
            <article className="workflow-table-row" key={rule.id}>
              <div>
                <strong>{rule.calculation_key}</strong>
                <span>{formatLabel(rule.calculation_type)} · {rule.input_field_keys.join(', ') || 'No inputs'}</span>
              </div>
              <StatusBadge tone={statusTone(rule.calculation_status)}>{formatLabel(rule.calculation_status)}</StatusBadge>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ValidationRuleFormEditor(props: {
  sections: SectionRow[]
  fields: FieldRow[]
  form: ValidationRuleForm
  canEdit: boolean
  actionName: string
  onFormChange: (form: ValidationRuleForm) => void
  onSaveRule: () => void
}) {
  return (
    <div className="workflow-form-grid">
      <label>
        <span>Rule key</span>
        <input value={props.form.ruleKey} disabled={!props.canEdit || Boolean(props.form.id)} onChange={(event) => props.onFormChange({ ...props.form, ruleKey: event.target.value })} />
      </label>
      <label>
        <span>Rule type</span>
        <select value={props.form.ruleType} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, ruleType: event.target.value })}>
          {validationRuleTypes.map((type) => <option value={type} key={type}>{formatLabel(type)}</option>)}
        </select>
      </label>
      <label>
        <span>Severity</span>
        <select value={props.form.severity} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, severity: event.target.value })}>
          {['info', 'warning', 'error', 'blocking'].map((severity) => <option value={severity} key={severity}>{formatLabel(severity)}</option>)}
        </select>
      </label>
      <label>
        <span>Applies on</span>
        <select value={props.form.appliesOn} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, appliesOn: event.target.value })}>
          {['draft_save', 'finalise', 'sign', 'patient_publish'].map((stage) => <option value={stage} key={stage}>{formatLabel(stage)}</option>)}
        </select>
      </label>
      <label>
        <span>Target section</span>
        <select value={props.form.targetSectionId} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, targetSectionId: event.target.value })}>
          <option value="">No section</option>
          {props.sections.map((section) => <option value={section.id} key={section.id}>{section.section_label}</option>)}
        </select>
      </label>
      <label>
        <span>Target field</span>
        <select value={props.form.targetFieldId} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, targetFieldId: event.target.value })}>
          <option value="">No field</option>
          {props.fields.map((field) => <option value={field.id} key={field.id}>{field.field_label}</option>)}
        </select>
      </label>
      <label className="workflow-form-wide">
        <span>Message</span>
        <textarea value={props.form.message} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, message: event.target.value })} />
      </label>
      <label className="practice-number-toggle">
        <input type="checkbox" checked={props.form.isActive} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, isActive: event.target.checked })} />
        <span>Active rule</span>
      </label>
      {props.canEdit && <Button disabled={props.actionName === 'validation-rule'} onClick={props.onSaveRule}>{props.actionName === 'validation-rule' ? 'Saving' : 'Save Rule'}</Button>}
    </div>
  )
}

function TemplatePreviewPanel({ sections, fields, options }: { sections: SectionRow[]; fields: FieldRow[]; options: OptionRow[] }) {
  return (
    <Card className="workflow-detail-card">
      <div className="workflow-panel-header">
        <div>
          <span className="workflow-muted">Safe preview</span>
          <h3>Clinician-facing Preview</h3>
          <p className="workflow-description">Preview data is temporary and never becomes patient or clinical-note data.</p>
        </div>
        <StatusBadge tone="info">No patient data</StatusBadge>
      </div>
      {sections.length === 0 ? (
        <EmptyState title="No preview available" description="Add sections and fields to preview the clinician renderer structure." />
      ) : (
        <div className="clinical-template-preview">
          {sections.map((section) => (
            <section key={section.id}>
              <h4>{section.section_label}</h4>
              {section.description && <p>{section.description}</p>}
              <div className="workflow-form-grid">
                {fields.filter((field) => field.clinical_template_section_id === section.id).map((field) => (
                  <label className={field.field_type === 'long_text' ? 'workflow-form-wide' : ''} key={field.id}>
                    <span>{field.field_label}{field.is_required && ' *'}</span>
                    {renderPreviewField(field, options.filter((option) => option.clinical_template_field_id === field.id))}
                    <small>{field.patient_visible_eligible ? 'Patient-visible eligible' : field.practitioner_only ? 'Practitioner-only' : field.help_text ?? ''}</small>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}

function renderPreviewField(field: FieldRow, options: OptionRow[]) {
  if (['single_choice', 'laterality', 'body_area', 'scale'].includes(field.field_type)) {
    return (
      <select disabled>
        <option>{field.placeholder ?? 'Choose option'}</option>
        {options.map((option) => <option key={option.id}>{option.option_label}</option>)}
      </select>
    )
  }
  if (['multiple_choice', 'checklist'].includes(field.field_type)) {
    return <div className="clinical-template-preview-options">{options.map((option) => <span key={option.id}>{option.option_label}</span>)}</div>
  }
  if (field.field_type === 'boolean') return <input type="checkbox" disabled />
  if (field.field_type === 'long_text') return <textarea disabled placeholder={field.placeholder ?? 'Example note text'} />
  if (field.field_type === 'date') return <input type="date" disabled />
  if (field.field_type === 'time') return <input type="time" disabled />
  if (field.field_type === 'datetime') return <input type="datetime-local" disabled />
  if (['number', 'decimal', 'measurement'].includes(field.field_type)) return <input type="number" disabled placeholder={field.allowed_units[0] ?? '0'} />
  if (readOnlyFieldTypes.includes(field.field_type)) return <input disabled value="Advanced field - inspection only" readOnly />
  return <input disabled placeholder={field.placeholder ?? 'Example response'} />
}

function TemplateVersionHistoryPanel(props: {
  versions: TemplateVersionRow[]
  selectedVersionId: string
  onSelectVersion: (id: string) => void
  canCreateVersion: boolean
  onCreateVersion: () => void
  retirementReason: string
  onRetirementReasonChange: (value: string) => void
  onRetire: () => void
  canRetire: boolean
  actionName: string
}) {
  return (
    <div className="workflow-two-column">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <h3>Version History</h3>
          {props.canCreateVersion && <Button variant="secondary" disabled={props.actionName === 'new-version'} onClick={props.onCreateVersion}>New Draft From Version</Button>}
        </div>
        <div className="workflow-version-list">
          {props.versions.map((version) => (
            <button className={`workflow-version-row ${props.selectedVersionId === version.id ? 'active' : ''}`} type="button" onClick={() => props.onSelectVersion(version.id)} key={version.id}>
              <div>
                <strong>Version {version.version_number}</strong>
                <span>{formatLabel(version.version_status)} · Published {formatDateTime(version.published_at)} · Retired {formatDateTime(version.retired_at)}</span>
                <span>{version.release_notes || 'No release notes'}</span>
              </div>
              <StatusBadge tone={statusTone(version.version_status)}>{formatLabel(version.version_status)}</StatusBadge>
            </button>
          ))}
        </div>
      </Card>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Retirement</span>
            <h3>Retire Active Version</h3>
          </div>
          {props.canRetire && <Button variant="secondary" disabled={props.actionName === 'retire'} onClick={props.onRetire}>Retire</Button>}
        </div>
        <p className="workflow-description">Retirement preserves historical rendering and prevents the version from being used for new notes.</p>
        <label className="workflow-form-grid">
          <span>Retirement reason</span>
          <textarea value={props.retirementReason} disabled={!props.canRetire} onChange={(event) => props.onRetirementReasonChange(event.target.value)} />
        </label>
      </Card>
    </div>
  )
}

function TemplateAssignmentPanel(props: {
  assignments: AssignmentRow[]
  form: AssignmentForm
  canEdit: boolean
  actionName: string
  onFormChange: (form: AssignmentForm) => void
  onEditAssignment: (form: AssignmentForm) => void
  onSaveAssignment: () => void
}) {
  return (
    <div className="workflow-two-column">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Deterministic precedence</span>
            <h3>Assignments</h3>
          </div>
          {!props.canEdit && <StatusBadge tone="warning">Requires active published version</StatusBadge>}
        </div>
        <div className="workflow-table-list">
          {props.assignments.length === 0 ? (
            <EmptyState title="No assignments" description="Assignments can be created only for active published tenant template versions." />
          ) : props.assignments.map((assignment) => (
            <button className="workflow-table-row" type="button" onClick={() => props.onEditAssignment(assignmentFormFrom(assignment))} key={assignment.id}>
              <div>
                <strong>{formatLabel(assignment.assignment_scope)} · Priority {assignment.assignment_priority}</strong>
                <span>{assignment.discipline || assignment.encounter_type || assignment.session_type || 'Tenant default'} · {formatDate(assignment.effective_from)} to {formatDate(assignment.effective_until)}</span>
              </div>
              <StatusBadge tone={assignment.is_active ? 'success' : 'neutral'}>{assignment.is_active ? 'Active' : 'Disabled'}</StatusBadge>
            </button>
          ))}
        </div>
      </Card>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <h3>Assignment Editor</h3>
          {props.canEdit && <Button disabled={props.actionName === 'assignment'} onClick={props.onSaveAssignment}>{props.actionName === 'assignment' ? 'Saving' : 'Save Assignment'}</Button>}
        </div>
        <div className="workflow-form-grid">
          <label>
            <span>Scope</span>
            <select value={props.form.assignmentScope} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, assignmentScope: event.target.value })}>
              {assignmentScopes.map((scope) => <option value={scope} key={scope}>{formatLabel(scope)}</option>)}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <input type="number" min="1" value={props.form.assignmentPriority} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, assignmentPriority: event.target.value })} />
          </label>
          <label>
            <span>Discipline</span>
            <input value={props.form.discipline} disabled={!props.canEdit || props.form.assignmentScope !== 'discipline'} onChange={(event) => props.onFormChange({ ...props.form, discipline: event.target.value })} />
          </label>
          <label>
            <span>Encounter type</span>
            <input value={props.form.encounterType} disabled={!props.canEdit || props.form.assignmentScope !== 'encounter_type'} onChange={(event) => props.onFormChange({ ...props.form, encounterType: event.target.value })} />
          </label>
          <label>
            <span>Session type</span>
            <input value={props.form.sessionType} disabled={!props.canEdit || props.form.assignmentScope !== 'session_type'} onChange={(event) => props.onFormChange({ ...props.form, sessionType: event.target.value })} />
          </label>
          <label>
            <span>Effective from</span>
            <input type="date" value={props.form.effectiveFrom} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, effectiveFrom: event.target.value })} />
          </label>
          <label>
            <span>Effective until</span>
            <input type="date" value={props.form.effectiveUntil} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, effectiveUntil: event.target.value })} />
          </label>
          <label className="practice-number-toggle">
            <input type="checkbox" checked={props.form.isDefault} disabled={!props.canEdit} onChange={(event) => props.onFormChange({ ...props.form, isDefault: event.target.checked })} />
            <span>Default assignment</span>
          </label>
        </div>
      </Card>
    </div>
  )
}

function TemplateReviewPanel({ version, reviewRequests, canAdminister }: { version: TemplateVersionRow; reviewRequests: ReviewRequestRow[]; canAdminister: boolean }) {
  return (
    <Card className="workflow-detail-card">
      <div className="workflow-panel-header">
        <div>
          <span className="workflow-muted">Review workflow</span>
          <h3>Review State</h3>
        </div>
        <StatusBadge tone={statusTone(version.review_status)}>{formatLabel(version.review_status)}</StatusBadge>
      </div>
      <p className="workflow-description">
        Review rows are displayed from the database. Protected request, approval and change-request RPCs are deferred until the workflow is explicitly promoted from optional metadata to enforced review operations.
      </p>
      {!canAdminister && <StatusBadge tone="warning">Review administration requires tenant Admin</StatusBadge>}
      <div className="workflow-table-list">
        {reviewRequests.length === 0 ? (
          <EmptyState title="No review requests" description="This template version has no review request history." />
        ) : reviewRequests.map((request) => (
          <article className="workflow-table-row" key={request.id}>
            <div>
              <strong>{formatLabel(request.review_status)}</strong>
              <span>Requested {formatDateTime(request.requested_at)} · Decision {formatDateTime(request.decision_at)}</span>
              {request.decision_reason && <span>{request.decision_reason}</span>}
            </div>
            <StatusBadge tone={statusTone(request.review_status)}>{formatLabel(request.review_status)}</StatusBadge>
          </article>
        ))}
      </div>
    </Card>
  )
}

function TemplateUsagePanel({ usage, currentUsage, assignments }: { usage: UsageSummaryRow[]; currentUsage: UsageSummaryRow | null; assignments: AssignmentRow[] }) {
  return (
    <div className="workflow-two-column">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span className="workflow-muted">Aggregate only</span>
            <h3>Usage Summary</h3>
          </div>
          <StatusBadge tone="info">No patient data</StatusBadge>
        </div>
        <div className="workflow-detail-grid">
          <InfoBlock label="Current version notes" value={String(currentUsage?.note_count ?? 0)} />
          <InfoBlock label="First used" value={formatDateTime(currentUsage?.first_used_at)} />
          <InfoBlock label="Last used" value={formatDateTime(currentUsage?.last_used_at)} />
          <InfoBlock label="Active assignments" value={String(currentUsage?.active_assignment_count ?? assignments.filter((assignment) => assignment.is_active).length)} />
        </div>
        <div className="workflow-table-list">
          {usage.map((item) => (
            <article className="workflow-table-row" key={item.clinical_note_template_version_id}>
              <div>
                <strong>Version {item.version_number}</strong>
                <span>{item.note_count} notes · First {formatDateTime(item.first_used_at)} · Last {formatDateTime(item.last_used_at)}</span>
              </div>
              <StatusBadge tone={statusTone(item.version_status)}>{formatLabel(item.version_status)}</StatusBadge>
            </article>
          ))}
          {usage.length === 0 && <EmptyState title="No usage yet" description="Usage remains aggregate only and never exposes patient identity or clinical response values." />}
        </div>
      </Card>
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <h3>Publication Boundary</h3>
          <StatusBadge tone="warning">Patient Link safe</StatusBadge>
        </div>
        <p className="workflow-description">
          Patient-visible eligibility is only metadata here. Clinical content becomes patient-facing only through explicit Clinical Engine publication controls, not through template management.
        </p>
      </Card>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="workflow-info-block">
      <span className="workflow-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
