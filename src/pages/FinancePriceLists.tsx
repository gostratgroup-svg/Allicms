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

type PriceListRow = Database['public']['Tables']['price_lists']['Row']
type PriceListInsert = Database['public']['Tables']['price_lists']['Insert']
type PriceListUpdate = Database['public']['Tables']['price_lists']['Update']
type PriceListItemRow = Database['public']['Tables']['price_list_items']['Row']
type PriceListItemInsert = Database['public']['Tables']['price_list_items']['Insert']
type PriceListItemUpdate = Database['public']['Tables']['price_list_items']['Update']

type PriceListFormState = {
  name: string
  description: string
  list_type: string
  is_default: boolean
  is_active: boolean
}

type PriceListItemFormState = {
  procedure_name: string
  procedure_code: string
  description: string
  price: string
  duration_minutes: string
  is_active: boolean
}

const emptyPriceListForm: PriceListFormState = {
  name: '',
  description: '',
  list_type: '',
  is_default: false,
  is_active: true,
}

const emptyPriceListItemForm: PriceListItemFormState = {
  procedure_name: '',
  procedure_code: '',
  description: '',
  price: '0',
  duration_minutes: '',
  is_active: true,
}

const priceListTypeOptions = ['', 'Cash Rates', 'Medical Aid Rates', 'School Rates', 'Contract Rates', 'Assessment Rates']
const durationOptions = ['', '15', '30', '45', '60', '90', '120', '180']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function formFromPriceList(priceList: PriceListRow | null): PriceListFormState {
  if (!priceList) return emptyPriceListForm

  return {
    name: priceList.name,
    description: priceList.description ?? '',
    list_type: priceList.list_type ?? '',
    is_default: priceList.is_default,
    is_active: priceList.is_active,
  }
}

function formFromPriceListItem(item: PriceListItemRow | null): PriceListItemFormState {
  if (!item) return emptyPriceListItemForm

  return {
    procedure_name: item.procedure_name,
    procedure_code: item.procedure_code ?? '',
    description: item.description ?? '',
    price: String(item.price),
    duration_minutes: item.duration_minutes === null ? '' : String(item.duration_minutes),
    is_active: item.is_active,
  }
}

function toPriceListPayload(formState: PriceListFormState): Omit<PriceListInsert, 'tenant_id'> {
  return {
    name: formState.name.trim(),
    description: emptyToNull(formState.description),
    list_type: emptyToNull(formState.list_type),
    is_default: formState.is_default,
    is_active: formState.is_active,
  }
}

function toPriceListItemPayload(formState: PriceListItemFormState, priceListId: string): Omit<PriceListItemInsert, 'tenant_id'> {
  return {
    price_list_id: priceListId,
    procedure_name: formState.procedure_name.trim(),
    procedure_code: emptyToNull(formState.procedure_code),
    description: emptyToNull(formState.description),
    price: Number(formState.price || 0),
    duration_minutes: numberOrNull(formState.duration_minutes),
    is_active: formState.is_active,
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value)
}

function formatDuration(value: number | null) {
  return value === null ? 'No duration' : `${value} min`
}

