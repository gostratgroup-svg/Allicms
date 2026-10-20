import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EditableField } from '../components/EditableField'
import { EditSaveControls } from '../components/EditSaveControls'
import { EyeIcon } from '../components/icons'
import { ErrorState, LoadingState } from '../components/UiState'
import { Button, Card } from '../components/ui'
import { showErrorNotice, showSuccessNotice } from '../lib/appNotice'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { createSignedDocumentUrl, formatFileSize, uploadDocumentFile } from '../lib/storageDocuments'
import type { Database, Json } from '../lib/database.types'

type PracticeBrandingRow = Database['public']['Tables']['practice_branding']['Row']
type PracticeBrandingInsert = Database['public']['Tables']['practice_branding']['Insert']
type PracticeBrandingUpdate = Database['public']['Tables']['practice_branding']['Update']
type PracticeLocationRow = Database['public']['Tables']['practice_locations']['Row']
type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row']
type BrandPreviewType = 'invoice' | 'email' | 'report'

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

function formatLocationAddress(location: PracticeLocationRow | null) {
  if (!location) return ''
  return [
    location.address_line_1,
    location.address_line_2,
    location.suburb,
    location.city,
    location.province,
    location.postal_code,
    location.country,
  ].filter(Boolean).join(', ')
}

type RgbColour = { red: number; green: number; blue: number }
type LogoAnalysis = {
  width: number
  height: number
  shape: 'square' | 'landscape' | 'other'
  idealDimensions: boolean
  supportedSize: boolean
  hasTransparency: boolean
}

