import { Route, Routes } from 'react-router-dom'
import AppModeGuard from '../auth/AppModeGuard'
import { AuthProvider } from '../auth/AuthContext'
import { PatientLinkPortal } from '../pages/PatientLinkPortal'

export function RootRoutes() {
  return (
    <Routes>
      <Route path="/p/:publicIdentifier/*" element={<PatientLinkPortal />} />
      <Route
        path="*"
        element={(
          <AuthProvider>
            <AppModeGuard />
          </AuthProvider>
        )}
      />
    </Routes>
  )
}
