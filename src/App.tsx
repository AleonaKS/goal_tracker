import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { GoalDetailPage } from '@/pages/GoalDetailPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAuthStore } from '@/stores/authStore'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAutoProgress } from '@/hooks/useAutoProgress'
import { useEffect, useState, useRef } from 'react'

// Обёртка макета для аутентифицированных маршрутов
function AuthenticatedLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

// Компонент экрана загрузки
function LoadingScreen({ authLoading }: { authLoading: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{authLoading ? 'Authenticating...' : 'Loading data...'}</p>
      </div>
    </div>
  )
}

// Компонент экрана ошибки
function ErrorScreen({ error }: { error: string }) {
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

function App() {
  const { user, isLoading: authLoading, isInitialized, initialize } = useAuthStore()
  const { error, fetchAll, setUser } = useApiDataStore()
  const { runAutoCalculations } = useAutoProgress()
  const hasLoadedData = useRef(false)

  // Инициализация аутентификации при монтировании
  useEffect(() => {
    initialize()
  }, [])

  // Синхронизация пользователя между сторами
  useEffect(() => {
    setUser(user)
  }, [user])

  // Загрузка данных при входе пользователя (с дедупликацией)
  useEffect(() => {
    if (user && !hasLoadedData.current) {
      hasLoadedData.current = true
      console.log('[App] Loading data for user:', user.email)
      fetchAll().then(() => {
        // Запуск автовычислений после загрузки данных
        runAutoCalculations()
      })
    }
  }, [user])
  
  // Показ загрузки во время инициализации
  if (!isInitialized) {
    return <LoadingScreen authLoading={true} />
  }

  // Показ загрузки во время аутентификации
  if (authLoading) {
    return <LoadingScreen authLoading={true} />
  }


  // Показ состояния ошибки
  if (error && user) {
    return <ErrorScreen error={error} />
  }

  return (
    <Routes>
      {/* Public routes - only accessible when not logged in */}
      {!user ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        /* Protected routes - only accessible when logged in */
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/goals/:id" element={<GoalDetailPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      )}
    </Routes>
  )
}

export default App
