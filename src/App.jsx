import { Routes, Route, Navigate } from 'react-router-dom'
import FitterView from './pages/FitterView'
import ClientProfileView from './pages/ClientProfileView'
import ClientsDashboard from './pages/ClientsDashboard'
import ClientHistoryView from './pages/ClientHistoryView'
import BookedConfirmation from './pages/BookedConfirmation'
import AuthGate from './components/AuthGate'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/new" replace />} />
      <Route path="/new" element={<FitterView />} />
      <Route
        path="/edit/:id"
        element={
          <AuthGate>
            <FitterView />
          </AuthGate>
        }
      />
      <Route path="/p/:id" element={<ClientProfileView />} />
      <Route path="/booked" element={<BookedConfirmation />} />
      <Route
        path="/clients"
        element={
          <AuthGate>
            <ClientsDashboard />
          </AuthGate>
        }
      />
      <Route
        path="/clients/:profileId"
        element={
          <AuthGate>
            <ClientHistoryView />
          </AuthGate>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center text-off-white">
      <div className="text-center">
        <p className="text-orange text-sm font-semibold tracking-widest uppercase mb-2">404</p>
        <p className="text-muted">That page doesn&apos;t exist.</p>
      </div>
    </div>
  )
}
