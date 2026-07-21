import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../UiState'
import { Button, Card, SearchBar, StatusBadge } from '../ui'
import type { Json } from '../../lib/database.types'

export type ClinicalDocumentationPatient = {
  id: string
  patient_number: string | null
  first_name: string | null
  last_name: string | null
  active_icd10_code: string | null
}

export type ClinicalDocumentationEncounter = {
  id: string
  encounter_type: string
  encounter_status: string
  occurred_at: string | null
  summary: string | null
}

export type ClinicalDocumentationNote = {
  id: string
  note_title: string | null
  note_type: string
  note_status: string
  clinical_visibility: string
  patient_visible_allowed: boolean
  is_restricted: boolean
  created_at: string
  updated_at: string
}

export type ClinicalDocumentationNoteVersion = {
  id: string
  clinical_note_id: string
  version_number: number
  clinical_note_template_version_id: string | null
  free_text_content: string | null
  version_status: string
  finalised_at: string | null
  signed_at: string | null
  updated_at: string
}

export type ClinicalDocumentationTemplate = {
  id: string
  tenant_id: string | null
  name: string
  description: string | null
  template_status: string
  active_version_id: string | null
}

export type ClinicalDocumentationTemplateVersion = {
  id: string
  tenant_id: string | null
  clinical_note_template_id: string
  version_number: number
  version_status: string
  default_free_text: string | null
  default_structured_content: Json
  visibility_default: string
}

export type ClinicalTemplateSection = {
  id: string
  clinical_note_template_version_id: string
  section_key: string
  section_label: string
  description: string | null
  help_text: string | null
  display_order: number
  section_type: string
  is_repeating: boolean
  patient_visible_eligible: boolean
  practitioner_only: boolean
  visibility_class: string
}

export type ClinicalTemplateField = {
  id: string
  clinical_note_template_version_id: string
  clinical_template_section_id: string
  field_key: string
  field_label: string
  field_type: string
  display_order: number
  help_text: string | null
  placeholder: string | null
  field_config: Json
  validation_config: Json
  allowed_units: string[]
  is_required: boolean
  is_required_on_finalise: boolean
  is_read_only: boolean
  is_calculated: boolean
  patient_visible_eligible: boolean
  practitioner_only: boolean
  visibility_class: string
}

export type ClinicalTemplateFieldOption = {
  id: string
  clinical_template_field_id: string
  option_key: string
  option_label: string
  option_value: Json
  display_order: number
  is_default: boolean
}

export type ClinicalTemplateValidationRule = {
  id: string
  clinical_note_template_version_id: string
  clinical_template_field_id: string | null
  rule_type: string
  severity: string
  applies_on: string
  message: string | null
  is_active: boolean
}

export type ClinicalTemplateCalculationRule = {
  id: string
  clinical_note_template_version_id: string
  target_clinical_template_field_id: string
  calculation_key: string
  calculation_type: string
  is_required_for_finalise: boolean
  calculation_status: string
}

export type ClinicalStructuredResponse = {
  id: string
  clinical_note_id: string
  clinical_note_version_id: string
  clinical_template_field_id: string | null
  field_key: string
  response_value: Json
  response_text: string | null
  response_number: number | null
  response_boolean: boolean | null
  response_date: string | null
  response_datetime: string | null
  response_unit: string | null
  display_value: string | null
  value_type: string
  validation_state: string
  validation_errors: Json
  lock_version: number
  saved_at: string
  copy_forward_event_id: string | null
  copied_value_edited: boolean
}

export type ClinicalDraftState = {
  clinical_note_version_id: string
  draft_status: string
  last_saved_at: string
  conflict_detected: boolean
  conflict_reason: string | null
  lock_version: number
}

export type ClinicalCopyForwardEvent = {
  id: string
  target_clinical_note_version_id: string
  target_response_id: string | null
  source_clinical_note_version_id: string
  source_response_id: string | null
  source_field_key: string | null
  target_field_key: string | null
  copied_at: string
  copied_value_edited: boolean
}

export type CreateClinicalDraftInput = {
  encounterId: string | null
  templateVersionId: string | null
  noteTitle: string
  noteType: string
  freeText: string
  structuredContent: Json
  clinicalVisibility: string
  patientVisibleAllowed: boolean
  isRestricted: boolean
}

type SaveStructuredInput = {
  field: ClinicalTemplateField
  payload: Json
  expectedLockVersion: number | null
}

