import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database, Json } from '../lib/database.types'

type PracticeBrandingRow = Database['public']['Tables']['practice_branding']['Row']
type PracticeBrandingInsert = Database['public']['Tables']['practice_branding']['Insert']
type PracticeBrandingUpdate = Database['public']['Tables']['practice_branding']['Update']

type PracticeBrandingFormState = {
  patient_facing_display_name: string
  logo_url: string
  primary_colour: string
  secondary_colour: string
  accent_colour: string
  invoice_logo_position: string
  statement_logo_position: string
  document_branding_enabled: boolean
  patient_link_branding_enabled: boolean
  communication_branding_enabled: boolean
  metadata_notes: string
}

const emptyBrandingForm: PracticeBrandingFormState = {
  patient_facing_display_name: '',
  logo_url: '',
  primary_colour: '#281878',
  secondary_colour: '#FCEFE8',
  accent_colour: '#FC844C',
  invoice_logo_position: 'bottom_left',
  statement_logo_position: 'bottom_left',
  document_branding_enabled: true,
  patient_link_branding_enabled: true,
  communication_branding_enabled: true,
  metadata_notes: '',
}

const logoPositionOptions = ['none', 'top_left', 'top_right', 'bottom_left', 'bottom_right']

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formatLogoPosition(value: string) {
  return value.replaceAll('_', ' ')
}

function formFromBranding(branding: PracticeBrandingRow | null): PracticeBrandingFormState {
  if (!branding) return emptyBrandingForm

  const metadata = isJsonObject(branding.metadata) ? branding.metadata : {}

  return {
    patient_facing_display_name: branding.patient_facing_display_name ?? '',
    logo_url: branding.logo_url ?? '',
    primary_colour: branding.primary_colour ?? emptyBrandingForm.primary_colour,
    secondary_colour: branding.secondary_colour ?? emptyBrandingForm.secondary_colour,
    accent_colour: branding.accent_colour ?? emptyBrandingForm.accent_colour,
    invoice_logo_position: branding.invoice_logo_position,
    statement_logo_position: branding.statement_logo_position,
    document_branding_enabled: branding.document_branding_enabled,
    patient_link_branding_enabled: branding.patient_link_branding_enabled,
    communication_branding_enabled: branding.communication_branding_enabled,
    metadata_notes: typeof metadata.notes === 'string' ? metadata.notes : '',
  }
}

function toBrandingPayload(formState: PracticeBrandingFormState, existingBranding: PracticeBrandingRow | null): Omit<PracticeBrandingInsert, 'tenant_id'> {
  const existingMetadata = existingBranding && isJsonObject(existingBranding.metadata) ? existingBranding.metadata : {}

  return {
    patient_facing_display_name: emptyToNull(formState.patient_facing_display_name),
    logo_url: emptyToNull(formState.logo_url),
    primary_colour: emptyToNull(formState.primary_colour),
    secondary_colour: emptyToNull(formState.secondary_colour),
    accent_colour: emptyToNull(formState.accent_colour),
    invoice_logo_position: formState.invoice_logo_position,
    statement_logo_position: formState.statement_logo_position,
    document_branding_enabled: formState.document_branding_enabled,
    patient_link_branding_enabled: formState.patient_link_branding_enabled,
    communication_branding_enabled: formState.communication_branding_enabled,
    metadata: {
      ...existingMetadata,
      notes: formState.metadata_notes.trim(),
    },
  }
}

