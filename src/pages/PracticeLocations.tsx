import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EditableField } from '../components/EditableField'
import { EditSaveControls } from '../components/EditSaveControls'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { showErrorNotice, showSuccessNotice } from '../lib/appNotice'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type PracticeLocationRow = Database['public']['Tables']['practice_locations']['Row']
type PracticeLocationInsert = Database['public']['Tables']['practice_locations']['Insert']
type PracticeLocationUpdate = Database['public']['Tables']['practice_locations']['Update']

type PracticeLocationFormState = {
  location_name: string
  location_type: string
  address_line_1: string
  address_line_2: string
  suburb: string
  city: string
  province: string
  postal_code: string
  country: string
  contact_email: string
  contact_phone: string
  room_venue_notes: string
  is_main_location: boolean
  is_active: boolean
}

const emptyLocationForm: PracticeLocationFormState = {
  location_name: '',
  location_type: 'practice',
  address_line_1: '',
  address_line_2: '',
  suburb: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'South Africa',
  contact_email: '',
  contact_phone: '',
  room_venue_notes: '',
  is_main_location: false,
  is_active: true,
}

const locationTypeOptions = ['practice', 'satellite', 'telehealth', 'partner', 'other']
const countryOptions = ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'United Kingdom', 'United States']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formFromLocation(location: PracticeLocationRow | null): PracticeLocationFormState {
  if (!location) return emptyLocationForm

  return {
    location_name: location.location_name,
    location_type: location.location_type,
    address_line_1: location.address_line_1 ?? '',
    address_line_2: location.address_line_2 ?? '',
    suburb: location.suburb ?? '',
    city: location.city ?? '',
    province: location.province ?? '',
    postal_code: location.postal_code ?? '',
    country: location.country,
    contact_email: location.contact_email ?? '',
    contact_phone: location.contact_phone ?? '',
    room_venue_notes: location.room_venue_notes ?? '',
    is_main_location: location.is_main_location,
    is_active: location.is_active,
  }
}

function toLocationPayload(formState: PracticeLocationFormState): Omit<PracticeLocationInsert, 'tenant_id'> {
  return {
    location_name: formState.location_name.trim(),
    location_type: formState.location_type,
    address_line_1: emptyToNull(formState.address_line_1),
    address_line_2: emptyToNull(formState.address_line_2),
    suburb: emptyToNull(formState.suburb),
    city: emptyToNull(formState.city),
    province: emptyToNull(formState.province),
    postal_code: emptyToNull(formState.postal_code),
    country: formState.country,
    contact_email: emptyToNull(formState.contact_email),
    contact_phone: emptyToNull(formState.contact_phone),
    room_venue_notes: emptyToNull(formState.room_venue_notes),
    is_main_location: formState.is_main_location,
    is_active: formState.is_active,
  }
}

function formatLocationType(locationType: string) {
  return locationType.replaceAll('_', ' ')
}

