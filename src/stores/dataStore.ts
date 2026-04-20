// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'
// import type { Category, Goal, Stage, Task, Metric, MetricEntry, Achievement } from '@/types'

// interface DataState {
//   categories: Category[]
//   goals: Goal[]
//   stages: Stage[]
//   tasks: Task[]
//   metrics: Metric[]
//   metricEntries: MetricEntry[]
//   achievements: Achievement[]
  
//   // Category actions
//   addCategory: (category: Omit<Category, '_id' | 'createdAt'>) => Category
//   updateCategory: (id: string, updates: Partial<Category>) => void
//   deleteCategory: (id: string) => void
  
//   // Goal actions
//   addGoal: (goal: Omit<Goal, '_id' | 'createdAt'>) => Goal
//   updateGoal: (id: string, updates: Partial<Goal>) => void
//   deleteGoal: (id: string) => void
  
//   // Stage actions
//   addStage: (stage: Omit<Stage, '_id'>) => Stage
//   updateStage: (id: string, updates: Partial<Stage>) => void
//   deleteStage: (id: string) => void
  
//   // Task actions
//   addTask: (task: Omit<Task, '_id'>) => Task
//   updateTask: (id: string, updates: Partial<Task>) => void
//   deleteTask: (id: string) => void
//   toggleTask: (id: string) => void
  
//   // Metric actions
//   addMetric: (metric: Omit<Metric, '_id' | 'createdAt'>) => Metric
//   updateMetric: (id: string, updates: Partial<Metric>) => void
//   deleteMetric: (id: string) => void
//   addMetricEntry: (entry: Omit<MetricEntry, '_id'>) => MetricEntry
//   deleteMetricEntry: (id: string) => void
  
//   // Achievement actions
//   addAchievement: (achievement: Omit<Achievement, '_id'>) => void
// }

// const generateId = () => Math.random().toString(36).substring(2, 15)

// const defaultCategories: Category[] = [
//   { _id: 'cat-1', name: 'Профессиональное', icon: 'Briefcase', color: '#3b82f6', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
//   { _id: 'cat-2', name: 'Финансы', icon: 'DollarSign', color: '#10b981', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
//   { _id: 'cat-3', name: 'Чтение', icon: 'BookOpen', color: '#8b5cf6', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
//   { _id: 'cat-4', name: 'Здоровье', icon: 'Heart', color: '#ef4444', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
//   { _id: 'cat-5', name: 'Языки', icon: 'Globe', color: '#f59e0b', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
//   { _id: 'cat-6', name: 'Хобби', icon: 'Palette', color: '#ec4899', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
//   { _id: 'cat-7', name: 'Личное', icon: 'User', color: '#6b7280', isDefault: true, createdAt: new Date(), goalCount: 0, taskCount: 0 },
// ]

// const demoGoals: Goal[] = [
//   {
//     _id: 'goal-1',
//     name: 'Найти работу',
//     categoryId: 'cat-1',
//     description: 'Найти работу мечты в IT сфере',
//     startDate: new Date('2024-01-01'),
//     deadlineType: 'specific_date',
//     deadlineValue: new Date('2024-06-30'),
//     status: 'in_progress',
//     priority: 5,
//     progressCalculation: 'by_tasks' as const,
//     createdAt: new Date(),
//   },
//   {
//     _id: 'goal-2',
//     name: 'Накопить на отпуск',
//     categoryId: 'cat-2',
//     description: 'Отложить 150 000 ₽ на отпуск',
//     startDate: new Date('2024-01-01'),
//     deadlineType: 'month_year',
//     deadlineValue: '2024-08',
//     status: 'in_progress',
//     priority: 4,
//     progressCalculation: 'by_metric',
//     progressMetricId: 'metric-1',
//     createdAt: new Date(),
//   },
//   {
//     _id: 'goal-3',
//     name: 'Прочитать 12 книг',
//     categoryId: 'cat-3',
//     description: 'Читать по одной книге в месяц',
//     startDate: new Date('2024-01-01'),
//     deadlineType: 'year',
//     deadlineValue: '2024',
//     status: 'in_progress',
//     priority: 3,
//     progressCalculation: 'by_metric',
//     progressMetricId: 'metric-2',
//     createdAt: new Date(),
//   },
// ]

