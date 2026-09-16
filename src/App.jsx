import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { MainLayout } from "./layouts/MainLayout"
import { Login } from "@/features/auth/Login"
import { Dashboard } from "@/features/dashboard/Dashboard"
import { NewScreening } from "@/features/screening/NewScreening"
import { ScreeningHistory } from "@/features/screening/ScreeningHistory"
import { CaseList } from "@/features/cases/CaseList"
import { AuditLogs } from "@/features/audit/AuditLogs"

import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ScreeningDetail } from "@/features/screening/ScreeningDetail"
import { Profile } from "@/features/profile/Profile"
import { Settings } from "@/features/settings/Settings"
import { AdminConsole } from "@/features/admin/AdminConsole"
import { Notifications } from "@/features/notifications/Notifications"

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes (Wrapped in ProtectedRoute & MainLayout) */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/screenings" element={<ScreeningHistory />} />
            <Route path="/screenings/new" element={<NewScreening />} />
            <Route path="/screenings/:id" element={<ScreeningDetail />} />
            <Route path="/cases" element={<CaseList />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin" element={<AdminConsole />} />
            <Route path="/settings" element={<Settings />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
