import type { AppNotice } from '../lib/appNotice'

type TopbarNoticeProps = {
  notice: AppNotice | null
  onDismiss: () => void
}

export function TopbarNotice({ notice, onDismiss }: TopbarNoticeProps) {
  if (!notice) return null

  return (
    <div className={`topbar-notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <span>{notice.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notice" title="Dismiss">x</button>
    </div>
  )
}
