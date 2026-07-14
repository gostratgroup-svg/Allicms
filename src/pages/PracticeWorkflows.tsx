import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, SearchBar, StatusBadge } from '../components/ui'
import type { Database, Json } from '../lib/database.types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type WorkflowDefinitionRow = Database['public']['Tables']['workflow_definitions']['Row']
type WorkflowDefinitionInsert = Database['public']['Tables']['workflow_definitions']['Insert']
type WorkflowDefinitionUpdate = Database['public']['Tables']['workflow_definitions']['Update']
type WorkflowDefinitionVersionRow = Database['public']['Tables']['workflow_definition_versions']['Row']
type WorkflowDefinitionVersionInsert = Database['public']['Tables']['workflow_definition_versions']['Insert']
type WorkflowDefinitionVersionUpdate = Database['public']['Tables']['workflow_definition_versions']['Update']
type WorkflowExecutionRow = Database['public']['Tables']['workflow_executions']['Row']
type WorkflowStepExecutionRow = Database['public']['Tables']['workflow_step_executions']['Row']
type WorkflowScheduledJobRow = Database['public']['Tables']['workflow_scheduled_jobs']['Row']
type WorkflowDeadLetterRow = Database['public']['Tables']['workflow_dead_letters']['Row']
type WorkflowActionRequestRow = Database['public']['Tables']['workflow_action_requests']['Row']
type CommunicationRequestRow = Database['public']['Tables']['communication_requests']['Row']
type StaffTaskRow = Database['public']['Tables']['staff_tasks']['Row']

type WorkflowTab = 'workflows' | 'executions' | 'scheduled' | 'failures' | 'requests' | 'tasks'

type WorkflowFormState = {
  name: string
  description: string
  category: string
  trigger_event_type: string
  action_type: string
  delay_minutes: string
  timezone_strategy: string
  status: 'draft' | 'disabled'
}

const emptyWorkflowForm: WorkflowFormState = {
  name: '',
  description: '',
  category: 'operations',
  trigger_event_type: 'booking.created',
  action_type: 'create_staff_task',
  delay_minutes: '',
  timezone_strategy: 'tenant_default',
  status: 'draft',
}

const tabs: Array<{ id: WorkflowTab; label: string }> = [
  { id: 'workflows', label: 'Workflows' },
  { id: 'executions', label: 'Executions' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'failures', label: 'Failures' },
  { id: 'requests', label: 'Requests' },
  { id: 'tasks', label: 'Tasks' },
]

const triggerEventOptions = [
  'booking.created',
  'booking.updated',
  'booking.cancelled',
  'session.completed',
  'invoice.issued',
  'payment.recorded',
  'patient_link.access_failed',
]

const actionTypeOptions = [
  'create_staff_task',
  'create_communication_request',
  'mark_patient_link_content_available',
  'add_patient_history_event',
  'create_internal_notification',
  'request_draft_invoice_recovery',
  'request_invoice_reconciliation_review',
]

const categoryOptions = ['operations', 'finance', 'communication', 'patient_link', 'security', 'system']
const statusFilterOptions = ['all', 'draft', 'active', 'paused', 'disabled', 'archived']
const ownerFilterOptions = ['all', 'system', 'tenant']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Not set'
  return value.replaceAll('_', ' ')
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['active', 'completed', 'processed', 'sent', 'resolved'].includes(status)) return 'success'
  if (['failed', 'dead_lettered', 'blocked', 'cancelled', 'unresolved'].includes(status)) return 'danger'
  if (['pending', 'scheduled', 'waiting', 'processing', 'running', 'in_progress', 'retry_scheduled'].includes(status)) return 'warning'
  if (['draft', 'validating', 'paused'].includes(status)) return 'info'
  return 'neutral'
}

