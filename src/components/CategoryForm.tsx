import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { categorySchema } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryFormProps {
  initialData?: Category
  onSubmit: () => void
  onCancel: () => void
}

export function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
  const { createCategory, updateCategory } = useApiDataStore()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      icon: 'folder',
      color: '#3b82f6',
      isDefault: false,
    },
  })

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ]

  const icons = [
    'folder', 'briefcase', 'heart', 'star', 'target', 'book', 'code', 'music',
    'camera', 'gamepad', 'plane', 'home', 'car', 'shopping-bag', 'dumbbell'
  ]

  const onFormSubmit = (data: z.infer<typeof categorySchema>) => {
    if (initialData) {
      updateCategory(initialData.id, data)
    } else {
      createCategory(data)
    }
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          {...register('name')}
          type="text"
          className="input-field"
          placeholder="Category name"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          className="input-field"
          rows={3}
          placeholder="Optional description"
        />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Icon
        </label>
        <select {...register('icon')} className="input-field">
          {icons.map(icon => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
        {errors.icon && (
          <p className="text-red-500 text-xs mt-1">{errors.icon.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <div className="grid grid-cols-5 gap-2">
          {colors.map(color => (
            <label key={color} className="relative">
              <input
                {...register('color')}
                type="radio"
                value={color}
                className="sr-only"
              />
              <div
                className={cn(
                  'w-8 h-8 rounded-full cursor-pointer border-2 transition-colors',
                  'hover:border-gray-400',
                  'checked:border-gray-900'
                )}
                style={{ backgroundColor: color }}
              />
            </label>
          ))}
        </div>
        {errors.color && (
          <p className="text-red-500 text-xs mt-1">{errors.color.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          {initialData ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