function colourToHex({ red, green, blue }: RgbColour) {
  return `#${[red, green, blue].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function colourDistance(first: RgbColour, second: RgbColour) {
  return Math.sqrt(
    ((first.red - second.red) ** 2)
    + ((first.green - second.green) ** 2)
    + ((first.blue - second.blue) ** 2),
  )
}

function mixWithWhite(colour: RgbColour, whiteRatio: number): RgbColour {
  return {
    red: colour.red + ((255 - colour.red) * whiteRatio),
    green: colour.green + ((255 - colour.green) * whiteRatio),
    blue: colour.blue + ((255 - colour.blue) * whiteRatio),
  }
}

function createFallbackAccent(primary: RgbColour): RgbColour {
  const average = (primary.red + primary.green + primary.blue) / 3
  const brightenBy = average < 135 ? 68 : -68
  return {
    red: primary.red + brightenBy,
    green: primary.green + brightenBy,
    blue: primary.blue + brightenBy,
  }
}

async function extractBrandPalette(file: File) {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = imageUrl
    await image.decode()

    const sampleSize = 96
    const canvas = document.createElement('canvas')
    canvas.width = sampleSize
    canvas.height = sampleSize
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Logo colours could not be analysed in this browser.')
    context.clearRect(0, 0, sampleSize, sampleSize)
    context.drawImage(image, 0, 0, sampleSize, sampleSize)

    const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data
    let hasTransparency = false
    const colourCounts = new Map<string, { colour: RgbColour; count: number; score: number }>()
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3]
      if (alpha < 250) hasTransparency = true
      if (alpha < 150) continue
      const raw = { red: pixels[index], green: pixels[index + 1], blue: pixels[index + 2] }
      const brightness = (raw.red * 0.299) + (raw.green * 0.587) + (raw.blue * 0.114)
      if (brightness > 246 || brightness < 8) continue

      const colour = {
        red: Math.min(255, Math.round(raw.red / 24) * 24),
        green: Math.min(255, Math.round(raw.green / 24) * 24),
        blue: Math.min(255, Math.round(raw.blue / 24) * 24),
      }
      const maximum = Math.max(colour.red, colour.green, colour.blue)
      const minimum = Math.min(colour.red, colour.green, colour.blue)
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum
      const key = `${colour.red}-${colour.green}-${colour.blue}`
      const existing = colourCounts.get(key)
      if (existing) {
        existing.count += 1
        existing.score = existing.count * (0.7 + saturation)
      } else {
        colourCounts.set(key, { colour, count: 1, score: 0.7 + saturation })
      }
    }

    const candidates = [...colourCounts.values()].sort((first, second) => second.score - first.score)
    if (!candidates.length) throw new Error('No usable colours were found in this logo. You can still choose the colours manually.')
    const primary = candidates[0].colour
    const accent = candidates.find((candidate) => colourDistance(primary, candidate.colour) >= 92)?.colour ?? createFallbackAccent(primary)
    const aspectRatio = image.naturalWidth / image.naturalHeight
    const shape = aspectRatio >= 0.8 && aspectRatio <= 1.25
      ? 'square'
      : aspectRatio >= 1.5 && aspectRatio <= 4
        ? 'landscape'
        : 'other'
    const idealDimensions = shape === 'square'
      ? image.naturalWidth >= 800 && image.naturalHeight >= 800
      : shape === 'landscape' && image.naturalWidth >= 1200 && image.naturalHeight >= 600

    return {
      primary: colourToHex(primary),
      secondary: colourToHex(mixWithWhite(primary, 0.9)),
      accent: colourToHex(accent),
      analysis: {
        width: image.naturalWidth,
        height: image.naturalHeight,
        shape,
        idealDimensions,
        supportedSize: file.size <= 5 * 1024 * 1024,
        hasTransparency,
      } satisfies LogoAnalysis,
    }
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
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
  const [extractingPalette, setExtractingPalette] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [logoAnalysis, setLogoAnalysis] = useState<LogoAnalysis | null>(null)
  const [practiceDisplayName, setPracticeDisplayName] = useState('')
  const [mainLocation, setMainLocation] = useState<PracticeLocationRow | null>(null)
  const [invoiceBankAccount, setInvoiceBankAccount] = useState<BankAccountRow | null>(null)
  const [expandedPreview, setExpandedPreview] = useState<BrandPreviewType | null>(null)

  const hasExistingBranding = Boolean(branding?.id)
  const showEditableFields = !hasExistingBranding || isEditing
  const isReadOnly = !canEditBranding || saving || extractingPalette || (hasExistingBranding && !isEditing)

  const previewDisplayName = useMemo(
    () => practiceDisplayName || activeTenant?.practice_name || 'Practice display name',
    [activeTenant?.practice_name, practiceDisplayName],
  )

  useEffect(() => {
    if (!expandedPreview) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedPreview(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [expandedPreview])

  useEffect(() => {
    if (logoFile) {
      const objectUrl = URL.createObjectURL(logoFile)
      setLogoPreviewUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }

    const logoPath = formState.logo_url.trim()
    if (!logoPath) {
      setLogoPreviewUrl('')
      return
    }

    if (/^(https?:|data:|blob:)/i.test(logoPath)) {
      setLogoPreviewUrl(logoPath)
      return
    }

    if (!supabase) return

    let isMounted = true
    createSignedDocumentUrl(supabase, 'practice-assets', logoPath, 900)
      .then((signedUrl) => {
        if (isMounted) setLogoPreviewUrl(signedUrl)
      })
      .catch(() => {
        if (isMounted) setLogoPreviewUrl('')
      })

    return () => {
      isMounted = false
    }
  }, [formState.logo_url, logoFile])

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
    const tenantPracticeName = activeTenant.practice_name

    async function loadBranding() {
      setLoading(true)
      setLoadError('')

      const [brandingResult, profileResult, mainLocationResult, billingSettingsResult, bankAccountsResult] = await Promise.all([
        supabaseClient
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
          .maybeSingle(),
        supabaseClient
          .from('practice_profiles')
          .select('legal_name, trading_name')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabaseClient
          .from('practice_locations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_main_location', true)
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle(),
        supabaseClient
          .from('billing_settings')
          .select('default_bank_account_id')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabaseClient
          .from('bank_accounts')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('owner_type', 'tenant')
          .is('owner_id', null)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
      ])

      if (!isMounted) return

      if (brandingResult.error || profileResult.error || mainLocationResult.error || billingSettingsResult.error || bankAccountsResult.error) {
        setLoadError(brandingResult.error?.message ?? profileResult.error?.message ?? mainLocationResult.error?.message ?? billingSettingsResult.error?.message ?? bankAccountsResult.error?.message ?? 'Branding configuration could not be loaded.')
        setBranding(null)
        setFormState(emptyBrandingForm)
        setLoading(false)
        return
      }

      const nextBranding = brandingResult.data as PracticeBrandingRow | null
      const availableBankAccounts = (bankAccountsResult.data ?? []) as BankAccountRow[]
      const stipulatedBankAccountId = billingSettingsResult.data?.default_bank_account_id
      const resolvedInvoiceBankAccount = availableBankAccounts.find((account) => account.id === stipulatedBankAccountId)
        ?? availableBankAccounts.find((account) => account.is_default)
        ?? null
      const resolvedPracticeName = profileResult.data?.trading_name?.trim()
        || profileResult.data?.legal_name?.trim()
        || tenantPracticeName
      setBranding(nextBranding)
      setMainLocation(mainLocationResult.data as PracticeLocationRow | null)
      setInvoiceBankAccount(resolvedInvoiceBankAccount)
      setPracticeDisplayName(resolvedPracticeName)
      setFormState({ ...formFromBranding(nextBranding), patient_facing_display_name: resolvedPracticeName })
      setIsEditing(!nextBranding)
      setLoading(false)
    }

    loadBranding()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof PracticeBrandingFormState>(field: Field, value: PracticeBrandingFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
  }

  const selectLogoFile = async (file: File | null) => {
    setLogoFile(file)
    setLogoAnalysis(null)
    if (!file) return

    setExtractingPalette(true)
    try {
      const palette = await extractBrandPalette(file)
      setLogoAnalysis(palette.analysis)
      setFormState((currentFormState) => ({
        ...currentFormState,
        primary_colour: palette.primary,
        secondary_colour: palette.secondary,
        accent_colour: palette.accent,
      }))
      showSuccessNotice('Brand colours suggested from the logo. You can adjust them before saving.')
    } catch (error) {
      showErrorNotice(error instanceof Error ? error.message : 'Logo colours could not be suggested. You can choose them manually.')
    } finally {
      setExtractingPalette(false)
    }
  }

  const saveBranding = async () => {
    if (!activeTenant?.id || !supabase || !canEditBranding || extractingPalette) return

    setSaving(true)

    try {
      let payload = {
        ...toBrandingPayload(formState, branding),
        patient_facing_display_name: previewDisplayName,
      }

      if (logoFile) {
        const uploadedLogo = await uploadDocumentFile(supabase, {
          tenantId: activeTenant.id,
          bucketId: 'practice-assets',
          patientId: null,
          practiceBrandingId: branding?.id ?? null,
          documentCategory: 'practice_logo',
          file: logoFile,
          sharingScope: 'practice',
          metadata: {
            source: 'practice_branding',
            display_name: previewDisplayName,
          },
        })
        payload = {
          ...payload,
          logo_url: uploadedLogo.object_path,
        }
      }

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

      if (result.error) throw result.error

      const savedBranding = result.data as PracticeBrandingRow
      setBranding(savedBranding)
      setFormState(formFromBranding(savedBranding))
      setLogoFile(null)
      showSuccessNotice(logoFile ? 'Practice branding saved and logo uploaded.' : hasExistingBranding ? 'Practice branding updated.' : 'Practice branding created.')
      setIsEditing(false)
    } catch (error) {
      showErrorNotice(error instanceof Error ? error.message : 'Practice branding could not be saved.')
      setSaving(false)
      return
    }
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
              <span>{hasExistingBranding ? (isEditing ? 'Edit branding' : 'Saved branding') : 'Create branding'}</span>
              <h3>Branding configuration</h3>
            </div>
            {canEditBranding && hasExistingBranding && (
              <EditSaveControls
                isEditing={isEditing}
                isSaving={saving || extractingPalette}
                onEdit={() => setIsEditing(true)}
                onSave={saveBranding}
                editLabel="Edit practice branding"
                saveLabel="Save practice branding"
              />
            )}
            {canEditBranding && !hasExistingBranding && (
              <Button disabled={saving || extractingPalette} onClick={saveBranding}>
                {extractingPalette ? 'Analysing logo' : saving ? 'Saving' : 'Save Branding'}
              </Button>
            )}
          </div>

          <div className="settings-form-grid practice-branding-form">
            <EditableField label="Practice display name" isEditing={false} value={previewDisplayName}>{null}</EditableField>
            <EditableField label="Logo URL / path" isEditing={showEditableFields} value={formState.logo_url}>
              <input value={formState.logo_url} disabled={isReadOnly} onChange={(event) => updateField('logo_url', event.target.value)} />
            </EditableField>
            {showEditableFields && (
              <label>
                <span>Upload logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={isReadOnly}
                  onChange={(event) => selectLogoFile(event.target.files?.[0] ?? null)}
                />
                {logoFile && <small className="field-helper">{extractingPalette ? 'Analysing logo colours...' : `${logoFile.name} selected (${formatFileSize(logoFile.size)}). Suggested colours remain editable.`}</small>}
                <div className="practice-logo-guidance" aria-label="Recommended logo specifications">
                  <span><b aria-hidden="true">✓</b> Square: 800 × 800 px or larger</span>
                  <span><b aria-hidden="true">✓</b> Rectangular: 1200 × 600 px or larger</span>
                  <span><b aria-hidden="true">✓</b> PNG or JPG, maximum 5 MB</span>
                  <span><b aria-hidden="true">✓</b> Transparent PNG preferred</span>
                  {logoAnalysis && (
                    <strong className={logoAnalysis.idealDimensions && logoAnalysis.supportedSize ? 'is-ideal' : 'needs-attention'}>
                      {logoAnalysis.width} × {logoAnalysis.height} px · {logoAnalysis.shape === 'landscape' ? 'Rectangular' : logoAnalysis.shape === 'square' ? 'Square' : 'Unusual shape'}
                      {logoAnalysis.idealDimensions && logoAnalysis.supportedSize ? ' · Ideal' : ' · May not fill the available space'}
                      {logoAnalysis.hasTransparency ? ' · Transparent background' : ''}
                    </strong>
                  )}
                </div>
              </label>
            )}
            <EditableField label="Primary colour" isEditing={showEditableFields} value={formState.primary_colour}>
              <input type="color" value={formState.primary_colour} disabled={isReadOnly} onChange={(event) => updateField('primary_colour', event.target.value)} />
            </EditableField>
            <EditableField label="Secondary colour" isEditing={showEditableFields} value={formState.secondary_colour}>
              <input type="color" value={formState.secondary_colour} disabled={isReadOnly} onChange={(event) => updateField('secondary_colour', event.target.value)} />
            </EditableField>
            <EditableField label="Accent colour" isEditing={showEditableFields} value={formState.accent_colour}>
              <input type="color" value={formState.accent_colour} disabled={isReadOnly} onChange={(event) => updateField('accent_colour', event.target.value)} />
            </EditableField>
            <EditableField label="Invoice logo position" isEditing={showEditableFields} value={formatLogoPosition(formState.invoice_logo_position)}>
              <select value={formState.invoice_logo_position} disabled={isReadOnly} onChange={(event) => updateField('invoice_logo_position', event.target.value)}>
                {logoPositionOptions.map((position) => <option value={position} key={position}>{formatLogoPosition(position)}</option>)}
              </select>
            </EditableField>
            <EditableField label="Statement logo position" isEditing={showEditableFields} value={formatLogoPosition(formState.statement_logo_position)}>
              <select value={formState.statement_logo_position} disabled={isReadOnly} onChange={(event) => updateField('statement_logo_position', event.target.value)}>
                {logoPositionOptions.map((position) => <option value={position} key={position}>{formatLogoPosition(position)}</option>)}
              </select>
            </EditableField>
            <EditableField className="wide-field" label="Metadata notes" isEditing={showEditableFields} value={formState.metadata_notes}>
              <textarea value={formState.metadata_notes} disabled={isReadOnly} onChange={(event) => updateField('metadata_notes', event.target.value)} />
            </EditableField>
            {!showEditableFields && (
              <>
                <EditableField label="Document branding" isEditing={false} value={formState.document_branding_enabled ? 'Enabled' : 'Disabled'}>{null}</EditableField>
                <EditableField label="Patient Link branding" isEditing={false} value={formState.patient_link_branding_enabled ? 'Enabled' : 'Disabled'}>{null}</EditableField>
                <EditableField label="Communication branding" isEditing={false} value={formState.communication_branding_enabled ? 'Enabled' : 'Disabled'}>{null}</EditableField>
              </>
            )}
          </div>

          {showEditableFields && <div className="practice-billing-toggle-grid">
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
          </div>}
        </Card>

      </div>

      <section className="practice-brand-template-section" aria-label="Customer-facing brand previews">
        <div className="practice-brand-template-heading">
          <span>Customer view</span>
          <h3>Brand previews</h3>
        </div>

        <div className="practice-brand-template-grid">
          <InvoiceBrandPreview displayName={previewDisplayName} logoUrl={logoPreviewUrl} primary={formState.primary_colour} secondary={formState.secondary_colour} accent={formState.accent_colour} practiceDetails={[mainLocation?.location_name || 'Main location', formatLocationAddress(mainLocation) || 'Main location address not configured', mainLocation?.contact_email ?? '', mainLocation?.contact_phone ?? '']} bankDetails={invoiceBankAccount ? [invoiceBankAccount.bank_name, `Account ${invoiceBankAccount.account_number}${invoiceBankAccount.branch_code ? ` · Branch ${invoiceBankAccount.branch_code}` : ''}`, `Account holder: ${invoiceBankAccount.account_holder}`] : ['No default bank account configured']} onOpen={() => setExpandedPreview('invoice')} />
          <EmailBrandPreview displayName={previewDisplayName} logoUrl={logoPreviewUrl} primary={formState.primary_colour} secondary={formState.secondary_colour} accent={formState.accent_colour} onOpen={() => setExpandedPreview('email')} />
          <ReportBrandPreview displayName={previewDisplayName} logoUrl={logoPreviewUrl} primary={formState.primary_colour} secondary={formState.secondary_colour} onOpen={() => setExpandedPreview('report')} />
        </div>
      </section>

      {expandedPreview && (
        <div className="modal-backdrop practice-brand-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setExpandedPreview(null) }}>
          <section className="modal-window practice-brand-preview-modal" role="dialog" aria-modal="true" aria-labelledby="brand-preview-title">
            <header className="practice-brand-preview-modal-header">
              <div>
                <span>Customer view</span>
                <h3 id="brand-preview-title">{expandedPreview === 'invoice' ? 'Invoice preview' : expandedPreview === 'email' ? 'Email preview' : 'Report preview'}</h3>
              </div>
              <button type="button" className="ui-icon-action" aria-label="Close preview" title="Close" onClick={() => setExpandedPreview(null)}>×</button>
            </header>
            <div className="practice-brand-preview-modal-body">
              {expandedPreview === 'invoice' && <InvoiceBrandPreview displayName={previewDisplayName} logoUrl={logoPreviewUrl} primary={formState.primary_colour} secondary={formState.secondary_colour} accent={formState.accent_colour} practiceDetails={[mainLocation?.location_name || 'Main location', formatLocationAddress(mainLocation) || 'Main location address not configured', mainLocation?.contact_email ?? '', mainLocation?.contact_phone ?? '']} bankDetails={invoiceBankAccount ? [invoiceBankAccount.bank_name, `Account ${invoiceBankAccount.account_number}${invoiceBankAccount.branch_code ? ` · Branch ${invoiceBankAccount.branch_code}` : ''}`, `Account holder: ${invoiceBankAccount.account_holder}`] : ['No default bank account configured']} expanded />}
              {expandedPreview === 'email' && <EmailBrandPreview displayName={previewDisplayName} logoUrl={logoPreviewUrl} primary={formState.primary_colour} secondary={formState.secondary_colour} accent={formState.accent_colour} expanded />}
              {expandedPreview === 'report' && <ReportBrandPreview displayName={previewDisplayName} logoUrl={logoPreviewUrl} primary={formState.primary_colour} secondary={formState.secondary_colour} expanded />}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

type BrandTemplateProps = {
  displayName: string
  logoUrl: string
  primary: string
  secondary?: string
  accent?: string
  expanded?: boolean
  onOpen?: () => void
  practiceDetails?: string[]
  bankDetails?: string[]
}

function PreviewExpandButton({ label, onOpen }: { label: string; onOpen?: () => void }) {
  if (!onOpen) return null
  return (
    <button type="button" className="practice-brand-preview-expand" aria-label={label} title={label} onClick={onOpen}>
      <EyeIcon />
    </button>
  )
}

function InvoiceBrandPreview({ displayName, logoUrl, primary, secondary = '#FCEFE8', accent = '#FC844C', expanded = false, onOpen, practiceDetails = [], bankDetails = [] }: BrandTemplateProps) {
  return (
    <article className={`practice-brand-template practice-brand-invoice-template${expanded ? ' is-expanded' : ''}`}>
      <div className="practice-brand-template-topline" style={{ background: primary }} />
      <PreviewExpandButton label="View full invoice preview" onOpen={onOpen} />
      <section className="practice-brand-invoice-masthead" style={{ background: secondary }}>
        <header>
          <BrandPreviewIdentity displayName={displayName} logoUrl={logoUrl} />
          <div className="practice-brand-invoice-heading"><strong>INVOICE</strong><span>INV-000124</span><small>20 October 2026</small></div>
        </header>
        <div className="practice-brand-invoice-parties">
          <div><span>Practice details</span><strong>{displayName}</strong>{practiceDetails.filter(Boolean).map((detail) => <small key={detail}>{detail}</small>)}</div>
          <div><span>To</span><strong>Preview Patient</strong><small>24 Client Avenue, Johannesburg</small><small>patient@example.co.za</small></div>
        </div>
        <div className="practice-brand-invoice-total" style={{ background: accent }}><span>Total due</span><strong>{expanded ? 'R1,300.00' : 'R850.00'}</strong></div>
      </section>
      <div className="practice-brand-invoice-table">
        <div className="practice-brand-invoice-table-head" style={{ color: primary }}><span>Item description</span><span>Unit price</span><span>Qty</span><span>Total</span></div>
        <div className="practice-brand-invoice-table-row"><span><strong>Physiotherapy session</strong><small>20 Oct 2026 · PT001</small></span><span>R850.00</span><span>1</span><strong>R850.00</strong></div>
        {expanded && <div className="practice-brand-invoice-table-row"><span><strong>Initial assessment</strong><small>20 Oct 2026 · PT002</small></span><span>R450.00</span><span>1</span><strong>R450.00</strong></div>}
      </div>
      <div className="practice-brand-invoice-summary">
        <div><span>Payment details</span>{bankDetails.map((detail, index) => index === 0 ? <strong key={detail}>{detail}</strong> : <small key={detail}>{detail}</small>)}<small>Reference: INV-000124</small></div>
        <dl><div><dt>Subtotal</dt><dd>{expanded ? 'R1,300.00' : 'R850.00'}</dd></div><div><dt>Tax</dt><dd>R0.00</dd></div><div><dt>Total due</dt><dd>{expanded ? 'R1,300.00' : 'R850.00'}</dd></div></dl>
      </div>
      <footer>
        <div className="practice-brand-invoice-terms"><strong>Terms &amp; notes</strong><span>Payment is due within 7 days. Please use the invoice number as your payment reference.</span></div>
        <div className="practice-brand-invoice-supported" aria-label="This practice is supported by AlliDesk."><span>This practice is supported by</span><img src="/assets/Allidesk_Blue_Logo%20copy.png" alt="AlliDesk" /><span aria-hidden="true">.</span></div>
      </footer>
    </article>
  )
}

function EmailBrandPreview({ displayName, logoUrl, primary, secondary = '#FCEFE8', accent = '#FC844C', expanded = false, onOpen }: BrandTemplateProps) {
  return (
    <article className={`practice-brand-template practice-brand-email-template${expanded ? ' is-expanded' : ''}`}>
      <PreviewExpandButton label="View full email preview" onOpen={onOpen} />
      <header style={{ background: primary }}><BrandPreviewIdentity displayName={displayName} logoUrl={logoUrl} inverse /></header>
      <div className="practice-brand-email-body">
        <span>Appointment confirmation</span>
        <h4>Your appointment is confirmed</h4>
        <p>Hello Preview Patient, your appointment is booked for Tuesday at 10:00.</p>
        {expanded && <><p>Your session will take place at the Main Practice with your treating therapist. Please arrive ten minutes early.</p><p>Use the button below to review the appointment details.</p></>}
        <button type="button" tabIndex={-1} style={{ background: accent }}>View appointment</button>
      </div>
      <footer style={{ color: secondary }}>{displayName}</footer>
    </article>
  )
}

function ReportBrandPreview({ displayName, logoUrl, primary, secondary = '#FCEFE8', expanded = false, onOpen }: BrandTemplateProps) {
  return (
    <article className={`practice-brand-template practice-brand-report-template${expanded ? ' is-expanded' : ''}`}>
      <PreviewExpandButton label="View full report preview" onOpen={onOpen} />
      <header><BrandPreviewIdentity displayName={displayName} logoUrl={logoUrl} /><span>CONFIDENTIAL</span></header>
      <div className="practice-brand-report-title" style={{ borderColor: primary }}><span>Clinical report</span><h4>Progress Summary</h4><p>Preview Patient · 20 October 2026</p></div>
      <div className="practice-brand-report-copy">
        <strong>Overview</strong><i /><i />
        <strong>Clinical progress</strong><i /><i /><i />
        {expanded && <><strong>Recommendations</strong><i /><i /><i /><strong>Plan</strong><i /><i /></>}
      </div>
      <footer style={{ background: secondary }} />
    </article>
  )
}

function BrandPreviewIdentity({ displayName, logoUrl, inverse = false }: { displayName: string; logoUrl: string; inverse?: boolean }) {
  return (
    <div className={`practice-brand-preview-identity${inverse ? ' inverse' : ''}`}>
      {logoUrl ? <img src={logoUrl} alt="" /> : <span style={{ color: inverse ? 'white' : undefined }}>{displayName.slice(0, 1).toUpperCase()}</span>}
      <strong>{displayName}</strong>
    </div>
  )
}