// const demoStages: Stage[] = [
//   { _id: 'stage-1', name: 'Подготовка', goalId: 'goal-1', startDate: new Date('2024-01-01'), endDate: new Date('2024-02-01') },
//   { _id: 'stage-2', name: 'Поиск', goalId: 'goal-1', startDate: new Date('2024-02-01'), endDate: new Date('2024-04-01') },
// ]

// const demoTasks: Task[] = [
//   { _id: 'task-1', name: 'Update Portfolio', goalId: 'goal-1', stageId: 'stage-1', isPeriodBased: false, priority: 5, complexity: 3, weight: 1, completed: true, subtasks: [] },
//   { _id: 'task-2', name: 'Prepare Resume', goalId: 'goal-1', stageId: 'stage-1', isPeriodBased: false, priority: 5, complexity: 2, weight: 1, completed: true, subtasks: [] },
//   { _id: 'task-3', name: 'Register on LinkedIn', goalId: 'goal-1', stageId: 'stage-2', isPeriodBased: false, priority: 4, complexity: 1, weight: 1, completed: false, subtasks: [] },
//   { _id: 'task-4', name: 'Apply to 10 Jobs', goalId: 'goal-1', stageId: 'stage-2', isPeriodBased: false, priority: 5, complexity: 2, weight: 1, completed: false, subtasks: [] },
// ]

// const demoMetrics: Metric[] = [
//   {
//     _id: 'metric-1',
//     name: 'Savings',
//     type: 'counter',
//     description: 'Save money for vacation',
//     goalId: 'goal-2',
//     initialValue: 0,
//     targetValue: 150000,
//     unit: 'rub',
//     inputMode: 'manual',
//     periodicity: 'monthly',
//     color: '#10b981',
//     createdAt: new Date(),
//   },
//   {
//     _id: 'metric-2',
//     name: 'Books Read',
//     type: 'counter',
//     description: 'Number of books read',
//     goalId: 'goal-3',
//     initialValue: 0,
//     targetValue: 12,
//     unit: 'books',
//     inputMode: 'fixed_step',
//     stepValue: 1,
//     periodicity: 'monthly',
//     color: '#8b5cf6',
//     createdAt: new Date(),
//   },
//   {
//     _id: 'metric-3',
//     name: 'Reading',
//     type: 'habit',
//     description: 'Read 30 pages every day',
//     initialValue: 0,
//     targetValue: 30,
//     unit: 'pages',
//     inputMode: 'fixed_step',
//     stepValue: 30,
//     periodicity: 'daily',
//     color: '#f59e0b',
//     createdAt: new Date(),
//   },
// ]

// const demoMetricEntries: MetricEntry[] = [
//   { _id: 'entry-1', metricId: 'metric-1', value: 5000, finalValue: 5000, note: 'First deposit', timestamp: new Date('2024-01-01'), isAddition: true },
//   { _id: 'entry-2', metricId: 'metric-1', value: 10000, finalValue: 15000, note: 'Bonus', timestamp: new Date('2024-01-15'), isAddition: true },
//   { _id: 'entry-3', metricId: 'metric-2', value: 1, finalValue: 1, note: '1984', timestamp: new Date('2024-01-01'), isAddition: true },
//   { _id: 'entry-4', metricId: 'metric-2', value: 1, finalValue: 2, note: 'The Little Prince', timestamp: new Date('2024-01-10'), isAddition: true },
//   { _id: 'entry-5', metricId: 'metric-2', value: 1, finalValue: 3, note: 'Alice in Wonderland', timestamp: new Date('2024-01-20'), isAddition: true },
//   { _id: 'entry-6', metricId: 'metric-3', value: 1, finalValue: 1, note: 'Morning run', timestamp: new Date('2024-01-01'), isAddition: true },
//   { _id: 'entry-7', metricId: 'metric-3', value: 1, finalValue: 2, note: 'Evening workout', timestamp: new Date('2024-01-02'), isAddition: true },
//   { _id: 'entry-8', metricId: 'metric-3', value: 1, finalValue: 3, note: 'Park run', timestamp: new Date('2024-01-03'), isAddition: true },
// ]

// export { defaultCategories, demoGoals, demoStages, demoTasks, demoMetrics, demoMetricEntries }

// export const useDataStore = create<DataState>()(
//   persist(
//     (set) => ({
//       categories: defaultCategories,
//       goals: demoGoals,
//       stages: demoStages,
//       tasks: demoTasks,
//       metrics: demoMetrics,
//       metricEntries: demoMetricEntries,
//       achievements: [],

