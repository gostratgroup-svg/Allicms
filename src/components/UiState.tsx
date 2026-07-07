import type { ReactNode } from 'react'

type UiStateProps = {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

function UiState({ eyebrow, title, description, actions, className = '' }: UiStateProps) {
  return (
    <section className={`ui-state-panel ${className}`.trim()}>
      {eyebrow && <p>{eyebrow}</p>}
      <h2>{title}</h2>
      <span>{description}</span>
      {actions && <div className="ui-state-actions">{actions}</div>}
    </section>
  )
}

export function LoadingState({ title = 'Loading', description = 'Please wait while AlliDesk prepares this area.' }: Partial<Pick<UiStateProps, 'title' | 'description'>>) {
  return <UiState eyebrow="Loading" title={title} description={description} className="loading-state-panel" />
}

export function EmptyState({ title, description, actions }: Pick<UiStateProps, 'title' | 'description' | 'actions'>) {
  return <UiState eyebrow="No data yet" title={title} description={description} actions={actions} />
}

export function ErrorState({ title = 'Something went wrong', description, actions }: Pick<UiStateProps, 'description' | 'actions'> & Partial<Pick<UiStateProps, 'title'>>) {
  return <UiState eyebrow="Error" title={title} description={description} actions={actions} className="error-state-panel" />
}

export function AccessDeniedState({ title = 'Access not allowed', description = 'Your current role does not include access to this workspace area yet.' }: Partial<Pick<UiStateProps, 'title' | 'description'>>) {
  return <UiState eyebrow="Access not allowed" title={title} description={description} className="access-denied-state-panel" />
}
