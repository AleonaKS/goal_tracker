import { create } from 'zustand'
import { 
  userService,
  categoryService,
  goalService,
  stageService,
  taskService,
  metricService,
  metricEntryService,
  achievementService
} from '@/services/mongoService'
import type {
  UserDocument,
  CategoryDocument,
  GoalDocument,
  StageDocument,
  TaskDocument,
  MetricDocument,
  MetricEntryDocument,
  AchievementDocument
} from '@/lib/mongodb'

interface MongoState {
  // Data
  users: UserDocument[]
  categories: CategoryDocument[]
  goals: GoalDocument[]
  stages: StageDocument[]
  tasks: TaskDocument[]
  metrics: MetricDocument[]
  metricEntries: MetricEntryDocument[]
  achievements: AchievementDocument[]
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Actions
  loadData: () => Promise<void>
  syncData: () => Promise<void>
  
  // User actions
  addUser: (user: Omit<UserDocument, '_id'>) => Promise<UserDocument>
  updateUser: (id: string, updates: Partial<UserDocument>) => Promise<boolean>
  
  // Category actions
  addCategory: (category: Omit<CategoryDocument, '_id'>) => Promise<CategoryDocument>
  updateCategory: (id: string, updates: Partial<CategoryDocument>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  
  // Goal actions
  addGoal: (goal: Omit<GoalDocument, '_id'>) => Promise<GoalDocument>
  updateGoal: (id: string, updates: Partial<GoalDocument>) => Promise<boolean>
  deleteGoal: (id: string) => Promise<boolean>
  
  // Stage actions
  addStage: (stage: Omit<StageDocument, '_id'>) => Promise<StageDocument>
  updateStage: (id: string, updates: Partial<StageDocument>) => Promise<boolean>
  deleteStage: (id: string) => Promise<boolean>
  
  // Task actions
  addTask: (task: Omit<TaskDocument, '_id'>) => Promise<TaskDocument>
  updateTask: (id: string, updates: Partial<TaskDocument>) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  toggleTask: (id: string) => Promise<boolean>
  
  // Metric actions
  addMetric: (metric: Omit<MetricDocument, '_id'>) => Promise<MetricDocument>
  updateMetric: (id: string, updates: Partial<MetricDocument>) => Promise<boolean>
  deleteMetric: (id: string) => Promise<boolean>
  addMetricEntry: (entry: Omit<MetricEntryDocument, '_id'>) => Promise<MetricEntryDocument>
  deleteMetricEntry: (id: string) => Promise<boolean>
  
  // Achievement actions
  addAchievement: (achievement: Omit<AchievementDocument, '_id'>) => Promise<AchievementDocument>
}

export const useMongoStore = create<MongoState>((set, get) => ({
  // Initial state
  users: [],
  categories: [],
  goals: [],
  stages: [],
  tasks: [],
  metrics: [],
  metricEntries: [],
  achievements: [],
  loading: false,
  error: null,

  // Load all data
  loadData: async () => {
    set({ loading: true, error: null })
    try {
      const [
        users,
        categories,
        goals,
        stages,
        tasks,
        metrics,
        metricEntries,
        achievements
      ] = await Promise.all([
        userService.find(),
        categoryService.find(),
        goalService.find(),
        stageService.find(),
        taskService.find(),
        metricService.find(),
        metricEntryService.find(),
        achievementService.find()
      ])

      set({
        users,
        categories,
        goals,
        stages,
        tasks,
        metrics,
        metricEntries,
        achievements,
        loading: false
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false 
      })
    }
  },

  // Sync data (reload from server)
  syncData: async () => {
    await get().loadData()
  },

  // User actions
  addUser: async (userData) => {
    try {
      const user = await userService.create(userData)
      set(state => ({
        users: [...state.users, user]
      }))
      return user
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create user' })
      throw error
    }
  },

  updateUser: async (id, updates) => {
    try {
      const success = await userService.update(id, updates)
      if (success) {
        set(state => ({
          users: state.users.map(user => 
            user._id === id ? { ...user, ...updates } : user
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update user' })
      return false
    }
  },

  // Category actions
  addCategory: async (categoryData) => {
    try {
      const category = await categoryService.create(categoryData)
      set(state => ({
        categories: [...state.categories, category]
      }))
      return category
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create category' })
      throw error
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const success = await categoryService.update(id, updates)
      if (success) {
        set(state => ({
          categories: state.categories.map(category => 
            category._id === id ? { ...category, ...updates } : category
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update category' })
      return false
    }
  },

  deleteCategory: async (id) => {
    try {
      const success = await categoryService.delete(id)
      if (success) {
        set(state => ({
          categories: state.categories.filter(category => category._id !== id)
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete category' })
      return false
    }
  },

  // Goal actions
  addGoal: async (goalData) => {
    try {
      const goal = await goalService.create(goalData)
      set(state => ({
        goals: [...state.goals, goal]
      }))
      return goal
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create goal' })
      throw error
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const success = await goalService.update(id, updates)
      if (success) {
        set(state => ({
          goals: state.goals.map(goal => 
            goal._id === id ? { ...goal, ...updates } : goal
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update goal' })
      return false
    }
  },

  deleteGoal: async (id) => {
    try {
      // Delete related data first
      await Promise.all([
        stageService.deleteMany({ goalId: id }),
        taskService.deleteMany({ goalId: id }),
        metricService.deleteMany({ goalId: id })
      ])
      
      const success = await goalService.delete(id)
      if (success) {
        set(state => ({
          goals: state.goals.filter(goal => goal._id !== id),
          stages: state.stages.filter(stage => stage.goalId !== id),
          tasks: state.tasks.filter(task => task.goalId !== id),
          metrics: state.metrics.filter(metric => metric.goalId !== id)
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete goal' })
      return false
    }
  },

  // Stage actions
  addStage: async (stageData) => {
    try {
      const stage = await stageService.create(stageData)
      set(state => ({
        stages: [...state.stages, stage]
      }))
      return stage
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create stage' })
      throw error
    }
  },

  updateStage: async (id, updates) => {
    try {
      const success = await stageService.update(id, updates)
      if (success) {
        set(state => ({
          stages: state.stages.map(stage => 
            stage._id === id ? { ...stage, ...updates } : stage
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update stage' })
      return false
    }
  },

  deleteStage: async (id) => {
    try {
      // Delete related tasks first
      await taskService.deleteMany({ stageId: id })
      
      const success = await stageService.delete(id)
      if (success) {
        set(state => ({
          stages: state.stages.filter(stage => stage._id !== id),
          tasks: state.tasks.filter(task => task.stageId !== id)
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete stage' })
      return false
    }
  },

  // Task actions
  addTask: async (taskData) => {
    try {
      const task = await taskService.create(taskData)
      set(state => ({
        tasks: [...state.tasks, task]
      }))
      return task
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task' })
      throw error
    }
  },

  updateTask: async (id, updates) => {
    try {
      const success = await taskService.update(id, updates)
      if (success) {
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === id ? { ...task, ...updates } : task
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task' })
      return false
    }
  },

  deleteTask: async (id) => {
    try {
      const success = await taskService.delete(id)
      if (success) {
        set(state => ({
          tasks: state.tasks.filter(task => task._id !== id)
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete task' })
      return false
    }
  },

  toggleTask: async (id) => {
    try {
      const { tasks } = get()
      const task = tasks.find(t => t._id === id)
      if (!task) return false

      const success = await taskService.update(id, { completed: !task.completed })
      if (success) {
        set(state => ({
          tasks: state.tasks.map(task => 
            task._id === id ? { ...task, completed: !task.completed } : task
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to toggle task' })
      return false
    }
  },

  // Metric actions
  addMetric: async (metricData) => {
    try {
      const metric = await metricService.create(metricData)
      set(state => ({
        metrics: [...state.metrics, metric]
      }))
      return metric
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create metric' })
      throw error
    }
  },

  updateMetric: async (id, updates) => {
    try {
      const success = await metricService.update(id, updates)
      if (success) {
        set(state => ({
          metrics: state.metrics.map(metric => 
            metric._id === id ? { ...metric, ...updates } : metric
          )
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update metric' })
      return false
    }
  },

  deleteMetric: async (id) => {
    try {
      // Delete related entries first
      await metricEntryService.deleteMany({ metricId: id })
      
      const success = await metricService.delete(id)
      if (success) {
        set(state => ({
          metrics: state.metrics.filter(metric => metric._id !== id),
          metricEntries: state.metricEntries.filter(entry => entry.metricId !== id)
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete metric' })
      return false
    }
  },

  addMetricEntry: async (entryData) => {
    try {
      const entry = await metricEntryService.create(entryData)
      set(state => ({
        metricEntries: [...state.metricEntries, entry]
      }))
      return entry
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create metric entry' })
      throw error
    }
  },

  deleteMetricEntry: async (id) => {
    try {
      const success = await metricEntryService.delete(id)
      if (success) {
        set(state => ({
          metricEntries: state.metricEntries.filter(entry => entry._id !== id)
        }))
      }
      return success
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete metric entry' })
      return false
    }
  },

  // Achievement actions
  addAchievement: async (achievementData) => {
    try {
      const achievement = await achievementService.create(achievementData)
      set(state => ({
        achievements: [...state.achievements, achievement]
      }))
      return achievement
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create achievement' })
      throw error
    }
  },
}))