//       addCategory: (category) => {
//         const newCategory: Category = {
//           ...category,
//           _id: generateId(),
//           createdAt: new Date(),
//         }
//         set((state) => ({ categories: [...state.categories, newCategory] }))
//         return newCategory
//       },

//       updateCategory: (id, updates) => {
//         set((state) => ({
//           categories: state.categories.map((c) => (c._id === id ? { ...c, ...updates } : c)),
//         }))
//       },

//       deleteCategory: (id) => {
//         set((state) => ({
//           categories: state.categories.filter((c) => c._id !== id),
//         }))
//       },

//       addGoal: (goal) => {
//         const newGoal: Goal = {
//           ...goal,
//           _id: generateId(),
//           createdAt: new Date(),
//         }
//         set((state) => ({ goals: [...state.goals, newGoal] }))
//         return newGoal
//       },

//       updateGoal: (id, updates) => {
//         set((state) => ({
//           goals: state.goals.map((g) => (g._id === id ? { ...g, ...updates } : g)),
//         }))
//       },

//       deleteGoal: (id) => {
//         set((state) => ({
//           goals: state.goals.filter((g) => g._id !== id),
//           stages: state.stages.filter((s) => s.goalId !== id),
//           tasks: state.tasks.filter((t) => t.goalId !== id),
//           metrics: state.metrics.filter((m) => m.goalId !== id),
//         }))
//       },

//       addStage: (stage) => {
//         const newStage: Stage = {
//           ...stage,
//           _id: generateId(),
//         }
//         set((state) => ({ stages: [...state.stages, newStage] }))
//         return newStage
//       },

//       updateStage: (id, updates) => {
//         set((state) => ({
//           stages: state.stages.map((s) => (s._id === id ? { ...s, ...updates } : s)),
//         }))
//       },

//       deleteStage: (id) => {
//         set((state) => ({
//           stages: state.stages.filter((s) => s._id !== id),
//           tasks: state.tasks.filter((t) => t.stageId !== id),
//         }))
//       },

//       addTask: (task) => {
//         const newTask: Task = {
//           ...task,
//           _id: generateId(),
//         }
//         set((state) => ({ tasks: [...state.tasks, newTask] }))
//         return newTask
//       },

//       updateTask: (id, updates) => {
//         set((state) => ({
//           tasks: state.tasks.map((t) => (t._id === id ? { ...t, ...updates } : t)),
//         }))
//       },

//       deleteTask: (id) => {
//         set((state) => ({
//           tasks: state.tasks.filter((t) => t._id !== id),
//         }))
//       },

//       toggleTask: (id) => {
//         set((state) => ({
//           tasks: state.tasks.map((t) =>
//             t._id === id ? { ...t, completed: !t.completed } : t
//           ),
//         }))
//       },

//       addMetric: (metric) => {
//         const newMetric: Metric = {
//           ...metric,
//           _id: generateId(),
//           createdAt: new Date(),
//         }
//         set((state) => ({ metrics: [...state.metrics, newMetric] }))
//         return newMetric
//       },

//       updateMetric: (id, updates) => {
//         set((state) => ({
//           metrics: state.metrics.map((m) => (m._id === id ? { ...m, ...updates } : m)),
//         }))
//       },

//       deleteMetric: (id) => {
//         set((state) => ({
//           metrics: state.metrics.filter((m) => m._id !== id),
//           metricEntries: state.metricEntries.filter((e) => e.metricId !== id),
//         }))
//       },

//       addMetricEntry: (entry) => {
//         const newEntry: MetricEntry = {
//           ...entry,
//           _id: generateId(),
//           timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
//         }
//         set((state) => ({ metricEntries: [...state.metricEntries, newEntry] }))
//         return newEntry
//       },

//       deleteMetricEntry: (id) => {
//         set((state) => ({
//           metricEntries: state.metricEntries.filter((e) => e._id !== id),
//         }))
//       },

//       addAchievement: (achievement) => {
//         const newAchievement: Achievement = {
//           ...achievement,
//           _id: generateId(),
//         }
//         set((state) => ({ achievements: [...state.achievements, newAchievement] }))
//       },
//     }),
//     {
//       name: 'data-storage',
//     }
//   )
// )
