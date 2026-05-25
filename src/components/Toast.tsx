import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Trophy, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Toast {
  id: string
  type: 'points' | 'achievement' | 'level' | 'info'
  title: string
  message: string
  points?: number
  icon?: string
  duration?: number
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, toast.duration || 4000)
    
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const icons = {
    points: <Star className="w-5 h-5 text-yellow-500" />,
    achievement: <Trophy className="w-5 h-5 text-amber-500" />,
    level: <Sparkles className="w-5 h-5 text-purple-500" />,
    info: <Star className="w-5 h-5 text-blue-500" />
  }

  const gradients = {
    points: 'from-yellow-50 to-amber-50 border-yellow-200',
    achievement: 'from-amber-50 to-orange-50 border-amber-200',
    level: 'from-purple-50 to-pink-50 border-purple-200',
    info: 'from-blue-50 to-cyan-50 border-blue-200'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={cn(
        'min-w-[280px] max-w-[360px] rounded-xl border-2 shadow-lg',
        'bg-gradient-to-r p-4',
        gradients[toast.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-white rounded-full shadow-sm">
          {toast.icon ? (
            <span className="text-2xl">{toast.icon}</span>
          ) : (
            icons[toast.type]
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">
            {toast.title}
          </h4>
          <p className="text-sm text-gray-600 mt-0.5">
            {toast.message}
          </p>
          
          {toast.points !== undefined && toast.points > 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm font-medium text-yellow-700">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              +{toast.points} очков
            </div>
          )}
        </div>
        
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
          className={cn(
            'h-full rounded-full',
            toast.type === 'points' && 'bg-yellow-500',
            toast.type === 'achievement' && 'bg-amber-500',
            toast.type === 'level' && 'bg-purple-500',
            toast.type === 'info' && 'bg-blue-500'
          )}
        />
      </div>
    </motion.div>
  )
}

// Хук для использования toast-уведомлений
import { useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
    return id
  }, [])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  const showPoints = useCallback((points: number, action: string) => {
    addToast({
      type: 'points',
      title: 'Получены очки!',
      message: action,
      points,
      duration: 4000
    })
  }, [addToast])
  
  const showAchievement = useCallback((title: string, description: string, icon: string, points: number) => {
    addToast({
      type: 'achievement',
      title: `Достижение разблокировано: ${title}`,
      message: description,
      icon,
      points,
      duration: 6000
    })
  }, [addToast])
  
  const showLevelUp = useCallback((level: number, title: string) => {
    addToast({
      type: 'level',
      title: 'Новый уровень!',
      message: `Вы достигли уровня ${level}: ${title}`,
      duration: 5000
    })
  }, [addToast])
  
  return {
    toasts,
    addToast,
    removeToast,
    showPoints,
    showAchievement,
    showLevelUp,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemove={removeToast} />
  }
}
