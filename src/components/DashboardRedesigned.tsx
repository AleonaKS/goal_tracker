import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronUp,
  Flame,
  TrendingUp,
  CheckCircle,
  Clock,
  Trophy,
  Tag,
  List,
  Calendar,
  Star,
  Target,
  BarChart3
} from 'lucide-react';
import { useApiDataStore } from '@/stores/apiDataStore';
import { Goal, Task, Metric } from '@/types';

interface DeadlineItem {
  id: string;
  title: string;
  date: Date;
  daysLeft: number;
  type: 'goal' | 'task' | 'habit' | 'counter';
  goalId?: string;
  taskId?: string;
  metricId?: string;
  progress?: number;
  category?: string;
  color?: string;
  status?: string;
}

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  icon: string;
  date: Date;
  type: 'habit_streak' | 'counter_progress' | 'completed_task';
  color?: string;
  value?: number;
}

const DashboardRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'habits' | 'counters' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  const { 
    goals, 
    tasks, 
    metrics, 
    metricEntries,
    isLoading: dataLoading 
  } = useApiDataStore();

  useEffect(() => {
    if (!dataLoading) {
      processDashboardData();
    }
  }, [goals, tasks, metrics, metricEntries, dataLoading]);

  const processDashboardData = () => {
    const now = new Date();
    const deadlineItems: DeadlineItem[] = [];

    // Process goals with deadlines
    goals?.forEach((goal: Goal) => {
      if (goal.dueDate || goal.deadlineType !== 'none') {
        let deadline: Date | null = null;
        
        if (goal.dueDate) {
          deadline = new Date(goal.dueDate);
        } else if (goal.deadlineType === 'specific_date' && goal.deadlineValue instanceof Date) {
          deadline = goal.deadlineValue;
        } else if (goal.deadlineType === 'month_year' && typeof goal.deadlineValue === 'string') {
          const [year, month] = goal.deadlineValue.split('-').map(Number);
          deadline = new Date(year, month - 1, 0);
        } else if (goal.deadlineType === 'year' && typeof goal.deadlineValue === 'string') {
          deadline = new Date(parseInt(goal.deadlineValue), 11, 31);
        }
        
        if (deadline) {
          const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let status = 'planned';
          if (goal.status === 'completed') status = 'completed';
          else if (daysLeft < 0) status = 'overdue';
          else if (goal.status === 'in_progress') status = 'in_progress';
          
          deadlineItems.push({
            id: goal.id,
            title: goal.name || 'Untitled Goal',
            date: deadline,
            daysLeft,
            type: 'goal',
            goalId: goal.id,
            progress: goal.progress || 0,
            category: goal.categoryId,
            color: 'blue',
            status
          });
        }
      }
    });

    // Sort by date (nearest first)
    deadlineItems.sort((a, b) => a.date.getTime() - b.date.getTime());
    setDeadlines(deadlineItems);

    // Generate achievements
    generateAchievements();
    setLoading(false);
  };

  const generateAchievements = () => {
    const achievementItems: AchievementItem[] = [];
    
    // Calculate metrics stats
    const metricsWithStats = metrics.map(metric => {
      const entries = metricEntries.filter(e => e.metricId === metric.id);
      const totalValue = entries.reduce((sum, entry) => sum + entry.value, 0);
      const progress = metric.targetValue > 0 ? Math.round((totalValue / metric.targetValue) * 100) : 0;
      
      return {
        ...metric,
        totalValue,
        progress,
        currentStreak: 0, // TODO: Calculate actual streak
        maxStreak: 0, // TODO: Calculate actual max streak
      };
    });

    // Habit streaks
    const habitAchievements = metricsWithStats
      .filter(m => m.type === 'habit' && m.currentStreak > 0)
      .map(m => ({
        id: m.id,
        type: 'habit_streak' as const,
        title: `Habit Streak: ${m.currentStreak} days`,
        description: m.name,
        subtitle: 'Habit',
        icon: 'Fire',
        date: new Date(),
        color: 'orange',
        value: m.currentStreak,
      }));

    // Counter progress
    const counterAchievements = metricsWithStats
      .filter(m => m.type === 'counter' && m.progress > 0)
      .map(m => ({
        id: m.id,
        type: 'counter_progress' as const,
        title: m.name,
        description: `${m.progress}% progress`,
        subtitle: 'Counter',
        icon: 'TrendingUp',
        date: new Date(),
        color: 'blue',
        value: m.progress,
      }));

    // Completed tasks
    const completedTasks = tasks?.filter((t: Task) => t.completed).slice(-10).reverse() || [];
    const taskAchievements = completedTasks.map((task: Task) => ({
      id: task.id,
      type: 'completed_task' as const,
      title: 'Task Completed',
      description: task.name || 'Task',
      subtitle: 'Task',
      icon: 'CheckCircle',
      date: new Date(task.completedAt || Date.now()),
      color: 'green'
    }));

    setAchievements([
      ...habitAchievements,
      ...counterAchievements,
      ...taskAchievements,
    ].slice(0, 10));
  };

  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const getDaysLeftText = (daysLeft: number) => {
    if (daysLeft < 0) return `Overdue by ${Math.abs(daysLeft)} days`;
    if (daysLeft === 0) return 'Today';
    if (daysLeft === 1) return 'Tomorrow';
    if (daysLeft <= 7) return `${daysLeft} days left`;
    return `${daysLeft} days left`;
  };

  const getStatusColor = (status: string, daysLeft: number) => {
    if (status === 'completed') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' };
    if (status === 'overdue' || daysLeft < 0) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' };
    if (status === 'in_progress') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' };
  };

  const getMonthShort = (date: Date) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months[date.getMonth()];
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'overdue': 'Overdue',
      'planned': 'Planned'
    };
    return labels[status] || status;
  };

  const handleDeadlineClick = (deadline: DeadlineItem) => {
    if (deadline.type === 'goal' && deadline.goalId) {
      navigate(`/goals/${deadline.goalId}`);
    } else if (deadline.type === 'task' && deadline.taskId) {
      navigate(`/tasks/${deadline.taskId}`);
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleGoalClick = (goalId: string) => {
    navigate(`/goals/${goalId}`);
  };

  const handleMetricClick = (metricId: string) => {
    navigate(`/metrics/${metricId}`);
  };

  // Get filtered achievements
  const getFilteredAchievements = () => {
    switch (achievementFilter) {
      case 'habits':
        return achievements.filter(a => a.type === 'habit_streak');
      case 'counters':
        return achievements.filter(a => a.type === 'counter_progress');
      case 'completed':
        return achievements.filter(a => a.type === 'completed_task');
      default:
        return achievements;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredAchievements = getFilteredAchievements();
  const stats = {
    inProgress: goals?.filter(g => g.status === 'in_progress').length || 0,
    completed: goals?.filter(g => g.status === 'completed').length || 0,
    overdue: goals?.filter(g => {
      if (!g.dueDate) return false;
      return new Date(g.dueDate) < new Date() && g.status !== 'completed';
    }).length || 0,
    planned: goals?.filter(g => g.status === 'planned').length || 0,
  };

  return (
    <div className="space-y-6 pb-24 p-4">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats - 4 cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* In Progress */}
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.inProgress}</div>
          <div className="text-sm opacity-90">In Progress</div>
        </div>
        
        {/* Completed */}
        <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.completed}</div>
          <div className="text-sm opacity-90">Completed</div>
        </div>
        
        {/* Overdue */}
        <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Tag className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.overdue}</div>
          <div className="text-sm opacity-90">Overdue</div>
        </div>
        
        {/* Planned */}
        <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats.planned}</div>
          <div className="text-sm opacity-90">Planned</div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Deadlines</h2>
        
        {deadlines.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.slice(0, 3).map((deadline) => {
              const colors = getStatusColor(deadline.status || 'planned', deadline.daysLeft);
              const isExpanded = expandedGoals.has(deadline.id);
              
              return (
                <div key={deadline.id} className={`rounded-xl border-2 overflow-hidden transition-all ${colors.border} ${colors.bg}`}>
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      if (deadline.type === 'goal') {
                        toggleGoalExpansion(deadline.id)
                      } else {
                        handleDeadlineClick(deadline)
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Date square */}
                      <div className="bg-white rounded-xl p-3 text-center min-w-[60px] shadow-sm">
                        <div className="text-xs font-bold uppercase text-gray-500">
                          {getMonthShort(deadline.date)}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {deadline.date.getDate()}
                        </div>
                      </div>
                      
                      {/* Title, status and progress */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{deadline.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} ${colors.text}`}>
                            {getStatusLabel(deadline.status || 'planned')}
                          </span>
                          <span className="text-sm text-gray-600">
                            {getDaysLeftText(deadline.daysLeft)}
                          </span>
                        </div>
                        
                        {/* Progress bar for goals */}
                        {deadline.type === 'goal' && deadline.progress !== undefined && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-white rounded-full h-2 shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${deadline.progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{deadline.progress}%</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Expand icon for goals */}
                      {deadline.type === 'goal' && (
                        <button 
                          className="p-2 hover:bg-white/50 rounded-full transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGoalExpansion(deadline.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Achievements with filters */}
      {achievements.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Achievements</h2>
          
          {/* Filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All', icon: Trophy },
              { id: 'habits', label: 'Habits', icon: Flame },
              { id: 'counters', label: 'Counters', icon: BarChart3 },
              { id: 'completed', label: 'Completed', icon: CheckCircle }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setAchievementFilter(filter.id as typeof achievementFilter)}
                className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  achievementFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <filter.icon className="h-4 w-4" />
                {filter.label}
              </button>
            ))}
          </div>
          
          <div className="space-y-3">
            {filteredAchievements.map((achievement) => (
              <div 
                key={achievement.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (achievement.type === 'habit_streak' || achievement.type === 'counter_progress') {
                    handleMetricClick(achievement.id);
                  } else if (achievement.type === 'completed_task') {
                    handleTaskClick(achievement.id);
                  }
                }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  achievement.color === 'orange' ? 'bg-orange-100' :
                  achievement.color === 'blue' ? 'bg-blue-100' :
                  achievement.color === 'green' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {achievement.icon === 'Fire' && <Flame className="h-6 w-6 text-orange-500" />}
                  {achievement.icon === 'TrendingUp' && <TrendingUp className="h-6 w-6 text-blue-500" />}
                  {achievement.icon === 'CheckCircle' && <CheckCircle className="h-6 w-6 text-green-500" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  {achievement.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{achievement.subtitle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRedesigned;
