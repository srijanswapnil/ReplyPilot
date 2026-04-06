import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import LandingPage   from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import AppLayout     from './layouts/AppLayout'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Authenticated — shared layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<DashboardPage />} />

        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