export function FinancePriceListsPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditPriceLists = authorization.hasPermission('tenant.finance.manage', 'tenant.practice.configure')
  const [priceLists, setPriceLists] = useState<PriceListRow[]>([])
  const [items, setItems] = useState<PriceListItemRow[]>([])
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [priceListForm, setPriceListForm] = useState<PriceListFormState>(emptyPriceListForm)
  const [itemForm, setItemForm] = useState<PriceListItemFormState>(emptyPriceListItemForm)
  const [loading, setLoading] = useState(true)
  const [savingPriceList, setSavingPriceList] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const [isCreatingPriceList, setIsCreatingPriceList] = useState(false)
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [isPriceListEditing, setIsPriceListEditing] = useState(false)
  const [isItemEditing, setIsItemEditing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const selectedPriceList = useMemo(
    () => priceLists.find((priceList) => priceList.id === selectedPriceListId) ?? null,
    [priceLists, selectedPriceListId],
  )
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  )
  const selectedItems = useMemo(
    () => items.filter((item) => item.price_list_id === selectedPriceListId),
    [items, selectedPriceListId],
  )
  const showPriceListFields = isCreatingPriceList || isPriceListEditing
  const showItemFields = isCreatingItem || isItemEditing
  const isPriceListReadOnly = !canEditPriceLists || savingPriceList || (!isCreatingPriceList && !isPriceListEditing)
  const isItemReadOnly = !canEditPriceLists || savingItem || !selectedPriceListId || (!isCreatingItem && !isItemEditing)

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

    async function loadPriceListData() {
      setLoading(true)
      setLoadError('')

      const [priceListsResult, itemsResult] = await Promise.all([
        supabaseClient
          .from('price_lists')
          .select(`
            id,
            tenant_id,
            name,
            description,
            list_type,
            is_default,
            is_active,
            metadata,
            deleted_at,
            created_at,
            updated_at
          `)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true }),
        supabaseClient
          .from('price_list_items')
          .select(`
            id,
            tenant_id,
            price_list_id,
            procedure_name,
            procedure_code,
            description,
            price,
            duration_minutes,
            is_active,
            metadata,
            deleted_at,
            created_at,
            updated_at
          `)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('procedure_name', { ascending: true }),
      ])

      if (!isMounted) return

      if (priceListsResult.error) {
        setLoadError(priceListsResult.error.message)
        setPriceLists([])
        setItems([])
        setLoading(false)
        return
      }

      if (itemsResult.error) {
        setLoadError(itemsResult.error.message)
        setPriceLists((priceListsResult.data ?? []) as PriceListRow[])
        setItems([])
        setLoading(false)
        return
      }

      setPriceLists((priceListsResult.data ?? []) as PriceListRow[])
      setItems((itemsResult.data ?? []) as PriceListItemRow[])
      setSelectedPriceListId(null)
      setSelectedItemId(null)
      setPriceListForm(emptyPriceListForm)
      setItemForm(emptyPriceListItemForm)
      setIsCreatingPriceList(false)
      setIsCreatingItem(false)
      setIsPriceListEditing(false)
      setIsItemEditing(false)
      setLoading(false)
    }

    loadPriceListData()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updatePriceListField = <Field extends keyof PriceListFormState>(field: Field, value: PriceListFormState[Field]) => {
    setPriceListForm((currentFormState) => ({ ...currentFormState, [field]: value }))
  }

  const updateItemField = <Field extends keyof PriceListItemFormState>(field: Field, value: PriceListItemFormState[Field]) => {
    setItemForm((currentFormState) => ({ ...currentFormState, [field]: value }))
  }

  const startCreatePriceList = () => {
    setSelectedPriceListId(null)
    setSelectedItemId(null)
    setPriceListForm(emptyPriceListForm)
    setItemForm(emptyPriceListItemForm)
    setIsCreatingPriceList(true)
    setIsCreatingItem(false)
    setIsPriceListEditing(true)
    setIsItemEditing(false)
  }

  const viewPriceList = (priceList: PriceListRow) => {
    setSelectedPriceListId(priceList.id)
    setSelectedItemId(null)
    setPriceListForm(formFromPriceList(priceList))
    setItemForm(emptyPriceListItemForm)
    setIsCreatingPriceList(false)
    setIsCreatingItem(false)
    setIsPriceListEditing(false)
    setIsItemEditing(false)
  }

  const startCreateItem = () => {
    setSelectedItemId(null)
    setItemForm(emptyPriceListItemForm)
    setIsCreatingItem(true)
    setIsItemEditing(true)
  }

  const viewItem = (item: PriceListItemRow) => {
    setSelectedItemId(item.id)
    setItemForm(formFromPriceListItem(item))
    setIsCreatingItem(false)
    setIsItemEditing(false)
  }

  const clearOtherDefaults = async (currentPriceListId?: string) => {
    if (!activeTenant?.id || !supabase) return { error: null }

    let query = supabase
      .from('price_lists')
      .update({ is_default: false })
      .eq('tenant_id', activeTenant.id)
      .is('deleted_at', null)

    if (currentPriceListId) {
      query = query.neq('id', currentPriceListId)
    }

    return query
  }

  const savePriceList = async () => {
    if (!activeTenant?.id || !supabase || !canEditPriceLists) return

    if (!priceListForm.name.trim()) {
      showErrorNotice('Price list name is required.')
      return
    }

    setSavingPriceList(true)

    if (priceListForm.is_default) {
      const clearResult = await clearOtherDefaults(selectedPriceList?.id)
      if (clearResult.error) {
        showErrorNotice(`Could not clear the previous default list: ${clearResult.error.message}`)
        setSavingPriceList(false)
        return
      }
    }

    const payload = toPriceListPayload(priceListForm)

    const result = selectedPriceList?.id
      ? await supabase
          .from('price_lists')
          .update(payload satisfies PriceListUpdate)
          .eq('id', selectedPriceList.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('price_lists')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      showErrorNotice(result.error.message)
      setSavingPriceList(false)
      return
    }

    const savedPriceList = result.data as PriceListRow
    setPriceLists((currentPriceLists) => {
      const nextPriceLists = selectedPriceList?.id
        ? currentPriceLists.map((priceList) =>
            priceList.id === savedPriceList.id
              ? savedPriceList
              : priceListForm.is_default
                ? { ...priceList, is_default: false }
                : priceList,
          )
        : [
            ...currentPriceLists.map((priceList) => (priceListForm.is_default ? { ...priceList, is_default: false } : priceList)),
            savedPriceList,
          ]

      return nextPriceLists.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name))
    })
    setSelectedPriceListId(savedPriceList.id)
    setPriceListForm(formFromPriceList(savedPriceList))
    showSuccessNotice(selectedPriceList?.id ? 'Price list updated.' : 'Price list created.')
    setIsCreatingPriceList(false)
    setIsPriceListEditing(false)
    setSavingPriceList(false)
  }

  const validateItem = () => {
    const price = Number(itemForm.price || 0)
    const duration = numberOrNull(itemForm.duration_minutes)

    if (!itemForm.procedure_name.trim()) return 'Procedure name is required.'
    if (!Number.isFinite(price) || price < 0) return 'Price cannot be negative.'
    if (itemForm.duration_minutes.trim() && (!duration || duration <= 0)) return 'Duration must be positive if supplied.'

    return ''
  }

  const saveItem = async () => {
    if (!activeTenant?.id || !supabase || !canEditPriceLists || !selectedPriceListId) return

    const validationError = validateItem()
    if (validationError) {
      showErrorNotice(validationError)
      return
    }

    setSavingItem(true)

    const payload = toPriceListItemPayload(itemForm, selectedPriceListId)

    const result = selectedItem?.id
      ? await supabase
          .from('price_list_items')
          .update(payload satisfies PriceListItemUpdate)
          .eq('id', selectedItem.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('price_list_items')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      showErrorNotice(result.error.message)
      setSavingItem(false)
      return
    }

    const savedItem = result.data as PriceListItemRow
    setItems((currentItems) => {
      const nextItems = selectedItem?.id
        ? currentItems.map((item) => (item.id === savedItem.id ? savedItem : item))
        : [...currentItems, savedItem]

      return nextItems.sort((a, b) => a.procedure_name.localeCompare(b.procedure_name))
    })
    setSelectedItemId(savedItem.id)
    setItemForm(formFromPriceListItem(savedItem))
    showSuccessNotice(selectedItem?.id ? 'Procedure line item updated.' : 'Procedure line item created.')
    setIsCreatingItem(false)
    setIsItemEditing(false)
    setSavingItem(false)
  }

  if (loading) {
    return <LoadingState title="Loading price lists" description="Checking active tenant price lists and procedure line items." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Price lists unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="finance-price-lists-page">
      <div className={`practice-locations-layout${!isCreatingPriceList && !selectedPriceList ? ' is-list-only' : ''}`}>
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Price list library</span>
              <h3>Price Lists</h3>
            </div>
            {canEditPriceLists && (
              <Button variant="secondary" onClick={startCreatePriceList}>
                Add Price List
              </Button>
            )}
          </div>

          {priceLists.length === 0 ? (
            <EmptyState title="No price lists yet" description="Create a price list before adding procedure line items." />
          ) : (
            <div className="practice-location-cards">
              {priceLists.map((priceList) => (
                <button
                  className={selectedPriceListId === priceList.id ? 'active' : ''}
                  type="button"
                  onClick={() => viewPriceList(priceList)}
                  key={priceList.id}
                >
                  <div>
                    <strong>{priceList.name}</strong>
                    <span>{priceList.list_type || 'No list type'} · {priceList.description || 'No description'}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    {priceList.is_default && <StatusBadge tone="info">Default</StatusBadge>}
                    <StatusBadge tone={priceList.is_active ? 'success' : 'neutral'}>
                      {priceList.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {(isCreatingPriceList || selectedPriceList) && <div className="practice-therapist-editor-stack">
          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header">
              <div>
                <span>{selectedPriceList ? (isPriceListEditing ? 'Edit price list' : 'Saved price list') : 'Create price list'}</span>
                <h3>{selectedPriceList ? priceListForm.name : 'New price list'}</h3>
              </div>
              {canEditPriceLists && selectedPriceList && (
                <EditSaveControls
                  isEditing={isPriceListEditing}
                  isSaving={savingPriceList}
                  onEdit={() => setIsPriceListEditing(true)}
                  onSave={savePriceList}
                  editLabel="Edit price list"
                  saveLabel="Save price list"
                />
              )}
              {canEditPriceLists && !selectedPriceList && (
                <Button disabled={savingPriceList} onClick={savePriceList}>
                  {savingPriceList ? 'Saving' : 'Save Price List'}
                </Button>
              )}
            </div>

            <div className="settings-form-grid finance-price-list-form">
              <EditableField label="Name" isEditing={showPriceListFields} value={priceListForm.name}>
                <input value={priceListForm.name} disabled={isPriceListReadOnly} onChange={(event) => updatePriceListField('name', event.target.value)} />
              </EditableField>
              <EditableField label="List type" isEditing={showPriceListFields} value={priceListForm.list_type || 'No type'}>
                <select value={priceListForm.list_type} disabled={isPriceListReadOnly} onChange={(event) => updatePriceListField('list_type', event.target.value)}>
                  {priceListTypeOptions.map((option) => (
                    <option value={option} key={option}>{option || 'No type'}</option>
                  ))}
                </select>
              </EditableField>
              <EditableField label="Status" isEditing={showPriceListFields} value={priceListForm.is_active ? 'Active' : 'Inactive'}>
                <select value={priceListForm.is_active ? 'active' : 'inactive'} disabled={isPriceListReadOnly} onChange={(event) => updatePriceListField('is_active', event.target.value === 'active')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </EditableField>
              <EditableField className="wide-field" label="Description" isEditing={showPriceListFields} value={priceListForm.description}>
                <textarea value={priceListForm.description} disabled={isPriceListReadOnly} onChange={(event) => updatePriceListField('description', event.target.value)} />
              </EditableField>
              <EditableField label="Default price list" isEditing={showPriceListFields} value={priceListForm.is_default ? 'Yes' : 'No'}>
                <div className="practice-number-toggle">
                  <input type="checkbox" checked={priceListForm.is_default} disabled={isPriceListReadOnly} onChange={(event) => updatePriceListField('is_default', event.target.checked)} />
                  <span>Default price list</span>
                </div>
              </EditableField>
            </div>
          </Card>

          <Card className="practice-profile-form-card">
            <div className="practice-profile-form-header">
              <div>
                <span>Procedure line items</span>
                <h3>{selectedPriceList ? selectedPriceList.name : 'Save price list first'}</h3>
              </div>
              {canEditPriceLists && selectedPriceListId && (
                <Button variant="secondary" onClick={startCreateItem}>
                  Add Procedure
                </Button>
              )}
            </div>

            {selectedPriceListId ? (
              <>
                <div className="practice-registration-list finance-procedure-list">
                  {selectedItems.length === 0 ? (
                    <span>No procedure line items captured yet.</span>
                  ) : (
                    selectedItems.map((item) => (
                      <button
                        className={selectedItemId === item.id ? 'active' : ''}
                        type="button"
                        onClick={() => viewItem(item)}
                        key={item.id}
                      >
                        <strong>{item.procedure_name}</strong>
                        <span>{item.procedure_code || 'No code'} · {formatDuration(item.duration_minutes)}</span>
                        <div>
                          <StatusBadge tone="info">{formatMoney(item.price)}</StatusBadge>
                          <StatusBadge tone={item.is_active ? 'success' : 'neutral'}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {(isCreatingItem || selectedItem) && <div className="practice-registration-editor-header">
                  <span>{selectedItem ? (isItemEditing ? 'Edit procedure' : 'Saved procedure') : 'New procedure'}</span>
                  {canEditPriceLists && selectedItem && (
                    <EditSaveControls
                      isEditing={isItemEditing}
                      isSaving={savingItem}
                      onEdit={() => setIsItemEditing(true)}
                      onSave={saveItem}
                      editLabel="Edit procedure"
                      saveLabel="Save procedure"
                    />
                  )}
                </div>}

                {(isCreatingItem || selectedItem) && <div className="settings-form-grid finance-procedure-form">
                  <EditableField label="Procedure name" isEditing={showItemFields} value={itemForm.procedure_name}>
                    <input value={itemForm.procedure_name} disabled={isItemReadOnly} onChange={(event) => updateItemField('procedure_name', event.target.value)} />
                  </EditableField>
                  <EditableField label="Procedure code" isEditing={showItemFields} value={itemForm.procedure_code}>
                    <input value={itemForm.procedure_code} disabled={isItemReadOnly} onChange={(event) => updateItemField('procedure_code', event.target.value)} />
                  </EditableField>
                  <EditableField label="Price" isEditing={showItemFields} value={formatMoney(Number(itemForm.price || 0))}>
                    <input type="number" min="0" step="0.01" value={itemForm.price} disabled={isItemReadOnly} onChange={(event) => updateItemField('price', event.target.value)} />
                  </EditableField>
                  <EditableField label="Duration" isEditing={showItemFields} value={itemForm.duration_minutes ? `${itemForm.duration_minutes} min` : 'No duration'}>
                    <select value={itemForm.duration_minutes} disabled={isItemReadOnly} onChange={(event) => updateItemField('duration_minutes', event.target.value)}>
                      {durationOptions.map((option) => (
                        <option value={option} key={option}>{option || 'N/A'}</option>
                      ))}
                    </select>
                  </EditableField>
                  <EditableField label="Status" isEditing={showItemFields} value={itemForm.is_active ? 'Active' : 'Inactive'}>
                    <select value={itemForm.is_active ? 'active' : 'inactive'} disabled={isItemReadOnly} onChange={(event) => updateItemField('is_active', event.target.value === 'active')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </EditableField>
                  <EditableField className="wide-field" label="Description" isEditing={showItemFields} value={itemForm.description}>
                    <textarea value={itemForm.description} disabled={isItemReadOnly} onChange={(event) => updateItemField('description', event.target.value)} />
                  </EditableField>
                </div>}

                {canEditPriceLists && isCreatingItem && !selectedItem && (
                  <div className="practice-registration-actions">
                    <Button disabled={savingItem || !selectedPriceListId} onClick={saveItem}>
                      {savingItem ? 'Saving' : selectedItem ? 'Save Procedure' : 'Add Procedure'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Select or create a price list" description="Procedure line items are managed inside a saved price list." />
            )}
          </Card>

        </div>}
      </div>
    </div>
  )
}