type Props = {
  patient: ClinicalDocumentationPatient
  canManage: boolean
  encounters: ClinicalDocumentationEncounter[]
  notes: ClinicalDocumentationNote[]
  versions: ClinicalDocumentationNoteVersion[]
  templates: ClinicalDocumentationTemplate[]
  templateVersions: ClinicalDocumentationTemplateVersion[]
  sections: ClinicalTemplateSection[]
  fields: ClinicalTemplateField[]
  fieldOptions: ClinicalTemplateFieldOption[]
  validationRules: ClinicalTemplateValidationRule[]
  calculationRules: ClinicalTemplateCalculationRule[]
  responses: ClinicalStructuredResponse[]
  draftStates: ClinicalDraftState[]
  copyForwardEvents: ClinicalCopyForwardEvent[]
  selectedNoteId: string
  saving: boolean
  onSelectNote: (noteId: string) => void
  onCreateDraft: (input: CreateClinicalDraftInput) => Promise<void>
  onSaveFreeText: (versionId: string, freeText: string, expectedDraftLockVersion: number | null) => Promise<void>
  onSaveStructuredResponse: (input: SaveStructuredInput) => Promise<void>
  onValidate: (versionId: string) => Promise<Json>
  onFinalise: () => Promise<void>
  onSign: () => Promise<void>
  onCopyForward: (sourceResponseId: string, targetVersionId: string, targetFieldId: string) => Promise<void>
}

const editableVersionStatuses = new Set(['draft'])
const referenceTypes = new Set(['outcome_measure_reference', 'diagnosis_reference', 'treatment_goal_reference', 'attachment_reference'])

