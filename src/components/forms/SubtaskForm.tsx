import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Subtask } from '@/types'

const subtaskSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  isCompleted: z.boolean().default(false),
  orderIndex: z.number().default(0)
})

interface SubtaskFormProps {
  taskId: string
  subtask?: Subtask
  onClose: () => void
}

export function SubtaskForm({ taskId, subtask, onClose }: SubtaskFormProps) {
  const { createSubtask, updateSubtask } = useApiDataStore()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(subtaskSchema),
    defaultValues: subtask || {
      title: '',
      isCompleted: false,
      orderIndex: 0
    }
  })

  const onSubmit = async (data: any) => {
    try {
      if (subtask) {
        await updateSubtask(subtask.id, data)
      } else {
        await createSubtask({
          ...data,
          taskId,
          userId: 'demo-user' // Will be replaced with actual user ID
        })
      }
      onClose()
    } catch (error) {
      console.error('Failed to save subtask:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {subtask ? 'Редактировать подзадачу' : 'Новая подзадача'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название *
            </label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите название подзадачи"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Порядок
              </label>
              <input
                {...register('orderIndex', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

          </div>

          <div className="flex items-center">
            <input
              {...register('isCompleted')}
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Выполнено
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {subtask ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