export function PracticeBrandingPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditBranding = authorization.hasPermission('tenant.practice.configure')
  const [branding, setBranding] = useState<PracticeBrandingRow | null>(null)
  const [formState, setFormState] = useState<PracticeBrandingFormState>(emptyBrandingForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const hasExistingBranding = Boolean(branding?.id)
  const isReadOnly = !canEditBranding || saving

  const previewDisplayName = useMemo(
    () => formState.patient_facing_display_name.trim() || activeTenant?.practice_name || 'Practice display name',
    [activeTenant?.practice_name, formState.patient_facing_display_name],
  )

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

    async function loadBranding() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const { data, error } = await supabaseClient
        .from('practice_branding')
        .select(`
          id,
          tenant_id,
          practice_profile_id,
          logo_url,
          primary_colour,
          secondary_colour,
          accent_colour,
          invoice_logo_position,
          statement_logo_position,
          patient_facing_display_name,
          document_branding_enabled,
          patient_link_branding_enabled,
          communication_branding_enabled,
          metadata,
          created_at,
          updated_at,
          deleted_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setBranding(null)
        setFormState(emptyBrandingForm)
        setLoading(false)
        return
      }

      const nextBranding = data as PracticeBrandingRow | null
      setBranding(nextBranding)
      setFormState(formFromBranding(nextBranding))
      setLoading(false)
    }

    loadBranding()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof PracticeBrandingFormState>(field: Field, value: PracticeBrandingFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const saveBranding = async () => {
    if (!activeTenant?.id || !supabase || !canEditBranding) return

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const payload = toBrandingPayload(formState, branding)

    const result = branding?.id
      ? await supabase
          .from('practice_branding')
          .update(payload satisfies PracticeBrandingUpdate)
          .eq('id', branding.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('practice_branding')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedBranding = result.data as PracticeBrandingRow
    setBranding(savedBranding)
    setFormState(formFromBranding(savedBranding))
    setSuccessMessage(hasExistingBranding ? 'Practice branding updated.' : 'Practice branding created.')
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading practice branding" description="Checking active tenant branding configuration." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Practice branding unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-branding-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Practice branding</span>
          <h3>{previewDisplayName}</h3>
          <p>
            Configure tenant branding defaults for future patient-facing views, documents and communication.
            This step stores logo paths only and does not upload files.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone={hasExistingBranding ? 'success' : 'info'}>
            {hasExistingBranding ? 'Configured' : 'Not created'}
          </StatusBadge>
          {!canEditBranding && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      {!hasExistingBranding && (
        <Card className="practice-profile-notice">
          <strong>Branding configuration not created yet.</strong>
          <span>Review the sensible defaults below and save to create branding settings for this tenant.</span>
        </Card>
      )}

      <div className="practice-branding-layout">
        <Card className="practice-profile-form-card">
          <div className="practice-profile-form-header">
            <div>
              <span>{hasExistingBranding ? 'Edit branding' : 'Create branding'}</span>
              <h3>Branding configuration</h3>
            </div>
            {canEditBranding && (
              <Button disabled={saving} onClick={saveBranding}>
                {saving ? 'Saving' : 'Save Branding'}
              </Button>
            )}
          </div>

          <div className="settings-form-grid practice-branding-form">
            <label>
              <span>Patient-facing display name</span>
              <input value={formState.patient_facing_display_name} disabled={isReadOnly} onChange={(event) => updateField('patient_facing_display_name', event.target.value)} />
            </label>
            <label>
              <span>Logo URL / path</span>
              <input value={formState.logo_url} disabled={isReadOnly} onChange={(event) => updateField('logo_url', event.target.value)} />
            </label>
            <label>
              <span>Primary colour</span>
              <input type="color" value={formState.primary_colour} disabled={isReadOnly} onChange={(event) => updateField('primary_colour', event.target.value)} />
            </label>
            <label>
              <span>Secondary colour</span>
              <input type="color" value={formState.secondary_colour} disabled={isReadOnly} onChange={(event) => updateField('secondary_colour', event.target.value)} />
            </label>
            <label>
              <span>Accent colour</span>
              <input type="color" value={formState.accent_colour} disabled={isReadOnly} onChange={(event) => updateField('accent_colour', event.target.value)} />
            </label>
            <label>
              <span>Invoice logo position</span>
              <select value={formState.invoice_logo_position} disabled={isReadOnly} onChange={(event) => updateField('invoice_logo_position', event.target.value)}>
                {logoPositionOptions.map((position) => <option value={position} key={position}>{formatLogoPosition(position)}</option>)}
              </select>
            </label>
            <label>
              <span>Statement logo position</span>
              <select value={formState.statement_logo_position} disabled={isReadOnly} onChange={(event) => updateField('statement_logo_position', event.target.value)}>
                {logoPositionOptions.map((position) => <option value={position} key={position}>{formatLogoPosition(position)}</option>)}
              </select>
            </label>
            <label className="wide-field">
              <span>Metadata notes</span>
              <textarea value={formState.metadata_notes} disabled={isReadOnly} onChange={(event) => updateField('metadata_notes', event.target.value)} />
            </label>
          </div>

          <div className="practice-billing-toggle-grid">
            <label className="practice-number-toggle">
              <input type="checkbox" checked={formState.document_branding_enabled} disabled={isReadOnly} onChange={(event) => updateField('document_branding_enabled', event.target.checked)} />
              <span>Document branding enabled</span>
            </label>
            <label className="practice-number-toggle">
              <input type="checkbox" checked={formState.patient_link_branding_enabled} disabled={isReadOnly} onChange={(event) => updateField('patient_link_branding_enabled', event.target.checked)} />
              <span>Patient Link branding enabled</span>
            </label>
            <label className="practice-number-toggle">
              <input type="checkbox" checked={formState.communication_branding_enabled} disabled={isReadOnly} onChange={(event) => updateField('communication_branding_enabled', event.target.checked)} />
              <span>Communication branding enabled</span>
            </label>
          </div>

          {(saveError || successMessage) && (
            <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
              {saveError || successMessage}
            </div>
          )}
        </Card>

        <Card className="practice-branding-preview" style={{ borderColor: formState.primary_colour }}>
          <span>Preview</span>
          <div className="practice-branding-preview-band" style={{ background: formState.primary_colour }}>
            <strong>{previewDisplayName}</strong>
          </div>
          <div className="practice-branding-preview-logo">
            <small>Logo path</small>
            <p>{formState.logo_url.trim() || 'No logo path captured'}</p>
          </div>
          <div className="practice-branding-preview-swatches">
            <span style={{ background: formState.primary_colour }} />
            <span style={{ background: formState.secondary_colour }} />
            <span style={{ background: formState.accent_colour }} />
          </div>
        </Card>
      </div>
    </div>
  )
}
