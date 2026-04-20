import { Target, CheckCircle, AlertCircle, Calendar, Clock, Trophy, TrendingUp, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApiDataStore } from '@/stores/apiDataStore'
import { ProgressBar } from './ProgressBar'
import { cn } from '@/lib/utils'
import type { Goal, Task, Metric } from '@/types'

interface DashboardWidgetsProps {
  className?: string
}

export function DashboardWidgets({ className }: DashboardWidgetsProps) {
  const navigate = useNavigate()
  const { goals, tasks, metrics } = useApiDataStore()

  // Calculate stats
  const stats = {
    inProgress: goals.filter(g => g.status === 'in_progress').length,
    completed: goals.filter(g => g.status === 'completed').length,
    overdue: goals.filter(g => g.status === 'overdue').length,
    planned: goals.filter(g => g.status === 'planned').length,
  }

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3)

  // Get upcoming goals (next 7 days)
  const upcomingGoals = goals
    .filter(g => g.status !== 'completed' && g.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3)

  // Get achievements
  const achievements = {
    habits: metrics.filter(m => m.type === 'habit' && m.currentStreak && m.currentStreak >= 10),
    counters: metrics.filter(m => m.type === 'counter' && m.progress && m.progress >= 50),
    tasks: tasks.filter(t => t.completed).slice(-10),
  }

  const StatWidget = ({ 
    title, 
    count, 
    icon: Icon, 
    color, 
    bgColor 
  }: { 
    title: string
    count: number
    icon: any
    color: string
    bgColor: string 
  }) => (
    <div className={cn('bg-white rounded-2xl p-4 shadow-sm border border-gray-100', bgColor)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{count}</div>
    </div>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Goal Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatWidget
            title="In Progress"
            count={stats.inProgress}
            icon={Target}
            color="text-blue-500"
            bgColor="bg-blue-50"
          />
          <StatWidget
            title="Completed"
            count={stats.completed}
            icon={CheckCircle}
            color="text-green-500"
            bgColor="bg-green-50"
          />
          <StatWidget
            title="Overdue"
            count={stats.overdue}
            icon={AlertCircle}
            color="text-red-500"
            bgColor="bg-red-50"
          />
          <StatWidget
            title="Planned"
            count={stats.planned}
            icon={Calendar}
            color="text-gray-500"
            bgColor="bg-gray-50"
          />
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
          <button
            onClick={() => navigate('/tasks')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{task.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {task.progress}%
                  </div>
                </div>
                <ProgressBar progress={task.progress} size="sm" className="mt-3" />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No upcoming tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Goals</h3>
          <button
            onClick={() => navigate('/goals')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {upcomingGoals.length > 0 ? (
            upcomingGoals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => navigate(`/goals/${goal.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{goal.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {goal.dueDate && new Date(goal.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {goal.progress}%
                  </div>
                </div>
                <ProgressBar progress={goal.progress} size="sm" className="mt-3" />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No upcoming goals</p>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
        <div className="space-y-4">
          {/* Habit Streaks */}
          {achievements.habits.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-gray-900">Habit Streaks</h4>
              </div>
              <div className="space-y-2">
                {achievements.habits.slice(0, 3).map((habit) => (
                  <div key={habit.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{habit.name}</span>
                    <span className="text-sm font-medium text-green-700">
                      {habit.currentStreak} day streak
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Counter Progress */}
          {achievements.counters.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Counter Progress</h4>
              </div>
              <div className="space-y-2">
                {achievements.counters.slice(0, 3).map((counter) => (
                  <div key={counter.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{counter.name}</span>
                    <span className="text-sm font-medium text-blue-700">
                      {counter.progress}% complete
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {achievements.tasks.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-gray-900">Completed Tasks</h4>
              </div>
              <div className="space-y-2">
                {achievements.tasks.slice(-3).reverse().map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{task.name}</span>
                    <span className="text-sm font-medium text-purple-700">
                      ✓ Done
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {achievements.habits.length === 0 && achievements.counters.length === 0 && achievements.tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No achievements yet. Keep working!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