function isJsonRecord(value: Json): value is Record<string, Json> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function summarizeJson(value: Json) {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
  if (isJsonRecord(value)) {
    const keys = Object.keys(value)
    return keys.length > 0 ? keys.slice(0, 4).map(formatLabel).join(', ') : 'No configuration'
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return 'No configuration'
}

function actionSummary(value: Json) {
  if (!Array.isArray(value) || value.length === 0) return 'No actions configured'

  return value
    .slice(0, 3)
    .map((item) => (isJsonRecord(item) && typeof item.action_type === 'string' ? formatLabel(item.action_type) : 'Configured action'))
    .join(', ')
}

function conditionSummary(value: Json) {
  if (!Array.isArray(value) || value.length === 0) return 'No conditions'
  return `${value.length} condition${value.length === 1 ? '' : 's'}`
}

function getActiveVersion(definition: WorkflowDefinitionRow, versions: WorkflowDefinitionVersionRow[]) {
  if (!definition.active_version_id) return null
  return versions.find((version) => version.id === definition.active_version_id) ?? null
}

function latestVersionFor(definitionId: string, versions: WorkflowDefinitionVersionRow[]) {
  return versions
    .filter((version) => version.workflow_definition_id === definitionId)
    .sort((a, b) => b.version_number - a.version_number)[0] ?? null
}

function getWorkflowHealth(definition: WorkflowDefinitionRow, executions: WorkflowExecutionRow[], deadLetters: WorkflowDeadLetterRow[]) {
  const failedExecutions = executions.filter(
    (execution) => execution.workflow_definition_id === definition.id && ['failed', 'dead_lettered'].includes(execution.status),
  )
  const unresolvedDeadLetters = deadLetters.filter(
    (deadLetter) => deadLetter.workflow_definition_id === definition.id && deadLetter.resolution_status === 'unresolved',
  )

  if (unresolvedDeadLetters.length > 0) return { label: `${unresolvedDeadLetters.length} unresolved`, tone: 'danger' as const }
  if (failedExecutions.length > 0) return { label: `${failedExecutions.length} failed`, tone: 'warning' as const }
  return { label: 'Healthy', tone: 'success' as const }
}

function safeErrorMessage(message: string) {
  if (message.toLowerCase().includes('row-level security')) return 'Your current role cannot complete this workflow action.'
  if (message.toLowerCase().includes('workflow version failed validation')) return 'Workflow validation failed. Check the trigger and action configuration.'
  if (message.toLowerCase().includes('only tenant admins')) return 'Only tenant admins can complete this workflow action.'
  return message
}

function workflowPayloadFromForm(formState: WorkflowFormState, tenantId: string): WorkflowDefinitionInsert {
  const keyBase = slugify(formState.name)

  return {
    tenant_id: tenantId,
    workflow_key: `tenant.${keyBase || crypto.randomUUID()}`,
    name: formState.name.trim(),
    description: emptyToNull(formState.description),
    category: formState.category,
    workflow_owner_type: 'tenant',
    status: formState.status,
    is_system_workflow: false,
    tenant_disable_allowed: true,
    tenant_clone_allowed: false,
    metadata: {},
  }
}

function versionPayloadFromForm(formState: WorkflowFormState, tenantId: string, definitionId: string, versionNumber: number): WorkflowDefinitionVersionInsert {
  const delayMinutes = formState.delay_minutes.trim() ? Number.parseInt(formState.delay_minutes, 10) : null

  return {
    tenant_id: tenantId,
    workflow_definition_id: definitionId,
    version_number: versionNumber,
    trigger_type: delayMinutes && delayMinutes > 0 ? 'delay_after_event' : 'domain_event',
    trigger_event_type: formState.trigger_event_type,
    trigger_config: delayMinutes && delayMinutes > 0 ? { delay_minutes: delayMinutes } : {},
    condition_config: [],
    action_config: [{ action_type: formState.action_type }],
    timezone_strategy: formState.timezone_strategy,
    status: 'draft',
    validation_metadata: {},
  }
}

export function PracticeWorkflowsPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canConfigureWorkflows = authorization.hasPermission('tenant.practice.configure')
  const canViewWorkflows = authorization.hasPermission('tenant.practice.configure', 'tenant.finance.view', 'tenant.communication.manage')
  const [activeTab, setActiveTab] = useState<WorkflowTab>('workflows')
  const [definitions, setDefinitions] = useState<WorkflowDefinitionRow[]>([])
  const [versions, setVersions] = useState<WorkflowDefinitionVersionRow[]>([])
  const [executions, setExecutions] = useState<WorkflowExecutionRow[]>([])
  const [steps, setSteps] = useState<WorkflowStepExecutionRow[]>([])
  const [scheduledJobs, setScheduledJobs] = useState<WorkflowScheduledJobRow[]>([])
  const [deadLetters, setDeadLetters] = useState<WorkflowDeadLetterRow[]>([])
  const [actionRequests, setActionRequests] = useState<WorkflowActionRequestRow[]>([])
  const [communicationRequests, setCommunicationRequests] = useState<CommunicationRequestRow[]>([])
  const [staffTasks, setStaffTasks] = useState<StaffTaskRow[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [formState, setFormState] = useState<WorkflowFormState>(emptyWorkflowForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState('')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedWorkflow = useMemo(
    () => definitions.find((definition) => definition.id === selectedWorkflowId) ?? null,
    [definitions, selectedWorkflowId],
  )
  const selectedExecution = useMemo(
    () => executions.find((execution) => execution.id === selectedExecutionId) ?? null,
    [executions, selectedExecutionId],
  )
  const filteredDefinitions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return definitions.filter((definition) => {
      const activeVersion = getActiveVersion(definition, versions) ?? latestVersionFor(definition.id, versions)
      const matchesSearch = !normalizedSearch
        || definition.name.toLowerCase().includes(normalizedSearch)
        || definition.workflow_key.toLowerCase().includes(normalizedSearch)
        || (definition.description ?? '').toLowerCase().includes(normalizedSearch)
      const matchesStatus = statusFilter === 'all' || definition.status === statusFilter
      const matchesOwner = ownerFilter === 'all' || (ownerFilter === 'system' ? definition.is_system_workflow : !definition.is_system_workflow)
      return matchesSearch && matchesStatus && matchesOwner
    })
  }, [definitions, ownerFilter, search, statusFilter, versions])

  const workflowCounts = useMemo(() => ({
    pendingEvents: actionRequests.filter((request) => ['pending', 'scheduled'].includes(request.status)).length,
    failedExecutions: executions.filter((execution) => ['failed', 'dead_lettered'].includes(execution.status)).length,
    dueJobs: scheduledJobs.filter((job) => ['scheduled', 'failed'].includes(job.status)).length,
    unresolvedFailures: deadLetters.filter((deadLetter) => deadLetter.resolution_status === 'unresolved').length,
    pendingCommunications: communicationRequests.filter((request) => ['draft', 'ready', 'scheduled', 'failed'].includes(request.status)).length,
    openTasks: staffTasks.filter((task) => ['open', 'in_progress', 'blocked'].includes(task.status)).length,
  }), [actionRequests, communicationRequests, deadLetters, executions, scheduledJobs, staffTasks])

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

    if (!canViewWorkflows) {
      setLoading(false)
      setLoadError('Your current role cannot view workflow administration.')
      return
    }

    void loadWorkflowWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id, canViewWorkflows])

  async function loadWorkflowWorkspace() {
    if (!activeTenant?.id || !supabase) return

    setLoading(true)
    setLoadError('')

    const tenantId = activeTenant.id
    const [
      tenantDefinitionsResult,
      systemDefinitionsResult,
      versionsResult,
      executionsResult,
      stepsResult,
      scheduledJobsResult,
      deadLettersResult,
      actionRequestsResult,
      communicationRequestsResult,
      staffTasksResult,
    ] = await Promise.all([
      supabase
        .from('workflow_definitions')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase
        .from('workflow_definitions')
        .select('*')
        .is('tenant_id', null)
        .eq('is_system_workflow', true)
        .is('deleted_at', null)
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('workflow_definition_versions')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .order('version_number', { ascending: false }),
      supabase
        .from('workflow_executions')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('workflow_step_executions')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('step_order', { ascending: true })
        .limit(120),
      supabase
        .from('workflow_scheduled_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('scheduled_for', { ascending: true })
        .limit(60),
      supabase
        .from('workflow_dead_letters')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('dead_lettered_at', { ascending: false })
        .limit(60),
      supabase
        .from('workflow_action_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('available_at', { ascending: true })
        .limit(60),
      supabase
        .from('communication_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('staff_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(60),
    ])

    const firstError = [
      tenantDefinitionsResult.error,
      systemDefinitionsResult.error,
      versionsResult.error,
      executionsResult.error,
      stepsResult.error,
      scheduledJobsResult.error,
      deadLettersResult.error,
      actionRequestsResult.error,
      communicationRequestsResult.error,
      staffTasksResult.error,
    ].find(Boolean)

    if (firstError) {
      setLoadError(safeErrorMessage(firstError.message))
      setLoading(false)
      return
    }

    const nextDefinitions = [
      ...((systemDefinitionsResult.data ?? []) as WorkflowDefinitionRow[]),
      ...((tenantDefinitionsResult.data ?? []) as WorkflowDefinitionRow[]),
    ]

    setDefinitions(nextDefinitions)
    setVersions((versionsResult.data ?? []) as WorkflowDefinitionVersionRow[])
    setExecutions((executionsResult.data ?? []) as WorkflowExecutionRow[])
    setSteps((stepsResult.data ?? []) as WorkflowStepExecutionRow[])
    setScheduledJobs((scheduledJobsResult.data ?? []) as WorkflowScheduledJobRow[])
    setDeadLetters((deadLettersResult.data ?? []) as WorkflowDeadLetterRow[])
    setActionRequests((actionRequestsResult.data ?? []) as WorkflowActionRequestRow[])
    setCommunicationRequests((communicationRequestsResult.data ?? []) as CommunicationRequestRow[])
    setStaffTasks((staffTasksResult.data ?? []) as StaffTaskRow[])
    setSelectedWorkflowId((currentId) => currentId && nextDefinitions.some((definition) => definition.id === currentId) ? currentId : nextDefinitions[0]?.id ?? null)
    setSelectedExecutionId((currentId) => currentId && (executionsResult.data ?? []).some((execution) => execution.id === currentId) ? currentId : (executionsResult.data?.[0]?.id ?? null))
    setLoading(false)
  }

  const updateFormField = <Field extends keyof WorkflowFormState>(field: Field, value: WorkflowFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setActionError('')
    setSuccessMessage('')
  }

  async function createDraftWorkflow() {
    if (!activeTenant?.id || !supabase || !canConfigureWorkflows || actionInProgress) return

    if (!formState.name.trim()) {
      setActionError('Workflow name is required.')
      return
    }

    if (formState.delay_minutes.trim()) {
      const delayMinutes = Number.parseInt(formState.delay_minutes, 10)
      if (!Number.isInteger(delayMinutes) || delayMinutes <= 0) {
        setActionError('Delay must be a positive number of minutes.')
        return
      }
    }

    setActionInProgress('create-workflow')
    setActionError('')
    setSuccessMessage('')

    const definitionPayload = workflowPayloadFromForm(formState, activeTenant.id)
    const definitionResult = await supabase
      .from('workflow_definitions')
      .insert(definitionPayload)
      .select()
      .single()

    if (definitionResult.error) {
      setActionError(safeErrorMessage(definitionResult.error.message))
      setActionInProgress('')
      return
    }

    const definition = definitionResult.data as WorkflowDefinitionRow
    const versionResult = await supabase
      .from('workflow_definition_versions')
      .insert(versionPayloadFromForm(formState, activeTenant.id, definition.id, 1))
      .select()
      .single()

    if (versionResult.error) {
      setActionError(safeErrorMessage(versionResult.error.message))
      setActionInProgress('')
      await loadWorkflowWorkspace()
      return
    }

    setFormState(emptyWorkflowForm)
    setSelectedWorkflowId(definition.id)
    setSuccessMessage('Draft workflow created. Activate the draft version when it is ready.')
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  async function createDraftVersion(definition: WorkflowDefinitionRow) {
    if (!activeTenant?.id || !supabase || !canConfigureWorkflows || actionInProgress) return
    if (definition.is_system_workflow) {
      setActionError('System workflows cannot be edited by tenant users.')
      return
    }

    const currentVersions = versions.filter((version) => version.workflow_definition_id === definition.id)
    const baseVersion = latestVersionFor(definition.id, versions)
    const nextVersionNumber = Math.max(0, ...currentVersions.map((version) => version.version_number)) + 1

    setActionInProgress(`version-${definition.id}`)
    setActionError('')
    setSuccessMessage('')

    const versionResult = await supabase
      .from('workflow_definition_versions')
      .insert({
        tenant_id: activeTenant.id,
        workflow_definition_id: definition.id,
        version_number: nextVersionNumber,
        trigger_type: baseVersion?.trigger_type ?? 'domain_event',
        trigger_event_type: baseVersion?.trigger_event_type ?? 'booking.created',
        trigger_config: baseVersion?.trigger_config ?? {},
        condition_config: baseVersion?.condition_config ?? [],
        action_config: baseVersion?.action_config ?? [{ action_type: 'create_staff_task' }],
        timezone_strategy: baseVersion?.timezone_strategy ?? 'tenant_default',
        status: 'draft',
        validation_metadata: {},
      } satisfies WorkflowDefinitionVersionInsert)
      .select()
      .single()

    if (versionResult.error) {
      setActionError(safeErrorMessage(versionResult.error.message))
      setActionInProgress('')
      return
    }

    setSuccessMessage('Draft workflow version created from the current configuration.')
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  async function activateVersion(version: WorkflowDefinitionVersionRow) {
    if (!supabase || !canConfigureWorkflows || actionInProgress) return

    if (!['draft', 'validating'].includes(version.status)) {
      setActionError('Only draft or validating workflow versions can be activated.')
      return
    }

    const confirmed = window.confirm(`Activate version ${version.version_number}? This will replace the current active version.`)
    if (!confirmed) return

    setActionInProgress(`activate-${version.id}`)
    setActionError('')
    setSuccessMessage('')

    const { error } = await supabase.rpc('activate_workflow_version', { target_version_id: version.id })

    if (error) {
      setActionError(safeErrorMessage(error.message))
      setActionInProgress('')
      return
    }

    const verificationResult = await supabase
      .from('workflow_definitions')
      .select('id, active_version_id, status')
      .eq('id', version.workflow_definition_id)
      .single()

    if (verificationResult.error || verificationResult.data?.active_version_id !== version.id) {
      setActionError('Workflow activation was submitted, but AlliDesk could not verify the active version. Please reload and check the workflow state.')
      setActionInProgress('')
      return
    }

    await loadWorkflowWorkspace()
    setSuccessMessage('Workflow version activated and verified.')
    setActionInProgress('')
  }

  async function updateWorkflowStatus(definition: WorkflowDefinitionRow, nextStatus: 'active' | 'disabled' | 'paused') {
    if (!supabase || !canConfigureWorkflows || actionInProgress) return

    if (definition.is_system_workflow && !definition.tenant_disable_allowed) {
      setActionError('This mandatory system workflow cannot be disabled or paused by tenant users.')
      return
    }

    if (definition.is_system_workflow) {
      setActionError('System workflow overrides are not enabled yet. This workflow remains centrally managed.')
      return
    }

    const confirmed = window.confirm(`Change workflow status to ${formatLabel(nextStatus)}?`)
    if (!confirmed) return

    setActionInProgress(`status-${definition.id}`)
    setActionError('')
    setSuccessMessage('')

    const statusResult = await supabase
      .from('workflow_definitions')
      .update({ status: nextStatus } satisfies WorkflowDefinitionUpdate)
      .eq('id', definition.id)
      .eq('updated_at', definition.updated_at)
      .select()
      .single()

    if (statusResult.error) {
      setActionError(safeErrorMessage(statusResult.error.message))
      setActionInProgress('')
      return
    }

    setSuccessMessage(`Workflow ${formatLabel(nextStatus)}.`)
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  async function cancelExecution(execution: WorkflowExecutionRow) {
    if (!supabase || !canConfigureWorkflows || actionInProgress) return

    if (['completed', 'cancelled'].includes(execution.status)) {
      setActionError('This execution is already complete or cancelled.')
      return
    }

    const reason = window.prompt('Reason for cancelling this workflow execution:', 'Cancelled by tenant administrator')
    if (!reason) return

    setActionInProgress(`cancel-execution-${execution.id}`)
    setActionError('')
    setSuccessMessage('')

    const { error } = await supabase.rpc('cancel_workflow_execution', {
      target_execution_id: execution.id,
      cancellation_reason_input: reason,
    })

    if (error) {
      setActionError(safeErrorMessage(error.message))
      setActionInProgress('')
      return
    }

    setSuccessMessage('Workflow execution cancelled.')
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  async function retryDeadLetter(deadLetter: WorkflowDeadLetterRow) {
    if (!supabase || !canConfigureWorkflows || actionInProgress) return

    if (!['unresolved', 'retry_scheduled'].includes(deadLetter.resolution_status)) {
      setActionError('This failure is not currently retryable.')
      return
    }

    const confirmed = window.confirm('Retry this dead-letter item? The original failure history will remain available.')
    if (!confirmed) return

    setActionInProgress(`retry-dead-letter-${deadLetter.id}`)
    setActionError('')
    setSuccessMessage('')

    const { error } = await supabase.rpc('retry_workflow_dead_letter', { target_dead_letter_id: deadLetter.id })

    if (error) {
      setActionError(safeErrorMessage(error.message))
      setActionInProgress('')
      return
    }

    setSuccessMessage('Dead-letter item queued for retry.')
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  async function cancelScheduledJob(job: WorkflowScheduledJobRow) {
    if (!supabase || !canConfigureWorkflows || actionInProgress) return

    if (!['scheduled', 'failed'].includes(job.status)) {
      setActionError('Only scheduled or failed jobs can be cancelled from this screen.')
      return
    }

    const reason = window.prompt('Reason for cancelling this scheduled job:', 'Cancelled by tenant administrator')
    if (!reason) return

    setActionInProgress(`cancel-job-${job.id}`)
    setActionError('')
    setSuccessMessage('')

    const { error } = await supabase.rpc('cancel_workflow_scheduled_job', {
      target_job_id: job.id,
      cancellation_reason_input: reason,
    })

    if (error) {
      setActionError(safeErrorMessage(error.message))
      setActionInProgress('')
      return
    }

    setSuccessMessage('Scheduled job cancelled.')
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  async function updateTaskStatus(task: StaffTaskRow, nextStatus: StaffTaskRow['status']) {
    if (!supabase || !canConfigureWorkflows || actionInProgress) return

    setActionInProgress(`task-${task.id}`)
    setActionError('')
    setSuccessMessage('')

    const result = await supabase
      .from('staff_tasks')
      .update({
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
      .eq('tenant_id', task.tenant_id)
      .eq('updated_at', task.updated_at)
      .select()
      .single()

    if (result.error) {
      setActionError(safeErrorMessage(result.error.message))
      setActionInProgress('')
      return
    }

    setSuccessMessage('Staff task updated.')
    setActionInProgress('')
    await loadWorkflowWorkspace()
  }

  if (loading) {
    return <LoadingState title="Loading workflows" description="Checking workflow definitions, executions and readiness records." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Workflow workspace unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => void loadWorkflowWorkspace()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="workflow-admin-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Workflow engine</span>
          <h3>{activeTenant?.practice_name ?? 'Practice workflows'}</h3>
          <p>
            Monitor workflow readiness, workflow definitions, executions, scheduled jobs, failures, communication requests
            and staff tasks. This workspace does not run workers or send communication.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{definitions.length} workflows</StatusBadge>
          {!canConfigureWorkflows && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="workflow-health-grid">
        <WorkflowMetric label="Pending action requests" value={workflowCounts.pendingEvents} tone={workflowCounts.pendingEvents > 0 ? 'warning' : 'success'} />
        <WorkflowMetric label="Failed executions" value={workflowCounts.failedExecutions} tone={workflowCounts.failedExecutions > 0 ? 'danger' : 'success'} />
        <WorkflowMetric label="Scheduled jobs" value={workflowCounts.dueJobs} tone={workflowCounts.dueJobs > 0 ? 'info' : 'neutral'} />
        <WorkflowMetric label="Dead letters" value={workflowCounts.unresolvedFailures} tone={workflowCounts.unresolvedFailures > 0 ? 'danger' : 'success'} />
        <WorkflowMetric label="Communication requests" value={workflowCounts.pendingCommunications} tone={workflowCounts.pendingCommunications > 0 ? 'warning' : 'success'} />
        <WorkflowMetric label="Open staff tasks" value={workflowCounts.openTasks} tone={workflowCounts.openTasks > 0 ? 'warning' : 'success'} />
      </div>

      {(actionError || successMessage) && (
        <Card className={actionError ? 'workflow-alert workflow-alert-error' : 'workflow-alert workflow-alert-success'}>
          <strong>{actionError ? 'Action could not be completed' : 'Workflow update complete'}</strong>
          <span>{actionError || successMessage}</span>
        </Card>
      )}

      <div className="workflow-tabs" role="tablist" aria-label="Workflow workspace sections">
        {tabs.map((tab) => (
          <button
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            key={tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'workflows' && (
        <WorkflowsTab
          canConfigureWorkflows={canConfigureWorkflows}
          definitions={filteredDefinitions}
          allDefinitions={definitions}
          versions={versions}
          executions={executions}
          deadLetters={deadLetters}
          selectedWorkflow={selectedWorkflow}
          formState={formState}
          search={search}
          statusFilter={statusFilter}
          ownerFilter={ownerFilter}
          actionInProgress={actionInProgress}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onOwnerFilterChange={setOwnerFilter}
          onSelectWorkflow={setSelectedWorkflowId}
          onFormChange={updateFormField}
          onCreateDraftWorkflow={createDraftWorkflow}
          onCreateDraftVersion={createDraftVersion}
          onActivateVersion={activateVersion}
          onUpdateStatus={updateWorkflowStatus}
        />
      )}

      {activeTab === 'executions' && (
        <ExecutionsTab
          definitions={definitions}
          executions={executions}
          steps={steps}
          scheduledJobs={scheduledJobs}
          actionRequests={actionRequests}
          selectedExecution={selectedExecution}
          canConfigureWorkflows={canConfigureWorkflows}
          actionInProgress={actionInProgress}
          onSelectExecution={setSelectedExecutionId}
          onCancelExecution={cancelExecution}
        />
      )}

      {activeTab === 'scheduled' && (
        <ScheduledTab
          jobs={scheduledJobs}
          definitions={definitions}
          executions={executions}
          canConfigureWorkflows={canConfigureWorkflows}
          actionInProgress={actionInProgress}
          onCancelJob={cancelScheduledJob}
        />
      )}

      {activeTab === 'failures' && (
        <FailuresTab
          failures={deadLetters}
          definitions={definitions}
          canConfigureWorkflows={canConfigureWorkflows}
          actionInProgress={actionInProgress}
          onRetry={retryDeadLetter}
        />
      )}

      {activeTab === 'requests' && (
        <RequestsTab
          actionRequests={actionRequests}
          communicationRequests={communicationRequests}
          definitions={definitions}
          executions={executions}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksTab
          tasks={staffTasks}
          canConfigureWorkflows={canConfigureWorkflows}
          actionInProgress={actionInProgress}
          onUpdateStatus={updateTaskStatus}
        />
      )}
    </div>
  )
}

function WorkflowMetric({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <Card className="workflow-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <StatusBadge tone={tone}>{value === 0 ? 'Clear' : 'Review'}</StatusBadge>
    </Card>
  )
}

type WorkflowsTabProps = {
  canConfigureWorkflows: boolean
  definitions: WorkflowDefinitionRow[]
  allDefinitions: WorkflowDefinitionRow[]
  versions: WorkflowDefinitionVersionRow[]
  executions: WorkflowExecutionRow[]
  deadLetters: WorkflowDeadLetterRow[]
  selectedWorkflow: WorkflowDefinitionRow | null
  formState: WorkflowFormState
  search: string
  statusFilter: string
  ownerFilter: string
  actionInProgress: string
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onOwnerFilterChange: (value: string) => void
  onSelectWorkflow: (id: string) => void
  onFormChange: <Field extends keyof WorkflowFormState>(field: Field, value: WorkflowFormState[Field]) => void
  onCreateDraftWorkflow: () => void
  onCreateDraftVersion: (definition: WorkflowDefinitionRow) => void
  onActivateVersion: (version: WorkflowDefinitionVersionRow) => void
  onUpdateStatus: (definition: WorkflowDefinitionRow, status: 'active' | 'disabled' | 'paused') => void
}

function WorkflowsTab({
  canConfigureWorkflows,
  definitions,
  allDefinitions,
  versions,
  executions,
  deadLetters,
  selectedWorkflow,
  formState,
  search,
  statusFilter,
  ownerFilter,
  actionInProgress,
  onSearchChange,
  onStatusFilterChange,
  onOwnerFilterChange,
  onSelectWorkflow,
  onFormChange,
  onCreateDraftWorkflow,
  onCreateDraftVersion,
  onActivateVersion,
  onUpdateStatus,
}: WorkflowsTabProps) {
  const selectedVersions = selectedWorkflow
    ? versions.filter((version) => version.workflow_definition_id === selectedWorkflow.id).sort((a, b) => b.version_number - a.version_number)
    : []
  const activeVersion = selectedWorkflow ? getActiveVersion(selectedWorkflow, versions) : null
  const recentExecutions = selectedWorkflow
    ? executions.filter((execution) => execution.workflow_definition_id === selectedWorkflow.id).slice(0, 5)
    : []
  const failureCount = selectedWorkflow
    ? deadLetters.filter((failure) => failure.workflow_definition_id === selectedWorkflow.id && failure.resolution_status === 'unresolved').length
    : 0

  return (
    <div className="workflow-workspace-grid">
      <Card className="workflow-list-panel">
        <div className="workflow-panel-header">
          <div>
            <span>Workflow definitions</span>
            <h3>{definitions.length} visible workflows</h3>
          </div>
        </div>
        <div className="workflow-filter-row">
          <SearchBar label="Search workflows" value={search} placeholder="Search by name or key" onChange={onSearchChange} />
          <label>
            Status
            <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
              {statusFilterOptions.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}
            </select>
          </label>
          <label>
            Owner
            <select value={ownerFilter} onChange={(event) => onOwnerFilterChange(event.target.value)}>
              {ownerFilterOptions.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}
            </select>
          </label>
        </div>

        {definitions.length === 0 ? (
          <EmptyState title="No workflows found" description={allDefinitions.length === 0 ? 'No workflow definitions are visible yet.' : 'Adjust the filters to find workflow definitions.'} />
        ) : (
          <div className="workflow-definition-list">
            {definitions.map((definition) => {
              const version = getActiveVersion(definition, versions) ?? latestVersionFor(definition.id, versions)
              const health = getWorkflowHealth(definition, executions, deadLetters)

              return (
                <button
                  type="button"
                  className={selectedWorkflow?.id === definition.id ? 'active' : ''}
                  onClick={() => onSelectWorkflow(definition.id)}
                  key={definition.id}
                >
                  <div>
                    <strong>{definition.name}</strong>
                    <span>{definition.workflow_key}</span>
                    <small>{formatLabel(definition.category)} · {version?.trigger_event_type ?? 'No trigger'}</small>
                  </div>
                  <div className="workflow-definition-badges">
                    <StatusBadge tone={definition.is_system_workflow ? 'info' : 'neutral'}>{definition.is_system_workflow ? 'System' : 'Tenant'}</StatusBadge>
                    <StatusBadge tone={statusTone(definition.status)}>{formatLabel(definition.status)}</StatusBadge>
                    <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <div className="workflow-detail-column">
        {canConfigureWorkflows && (
          <Card className="workflow-draft-card">
            <div className="workflow-panel-header">
              <div>
                <span>Tenant workflow draft</span>
                <h3>Create controlled workflow</h3>
              </div>
              <Button disabled={Boolean(actionInProgress)} onClick={onCreateDraftWorkflow}>
                {actionInProgress === 'create-workflow' ? 'Saving' : 'Create Draft'}
              </Button>
            </div>
            <div className="workflow-form-grid">
              <label>
                Name
                <input value={formState.name} onChange={(event) => onFormChange('name', event.target.value)} placeholder="Example: Intake follow-up task" />
              </label>
              <label>
                Category
                <select value={formState.category} onChange={(event) => onFormChange('category', event.target.value)}>
                  {categoryOptions.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}
                </select>
              </label>
              <label>
                Trigger event
                <select value={formState.trigger_event_type} onChange={(event) => onFormChange('trigger_event_type', event.target.value)}>
                  {triggerEventOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                Action
                <select value={formState.action_type} onChange={(event) => onFormChange('action_type', event.target.value)}>
                  {actionTypeOptions.map((option) => <option value={option} key={option}>{formatLabel(option)}</option>)}
                </select>
              </label>
              <label>
                Delay minutes
                <input inputMode="numeric" value={formState.delay_minutes} onChange={(event) => onFormChange('delay_minutes', event.target.value)} placeholder="Optional" />
              </label>
              <label>
                Initial status
                <select value={formState.status} onChange={(event) => onFormChange('status', event.target.value as WorkflowFormState['status'])}>
                  <option value="draft">Draft</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className="workflow-form-wide">
                Description
                <textarea value={formState.description} onChange={(event) => onFormChange('description', event.target.value)} rows={3} />
              </label>
            </div>
          </Card>
        )}

        {selectedWorkflow ? (
          <Card className="workflow-detail-card">
            <div className="workflow-panel-header">
              <div>
                <span>{selectedWorkflow.is_system_workflow ? 'System workflow' : 'Tenant workflow'}</span>
                <h3>{selectedWorkflow.name}</h3>
              </div>
              <div className="workflow-header-actions">
                <StatusBadge tone={statusTone(selectedWorkflow.status)}>{formatLabel(selectedWorkflow.status)}</StatusBadge>
                {canConfigureWorkflows && !selectedWorkflow.is_system_workflow && (
                  <>
                    <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onUpdateStatus(selectedWorkflow, selectedWorkflow.status === 'disabled' ? 'active' : 'disabled')}>
                      {selectedWorkflow.status === 'disabled' ? 'Enable' : 'Disable'}
                    </Button>
                    <Button variant="ghost" disabled={Boolean(actionInProgress)} onClick={() => onUpdateStatus(selectedWorkflow, 'paused')}>
                      Pause
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="workflow-detail-grid">
              <InfoBlock label="Workflow key" value={selectedWorkflow.workflow_key} />
              <InfoBlock label="Category" value={formatLabel(selectedWorkflow.category)} />
              <InfoBlock label="Owner" value={selectedWorkflow.is_system_workflow ? 'System managed' : 'Tenant managed'} />
              <InfoBlock label="Updated" value={formatDateTime(selectedWorkflow.updated_at)} />
              <InfoBlock label="Tenant may disable" value={selectedWorkflow.tenant_disable_allowed ? 'Yes' : 'No'} />
              <InfoBlock label="Tenant may clone" value={selectedWorkflow.tenant_clone_allowed ? 'Yes' : 'No'} />
              <InfoBlock label="Active version" value={activeVersion ? `Version ${activeVersion.version_number}` : 'No active version'} />
              <InfoBlock label="Trigger" value={activeVersion?.trigger_event_type ?? 'No active trigger'} />
            </div>

            {selectedWorkflow.description && <p className="workflow-description">{selectedWorkflow.description}</p>}

            {activeVersion ? (
              <div className="workflow-config-summary">
                <InfoBlock label="Trigger config" value={summarizeJson(activeVersion.trigger_config)} />
                <InfoBlock label="Conditions" value={conditionSummary(activeVersion.condition_config)} />
                <InfoBlock label="Actions" value={actionSummary(activeVersion.action_config)} />
                <InfoBlock label="Timezone" value={formatLabel(activeVersion.timezone_strategy)} />
                <InfoBlock label="Effective from" value={formatDateTime(activeVersion.effective_from)} />
                <InfoBlock label="Published" value={formatDateTime(activeVersion.published_at)} />
              </div>
            ) : (
              <EmptyState title="No active version" description="Create or activate a workflow version before this workflow can run." />
            )}

            <div className="workflow-subsection">
              <div className="workflow-panel-header">
                <div>
                  <span>Version history</span>
                  <h4>{selectedVersions.length} versions</h4>
                </div>
                {canConfigureWorkflows && !selectedWorkflow.is_system_workflow && (
                  <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onCreateDraftVersion(selectedWorkflow)}>
                    New Draft Version
                  </Button>
                )}
              </div>
              {selectedVersions.length === 0 ? (
                <EmptyState title="No versions yet" description="No workflow-version records are visible for this workflow." />
              ) : (
                <div className="workflow-version-list">
                  {selectedVersions.map((version) => (
                    <div className="workflow-version-row" key={version.id}>
                      <div>
                        <strong>Version {version.version_number}</strong>
                        <span>{version.trigger_event_type ?? formatLabel(version.trigger_type)}</span>
                        <small>{conditionSummary(version.condition_config)} · {actionSummary(version.action_config)}</small>
                      </div>
                      <div className="workflow-version-actions">
                        <StatusBadge tone={statusTone(version.status)}>{formatLabel(version.status)}</StatusBadge>
                        {version.id === selectedWorkflow.active_version_id && <StatusBadge tone="success">Active</StatusBadge>}
                        {canConfigureWorkflows && !selectedWorkflow.is_system_workflow && ['draft', 'validating'].includes(version.status) && (
                          <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onActivateVersion(version)}>
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="workflow-subsection">
              <span>Recent executions</span>
              {recentExecutions.length === 0 ? (
                <p className="workflow-muted">No recent executions for this workflow.</p>
              ) : (
                <div className="workflow-compact-list">
                  {recentExecutions.map((execution) => (
                    <div key={execution.id}>
                      <strong>{formatLabel(execution.status)}</strong>
                      <span>{formatDateTime(execution.created_at)} · attempts {execution.attempt_count}</span>
                    </div>
                  ))}
                </div>
              )}
              {failureCount > 0 && <StatusBadge tone="danger">{failureCount} unresolved failures</StatusBadge>}
            </div>
          </Card>
        ) : (
          <EmptyState title="Select a workflow" description="Choose a workflow definition to inspect configuration, versions and health." />
        )}
      </div>
    </div>
  )
}

function ExecutionsTab({
  definitions,
  executions,
  steps,
  scheduledJobs,
  actionRequests,
  selectedExecution,
  canConfigureWorkflows,
  actionInProgress,
  onSelectExecution,
  onCancelExecution,
}: {
  definitions: WorkflowDefinitionRow[]
  executions: WorkflowExecutionRow[]
  steps: WorkflowStepExecutionRow[]
  scheduledJobs: WorkflowScheduledJobRow[]
  actionRequests: WorkflowActionRequestRow[]
  selectedExecution: WorkflowExecutionRow | null
  canConfigureWorkflows: boolean
  actionInProgress: string
  onSelectExecution: (id: string) => void
  onCancelExecution: (execution: WorkflowExecutionRow) => void
}) {
  const selectedSteps = selectedExecution ? steps.filter((step) => step.workflow_execution_id === selectedExecution.id) : []
  const selectedJobs = selectedExecution ? scheduledJobs.filter((job) => job.workflow_execution_id === selectedExecution.id) : []
  const selectedActions = selectedExecution ? actionRequests.filter((request) => request.workflow_execution_id === selectedExecution.id) : []

  return (
    <div className="workflow-workspace-grid">
      <Card className="workflow-list-panel">
        <div className="workflow-panel-header">
          <div>
            <span>Workflow executions</span>
            <h3>{executions.length} recent executions</h3>
          </div>
        </div>
        {executions.length === 0 ? (
          <EmptyState title="No executions yet" description="Workflow execution records will appear here once a worker runtime is introduced." />
        ) : (
          <div className="workflow-definition-list">
            {executions.map((execution) => (
              <button
                type="button"
                className={selectedExecution?.id === execution.id ? 'active' : ''}
                onClick={() => onSelectExecution(execution.id)}
                key={execution.id}
              >
                <div>
                  <strong>{definitions.find((definition) => definition.id === execution.workflow_definition_id)?.name ?? 'Workflow execution'}</strong>
                  <span>{formatLabel(execution.trigger_type)} · {formatDateTime(execution.created_at)}</span>
                  <small>Attempts {execution.attempt_count} · Correlation {execution.correlation_id.slice(0, 8)}</small>
                </div>
                <StatusBadge tone={statusTone(execution.status)}>{formatLabel(execution.status)}</StatusBadge>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="workflow-detail-card">
        {selectedExecution ? (
          <>
            <div className="workflow-panel-header">
              <div>
                <span>Execution detail</span>
                <h3>{definitions.find((definition) => definition.id === selectedExecution.workflow_definition_id)?.name ?? selectedExecution.id}</h3>
              </div>
              <div className="workflow-header-actions">
                <StatusBadge tone={statusTone(selectedExecution.status)}>{formatLabel(selectedExecution.status)}</StatusBadge>
                {canConfigureWorkflows && !['completed', 'cancelled'].includes(selectedExecution.status) && (
                  <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onCancelExecution(selectedExecution)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
            <div className="workflow-detail-grid">
              <InfoBlock label="Started" value={formatDateTime(selectedExecution.started_at)} />
              <InfoBlock label="Completed" value={formatDateTime(selectedExecution.completed_at)} />
              <InfoBlock label="Failed" value={formatDateTime(selectedExecution.failed_at)} />
              <InfoBlock label="Next retry" value={formatDateTime(selectedExecution.next_retry_at)} />
              <InfoBlock label="Current step" value={selectedExecution.current_step_key ?? 'No current step'} />
              <InfoBlock label="Correlation" value={selectedExecution.correlation_id} />
            </div>
            {selectedExecution.error_summary && (
              <Card className="workflow-alert workflow-alert-error">
                <strong>{formatLabel(selectedExecution.error_classification)}</strong>
                <span>{selectedExecution.error_summary}</span>
              </Card>
            )}
            <WorkflowRows title="Step executions" empty="No step executions recorded.">
              {selectedSteps.map((step) => (
                <div className="workflow-version-row" key={step.id}>
                  <div>
                    <strong>{step.step_order}. {formatLabel(step.step_key)}</strong>
                    <span>{formatLabel(step.action_type)} · attempts {step.attempt_count}</span>
                    <small>{summarizeJson(step.input_summary)} → {summarizeJson(step.output_summary)}</small>
                    {step.error_summary && <small>{step.error_summary}</small>}
                  </div>
                  <StatusBadge tone={statusTone(step.status)}>{formatLabel(step.status)}</StatusBadge>
                </div>
              ))}
            </WorkflowRows>
            <WorkflowRows title="Scheduled jobs" empty="No scheduled jobs linked to this execution.">
              {selectedJobs.map((job) => (
                <div className="workflow-version-row" key={job.id}>
                  <div>
                    <strong>{formatLabel(job.job_type)}</strong>
                    <span>{formatDateTime(job.scheduled_for)} · {job.timezone}</span>
                  </div>
                  <StatusBadge tone={statusTone(job.status)}>{formatLabel(job.status)}</StatusBadge>
                </div>
              ))}
            </WorkflowRows>
            <WorkflowRows title="Action requests" empty="No action requests linked to this execution.">
              {selectedActions.map((request) => (
                <div className="workflow-version-row" key={request.id}>
                  <div>
                    <strong>{formatLabel(request.action_type)}</strong>
                    <span>{formatDateTime(request.available_at)} · attempts {request.attempt_count}</span>
                    <small>{summarizeJson(request.payload)}</small>
                  </div>
                  <StatusBadge tone={statusTone(request.status)}>{formatLabel(request.status)}</StatusBadge>
                </div>
              ))}
            </WorkflowRows>
          </>
        ) : (
          <EmptyState title="Select an execution" description="Choose a workflow execution to inspect safe technical details." />
        )}
      </Card>
    </div>
  )
}

function ScheduledTab({
  jobs,
  definitions,
  executions,
  canConfigureWorkflows,
  actionInProgress,
  onCancelJob,
}: {
  jobs: WorkflowScheduledJobRow[]
  definitions: WorkflowDefinitionRow[]
  executions: WorkflowExecutionRow[]
  canConfigureWorkflows: boolean
  actionInProgress: string
  onCancelJob: (job: WorkflowScheduledJobRow) => void
}) {
  return (
    <Card className="workflow-detail-card">
      <div className="workflow-panel-header">
        <div>
          <span>Scheduled jobs</span>
          <h3>{jobs.length} workflow schedule records</h3>
        </div>
      </div>
      {jobs.length === 0 ? (
        <EmptyState title="No scheduled jobs" description="Delayed workflow work and future reminders will appear here." />
      ) : (
        <div className="workflow-table-list">
          {jobs.map((job) => {
            const execution = executions.find((item) => item.id === job.workflow_execution_id)
            const workflow = definitions.find((definition) => definition.id === execution?.workflow_definition_id)

            return (
              <div className="workflow-table-row" key={job.id}>
                <div>
                  <strong>{formatLabel(job.job_type)}</strong>
                  <span>{workflow?.name ?? 'Workflow job'} · {formatDateTime(job.scheduled_for)}</span>
                  <small>{job.target_entity_type ? `${formatLabel(job.target_entity_type)} context` : 'No target context'} · attempts {job.attempt_count}</small>
                </div>
                <div className="workflow-version-actions">
                  <StatusBadge tone={statusTone(job.status)}>{formatLabel(job.status)}</StatusBadge>
                  {canConfigureWorkflows && ['scheduled', 'failed'].includes(job.status) && (
                    <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onCancelJob(job)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function FailuresTab({
  failures,
  definitions,
  canConfigureWorkflows,
  actionInProgress,
  onRetry,
}: {
  failures: WorkflowDeadLetterRow[]
  definitions: WorkflowDefinitionRow[]
  canConfigureWorkflows: boolean
  actionInProgress: string
  onRetry: (failure: WorkflowDeadLetterRow) => void
}) {
  return (
    <Card className="workflow-detail-card">
      <div className="workflow-panel-header">
        <div>
          <span>Failures and dead letters</span>
          <h3>{failures.length} failure records</h3>
        </div>
      </div>
      {failures.length === 0 ? (
        <EmptyState title="No dead-letter records" description="Failed workflow work that needs review will appear here." />
      ) : (
        <div className="workflow-table-list">
          {failures.map((failure) => (
            <div className="workflow-table-row" key={failure.id}>
              <div>
                <strong>{definitions.find((definition) => definition.id === failure.workflow_definition_id)?.name ?? formatLabel(failure.failure_class)}</strong>
                <span>{failure.error_summary}</span>
                <small>First failed {formatDateTime(failure.first_failed_at)} · dead-lettered {formatDateTime(failure.dead_lettered_at)} · retries {failure.retry_count}</small>
              </div>
              <div className="workflow-version-actions">
                <StatusBadge tone={statusTone(failure.resolution_status)}>{formatLabel(failure.resolution_status)}</StatusBadge>
                {canConfigureWorkflows && ['unresolved', 'retry_scheduled'].includes(failure.resolution_status) && (
                  <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onRetry(failure)}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function RequestsTab({
  actionRequests,
  communicationRequests,
}: {
  actionRequests: WorkflowActionRequestRow[]
  communicationRequests: CommunicationRequestRow[]
  definitions: WorkflowDefinitionRow[]
  executions: WorkflowExecutionRow[]
}) {
  return (
    <div className="workflow-two-column">
      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span>Action requests</span>
            <h3>{actionRequests.length} readiness records</h3>
          </div>
        </div>
        {actionRequests.length === 0 ? (
          <EmptyState title="No action requests" description="Future workflow actions will queue here before a worker executes them." />
        ) : (
          <div className="workflow-table-list">
            {actionRequests.map((request) => (
              <div className="workflow-table-row" key={request.id}>
                <div>
                  <strong>{formatLabel(request.action_type)}</strong>
                  <span>{formatDateTime(request.available_at)} · attempts {request.attempt_count}</span>
                  <small>{request.target_entity_type ? `${formatLabel(request.target_entity_type)} context` : summarizeJson(request.payload)}</small>
                  {request.error_summary && <small>{request.error_summary}</small>}
                </div>
                <StatusBadge tone={statusTone(request.status)}>{formatLabel(request.status)}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="workflow-detail-card">
        <div className="workflow-panel-header">
          <div>
            <span>Communication requests</span>
            <h3>{communicationRequests.length} queued messages</h3>
          </div>
        </div>
        {communicationRequests.length === 0 ? (
          <EmptyState title="No communication requests" description="Future email, SMS, WhatsApp and internal notifications will appear here before delivery." />
        ) : (
          <div className="workflow-table-list">
            {communicationRequests.map((request) => (
              <div className="workflow-table-row" key={request.id}>
                <div>
                  <strong>{formatLabel(request.channel)} · {formatLabel(request.recipient_type)}</strong>
                  <span>{request.template_key ?? 'No template'} · {formatDateTime(request.scheduled_send_at)}</span>
                  <small>Attempts {request.attempt_count} · {request.related_invoice_id ? 'Invoice context' : request.related_booking_id ? 'Booking context' : 'Workflow context'}</small>
                  {request.error_summary && <small>{request.error_summary}</small>}
                </div>
                <StatusBadge tone={statusTone(request.status)}>{formatLabel(request.status)}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function TasksTab({
  tasks,
  canConfigureWorkflows,
  actionInProgress,
  onUpdateStatus,
}: {
  tasks: StaffTaskRow[]
  canConfigureWorkflows: boolean
  actionInProgress: string
  onUpdateStatus: (task: StaffTaskRow, status: StaffTaskRow['status']) => void
}) {
  return (
    <Card className="workflow-detail-card">
      <div className="workflow-panel-header">
        <div>
          <span>Staff tasks</span>
          <h3>{tasks.length} workflow task records</h3>
        </div>
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="No workflow staff tasks" description="Workflow-created task readiness records will appear here." />
      ) : (
        <div className="workflow-table-list">
          {tasks.map((task) => (
            <div className="workflow-table-row" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>{formatLabel(task.task_type)} · due {formatDateTime(task.due_at)}</span>
                <small>{task.assigned_role ? `Assigned to ${formatLabel(task.assigned_role)}` : 'No role assignment'} · priority {formatLabel(task.priority)}</small>
                {task.description && <small>{task.description}</small>}
              </div>
              <div className="workflow-version-actions">
                <StatusBadge tone={statusTone(task.status)}>{formatLabel(task.status)}</StatusBadge>
                {canConfigureWorkflows && task.status !== 'completed' && (
                  <>
                    <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onUpdateStatus(task, 'in_progress')}>
                      Start
                    </Button>
                    <Button variant="secondary" disabled={Boolean(actionInProgress)} onClick={() => onUpdateStatus(task, 'completed')}>
                      Complete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function WorkflowRows({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <div className="workflow-subsection">
      <span>{title}</span>
      {hasRows ? <div className="workflow-version-list">{children}</div> : <p className="workflow-muted">{empty}</p>}
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="workflow-info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
