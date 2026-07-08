import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type CommunicationTemplateRow = Database['public']['Tables']['communication_templates']['Row']
type CommunicationTemplateInsert = Database['public']['Tables']['communication_templates']['Insert']
type CommunicationTemplateUpdate = Database['public']['Tables']['communication_templates']['Update']

type CommunicationTemplateFormState = {
  template_key: string
  channel: string
  title: string
  message_body: string
  automation_trigger_key: string
  is_active: boolean
}

const emptyTemplateForm: CommunicationTemplateFormState = {
  template_key: 'appointment_booked',
  channel: 'whatsapp',
  title: '',
  message_body: '',
  automation_trigger_key: '',
  is_active: true,
}

const recommendedTemplateKeys = [
  'appointment_booked',
  'intake_required',
  'invoice_available',
  'payment_due',
  'payment_received',
  'statement_available',
  'feedback_available',
]

const channelOptions = ['whatsapp', 'email', 'sms', 'patient_link', 'internal']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formatTemplateLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function formFromTemplate(template: CommunicationTemplateRow | null): CommunicationTemplateFormState {
  if (!template) return emptyTemplateForm

  return {
    template_key: template.template_key,
    channel: template.channel,
    title: template.title,
    message_body: template.message_body,
    automation_trigger_key: template.automation_trigger_key ?? '',
    is_active: template.is_active,
  }
}

function toTemplatePayload(formState: CommunicationTemplateFormState): Omit<CommunicationTemplateInsert, 'tenant_id'> {
  return {
    template_key: formState.template_key.trim(),
    channel: formState.channel,
    title: formState.title.trim(),
    message_body: formState.message_body.trim(),
    automation_trigger_key: emptyToNull(formState.automation_trigger_key),
    is_active: formState.is_active,
  }
}

export function PracticeCommunicationTemplatesPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditTemplates = authorization.hasPermission('tenant.practice.configure')
  const [templates, setTemplates] = useState<CommunicationTemplateRow[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CommunicationTemplateFormState>(emptyTemplateForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  )
  const isCreating = !selectedTemplateId
  const isReadOnly = !canEditTemplates || saving

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

    async function loadTemplates() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const { data, error } = await supabaseClient
        .from('communication_templates')
        .select(`
          id,
          tenant_id,
          practice_profile_id,
          template_key,
          channel,
          title,
          message_body,
          automation_trigger_key,
          is_active,
          metadata,
          created_at,
          updated_at,
          deleted_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('template_key', { ascending: true })
        .order('channel', { ascending: true })

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setTemplates([])
        setSelectedTemplateId(null)
        setFormState(emptyTemplateForm)
        setLoading(false)
        return
      }

      setTemplates((data ?? []) as CommunicationTemplateRow[])
      setSelectedTemplateId(null)
      setFormState(emptyTemplateForm)
      setLoading(false)
    }

    loadTemplates()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof CommunicationTemplateFormState>(field: Field, value: CommunicationTemplateFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const startCreateTemplate = () => {
    setSelectedTemplateId(null)
    setFormState(emptyTemplateForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const startEditTemplate = (template: CommunicationTemplateRow) => {
    setSelectedTemplateId(template.id)
    setFormState(formFromTemplate(template))
    setSaveError('')
    setSuccessMessage('')
  }

  const saveTemplate = async () => {
    if (!activeTenant?.id || !supabase || !canEditTemplates) return

    if (!formState.template_key.trim() || !formState.title.trim() || !formState.message_body.trim()) {
      setSaveError('Template key, title and message body are required.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const payload = toTemplatePayload(formState)

    const result = selectedTemplate?.id
      ? await supabase
          .from('communication_templates')
          .update(payload satisfies CommunicationTemplateUpdate)
          .eq('id', selectedTemplate.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('communication_templates')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedTemplate = result.data as CommunicationTemplateRow
    setTemplates((currentTemplates) => {
      const nextTemplates = selectedTemplate?.id
        ? currentTemplates.map((template) => (template.id === savedTemplate.id ? savedTemplate : template))
        : [...currentTemplates, savedTemplate]

      return nextTemplates.sort((a, b) => a.template_key.localeCompare(b.template_key) || a.channel.localeCompare(b.channel))
    })
    setSelectedTemplateId(savedTemplate.id)
    setFormState(formFromTemplate(savedTemplate))
    setSuccessMessage(selectedTemplate?.id ? 'Communication template updated.' : 'Communication template created.')
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading communication templates" description="Checking active tenant communication templates." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Communication templates unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-communication-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Communication templates</span>
          <h3>{activeTenant?.practice_name ?? 'Practice templates'}</h3>
          <p>
            Store manual message templates for now and prepare future automation triggers. This screen does not
            send WhatsApp, SMS or email messages.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{templates.length} templates</StatusBadge>
          {!canEditTemplates && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="practice-locations-layout">
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Template list</span>
              <h3>Templates</h3>
            </div>
            {canEditTemplates && (
              <Button variant="secondary" onClick={startCreateTemplate}>
                New Template
              </Button>
            )}
          </div>

          {templates.length === 0 ? (
            <EmptyState
              title="No templates yet"
              description="Create the first communication template for this tenant."
            />
          ) : (
            <div className="practice-location-cards">
              {templates.map((template) => (
                <button
                  className={selectedTemplateId === template.id ? 'active' : ''}
                  type="button"
                  onClick={() => startEditTemplate(template)}
                  key={template.id}
                >
                  <div>
                    <strong>{template.title}</strong>
                    <span>{formatTemplateLabel(template.template_key)} · {formatTemplateLabel(template.channel)}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    <StatusBadge tone={template.is_active ? 'success' : 'neutral'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="practice-profile-form-card">
          <div className="practice-profile-form-header">
            <div>
              <span>{isCreating ? 'Create template' : 'Edit template'}</span>
              <h3>{isCreating ? 'New communication template' : formState.title || 'Template details'}</h3>
            </div>
            {canEditTemplates && (
              <Button disabled={saving} onClick={saveTemplate}>
                {saving ? 'Saving' : 'Save Template'}
              </Button>
            )}
          </div>

          <div className="settings-form-grid practice-communication-form">
            <label>
              <span>Template key</span>
              <select value={formState.template_key} disabled={isReadOnly} onChange={(event) => updateField('template_key', event.target.value)}>
                {recommendedTemplateKeys.map((templateKey) => (
                  <option value={templateKey} key={templateKey}>{formatTemplateLabel(templateKey)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Channel</span>
              <select value={formState.channel} disabled={isReadOnly} onChange={(event) => updateField('channel', event.target.value)}>
                {channelOptions.map((channel) => (
                  <option value={channel} key={channel}>{formatTemplateLabel(channel)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Automation trigger key</span>
              <input value={formState.automation_trigger_key} disabled={isReadOnly} onChange={(event) => updateField('automation_trigger_key', event.target.value)} />
            </label>
            <label>
              <span>Status</span>
              <select value={formState.is_active ? 'active' : 'inactive'} disabled={isReadOnly} onChange={(event) => updateField('is_active', event.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="wide-field">
              <span>Title</span>
              <input value={formState.title} disabled={isReadOnly} onChange={(event) => updateField('title', event.target.value)} />
            </label>
            <label className="wide-field">
              <span>Message body</span>
              <textarea value={formState.message_body} disabled={isReadOnly} onChange={(event) => updateField('message_body', event.target.value)} />
            </label>
          </div>

          <Card className="practice-template-preview">
            <span>Message preview</span>
            <strong>{formState.title || 'Template title'}</strong>
            <p>{formState.message_body || 'Message body will preview here.'}</p>
          </Card>

          {(saveError || successMessage) && (
            <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
              {saveError || successMessage}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
