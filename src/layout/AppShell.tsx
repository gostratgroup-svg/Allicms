import type { ReactNode } from 'react'

type AppShellProps = {
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
  eyebrowCase?: 'uppercase' | 'normal'
  title: string
  actions?: ReactNode
}

type MainContentProps = {
  children: ReactNode
}

export function AppShell({ sidebar, topbar, children, modals }: AppShellProps) {
  return (
    <div className="app-shell">
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

export function Topbar({ eyebrow, eyebrowCase = 'uppercase', title, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className={eyebrowCase === 'normal' ? 'normal-case' : undefined}>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions}
    </header>
  )
}

export function MainContent({ children }: MainContentProps) {
  return <>{children}</>
}
