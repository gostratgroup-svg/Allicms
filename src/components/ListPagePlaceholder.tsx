import { useState } from 'react'
import { Button, Card, SearchBar, StatusBadge } from './ui'

type ListPagePlaceholderProps = {
  title: string
  description: string
  searchPlaceholder: string
  emptyState: string
  primaryActionLabel?: string
}

export function ListPagePlaceholder({
  title,
  description,
  searchPlaceholder,
  emptyState,
  primaryActionLabel,
}: ListPagePlaceholderProps) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <Card className="list-page-placeholder">
      <div className="list-page-placeholder-header">
        <div>
          <span>List framework</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {primaryActionLabel && <Button>{primaryActionLabel}</Button>}
      </div>

      <div className="list-page-placeholder-toolbar">
        <SearchBar
          label="Search"
          value={searchValue}
          placeholder={searchPlaceholder}
          onChange={setSearchValue}
        />
        <StatusBadge tone="info">Static placeholder</StatusBadge>
      </div>

      <div className="list-page-placeholder-empty">
        <strong>{emptyState}</strong>
        <span>Live records will appear here when this module is connected to production data.</span>
      </div>
    </Card>
  )
}
