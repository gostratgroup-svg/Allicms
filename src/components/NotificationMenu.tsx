export function NotificationMenu() {
  return (
    <details className="notification-menu">
      <summary aria-label="Open notifications">
        <span className="notification-bell" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
            <path d="M9.5 20a2.7 2.7 0 0 0 5 0" />
          </svg>
        </span>
      </summary>

      <div className="notification-popover" role="menu">
        <div className="notification-popover-header">
          <strong>Notifications</strong>
          <span>Framework placeholder</span>
        </div>
        <div className="notification-empty-state">
          <strong>No notifications yet.</strong>
          <span>Live alerts, reminders and communication updates will appear here later.</span>
        </div>
      </div>
    </details>
  )
}
