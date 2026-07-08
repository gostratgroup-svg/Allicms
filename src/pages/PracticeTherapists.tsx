import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type TherapistProfileRow = Database['public']['Tables']['therapist_profiles']['Row']
type TherapistProfileInsert = Database['public']['Tables']['therapist_profiles']['Insert']
type TherapistProfileUpdate = Database['public']['Tables']['therapist_profiles']['Update']
type ProfessionalRegistrationRow = Database['public']['Tables']['professional_registrations']['Row']
type ProfessionalRegistrationInsert = Database['public']['Tables']['professional_registrations']['Insert']
type ProfessionalRegistrationUpdate = Database['public']['Tables']['professional_registrations']['Update']

type TenantUserOption = {
  profile_id: string
  role: string
  label: string
}

type TherapistProfileFormState = {
  display_name: string
  user_id: string
  profession: string
  qualifications: string
  bio: string
  default_appointment_duration_minutes: string
  default_billing_rate: string
  practice_number: string
  billing_name: string
  billing_email: string
  billing_phone: string
  is_active: boolean
}

type RegistrationFormState = {
  registration_body: string
  registration_number: string
  registration_type: string
  country: string
  valid_from: string
  valid_until: string
  is_primary: boolean
  is_active: boolean
}

const emptyTherapistForm: TherapistProfileFormState = {
  display_name: '',
  user_id: '',
  profession: '',
  qualifications: '',
  bio: '',
  default_appointment_duration_minutes: '60',
  default_billing_rate: '',
  practice_number: '',
  billing_name: '',
  billing_email: '',
  billing_phone: '',
  is_active: true,
}

const emptyRegistrationForm: RegistrationFormState = {
  registration_body: 'HPCSA',
  registration_number: '',
  registration_type: '',
  country: 'South Africa',
  valid_from: '',
  valid_until: '',
  is_primary: false,
  is_active: true,
}

const countryOptions = ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'United Kingdom', 'United States']
const registrationBodyOptions = ['HPCSA', 'SACSSP', 'AHPCSA', 'BHF', 'Other']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function formFromTherapist(therapist: TherapistProfileRow | null): TherapistProfileFormState {
  if (!therapist) return emptyTherapistForm

  return {
    display_name: therapist.display_name,
    user_id: therapist.user_id ?? '',
    profession: therapist.profession ?? '',
    qualifications: therapist.qualifications ?? '',
    bio: therapist.bio ?? '',
    default_appointment_duration_minutes: therapist.default_appointment_duration_minutes ? String(therapist.default_appointment_duration_minutes) : '',
    default_billing_rate: therapist.default_billing_rate === null ? '' : String(therapist.default_billing_rate),
    practice_number: therapist.practice_number ?? '',
    billing_name: therapist.billing_name ?? '',
    billing_email: therapist.billing_email ?? '',
    billing_phone: therapist.billing_phone ?? '',
    is_active: therapist.is_active,
  }
}

function formFromRegistration(registration: ProfessionalRegistrationRow | null): RegistrationFormState {
  if (!registration) return emptyRegistrationForm

  return {
    registration_body: registration.registration_body,
    registration_number: registration.registration_number,
    registration_type: registration.registration_type ?? '',
    country: registration.country,
    valid_from: registration.valid_from ?? '',
    valid_until: registration.valid_until ?? '',
    is_primary: registration.is_primary,
    is_active: registration.is_active,
  }
}

function toTherapistPayload(formState: TherapistProfileFormState): Omit<TherapistProfileInsert, 'tenant_id'> {
  return {
    display_name: formState.display_name.trim(),
    user_id: formState.user_id || null,
    profession: emptyToNull(formState.profession),
    qualifications: emptyToNull(formState.qualifications),
    bio: emptyToNull(formState.bio),
    default_appointment_duration_minutes: numberOrNull(formState.default_appointment_duration_minutes),
    default_billing_rate: numberOrNull(formState.default_billing_rate),
    practice_number: emptyToNull(formState.practice_number),
    billing_name: emptyToNull(formState.billing_name),
    billing_email: emptyToNull(formState.billing_email),
    billing_phone: emptyToNull(formState.billing_phone),
    is_active: formState.is_active,
  }
}