export function ClinicalDocumentationWorkspace(props: Props) {
  const selectedNote = props.notes.find((note) => note.id === props.selectedNoteId) ?? props.notes[0] ?? null
  const selectedVersions = props.versions
    .filter((version) => version.clinical_note_id === selectedNote?.id)
    .sort((left, right) => right.version_number - left.version_number)
  const selectedVersion = selectedVersions[0] ?? null
  const selectedTemplateVersion = selectedVersion?.clinical_note_template_version_id
    ? props.templateVersions.find((version) => version.id === selectedVersion.clinical_note_template_version_id) ?? null
    : null
  const selectedTemplate = selectedTemplateVersion
    ? props.templates.find((template) => template.id === selectedTemplateVersion.clinical_note_template_id) ?? null
    : null
  const selectedDraft = selectedVersion
    ? props.draftStates.find((draft) => draft.clinical_note_version_id === selectedVersion.id) ?? null
    : null
  const isDraftEditable = Boolean(selectedVersion && editableVersionStatuses.has(selectedVersion.version_status) && props.canManage)

  const [templateSearch, setTemplateSearch] = useState('')
  const [createForm, setCreateForm] = useState<CreateClinicalDraftInput>({
    encounterId: props.encounters[0]?.id ?? null,
    templateVersionId: null,
    noteTitle: '',
    noteType: 'progress_note',
    freeText: '',
    structuredContent: {},
    clinicalVisibility: 'internal',
    patientVisibleAllowed: false,
    isRestricted: false,
  })
  const [freeTextDraft, setFreeTextDraft] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed' | 'stale'>('idle')
  const [localMessage, setLocalMessage] = useState('')
  const [validationResult, setValidationResult] = useState<Json>(null)

  useEffect(() => {
    setFreeTextDraft(selectedVersion?.free_text_content ?? '')
    setSaveState('idle')
    setLocalMessage('')
    setValidationResult(null)
  }, [selectedVersion?.id])

  useEffect(() => {
    if (!props.selectedNoteId && selectedNote) props.onSelectNote(selectedNote.id)
  }, [props.selectedNoteId, selectedNote?.id])

  const templateVersionOptions = useMemo(() => {
    const search = templateSearch.trim().toLowerCase()
    return props.templateVersions
      .filter((version) => version.version_status === 'active')
      .map((version) => {
        const template = props.templates.find((item) => item.id === version.clinical_note_template_id)
        return { version, template }
      })
      .filter(({ template }) => template && template.template_status !== 'retired')
      .filter(({ version, template }) => {
        if (!search) return true
        return `${template?.name ?? ''} ${template?.description ?? ''} ${version.version_number}`.toLowerCase().includes(search)
      })
  }, [props.templateVersions, props.templates, templateSearch])

  const sectionRows = useMemo(
    () => selectedVersion
      ? props.sections
        .filter((section) => section.clinical_note_template_version_id === selectedVersion.clinical_note_template_version_id)
        .sort((left, right) => left.display_order - right.display_order)
      : [],
    [props.sections, selectedVersion?.clinical_note_template_version_id],
  )

  const previousResponses = useMemo(
    () => props.responses
      .filter((response) => response.clinical_note_version_id !== selectedVersion?.id)
      .sort((left, right) => right.saved_at.localeCompare(left.saved_at)),
    [props.responses, selectedVersion?.id],
  )

  const handleCreateDraft = async () => {
    if (!props.canManage) return
    setLocalMessage('')
    setSaveState('saving')
    try {
      await props.onCreateDraft(createForm)
      setCreateForm((current) => ({ ...current, noteTitle: '', freeText: '', structuredContent: {} }))
      setSaveState('saved')
    } catch (error) {
      setSaveState('failed')
      setLocalMessage(safeMessage(error))
    }
  }

  const handleSaveFreeText = async () => {
    if (!selectedVersion || !isDraftEditable) return
    setLocalMessage('')
    setSaveState('saving')
    try {
      await props.onSaveFreeText(selectedVersion.id, freeTextDraft, selectedDraft?.lock_version ?? null)
      setSaveState('saved')
    } catch (error) {
      setSaveState('failed')
      setLocalMessage(safeMessage(error))
    }
  }

  const handleValidate = async () => {
    if (!selectedVersion) return
    setLocalMessage('')
    try {
      const result = await props.onValidate(selectedVersion.id)
      setValidationResult(result)
    } catch (error) {
      setLocalMessage(safeMessage(error))
    }
  }

  const handleFinalise = async () => {
    setLocalMessage('')
    try {
      await handleValidate()
      await props.onFinalise()
    } catch (error) {
      setLocalMessage(safeMessage(error))
    }
  }

  return (
    <div className="clinical-documentation-workspace">
      <div className="clinical-documentation-grid">
        <Card className="clinical-documentation-side">
          <div className="clinical-documentation-card-header">
            <div>
              <span>Documentation</span>
              <h3>Notes</h3>
            </div>
            <StatusBadge tone="info">{props.notes.length}</StatusBadge>
          </div>
          {props.notes.length === 0 ? (
            <EmptyState title="No clinical notes yet" description="Create a draft note from an active template or start an approved untemplated draft." />
          ) : (
            <div className="clinical-documentation-note-list">
              {props.notes.map((note) => (
                <button
                  type="button"
                  className={note.id === selectedNote?.id ? 'active' : ''}
                  onClick={() => props.onSelectNote(note.id)}
                  key={note.id}
                >
                  <strong>{note.note_title || formatLabel(note.note_type)}</strong>
                  <span>{formatLabel(note.note_status)} · {formatDateTime(note.updated_at)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="clinical-documentation-main">
          <Card>
            <div className="clinical-documentation-card-header">
              <div>
                <span>New note workflow</span>
                <h3>{formatPatientName(props.patient)}</h3>
              </div>
              {!props.canManage && <StatusBadge tone="warning">Read only</StatusBadge>}
            </div>
            <div className="clinical-documentation-new-note">
              <label>
                Encounter
                <select
                  value={createForm.encounterId ?? ''}
                  disabled={!props.canManage}
                  onChange={(event) => setCreateForm((current) => ({ ...current, encounterId: event.target.value || null }))}
                >
                  <option value="">No encounter linked yet</option>
                  {props.encounters.map((encounter) => (
                    <option value={encounter.id} key={encounter.id}>{formatLabel(encounter.encounter_type)} · {formatDateTime(encounter.occurred_at)}</option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  value={createForm.noteTitle}
                  placeholder="Optional clinical note title"
                  disabled={!props.canManage}
                  onChange={(event) => setCreateForm((current) => ({ ...current, noteTitle: event.target.value }))}
                />
              </label>
              <label>
                Note type
                <select
                  value={createForm.noteType}
                  disabled={!props.canManage}
                  onChange={(event) => setCreateForm((current) => ({ ...current, noteType: event.target.value }))}
                >
                  <option value="progress_note">Progress note</option>
                  <option value="process_note">Process note</option>
                  <option value="session_feedback">Session feedback</option>
                  <option value="assessment_note">Assessment note</option>
                  <option value="case_management">Case management</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <TemplatePicker
              search={templateSearch}
              onSearch={setTemplateSearch}
              options={templateVersionOptions}
              selectedVersionId={createForm.templateVersionId}
              onSelect={(version) => setCreateForm((current) => ({
                ...current,
                templateVersionId: version?.id ?? null,
                freeText: version?.default_free_text ?? '',
                structuredContent: version?.default_structured_content ?? {},
                clinicalVisibility: version?.visibility_default ?? current.clinicalVisibility,
              }))}
            />
            <div className="clinical-documentation-actions">
              <Button variant="secondary" disabled={!props.canManage || props.saving || saveState === 'saving'} onClick={handleCreateDraft}>
                {saveState === 'saving' ? 'Creating...' : 'Create draft note'}
              </Button>
              <p>Unlinked drafts are allowed for intake or documentation started before a formal encounter is created.</p>
            </div>
          </Card>

          {!selectedNote || !selectedVersion ? (
            <EmptyState title="Select or create a note" description="Choose a note from the list or create a new draft to open the documentation editor." />
          ) : (
            <>
              <Card>
                <div className="clinical-documentation-card-header">
                  <div>
                    <span>Editor</span>
                    <h3>{selectedNote.note_title || formatLabel(selectedNote.note_type)}</h3>
                    <p>{selectedTemplate ? `${selectedTemplate.name} · v${selectedTemplateVersion?.version_number ?? ''}` : 'Untemplated note'}</p>
                  </div>
                  <DraftIndicator version={selectedVersion} draft={selectedDraft} saveState={saveState} />
                </div>
                <div className="clinical-documentation-boundaries">
                  <StatusBadge tone={selectedNote.clinical_visibility === 'patient_facing' ? 'info' : 'neutral'}>{formatLabel(selectedNote.clinical_visibility)}</StatusBadge>
                  {selectedNote.patient_visible_allowed && <StatusBadge tone="info">Patient-visible eligible</StatusBadge>}
                  {selectedNote.is_restricted && <StatusBadge tone="warning">Restricted</StatusBadge>}
                  {!isDraftEditable && <StatusBadge tone="warning">Immutable</StatusBadge>}
                </div>
                <label className="clinical-documentation-free-text">
                  Free-text note
                  <textarea
                    value={freeTextDraft}
                    disabled={!isDraftEditable}
                    placeholder="Document clinical observations, reasoning or session details."
                    onChange={(event) => {
                      setFreeTextDraft(event.target.value)
                      setSaveState('idle')
                    }}
                  />
                </label>
                <div className="clinical-documentation-actions">
                  <Button variant="secondary" disabled={!isDraftEditable || props.saving || saveState === 'saving'} onClick={handleSaveFreeText}>Save free text</Button>
                  <Button variant="secondary" disabled={!selectedVersion || props.saving} onClick={handleValidate}>Validate</Button>
                  <Button variant="primary" disabled={!isDraftEditable || props.saving} onClick={handleFinalise}>Finalise</Button>
                  <Button variant="secondary" disabled={selectedVersion.version_status !== 'finalised' || !props.canManage || props.saving} onClick={props.onSign}>Sign</Button>
                </div>
                {localMessage && <p className="clinical-documentation-error">{localMessage}</p>}
                <ValidationSummary result={validationResult} localMissing={clientRequiredMissing(sectionRows, props.fields, props.responses, selectedVersion.id)} />
              </Card>

              {selectedVersion.clinical_note_template_version_id ? (
                <StructuredRenderer
                  sections={sectionRows}
                  fields={props.fields}
                  options={props.fieldOptions}
                  calculationRules={props.calculationRules}
                  responses={props.responses.filter((response) => response.clinical_note_version_id === selectedVersion.id)}
                  versionId={selectedVersion.id}
                  disabled={!isDraftEditable || props.saving}
                  onSave={props.onSaveStructuredResponse}
                />
              ) : (
                <Card>
                  <EmptyState title="Untemplated note" description="This note uses free-text documentation only. Structured fields are available when an active template is selected at creation." />
                </Card>
              )}

              <PreviousNotes
                currentVersionId={selectedVersion.id}
                previousResponses={previousResponses}
                fields={props.fields}
                versions={props.versions}
                events={props.copyForwardEvents}
                canManage={isDraftEditable}
                onCopyForward={(sourceResponse, targetFieldId) => props.onCopyForward(sourceResponse.id, selectedVersion.id, targetFieldId)}
              />
            </>
          )}

          <ClinicalTimeline
            encounters={props.encounters}
            notes={props.notes}
            versions={props.versions}
            copyForwardEvents={props.copyForwardEvents}
          />
        </div>
      </div>
    </div>
  )
}

function TemplatePicker(props: {
  search: string
  onSearch: (value: string) => void
  options: Array<{ version: ClinicalDocumentationTemplateVersion; template: ClinicalDocumentationTemplate | undefined }>
  selectedVersionId: string | null
  onSelect: (version: ClinicalDocumentationTemplateVersion | null) => void
}) {
  return (
    <div className="clinical-template-picker">
      <SearchBar label="Template search" value={props.search} placeholder="Search active templates" onChange={props.onSearch} />
      <div className="clinical-template-options">
        <button type="button" className={!props.selectedVersionId ? 'active' : ''} onClick={() => props.onSelect(null)}>
          <strong>Untemplated note</strong>
          <span>Approved free-text documentation route</span>
        </button>
        {props.options.map(({ version, template }) => (
          <button type="button" className={props.selectedVersionId === version.id ? 'active' : ''} onClick={() => props.onSelect(version)} key={version.id}>
            <strong>{template?.name ?? 'Clinical template'}</strong>
            <span>{template?.description || 'No description'} · v{version.version_number}</span>
            <small>{version.tenant_id ? 'Tenant template' : 'System template'} · {formatLabel(version.version_status)}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function DraftIndicator(props: { version: ClinicalDocumentationNoteVersion; draft: ClinicalDraftState | null; saveState: string }) {
  const conflict = props.draft?.conflict_detected
  return (
    <div className="clinical-draft-indicator">
      <StatusBadge tone={props.version.version_status === 'draft' ? 'info' : 'success'}>{formatLabel(props.version.version_status)}</StatusBadge>
      {conflict && <StatusBadge tone="danger">Stale conflict</StatusBadge>}
      <span>Last saved {formatDateTime(props.draft?.last_saved_at ?? props.version.updated_at)}</span>
      {props.saveState !== 'idle' && <span>{formatLabel(props.saveState)}</span>}
    </div>
  )
}

function StructuredRenderer(props: {
  sections: ClinicalTemplateSection[]
  fields: ClinicalTemplateField[]
  options: ClinicalTemplateFieldOption[]
  calculationRules: ClinicalTemplateCalculationRule[]
  responses: ClinicalStructuredResponse[]
  versionId: string
  disabled: boolean
  onSave: (input: SaveStructuredInput) => Promise<void>
}) {
  return (
    <div className="clinical-structured-renderer">
      {props.sections.map((section) => {
        const fields = props.fields
          .filter((field) => field.clinical_template_section_id === section.id)
          .sort((left, right) => left.display_order - right.display_order)
        return (
          <Card className="clinical-template-section-card" key={section.id}>
            <div className="clinical-documentation-card-header">
              <div>
                <span>{formatLabel(section.visibility_class)}</span>
                <h3>{section.section_label}</h3>
                {section.help_text && <p>{section.help_text}</p>}
              </div>
              <div className="clinical-documentation-boundaries">
                {section.patient_visible_eligible && <StatusBadge tone="info">Patient-visible eligible</StatusBadge>}
                {section.practitioner_only && <StatusBadge tone="warning">Practitioner only</StatusBadge>}
                {section.is_repeating && <StatusBadge tone="neutral">Repeatable</StatusBadge>}
              </div>
            </div>
            {fields.length === 0 ? (
              <p className="clinical-documentation-muted">No fields configured for this section.</p>
            ) : (
              <div className="clinical-fields-grid">
                {fields.map((field) => (
                  <ClinicalFieldRenderer
                    field={field}
                    response={props.responses.find((response) => response.clinical_template_field_id === field.id) ?? null}
                    options={props.options.filter((option) => option.clinical_template_field_id === field.id).sort((left, right) => left.display_order - right.display_order)}
                    calculation={props.calculationRules.find((rule) => rule.target_clinical_template_field_id === field.id) ?? null}
                    disabled={props.disabled}
                    onSave={(payload, expectedLockVersion) => props.onSave({ field, payload, expectedLockVersion })}
                    key={field.id}
                  />
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function ClinicalFieldRenderer(props: {
  field: ClinicalTemplateField
  response: ClinicalStructuredResponse | null
  options: ClinicalTemplateFieldOption[]
  calculation: ClinicalTemplateCalculationRule | null
  disabled: boolean
  onSave: (payload: Json, expectedLockVersion: number | null) => Promise<void>
}) {
  const [value, setValue] = useState(responseToInputValue(props.response, props.field.field_type))
  const [unit, setUnit] = useState(props.response?.response_unit ?? props.field.allowed_units[0] ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed' | 'stale'>('idle')

  useEffect(() => {
    setValue(responseToInputValue(props.response, props.field.field_type))
    setUnit(props.response?.response_unit ?? props.field.allowed_units[0] ?? '')
    setState('idle')
  }, [props.response?.id, props.response?.lock_version, props.field.id])

  const readOnly = props.disabled || props.field.is_read_only || props.field.is_calculated
  const canEdit = !readOnly && !referenceTypes.has(props.field.field_type) && !['heading', 'instruction', 'read_only_display', 'calculated', 'table', 'repeating_group'].includes(props.field.field_type)

  const save = async () => {
    if (!canEdit) return
    setState('saving')
    try {
      await props.onSave(buildPayload(props.field, value, unit), props.response?.lock_version ?? null)
      setState('saved')
    } catch (error) {
      setState(String(error).toLowerCase().includes('changed since') ? 'stale' : 'failed')
    }
  }

  return (
    <div className={`clinical-field clinical-field-${props.field.field_type}`}>
      <div className="clinical-field-label">
        <span>{props.field.field_label}{(props.field.is_required || props.field.is_required_on_finalise) ? ' *' : ''}</span>
        <div>
          {props.field.patient_visible_eligible && <StatusBadge tone="info">Patient-visible eligible</StatusBadge>}
          {props.field.practitioner_only && <StatusBadge tone="warning">Practitioner only</StatusBadge>}
        </div>
      </div>
      {props.field.help_text && <p>{props.field.help_text}</p>}
      {renderFieldControl(props.field, props.options, value, setValue, unit, setUnit, readOnly)}
      {props.field.is_calculated && (
        <p className="clinical-documentation-muted">
          Calculated field. {props.calculation ? `${formatLabel(props.calculation.calculation_type)} calculation is ${formatLabel(props.calculation.calculation_status)}.` : 'Calculation result is pending or unavailable.'}
        </p>
      )}
      {referenceTypes.has(props.field.field_type) && <p className="clinical-documentation-muted">Reference field uses the authoritative clinical record. Direct editing is deferred.</p>}
      <div className="clinical-field-footer">
        <span>{props.response ? `Saved ${formatDateTime(props.response.saved_at)} · lock ${props.response.lock_version}` : 'Not saved yet'}</span>
        <Button variant="secondary" disabled={!canEdit || state === 'saving'} onClick={save}>{state === 'saving' ? 'Saving...' : 'Save field'}</Button>
      </div>
      {state === 'stale' && <p className="clinical-documentation-error">This field changed since it loaded. Reload before saving.</p>}
      {state === 'failed' && <p className="clinical-documentation-error">Field could not be saved safely.</p>}
    </div>
  )
}

function renderFieldControl(
  field: ClinicalTemplateField,
  options: ClinicalTemplateFieldOption[],
  value: string,
  setValue: (value: string) => void,
  unit: string,
  setUnit: (value: string) => void,
  readOnly: boolean,
) {
  if (field.field_type === 'heading') return <h4>{field.field_label}</h4>
  if (field.field_type === 'instruction' || field.field_type === 'read_only_display') return <p className="clinical-documentation-muted">{field.placeholder || 'Read-only information'}</p>
  if (field.field_type === 'long_text' || field.field_type === 'rich_text') {
    return <textarea value={value} disabled={readOnly} placeholder={field.placeholder ?? ''} onChange={(event) => setValue(event.target.value)} />
  }
  if (['number', 'decimal', 'scale'].includes(field.field_type)) {
    return <input type="number" value={value} disabled={readOnly} placeholder={field.placeholder ?? ''} onChange={(event) => setValue(event.target.value)} />
  }
  if (field.field_type === 'date') return <input type="date" value={value} disabled={readOnly} onChange={(event) => setValue(event.target.value)} />
  if (field.field_type === 'time') return <input type="time" value={value} disabled={readOnly} onChange={(event) => setValue(event.target.value)} />
  if (field.field_type === 'datetime') return <input type="datetime-local" value={value} disabled={readOnly} onChange={(event) => setValue(event.target.value)} />
  if (field.field_type === 'boolean') {
    return (
      <label className="clinical-field-checkbox">
        <input type="checkbox" checked={value === 'true'} disabled={readOnly} onChange={(event) => setValue(event.target.checked ? 'true' : 'false')} />
        Yes
      </label>
    )
  }
  if (field.field_type === 'single_choice' || field.field_type === 'laterality' || field.field_type === 'body_area') {
    return (
      <select value={value} disabled={readOnly} onChange={(event) => setValue(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option value={option.option_key} key={option.id}>{option.option_label}</option>)}
      </select>
    )
  }
  if (field.field_type === 'multiple_choice' || field.field_type === 'checklist') {
    const selected = new Set(value ? value.split('|') : [])
    return (
      <div className="clinical-field-checklist">
        {options.map((option) => (
          <label key={option.id}>
            <input
              type="checkbox"
              checked={selected.has(option.option_key)}
              disabled={readOnly}
              onChange={(event) => {
                const next = new Set(selected)
                if (event.target.checked) next.add(option.option_key)
                else next.delete(option.option_key)
                setValue(Array.from(next).join('|'))
              }}
            />
            {option.option_label}
          </label>
        ))}
      </div>
    )
  }
  if (field.field_type === 'measurement') {
    return (
      <div className="clinical-measurement-field">
        <input type="number" value={value} disabled={readOnly} placeholder={field.placeholder ?? ''} onChange={(event) => setValue(event.target.value)} />
        <select value={unit} disabled={readOnly || field.allowed_units.length === 0} onChange={(event) => setUnit(event.target.value)}>
          {field.allowed_units.length === 0 ? <option value="">unit</option> : field.allowed_units.map((allowedUnit) => <option value={allowedUnit} key={allowedUnit}>{allowedUnit}</option>)}
        </select>
      </div>
    )
  }
  return <input value={value} disabled={readOnly || referenceTypes.has(field.field_type)} placeholder={field.placeholder ?? 'Specialised field interface deferred'} onChange={(event) => setValue(event.target.value)} />
}

function PreviousNotes(props: {
  currentVersionId: string
  previousResponses: ClinicalStructuredResponse[]
  fields: ClinicalTemplateField[]
  versions: ClinicalDocumentationNoteVersion[]
  events: ClinicalCopyForwardEvent[]
  canManage: boolean
  onCopyForward: (sourceResponse: ClinicalStructuredResponse, targetFieldId: string) => Promise<void>
}) {
  const currentFields = props.fields
  return (
    <Card>
      <div className="clinical-documentation-card-header">
        <div>
          <span>Previous documentation</span>
          <h3>Selective copy-forward</h3>
          <p>Choose individual fields only. Copied content becomes fresh draft content and does not inherit signatures.</p>
        </div>
      </div>
      {props.previousResponses.length === 0 ? (
        <EmptyState title="No structured responses to copy" description="Previous structured values will appear here once saved." />
      ) : (
        <div className="clinical-copy-forward-list">
          {props.previousResponses.slice(0, 12).map((response) => {
            const targetField = currentFields.find((field) => field.field_key === response.field_key)
            const sourceVersion = props.versions.find((version) => version.id === response.clinical_note_version_id)
            const event = props.events.find((item) => item.target_response_id === response.id)
            return (
              <div className="clinical-copy-forward-item" key={response.id}>
                <div>
                  <strong>{response.field_key}</strong>
                  <span>{response.display_value || response.response_text || String(response.response_number ?? '') || 'Stored value'} · v{sourceVersion?.version_number ?? '-'}</span>
                  {event && <small>Copied {formatDateTime(event.copied_at)}{event.copied_value_edited ? ' · edited after copy' : ''}</small>}
                </div>
                <Button variant="secondary" disabled={!props.canManage || !targetField} onClick={() => targetField ? props.onCopyForward(response, targetField.id) : undefined}>Copy</Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function ClinicalTimeline(props: {
  encounters: ClinicalDocumentationEncounter[]
  notes: ClinicalDocumentationNote[]
  versions: ClinicalDocumentationNoteVersion[]
  copyForwardEvents: ClinicalCopyForwardEvent[]
}) {
  const items = [
    ...props.encounters.map((item) => ({ key: `encounter-${item.id}`, title: formatLabel(item.encounter_type), text: item.summary || formatLabel(item.encounter_status), date: item.occurred_at, tone: 'info' as const })),
    ...props.notes.map((item) => ({ key: `note-${item.id}`, title: item.note_title || formatLabel(item.note_type), text: formatLabel(item.note_status), date: item.updated_at, tone: 'neutral' as const })),
    ...props.versions.filter((item) => item.finalised_at).map((item) => ({ key: `final-${item.id}`, title: 'Note finalised', text: `Version ${item.version_number}`, date: item.finalised_at, tone: 'success' as const })),
    ...props.versions.filter((item) => item.signed_at).map((item) => ({ key: `sign-${item.id}`, title: 'Note signed', text: `Version ${item.version_number}`, date: item.signed_at, tone: 'success' as const })),
    ...props.copyForwardEvents.map((item) => ({ key: `copy-${item.id}`, title: 'Copy-forward used', text: `${item.source_field_key ?? 'Field'} copied to ${item.target_field_key ?? 'draft'}`, date: item.copied_at, tone: 'info' as const })),
  ].sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''))

  return (
    <Card>
      <div className="clinical-documentation-card-header">
        <div>
          <span>Clinical timeline</span>
          <h3>Documentation activity</h3>
        </div>
      </div>
      <div className="clinical-timeline-list">
        {items.length === 0 ? (
          <EmptyState title="No clinical timeline yet" description="Encounters, notes, finalisation, signing and copy-forward events will appear here." />
        ) : items.slice(0, 16).map((item) => (
          <div className="clinical-timeline-item" key={item.key}>
            <StatusBadge tone={item.tone}>{item.title}</StatusBadge>
            <span>{item.text}</span>
            <small>{formatDateTime(item.date)}</small>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ValidationSummary(props: { result: Json; localMissing: string[] }) {
  const resultObject = isRecord(props.result) ? props.result : null
  const errors = Array.isArray(resultObject?.errors) ? resultObject.errors.map(String) : []
  return (
    <div className="clinical-validation-summary">
      <strong>Validation summary</strong>
      {props.localMissing.length === 0 && errors.length === 0 ? (
        <p>No local validation blockers detected. Database validation remains authoritative.</p>
      ) : (
        <ul>
          {props.localMissing.map((item) => <li key={item}>Required: {item}</li>)}
          {errors.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      {resultObject && <StatusBadge tone={resultObject.valid ? 'success' : 'warning'}>{resultObject.valid ? 'Database ready' : 'Database blockers'}</StatusBadge>}
    </div>
  )
}

function buildPayload(field: ClinicalTemplateField, value: string, unit: string): Json {
  const base = {
    response_value: null as Json,
    response_text: null as string | null,
    response_number: null as number | null,
    response_boolean: null as boolean | null,
    response_date: null as string | null,
    response_datetime: null as string | null,
    response_unit: unit || null,
    display_value: value || null,
    value_type: 'text',
    validation_state: 'unchecked',
    validation_errors: [],
    client_saved_at: new Date().toISOString(),
    metadata: {},
  }

  if (['number', 'decimal', 'scale', 'measurement'].includes(field.field_type)) {
    const numberValue = value === '' ? null : Number(value)
    return { ...base, response_number: Number.isFinite(numberValue) ? numberValue : null, value_type: field.field_type === 'decimal' ? 'decimal' : 'number' }
  }
  if (field.field_type === 'boolean') return { ...base, response_boolean: value === 'true', value_type: 'boolean', display_value: value === 'true' ? 'Yes' : 'No' }
  if (field.field_type === 'date') return { ...base, response_date: value || null, value_type: 'date' }
  if (field.field_type === 'datetime') return { ...base, response_datetime: value ? new Date(value).toISOString() : null, value_type: 'datetime' }
  if (field.field_type === 'time') return { ...base, response_text: value || null, value_type: 'time' }
  if (field.field_type === 'single_choice' || field.field_type === 'laterality' || field.field_type === 'body_area') return { ...base, response_text: value || null, response_value: value || null, value_type: 'choice' }
  if (field.field_type === 'multiple_choice' || field.field_type === 'checklist') {
    const values = value ? value.split('|') : []
    return { ...base, response_value: values, display_value: values.join(', '), value_type: 'multi_choice' }
  }
  return { ...base, response_text: value || null, value_type: 'text' }
}

function responseToInputValue(response: ClinicalStructuredResponse | null, fieldType: string) {
  if (!response) return ''
  if (['number', 'decimal', 'scale', 'measurement'].includes(fieldType)) return response.response_number === null ? '' : String(response.response_number)
  if (fieldType === 'boolean') return response.response_boolean ? 'true' : 'false'
  if (fieldType === 'date') return response.response_date ?? ''
  if (fieldType === 'datetime') return response.response_datetime ? response.response_datetime.slice(0, 16) : ''
  if (fieldType === 'multiple_choice' || fieldType === 'checklist') return Array.isArray(response.response_value) ? response.response_value.map(String).join('|') : ''
  return response.response_text ?? response.display_value ?? ''
}

function clientRequiredMissing(sections: ClinicalTemplateSection[], fields: ClinicalTemplateField[], responses: ClinicalStructuredResponse[], versionId: string) {
  const responseFieldIds = new Set(responses.filter((response) => response.clinical_note_version_id === versionId).map((response) => response.clinical_template_field_id))
  const sectionIds = new Set(sections.map((section) => section.id))
  return fields
    .filter((field) => sectionIds.has(field.clinical_template_section_id))
    .filter((field) => field.is_required || field.is_required_on_finalise)
    .filter((field) => !['heading', 'instruction', 'read_only_display'].includes(field.field_type))
    .filter((field) => !responseFieldIds.has(field.id))
    .map((field) => field.field_label)
}

function formatPatientName(patient: ClinicalDocumentationPatient) {
  return `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || patient.patient_number || 'Patient'
}

function formatLabel(value: string | null | undefined) {
  return (value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Not set'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function isRecord(value: Json): value is Record<string, Json> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function safeMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('permission')) {
      return 'Clinical documentation is unavailable for your current role.'
    }
    if (error.message.toLowerCase().includes('changed since')) return 'This draft has a stale edit conflict. Reload before saving.'
    return error.message
  }
  return 'Clinical documentation action failed.'
}
