import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { GoalDetailPage } from '@/pages/GoalDetailPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAuthStore } from '@/stores/authStore'
import { useMongoStore } from '@/stores/mongoStore'
import { useEffect } from 'react'

const queryClient = new QueryClient()

function AppRoutes() {
  const { user } = useAuthStore()
  const { loading, error, loadData } = useMongoStore()

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  if (!user) {
    return <LoginPage />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading data: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:id" element={<GoalDetailPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  )
}

export default App
