import { useState, useMemo } from 'react'
import { Search, Calendar, Target, CheckCircle2, Circle, Plus, Clock, Filter } from 'lucide-react'
import { format, isToday, isPast, isFuture } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTask: (task: Task) => void
  onCreateNewTask: () => void
  selectedDate?: Date
}

export function TaskSelectorModal({ isOpen, onClose, onSelectTask, onCreateNewTask, selectedDate }: TaskSelectorModalProps) {
  const { tasks, goals, categories, updateTask } = useApiDataStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  // Фильтрация задач на основе поиска и фильтров
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Фильтрация по статусу выполнения
      if (!showCompleted && task.completed) return false
      
      // Фильтрация по поисковому запросу
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const nameMatch = task.name.toLowerCase().includes(query)
        const descriptionMatch = task.description?.toLowerCase().includes(query)
        const goalMatch = goals.find(g => g.id === task.goalId)?.name.toLowerCase().includes(query)
        if (!nameMatch && !descriptionMatch && !goalMatch) return false
      }
      
      // Фильтрация по цели
      if (selectedGoal !== 'all' && task.goalId !== selectedGoal) return false
      
      return true
    })
  }, [tasks, searchQuery, selectedGoal, showCompleted, goals])

  // Группировка задач по статусу
  const taskGroups = useMemo(() => {
    const groups = {
      unscheduled: [] as Task[], // Tasks without due date
      overdue: [] as Task[],     // Past tasks
      today: [] as Task[],       // Today's tasks
      upcoming: [] as Task[],    // Future tasks
      completed: [] as Task[],    // Completed tasks
    }

    filteredTasks.forEach(task => {
      if (task.completed) {
        groups.completed.push(task)
      } else if (!task.dueDate) {
        groups.unscheduled.push(task)
      } else {
        const dueDate = new Date(task.dueDate)
        if (isToday(dueDate)) {
          groups.today.push(task)
        } else if (isPast(dueDate)) {
          groups.overdue.push(task)
        } else {
          groups.upcoming.push(task)
        }
      }
    })

    return groups
  }, [filteredTasks])

  const handleSelectTask = (task: Task) => {
    // Если у задачи нет даты выполнения и есть выбранная дата, назначить её
    if (!task.dueDate && selectedDate) {
      updateTask(task.id, { dueDate: selectedDate })
    }
    onSelectTask(task)
    onClose()
  }

  const handleCreateNew = () => {
    onCreateNewTask()
    onClose()
  }

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.color || '#6b7280'
  }

  const getGoalName = (goalId?: string) => {
    const goal = goals.find(g => g.id === goalId)
    return goal?.name
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedDate ? `Выбор задач для ${format(selectedDate, 'd MMMM', { locale: ru })}` : 'Выбор задач'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все цели</option>
              {goals.map(goal => (
                <option key={goal.id} value={goal.id}>{goal.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Выполненные</span>
            </label>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Unscheduled Tasks */}
            {taskGroups.unscheduled.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Без даты ({taskGroups.unscheduled.length})
                </h3>
                <div className="space-y-2">
                  {taskGroups.unscheduled.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onSelect={() => handleSelectTask(task)}
                      getCategoryColor={getCategoryColor}
                      getGoalName={getGoalName}
                      showDate={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Tasks */}
            {taskGroups.overdue.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Просроченные ({taskGroups.overdue.length})
                </h3>
                <div className="space-y-2">
                  {taskGroups.overdue.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onSelect={() => handleSelectTask(task)}
                      getCategoryColor={getCategoryColor}
                      getGoalName={getGoalName}
                      showDate={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Tasks */}
            {taskGroups.today.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-blue-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Сегодня ({taskGroups.today.length})
                </h3>
                <div className="space-y-2">
                  {taskGroups.today.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onSelect={() => handleSelectTask(task)}
                      getCategoryColor={getCategoryColor}
                      getGoalName={getGoalName}
                      showDate={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Tasks */}
            {taskGroups.upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Предстоящие ({taskGroups.upcoming.length})
                </h3>
                <div className="space-y-2">
                  {taskGroups.upcoming.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onSelect={() => handleSelectTask(task)}
                      getCategoryColor={getCategoryColor}
                      getGoalName={getGoalName}
                      showDate={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {showCompleted && taskGroups.completed.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Выполненные ({taskGroups.completed.length})
                </h3>
                <div className="space-y-2">
                  {taskGroups.completed.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onSelect={() => handleSelectTask(task)}
                      getCategoryColor={getCategoryColor}
                      getGoalName={getGoalName}
                      showDate={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Задачи не найдены</h3>
                <p className="text-sm text-gray-500 mb-6">
                  {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'У вас пока нет задач'}
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Создать задачу
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Создать новую задачу
            </button>
            
            <div className="text-sm text-gray-500">
              Найдено задач: {filteredTasks.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Компонент карточки задачи
interface TaskCardProps {
  task: Task
  onSelect: () => void
  getCategoryColor: (categoryId?: string) => string
  getGoalName: (goalId?: string) => string | undefined
  showDate: boolean
}

function TaskCard({ task, onSelect, getCategoryColor, getGoalName, showDate }: TaskCardProps) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer group"
      style={{ borderLeftColor: getCategoryColor(task.categoryId), borderLeftWidth: '4px' }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          // Toggle completion logic could be added here
        }}
        className="flex-shrink-0"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-gray-900 truncate",
          task.completed && "line-through text-gray-500"
        )}>
          {task.name}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          {/* Goal badge */}
          {task.goalId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              <Target className="w-3 h-3" />
              {getGoalName(task.goalId)}
            </span>
          )}
          
          {/* Date */}
          {showDate && task.dueDate && (
            <span className="text-xs text-gray-500">
              {format(new Date(task.dueDate), 'd MMM', { locale: ru })}
            </span>
          )}

          {/* Priority */}
          <span className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium",
            task.priority === 1 && "bg-red-100 text-red-700",
            task.priority === 2 && "bg-orange-100 text-orange-700",
            task.priority === 3 && "bg-yellow-100 text-yellow-700",
            task.priority === 4 && "bg-green-100 text-green-700",
            task.priority === 5 && "bg-blue-100 text-blue-700"
          )}>
            {task.priority}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        {task.startTime && (
          <span>{task.startTime} {task.endTime && `- ${task.endTime}`}</span>
        )}
        {task.duration && (
          <span>{task.duration} мин</span>
        )}
      </div>
    </div>
  )
}
