import { Link } from 'react-router-dom'
import { Card, StatusBadge } from './ui'

export type SectionHubItem = {
  title: string
  description: string
  status?: string
  to?: string
}

type SectionHubPageProps = {
  eyebrow: string
  title: string
  description: string
  sections: SectionHubItem[]
  ariaLabel: string
}

export function SectionHubPage({ eyebrow, title, description, sections, ariaLabel }: SectionHubPageProps) {
  return (
    <div className="section-hub">
      <Card className="section-hub-intro">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <StatusBadge tone="info">Static placeholder</StatusBadge>
      </Card>

      <section className="section-hub-grid" aria-label={ariaLabel}>
        {sections.map((section) => (
          section.to ? (
            <Link className="section-hub-card-link" to={section.to} key={section.title}>
              <Card className="section-hub-card">
                <div>
                  <span>{section.status ?? 'Ready for Phase 4'}</span>
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                </div>
                <StatusBadge tone="info">Open</StatusBadge>
              </Card>
            </Link>
          ) : (
            <Card className="section-hub-card" key={section.title}>
              <div>
                <span>{section.status ?? 'Ready for Phase 4'}</span>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
              <StatusBadge>Not connected</StatusBadge>
            </Card>
          )
        ))}
      </section>
    </div>
  )
}
