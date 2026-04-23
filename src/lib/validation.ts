import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const categorySchema = z.object({
  name: z.string().min(1, 'Введите название категории').max(50, 'Максимум 50 символов'),
  description: z.string().max(200, 'Максимум 200 символов').optional(),
  icon: z.string().min(1, 'Выберите иконку'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Введите корректный цвет в формате HEX'),
})

export type CategoryFormData = z.infer<typeof categorySchema>

export const goalSchema = z.object({
  name: z.string().min(1, 'Введите название цели').max(100, 'Максимум 100 символов'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
  startDate: z.date().optional(),
  deadlineType: z.enum(['none', 'month_year', 'year', 'specific_date']),
  deadlineValue: z.union([z.string(), z.date()]).optional(),
  priority: z.number().min(1).max(5),
  progressCalculation: z.enum(['by_tasks', 'by_metric']),
  progressMetricId: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'overdue', 'planned', 'frozen']).optional(),
  isFrozen: z.boolean().default(false),
  autoCalculateStatus: z.boolean().default(true),
})

export type GoalFormData = z.infer<typeof goalSchema>

export const stageSchema = z.object({
  name: z.string().min(1, 'Введите название этапа').max(100, 'Максимум 100 символов'),
  goalId: z.string(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate
  }
  return true
}, {
  message: 'Дата завершения должна быть позже даты начала',
  path: ['endDate'],
})

export type StageFormData = z.infer<typeof stageSchema>

export const taskSchema = z.object({
  name: z.string().min(1, 'Введите название задачи').max(100, 'Максимум 100 символов'),
  goalId: z.string(),
  stageId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  isPeriodBased: z.boolean(),
  priority: z.number().min(1).max(5),
  complexity: z.number().min(1).max(5),
  weight: z.number().min(0.1).max(10),
  // Time blocking fields - allow null/undefined
  duration: z.number().min(1).max(480).nullable().optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Формат: HH:mm').nullable().optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Формат: HH:mm').nullable().optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>

export const subtaskSchema = z.object({
  name: z.string().min(1, 'Введите название подзадачи').max(100, 'Максимум 100 символов'),
})

export type SubtaskFormData = z.infer<typeof subtaskSchema>

export const metricSchema = z.object({
  name: z.string().min(1, 'Введите название метрики').max(100, 'Максимум 100 символов'),
  type: z.enum(['habit', 'counter']),
  description: z.string().max(500, 'Максимум 500 символов').optional(),
  categoryId: z.string().min(1, 'Выберите категорию'),
  goalId: z.string().optional(),
  initialValue: z.number().min(0).default(0),
  targetValue: z.number().min(0).optional().default(100),
  unit: z.string().optional().default(''),
  inputMode: z.enum(['fixed_step', 'manual']),
  stepValue: z.number().min(0).optional(),
  periodicity: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'every_n_days', 'weekdays']),
  nDays: z.number().min(1).optional(),
  weekdays: z.array(z.number().min(0).max(6)).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Введите корректный цвет'),
  // Auto-reset and target increase
  autoResetEnabled: z.boolean().default(false),
  resetPeriodicity: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  resetDayOfWeek: z.number().min(0).max(6).optional(),
  resetDayOfMonth: z.number().min(1).max(31).optional(),
  resetMonthOfYear: z.number().min(1).max(12).optional(),
  // Target increase
  targetIncreaseEnabled: z.boolean().default(false),
  targetIncreaseValue: z.number().min(0).optional(),
  targetIncreasePeriodicity: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
}).refine((data) => {
  if (data.inputMode === 'fixed_step' && !data.stepValue) {
    return false
  }
  return true
}, {
  message: 'Укажите шаг изменения',
  path: ['stepValue'],
}).refine((data) => {
  if (data.periodicity === 'every_n_days' && !data.nDays) {
    return false
  }
  return true
}, {
  message: 'Укажите количество дней',
  path: ['nDays'],
}).refine((data) => {
  if (data.periodicity === 'weekdays' && (!data.weekdays || data.weekdays.length === 0)) {
    return false
  }
  return true
}, {
  message: 'Выберите хотя бы один день недели',
  path: ['weekdays'],
})

export type MetricFormData = z.infer<typeof metricSchema>

export const metricEntrySchema = z.object({
  metricId: z.string(),
  value: z.number(),
  finalValue: z.number(),
  note: z.string().max(200, 'Максимум 200 символов').optional(),
  timestamp: z.date(),
  isAddition: z.boolean(),
})

export type MetricEntryFormData = z.infer<typeof metricEntrySchema>

export const unitSchema = z.object({
  value: z.string().min(1, 'Введите обозначение').max(10, 'Максимум 10 символов'),
  label: z.string().min(1, 'Введите название').max(50, 'Максимум 50 символов'),
})

export type UnitFormData = z.infer<typeof unitSchema>

export const settingsSchema = z.object({
  monthYearHandling: z.enum(['start', 'end']),
  yearHandling: z.enum(['start', 'end']),
})

export type SettingsFormData = z.infer<typeof settingsSchema>
