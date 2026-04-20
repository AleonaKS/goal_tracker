import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export function Modal({ isOpen, onClose, title, children, className, size = 'medium' }: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-2xl'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={cn('modal-content', sizeClasses[size], className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