function formatAddress(location: PracticeLocationRow) {
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

export function PracticeLocationsPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditLocations = authorization.hasPermission('tenant.practice.configure')
  const [locations, setLocations] = useState<PracticeLocationRow[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [formState, setFormState] = useState<PracticeLocationFormState>(emptyLocationForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [loadError, setLoadError] = useState('')

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  )
  const showEditableFields = isCreating || isEditing
  const isReadOnly = !canEditLocations || saving || (!isCreating && !isEditing)

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

    async function loadLocations() {
      setLoading(true)
      setLoadError('')

      const { data, error } = await supabaseClient
        .from('practice_locations')
        .select(`
          id,
          tenant_id,
          practice_profile_id,
          location_name,
          location_type,
          address_line_1,
          address_line_2,
          suburb,
          city,
          province,
          postal_code,
          country,
          contact_email,
          contact_phone,
          room_venue_notes,
          is_main_location,
          is_active,
          metadata,
          created_at,
          updated_at,
          deleted_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('is_main_location', { ascending: false })
        .order('location_name', { ascending: true })

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setLocations([])
        setSelectedLocationId(null)
        setFormState(emptyLocationForm)
        setLoading(false)
        return
      }

      setLocations((data ?? []) as PracticeLocationRow[])
      setSelectedLocationId(null)
      setFormState(emptyLocationForm)
      setIsCreating(false)
      setIsEditing(false)
      setLoading(false)
    }

    loadLocations()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof PracticeLocationFormState>(field: Field, value: PracticeLocationFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
  }

  const startCreateLocation = () => {
    setSelectedLocationId(null)
    setFormState(emptyLocationForm)
    setIsCreating(true)
    setIsEditing(true)
  }

  const viewLocation = (location: PracticeLocationRow) => {
    setSelectedLocationId(location.id)
    setFormState(formFromLocation(location))
    setIsCreating(false)
    setIsEditing(false)
  }

  const saveLocation = async () => {
    if (!activeTenant?.id || !supabase || !canEditLocations) return

    if (!formState.location_name.trim()) {
      showErrorNotice('Location name is required.')
      return
    }

    setSaving(true)

    const payload = toLocationPayload(formState)

    const result = selectedLocation?.id
      ? await supabase
          .from('practice_locations')
          .update(payload satisfies PracticeLocationUpdate)
          .eq('id', selectedLocation.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('practice_locations')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      showErrorNotice(result.error.message)
      setSaving(false)
      return
    }

    const savedLocation = result.data as PracticeLocationRow
    setLocations((currentLocations) => {
      const nextLocations = selectedLocation?.id
        ? currentLocations.map((location) => (location.id === savedLocation.id ? savedLocation : location))
        : [...currentLocations, savedLocation]

      return nextLocations.sort((a, b) => Number(b.is_main_location) - Number(a.is_main_location) || a.location_name.localeCompare(b.location_name))
    })
    setSelectedLocationId(savedLocation.id)
    setFormState(formFromLocation(savedLocation))
    showSuccessNotice(selectedLocation?.id ? 'Location updated.' : 'Location created.')
    setIsCreating(false)
    setIsEditing(false)
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading practice locations" description="Checking active tenant practice locations." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Practice locations unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-locations-page">
      <div className={`practice-locations-layout${!isCreating && !selectedLocation ? ' is-list-only' : ''}`}>
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Location list</span>
              <h3>Locations</h3>
            </div>
            {canEditLocations && (
              <Button variant="secondary" onClick={startCreateLocation}>
                Add Location
              </Button>
            )}
          </div>

          {locations.length === 0 ? (
            <EmptyState
              title="No locations yet"
              description="Create the first practice location for this tenant."
            />
          ) : (
            <div className="practice-location-cards">
              {locations.map((location) => (
                <button
                  className={selectedLocationId === location.id ? 'active' : ''}
                  type="button"
                  onClick={() => viewLocation(location)}
                  key={location.id}
                >
                  <div>
                    <strong>{location.location_name}</strong>
                    <span>{formatAddress(location) || 'No address captured'}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    {location.is_main_location && <StatusBadge tone="info">Main</StatusBadge>}
                    <StatusBadge tone={location.is_active ? 'success' : 'neutral'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {(isCreating || selectedLocation) && <Card className="practice-profile-form-card">
          <div className="practice-profile-form-header">
            <div>
              <span>{isCreating ? 'Create location' : isEditing ? 'Edit location' : 'Saved location'}</span>
              <h3>{isCreating ? 'New location' : formState.location_name || 'Location details'}</h3>
            </div>
            {canEditLocations && !isCreating && (
              <EditSaveControls
                isEditing={isEditing}
                isSaving={saving}
                onEdit={() => setIsEditing(true)}
                onSave={saveLocation}
                editLabel="Edit location"
                saveLabel="Save location"
              />
            )}
            {canEditLocations && isCreating && (
              <Button disabled={saving} onClick={saveLocation}>
                {saving ? 'Saving' : 'Save Location'}
              </Button>
            )}
          </div>

          <div className="settings-form-grid practice-location-form">
            <EditableField label="Location name" isEditing={showEditableFields} value={formState.location_name}>
              <input value={formState.location_name} disabled={isReadOnly} onChange={(event) => updateField('location_name', event.target.value)} />
            </EditableField>
            <EditableField label="Location type" isEditing={showEditableFields} value={formatLocationType(formState.location_type)}>
              <select value={formState.location_type} disabled={isReadOnly} onChange={(event) => updateField('location_type', event.target.value)}>
                {locationTypeOptions.map((locationType) => (
                  <option value={locationType} key={locationType}>{formatLocationType(locationType)}</option>
                ))}
              </select>
            </EditableField>
            <EditableField label="Contact email" isEditing={showEditableFields} value={formState.contact_email}>
              <input type="email" value={formState.contact_email} disabled={isReadOnly} onChange={(event) => updateField('contact_email', event.target.value)} />
            </EditableField>
            <EditableField label="Contact phone" isEditing={showEditableFields} value={formState.contact_phone}>
              <input value={formState.contact_phone} disabled={isReadOnly} onChange={(event) => updateField('contact_phone', event.target.value)} />
            </EditableField>
            <EditableField label="Address line 1" isEditing={showEditableFields} value={formState.address_line_1}>
              <input value={formState.address_line_1} disabled={isReadOnly} onChange={(event) => updateField('address_line_1', event.target.value)} />
            </EditableField>
            <EditableField label="Address line 2" isEditing={showEditableFields} value={formState.address_line_2}>
              <input value={formState.address_line_2} disabled={isReadOnly} onChange={(event) => updateField('address_line_2', event.target.value)} />
            </EditableField>
            <EditableField label="Suburb / area" isEditing={showEditableFields} value={formState.suburb}>
              <input value={formState.suburb} disabled={isReadOnly} onChange={(event) => updateField('suburb', event.target.value)} />
            </EditableField>
            <EditableField label="City" isEditing={showEditableFields} value={formState.city}>
              <input value={formState.city} disabled={isReadOnly} onChange={(event) => updateField('city', event.target.value)} />
            </EditableField>
            <EditableField label="Province" isEditing={showEditableFields} value={formState.province}>
              <input value={formState.province} disabled={isReadOnly} onChange={(event) => updateField('province', event.target.value)} />
            </EditableField>
            <EditableField label="Postal code" isEditing={showEditableFields} value={formState.postal_code}>
              <input value={formState.postal_code} disabled={isReadOnly} onChange={(event) => updateField('postal_code', event.target.value)} />
            </EditableField>
            <EditableField label="Country" isEditing={showEditableFields} value={formState.country}>
              <select value={formState.country} disabled={isReadOnly} onChange={(event) => updateField('country', event.target.value)}>
                {countryOptions.map((country) => <option value={country} key={country}>{country}</option>)}
              </select>
            </EditableField>
            <EditableField label="Status" isEditing={showEditableFields} value={formState.is_active ? 'Active' : 'Inactive'}>
              <select value={formState.is_active ? 'active' : 'inactive'} disabled={isReadOnly} onChange={(event) => updateField('is_active', event.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </EditableField>
            <EditableField label="Main location" isEditing={showEditableFields} value={formState.is_main_location ? 'Yes' : 'No'}>
              <div className="practice-number-toggle">
                <input type="checkbox" checked={formState.is_main_location} disabled={isReadOnly} onChange={(event) => updateField('is_main_location', event.target.checked)} />
                <span>Main location</span>
              </div>
            </EditableField>
            <EditableField className="wide-field" label="Room / venue notes" isEditing={showEditableFields} value={formState.room_venue_notes}>
              <textarea value={formState.room_venue_notes} disabled={isReadOnly} onChange={(event) => updateField('room_venue_notes', event.target.value)} />
            </EditableField>
          </div>
        </Card>}
      </div>
    </div>
  )
}
