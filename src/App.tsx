import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AppGate } from './features/session/AppGate'
import { AuthProvider } from './features/session/AuthProvider'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { JoinPage, PairPage } from './pages/PairPage'
import { LoginPage, SetupPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { SignalPage } from './pages/SignalPage'
import { WelcomePage } from './pages/WelcomePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppGate />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/pair" element={<PairPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/signal" element={<SignalPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
