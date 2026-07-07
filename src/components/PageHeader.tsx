import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type PageHeaderProps = {
  title: string
  description: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumbs.length > 0 && (
        <nav className="page-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((item) => (
              <li key={`${item.label}-${item.to ?? 'current'}`}>
                {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="page-header-main">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  )
}
