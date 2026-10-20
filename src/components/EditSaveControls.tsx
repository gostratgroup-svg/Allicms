import { PencilIcon, SaveIcon } from './icons'

export type EditSaveControlsProps = {
  isEditing: boolean
  isSaving?: boolean
  disabled?: boolean
  onEdit: () => void
  onSave: () => void
  editLabel?: string
  editTooltip?: string
  saveLabel?: string
}

// Shared control for forms that load locked, enter an explicit edit state, and save through their owning page.
export function EditSaveControls({
  isEditing,
  isSaving = false,
  disabled = false,
  onEdit,
  onSave,
  editLabel = 'Edit details',
  editTooltip = 'Edit',
  saveLabel = 'Save details',
}: EditSaveControlsProps) {
  return (
    <div className="ui-edit-save-controls">
      <button
        type="button"
        className={`ui-icon-action${isEditing ? ' is-active' : ''}`}
        aria-label={editLabel}
        title={editTooltip}
        disabled={disabled || isEditing || isSaving}
        onClick={onEdit}
      >
        <PencilIcon />
      </button>
      {isEditing && (
        <button
          type="button"
          className="ui-icon-action ui-icon-action-primary"
          aria-label={isSaving ? 'Saving details' : saveLabel}
          title={isSaving ? 'Saving details' : saveLabel}
          disabled={disabled || isSaving}
          onClick={onSave}
        >
          <SaveIcon />
        </button>
      )}
    </div>
  )
}
