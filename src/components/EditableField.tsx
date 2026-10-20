import type { ReactNode } from 'react'

export type EditableFieldProps = {
  label: string
  isEditing: boolean
  value: ReactNode
  children: ReactNode
  emptyValue?: ReactNode
  className?: string
}

export function EditableField({
  label,
  isEditing,
  value,
  children,
  emptyValue = 'Not set',
  className = '',
}: EditableFieldProps) {
  if (isEditing) {
    return (
      <label className={className}>
        <span>{label}</span>
        {children}
      </label>
    )
  }

  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className={`ui-readonly-field ${className}`.trim()}>
      <span>{label}</span>
      <strong>{hasValue ? value : emptyValue}</strong>
    </div>
  )
}
