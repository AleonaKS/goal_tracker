import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Trophy, Sparkles, Target, Zap, Star, Award, Flame } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from '@/lib/utils'
import { createCustomAchievement, POINTS_CONFIG } from '@/lib/gamification'
import { useApiDataStore } from '@/stores/apiDataStore'

const customAchievementSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(50, 'Максимум 50 символов'),
  description: z.string().min(1, 'Описание обязательно').max(200, 'Максимум 200 символов'),
  points: z.number().min(1, 'Минимум 1 очко').max(1000, 'Максимум 1000 очков'),
  icon: z.string().default('⭐'),
  targetValue: z.number().min(1).optional(),
  targetType: z.enum(['counter', 'habit', 'task', 'goal']).optional(),
})

type CustomAchievementFormData = z.infer<typeof customAchievementSchema>

const ICON_OPTIONS = [
  { icon: '⭐', label: 'Звезда', component: Star },
  { icon: '🏆', label: 'Трофей', component: Trophy },
  { icon: '🎯', label: 'Цель', component: Target },
  { icon: '⚡', label: 'Энергия', component: Zap },
  { icon: '🔥', label: 'Огонь', component: Flame },
  { icon: '🎖️', label: 'Медаль', component: Award },
  { icon: '💎', label: 'Алмаз' },
  { icon: '🚀', label: 'Ракета' },
  { icon: '👑', label: 'Корона' },
  { icon: '🎉', label: 'Праздник' },
]

const TARGET_TYPE_OPTIONS = [
  { value: 'counter', label: 'Счётчик', description: 'Достичь значения в счётчике' },
  { value: 'habit', label: 'Привычка', description: 'Поддержать серию привычки' },
  { value: 'task', label: 'Задача', description: 'Выполнить определённое количество задач' },
  { value: 'goal', label: 'Цель', description: 'Завершить цели' },
]

interface CustomAchievementFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CustomAchievementForm({ isOpen, onClose, onSuccess }: CustomAchievementFormProps) {
  const { user } = useApiDataStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('⭐')
  const [showTargetFields, setShowTargetFields] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<CustomAchievementFormData>({
    resolver: zodResolver(customAchievementSchema),
    defaultValues: {
      title: '',
      description: '',
      points: 50,
      icon: '⭐',
    }
  })

  const pointsValue = watch('points')

  const onSubmit = async (data: CustomAchievementFormData) => {
    if (!user?.id) return

    setIsSubmitting(true)
    try {
      const achievement = await createCustomAchievement(user.id, {
        title: data.title,
        description: data.description,
        points: data.points,
        icon: data.icon,
      })

      if (achievement) {
        reset()
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error('Failed to create achievement:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon)
    setValue('icon', icon)
  }

  const handleClose = () => {
    reset()
    setSelectedIcon('⭐')
    setShowTargetFields(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Создать достижение"
      size="large"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Icon Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Иконка достижения
          </label>
          <div className="flex flex-wrap gap-3">
            {ICON_OPTIONS.map(({ icon, label }) => (
              <button
                key={icon}
                type="button"
                onClick={() => handleIconSelect(icon)}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                  selectedIcon === icon
                    ? "bg-blue-500 text-white ring-2 ring-blue-300 scale-110"
                    : "bg-gray-100 hover:bg-gray-200"
                )}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название достижения
          </label>
          <input
            {...register('title')}
            type="text"
            placeholder="Например: Марафонец"
            className={cn(
              "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.title && "border-red-500"
            )}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Например: Пробежать 100 км за месяц"
            className={cn(
              "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none",
              errors.description && "border-red-500"
            )}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Points */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Очки за достижение
          </label>
          <div className="flex items-center gap-4">
            <input
              {...register('points', { valueAsNumber: true })}
              type="number"
              min={1}
              max={1000}
              className={cn(
                "w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500",
                errors.points && "border-red-500"
              )}
            />
            <div className="flex-1">
              <input
                type="range"
                min={1}
                max={500}
                value={pointsValue || 50}
                onChange={(e) => setValue('points', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Легко (1)</span>
                <span>Средне (100)</span>
                <span>Сложно (500)</span>
              </div>
            </div>
          </div>
          {errors.points && (
            <p className="mt-1 text-sm text-red-500">{errors.points.message}</p>
          )}
        </div>

        {/* Target Condition Toggle */}
        <div className="border-t pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showTargetFields}
              onChange={(e) => setShowTargetFields(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Добавить условие для получения
            </span>
          </label>
          <p className="text-xs text-gray-500 ml-8 mt-1">
            Опционально: автоматически выдавать при достижении цели
          </p>
        </div>

        {/* Target Fields */}
        {showTargetFields && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип цели
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TARGET_TYPE_OPTIONS.map(({ value, label, description }) => (
                  <label
                    key={value}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-300 transition-colors"
                  >
                    <input
                      {...register('targetType')}
                      type="radio"
                      value={value}
                      className="mt-1 w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Целевое значение
              </label>
              <input
                {...register('targetValue', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="Например: 10"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Например: 10 задач, 30 дней серии, 100 км
              </p>
            </div>
          </div>
        )}

        {/* Preset Achievements Inspiration */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Идеи для вдохновения
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { title: 'Ранние пташки', desc: 'Встать в 6 утра 5 дней подряд', icon: '🌅', points: 30 },
              { title: 'Книжный червь', desc: 'Прочитать 5 книг', icon: '📚', points: 75 },
              { title: 'Медитация', desc: 'Медитировать 30 дней', icon: '🧘', points: 100 },
              { title: 'Водный баланс', desc: 'Выпивать 2л воды 14 дней', icon: '💧', points: 40 },
            ].map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => {
                  setValue('title', preset.title)
                  setValue('description', preset.desc)
                  setValue('points', preset.points)
                  setSelectedIcon(preset.icon)
                  setValue('icon', preset.icon)
                }}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors text-left"
              >
                <span className="mr-1">{preset.icon}</span>
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Создать достижение
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
