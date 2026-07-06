import type { ReactNode } from 'react'

type AppShellProps = {
  topNotice?: string
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
  modals?: ReactNode
}

type SidebarProps = {
  children: ReactNode
}

type TopbarProps = {
  eyebrow: string
  title: string
  actions?: ReactNode
}

type MainContentProps = {
  children: ReactNode
}

export function AppShell({ topNotice, sidebar, topbar, children, modals }: AppShellProps) {
  return (
    <div className="app-shell">
      {topNotice && <div className="top-action-notice" role="status">{topNotice}</div>}
      <aside className="sidebar">{sidebar}</aside>
      <main>
        {topbar}
        {children}
      </main>
      {modals}
    </div>
  )
}

export function Sidebar({ children }: SidebarProps) {
  return <>{children}</>
}

export function Topbar({ eyebrow, title, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions}
    </header>
  )
}

export function MainContent({ children }: MainContentProps) {
  return <>{children}</>
}