function toRegistrationPayload(formState: RegistrationFormState, therapistProfileId: string): Omit<ProfessionalRegistrationInsert, 'tenant_id'> {
  return {
    therapist_profile_id: therapistProfileId,
    registration_body: formState.registration_body.trim(),
    registration_number: formState.registration_number.trim(),
    registration_type: emptyToNull(formState.registration_type),
    country: formState.country,
    valid_from: formState.valid_from || null,
    valid_until: formState.valid_until || null,
    is_primary: formState.is_primary,
    is_active: formState.is_active,
  }
}

function formatMoney(value: number | null) {
  if (value === null) return 'No rate'
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value)
}

export function PracticeTherapistsPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditTherapists = authorization.hasPermission('tenant.practice.configure')
  const canLoadTenantUsers = authorization.hasPermission('tenant.users.manage')
  const [therapists, setTherapists] = useState<TherapistProfileRow[]>([])
  const [registrations, setRegistrations] = useState<ProfessionalRegistrationRow[]>([])
  const [tenantUserOptions, setTenantUserOptions] = useState<TenantUserOption[]>([])
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null)
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null)
  const [therapistForm, setTherapistForm] = useState<TherapistProfileFormState>(emptyTherapistForm)
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>(emptyRegistrationForm)
  const [loading, setLoading] = useState(true)
  const [savingTherapist, setSavingTherapist] = useState(false)
  const [savingRegistration, setSavingRegistration] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedTherapist = useMemo(
    () => therapists.find((therapist) => therapist.id === selectedTherapistId) ?? null,
    [therapists, selectedTherapistId],
  )
  const selectedRegistration = useMemo(
    () => registrations.find((registration) => registration.id === selectedRegistrationId) ?? null,
    [registrations, selectedRegistrationId],
  )
  const selectedTherapistRegistrations = useMemo(
    () => registrations.filter((registration) => registration.therapist_profile_id === selectedTherapistId),
    [registrations, selectedTherapistId],
  )
  const isTherapistReadOnly = !canEditTherapists || savingTherapist
  const isRegistrationReadOnly = !canEditTherapists || savingRegistration || !selectedTherapistId

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

    async function loadTherapistData() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const therapistResult = await supabaseClient
        .from('therapist_profiles')
        .select(`
          id,
          tenant_id,
          user_id,
          display_name,
          profession,
          qualifications,
          bio,
          default_appointment_duration_minutes,
          default_billing_rate,
          practice_number,
          billing_name,
          billing_email,
          billing_phone,
          is_active,
          metadata,
          deleted_at,
          created_at,
          updated_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('display_name', { ascending: true })

      if (!isMounted) return

      if (therapistResult.error) {
        setLoadError(therapistResult.error.message)
        setTherapists([])
        setRegistrations([])
        setLoading(false)
        return
      }

      const registrationResult = await supabaseClient
        .from('professional_registrations')
        .select(`
          id,
          tenant_id,
          therapist_profile_id,
          registration_body,
          registration_number,
          registration_type,
          country,
          valid_from,
          valid_until,
          is_primary,
          is_active,
          metadata,
          deleted_at,
          created_at,
          updated_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('registration_body', { ascending: true })

      if (!isMounted) return

      if (registrationResult.error) {
        setLoadError(registrationResult.error.message)
        setTherapists((therapistResult.data ?? []) as TherapistProfileRow[])
        setRegistrations([])
        setLoading(false)
        return
      }

      let nextTenantUserOptions: TenantUserOption[] = []

      if (canLoadTenantUsers) {
        const tenantUsersResult = await supabaseClient
          .from('tenant_users')
          .select('profile_id, role')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .is('deleted_at', null)

        if (isMounted && !tenantUsersResult.error) {
          nextTenantUserOptions = (tenantUsersResult.data ?? []).map((tenantUser) => ({
            profile_id: tenantUser.profile_id,
            role: tenantUser.role,
            label: `${tenantUser.role} · ${tenantUser.profile_id}`,
          }))
        }
      }

      if (!isMounted) return

      setTherapists((therapistResult.data ?? []) as TherapistProfileRow[])
      setRegistrations((registrationResult.data ?? []) as ProfessionalRegistrationRow[])
      setTenantUserOptions(nextTenantUserOptions)
      setSelectedTherapistId(null)
      setSelectedRegistrationId(null)
      setTherapistForm(emptyTherapistForm)
      setRegistrationForm(emptyRegistrationForm)
      setLoading(false)
    }

    loadTherapistData()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id, canLoadTenantUsers])

  const updateTherapistField = <Field extends keyof TherapistProfileFormState>(field: Field, value: TherapistProfileFormState[Field]) => {
    setTherapistForm((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const updateRegistrationField = <Field extends keyof RegistrationFormState>(field: Field, value: RegistrationFormState[Field]) => {
    setRegistrationForm((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const startCreateTherapist = () => {
    setSelectedTherapistId(null)
    setSelectedRegistrationId(null)
    setTherapistForm(emptyTherapistForm)
    setRegistrationForm(emptyRegistrationForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const startEditTherapist = (therapist: TherapistProfileRow) => {
    setSelectedTherapistId(therapist.id)
    setSelectedRegistrationId(null)
    setTherapistForm(formFromTherapist(therapist))
    setRegistrationForm(emptyRegistrationForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const startCreateRegistration = () => {
    setSelectedRegistrationId(null)
    setRegistrationForm(emptyRegistrationForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const startEditRegistration = (registration: ProfessionalRegistrationRow) => {
    setSelectedRegistrationId(registration.id)
    setRegistrationForm(formFromRegistration(registration))
    setSaveError('')
    setSuccessMessage('')
  }

  const saveTherapist = async () => {
    if (!activeTenant?.id || !supabase || !canEditTherapists) return

    if (!therapistForm.display_name.trim()) {
      setSaveError('Display name is required.')
      return
    }

    setSavingTherapist(true)
    setSaveError('')
    setSuccessMessage('')

    const payload = toTherapistPayload(therapistForm)

    const result = selectedTherapist?.id
      ? await supabase
          .from('therapist_profiles')
          .update(payload satisfies TherapistProfileUpdate)
          .eq('id', selectedTherapist.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('therapist_profiles')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingTherapist(false)
      return
    }

    const savedTherapist = result.data as TherapistProfileRow
    setTherapists((currentTherapists) => {
      const nextTherapists = selectedTherapist?.id
        ? currentTherapists.map((therapist) => (therapist.id === savedTherapist.id ? savedTherapist : therapist))
        : [...currentTherapists, savedTherapist]

      return nextTherapists.sort((a, b) => a.display_name.localeCompare(b.display_name))
    })
    setSelectedTherapistId(savedTherapist.id)
    setTherapistForm(formFromTherapist(savedTherapist))
    setSuccessMessage(selectedTherapist?.id ? 'Therapist profile updated.' : 'Therapist profile created.')
    setSavingTherapist(false)
  }

  const clearOtherPrimaryRegistrations = async (therapistProfileId: string, currentRegistrationId?: string) => {
    if (!activeTenant?.id || !supabase) return { error: null }

    let query = supabase
      .from('professional_registrations')
      .update({ is_primary: false })
      .eq('tenant_id', activeTenant.id)
      .eq('therapist_profile_id', therapistProfileId)
      .is('deleted_at', null)

    if (currentRegistrationId) {
      query = query.neq('id', currentRegistrationId)
    }

    return query
  }

  const saveRegistration = async () => {
    if (!activeTenant?.id || !supabase || !canEditTherapists || !selectedTherapistId) return

    if (!registrationForm.registration_body.trim() || !registrationForm.registration_number.trim()) {
      setSaveError('Registration body and registration number are required.')
      return
    }

    setSavingRegistration(true)
    setSaveError('')
    setSuccessMessage('')

    if (registrationForm.is_primary) {
      const clearResult = await clearOtherPrimaryRegistrations(selectedTherapistId, selectedRegistration?.id)
      if (clearResult.error) {
        setSaveError(`Could not clear the previous primary registration: ${clearResult.error.message}`)
        setSavingRegistration(false)
        return
      }
    }

    const payload = toRegistrationPayload(registrationForm, selectedTherapistId)

    const result = selectedRegistration?.id
      ? await supabase
          .from('professional_registrations')
          .update(payload satisfies ProfessionalRegistrationUpdate)
          .eq('id', selectedRegistration.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('professional_registrations')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSavingRegistration(false)
      return
    }

    const savedRegistration = result.data as ProfessionalRegistrationRow
    setRegistrations((currentRegistrations) => {
      const nextRegistrations = selectedRegistration?.id
        ? currentRegistrations.map((registration) =>
            registration.id === savedRegistration.id
              ? savedRegistration
              : registrationForm.is_primary && registration.therapist_profile_id === selectedTherapistId
                ? { ...registration, is_primary: false }
                : registration,
          )
        : [
            ...currentRegistrations.map((registration) =>
              registrationForm.is_primary && registration.therapist_profile_id === selectedTherapistId
                ? { ...registration, is_primary: false }
                : registration,
            ),
            savedRegistration,
          ]

      return nextRegistrations.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.registration_body.localeCompare(b.registration_body))
    })
    setSelectedRegistrationId(savedRegistration.id)
    setRegistrationForm(formFromRegistration(savedRegistration))
    setSuccessMessage(selectedRegistration?.id ? 'Professional registration updated.' : 'Professional registration created.')
    setSavingRegistration(false)
  }

  if (loading) {
    return <LoadingState title="Loading therapist profiles" description="Checking active tenant therapist profiles and registrations." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Therapist profiles unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-therapists-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Therapist profiles</span>
          <h3>{activeTenant?.practice_name ?? 'Practice therapists'}</h3>
          <p>
            Manage therapist professional profiles and basic professional registrations. Booking provider,
            therapist banking and calendar workflows are intentionally not connected yet.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{therapists.length} therapists</StatusBadge>
          {!canEditTherapists && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="practice-locations-layout">
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Therapist list</span>
              <h3>Therapists</h3>
            </div>
            {canEditTherapists && (
              <Button variant="secondary" onClick={startCreateTherapist}>
                New Therapist
              </Button>
            )}
          </div>

          {therapists.length === 0 ? (
            <EmptyState title="No therapists yet" description="Create the first therapist profile for this tenant." />
          ) : (
            <div className="practice-location-cards">
              {therapists.map((therapist) => (
                <button
                  className={selectedTherapistId === therapist.id ? 'active' : ''}
                  type="button"
                  onClick={() => startEditTherapist(therapist)}
                  key={therapist.id}
                >
                  <div>
                    <strong>{therapist.display_name}</strong>
                    <span>{therapist.profession || 'No profession captured'} · {formatMoney(therapist.default_billing_rate)}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    <StatusBadge tone={therapist.is_active ? 'success' : 'neutral'}>
                      {therapist.is_active ? 'Active' : 'Inactive'}
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
                <span>{selectedTherapist ? 'Edit therapist' : 'Create therapist'}</span>
                <h3>{selectedTherapist ? therapistForm.display_name : 'New therapist profile'}</h3>
              </div>
              {canEditTherapists && (
                <Button disabled={savingTherapist} onClick={saveTherapist}>
                  {savingTherapist ? 'Saving' : 'Save Therapist'}
                </Button>
              )}
            </div>

            <div className="settings-form-grid practice-therapist-form">
              <label>
                <span>Display name</span>
                <input value={therapistForm.display_name} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('display_name', event.target.value)} />
              </label>
              <label>
                <span>Linked user / profile</span>
                <select value={therapistForm.user_id} disabled={isTherapistReadOnly || tenantUserOptions.length === 0} onChange={(event) => updateTherapistField('user_id', event.target.value)}>
                  <option value="">{tenantUserOptions.length ? 'No linked user' : 'No tenant users available'}</option>
                  {tenantUserOptions.map((option) => (
                    <option value={option.profile_id} key={option.profile_id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Profession</span>
                <input value={therapistForm.profession} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('profession', event.target.value)} />
              </label>
              <label>
                <span>Qualifications</span>
                <input value={therapistForm.qualifications} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('qualifications', event.target.value)} />
              </label>
              <label>
                <span>Default appointment duration</span>
                <input type="number" min="1" value={therapistForm.default_appointment_duration_minutes} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('default_appointment_duration_minutes', event.target.value)} />
              </label>
              <label>
                <span>Default billing rate</span>
                <input type="number" min="0" step="0.01" value={therapistForm.default_billing_rate} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('default_billing_rate', event.target.value)} />
              </label>
              <label>
                <span>Practice number</span>
                <input value={therapistForm.practice_number} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('practice_number', event.target.value)} />
              </label>
              <label>
                <span>Status</span>
                <select value={therapistForm.is_active ? 'active' : 'inactive'} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('is_active', event.target.value === 'active')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                <span>Billing name</span>
                <input value={therapistForm.billing_name} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('billing_name', event.target.value)} />
              </label>
              <label>
                <span>Billing email</span>
                <input type="email" value={therapistForm.billing_email} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('billing_email', event.target.value)} />
              </label>
              <label>
                <span>Billing phone</span>
                <input value={therapistForm.billing_phone} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('billing_phone', event.target.value)} />
              </label>
              <label className="wide-field">
                <span>Bio</span>
                <textarea value={therapistForm.bio} disabled={isTherapistReadOnly} onChange={(event) => updateTherapistField('bio', event.target.value)} />
              </label>
            </div>
          </Card>

          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header">
              <div>
                <span>Professional registrations</span>
                <h3>{selectedTherapist ? 'Registration details' : 'Save therapist first'}</h3>
              </div>
              {canEditTherapists && selectedTherapistId && (
                <Button variant="secondary" onClick={startCreateRegistration}>
                  New Registration
                </Button>
              )}
            </div>

            {selectedTherapistId ? (
              <>
                <div className="practice-registration-list">
                  {selectedTherapistRegistrations.length === 0 ? (
                    <span>No registrations captured yet.</span>
                  ) : (
                    selectedTherapistRegistrations.map((registration) => (
                      <button
                        className={selectedRegistrationId === registration.id ? 'active' : ''}
                        type="button"
                        onClick={() => startEditRegistration(registration)}
                        key={registration.id}
                      >
                        <strong>{registration.registration_body} · {registration.registration_number}</strong>
                        <span>{registration.registration_type || 'No type'} · {registration.country}</span>
                        <div>
                          {registration.is_primary && <StatusBadge tone="info">Primary</StatusBadge>}
                          <StatusBadge tone={registration.is_active ? 'success' : 'neutral'}>
                            {registration.is_active ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="settings-form-grid practice-registration-form">
                  <label>
                    <span>Registration body</span>
                    <select value={registrationForm.registration_body} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('registration_body', event.target.value)}>
                      {registrationBodyOptions.map((body) => <option value={body} key={body}>{body}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Registration number</span>
                    <input value={registrationForm.registration_number} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('registration_number', event.target.value)} />
                  </label>
                  <label>
                    <span>Registration type</span>
                    <input value={registrationForm.registration_type} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('registration_type', event.target.value)} />
                  </label>
                  <label>
                    <span>Country</span>
                    <select value={registrationForm.country} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('country', event.target.value)}>
                      {countryOptions.map((country) => <option value={country} key={country}>{country}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Valid from</span>
                    <input type="date" value={registrationForm.valid_from} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('valid_from', event.target.value)} />
                  </label>
                  <label>
                    <span>Valid until</span>
                    <input type="date" value={registrationForm.valid_until} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('valid_until', event.target.value)} />
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={registrationForm.is_active ? 'active' : 'inactive'} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('is_active', event.target.value === 'active')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <label className="practice-number-toggle">
                    <input type="checkbox" checked={registrationForm.is_primary} disabled={isRegistrationReadOnly} onChange={(event) => updateRegistrationField('is_primary', event.target.checked)} />
                    <span>Primary registration</span>
                  </label>
                </div>

                {canEditTherapists && (
                  <div className="practice-registration-actions">
                    <Button disabled={savingRegistration || !selectedTherapistId} onClick={saveRegistration}>
                      {savingRegistration ? 'Saving' : selectedRegistration ? 'Save Registration' : 'Add Registration'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Select or create a therapist" description="Professional registrations are linked to a saved therapist profile." />
            )}
          </Card>

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
