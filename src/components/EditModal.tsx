import { useState } from 'react'
import { Modal } from './Modal'
import { GoalForm } from './forms/GoalForm'
import { TaskForm } from './forms/TaskForm'
import { MetricForm } from './forms/MetricForm'
import type { Goal, Task, Metric } from '@/types'

type EditableEntity = Goal | Task | Metric
type EntityType = 'goal' | 'task' | 'metric'

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  entity: EditableEntity
  entityType: EntityType
  additionalData?: {
    goalId?: string
    stageId?: string
  }
}

export function EditModal({ isOpen, onClose, entity, entityType, additionalData }: EditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    setIsSubmitting(true)
    // Отправка формы обрабатывается компонентами формы
    setTimeout(() => {
      setIsSubmitting(false)
      onClose()
    }, 500)
  }

  const renderForm = () => {
    switch (entityType) {
      case 'goal':
        return (
          <GoalForm
            initialData={entity as Goal}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )
      case 'task':
        return (
          <TaskForm
            goalId={additionalData?.goalId || ''}
            stageId={additionalData?.stageId}
            initialData={entity as Task}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )
      case 'metric':
        return (
          <MetricForm
            initialData={entity as Metric}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )
      default:
        return null
    }
  }

  const getTitle = () => {
    const action = entity.id ? 'Edit' : 'Create'
    const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1)
    return `${action} ${entityName}`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="large"
    >
      <div className="max-h-[80vh] overflow-y-auto">
        {renderForm()}
      </div>
    </Modal>
  )
}
