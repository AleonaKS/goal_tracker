import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface FieldErrorModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

export function FieldErrorModal({ isOpen, message, onClose }: FieldErrorModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className="bg-red-50 border border-red-200 rounded-xl shadow-xl p-4 max-w-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">Ошибка валидации</p>
          <p className="text-sm text-red-600 mt-1">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  )
}
