type UserAccountMenuProps = {
  displayName: string
  email?: string
  roleLabel: string
  workspaceName: string
  onLogout: () => void
}

function getInitials(displayName: string, email?: string) {
  const source = displayName || email || 'AlliDesk User'
  const words = source
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export function UserAccountMenu({ displayName, email, roleLabel, workspaceName, onLogout }: UserAccountMenuProps) {
  return (
    <details className="user-account-menu">
      <summary aria-label="Open account menu">
        <span className="user-account-avatar" aria-hidden="true">
          {getInitials(displayName, email)}
        </span>
        <span className="user-account-summary">
          <strong>{displayName}</strong>
          <small>{roleLabel}</small>
        </span>
      </summary>

      <div className="user-account-popover" role="menu">
        <div className="user-account-details">
          <span>User</span>
          <strong>{displayName}</strong>
          <small>{email ?? 'Email unavailable'}</small>
        </div>

        <div className="user-account-details">
          <span>Workspace</span>
          <strong>{workspaceName}</strong>
          <small>{roleLabel}</small>
        </div>

        <button type="button" className="account-menu-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </details>
  )
}
