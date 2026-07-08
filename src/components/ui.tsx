import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

type ButtonProps = {
  children: ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  onClick?: () => void
}

type StatusBadgeProps = {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

type SearchBarProps = {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>

export function Card({ children, className = '', style }: CardProps) {
  return <section className={`ui-card ${className}`.trim()} style={style}>{children}</section>
}

export function Button({ children, className = '', type = 'button', variant = 'primary', disabled = false, onClick }: ButtonProps) {
  return (
    <button
      type={type}
      className={`ui-button ui-button-${variant} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`ui-status-badge ui-status-${tone}`}>{children}</span>
}

export function SearchBar({ label, value, placeholder = 'Search', onChange, ...inputProps }: SearchBarProps) {
  return (
    <label className="ui-search-bar">
      <span>{label}</span>
      <input
        {...inputProps}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
