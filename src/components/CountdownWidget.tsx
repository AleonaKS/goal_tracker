import { useState, useEffect, useMemo, useCallback } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, format, isPast, isToday, addDays, addYears } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, X, Edit2, Trash2, Calendar, Clock, Target, PartyPopper, Gift, Trophy, Plane, Heart, Sparkles, Loader2 } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/supabase-api'

interface CountdownEventUI {
  id: string
  title: string
  date: Date
  icon: 'party' | 'gift' | 'trophy' | 'plane' | 'heart' | 'target' | 'calendar'
  color: string
  isRecurring?: boolean
  recurringType?: 'yearly' | 'monthly' | 'weekly'
}

const PRESET_EVENTS: Omit<CountdownEventUI, 'id' | 'date'>[] = [
  { title: 'Новый Год', icon: 'party', color: '#ef4444', isRecurring: true, recurringType: 'yearly' },
  { title: 'День рождения', icon: 'gift', color: '#f59e0b' },
  { title: 'Отпуск', icon: 'plane', color: '#3b82f6' },
  { title: 'Чемпионат мира', icon: 'trophy', color: '#10b981' },
]

const ICONS = {
  party: PartyPopper,
  gift: Gift,
  trophy: Trophy,
  plane: Plane,
  heart: Heart,
  target: Target,
  calendar: Calendar,
}

function calculateTimeLeft(targetDate: Date): {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
  isToday: boolean
} {
  const now = new Date()
  
  if (isPast(targetDate) && !isToday(targetDate)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true, isToday: false }
  }
  
  if (isToday(targetDate)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: false, isToday: true }
  }
  
  const days = differenceInDays(targetDate, now)
  const hours = differenceInHours(targetDate, now) % 24
  const minutes = differenceInMinutes(targetDate, now) % 60
  const seconds = differenceInSeconds(targetDate, now) % 60
  
  const totalSeconds = differenceInSeconds(targetDate, now)
  
  return { days, hours, minutes, seconds, totalSeconds, isExpired: false, isToday: false }
}

function parseEventColor(colorString?: string): string {
  if (!colorString) return '#3b82f6'
  const colors: Record<string, string> = {
    'blue': '#3b82f6',
    'green': '#10b981',
    'red': '#ef4444',
    'yellow': '#f59e0b',
    'purple': '#8b5cf6',
    'pink': '#ec4899',
    'orange': '#f97316',
    'teal': '#14b8a6',
    'indigo': '#6366f1',
  }
  return colors[colorString] || colorString
}

function mapIconToString(icon: string): CountdownEventUI['icon'] {
  const iconMap: Record<string, CountdownEventUI['icon']> = {
    'party': 'party',
    'gift': 'gift',
    'trophy': 'trophy',
    'plane': 'plane',
    'heart': 'heart',
    'target': 'target',
    'calendar': 'calendar',
    'deadline': 'calendar',
    'reminder': 'calendar',
    'milestone': 'trophy'
  }
  return iconMap[icon] || 'calendar'
}

export function CountdownWidget() {
  const { user } = useApiDataStore()
  const [events, setEvents] = useState<CountdownEventUI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CountdownEventUI | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    icon: 'calendar' as CountdownEventUI['icon'],
    color: '#3b82f6',
    isRecurring: false,
    recurringType: 'yearly' as 'yearly' | 'monthly' | 'weekly'
  })
  const [now, setNow] = useState(new Date())
  const [isSaving, setIsSaving] = useState(false)

  // Load events from database
  const loadEvents = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const dbEvents = await getCalendarEvents(user.id)
      
      // Convert CalendarEvent to CountdownEventUI
      const mappedEvents: CountdownEventUI[] = dbEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: e.eventDate,
        icon: mapIconToString(e.eventType),
        color: parseEventColor(e.color),
        isRecurring: e.eventType === 'countdown'
      }))
      
      setEvents(mappedEvents)
    } catch (error) {
      console.error('Failed to load countdown events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Add recurring events for next occurrence
  useEffect(() => {
    const recurringEvents = events.filter(e => e.isRecurring && e.recurringType === 'yearly' && isPast(e.date) && !isToday(e.date))
    
    if (recurringEvents.length > 0) {
      recurringEvents.forEach(event => {
        const newDate = addYears(event.date, 1)
        if (isPast(newDate)) {
          updateCalendarEvent(event.id, { eventDate: addYears(newDate, 1) })
        } else {
          updateCalendarEvent(event.id, { eventDate: newDate })
        }
      })
      loadEvents()
    }
  }, [events, loadEvents])

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !formData.title || !formData.date) return
    
    setIsSaving(true)
    try {
      const eventColor = Object.entries({
        'blue': '#3b82f6',
        'green': '#10b981',
        'red': '#ef4444',
        'yellow': '#f59e0b',
        'purple': '#8b5cf6',
        'pink': '#ec4899',
        'orange': '#f97316',
        'teal': '#14b8a6',
        'indigo': '#6366f1',
      }).find(([, val]) => val === formData.color)?.[0] || formData.color

      await createCalendarEvent({
        userId: user.id,
        eventDate: new Date(formData.date),
        eventType: 'countdown',
        title: formData.title,
        color: eventColor
      })
      
      setFormData({
        title: '',
        date: '',
        icon: 'calendar',
        color: '#3b82f6',
        isRecurring: false,
        recurringType: 'yearly'
      })
      setShowForm(false)
      loadEvents()
    } catch (error) {
      console.error('Failed to create event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent || !formData.title || !formData.date) return
    
    setIsSaving(true)
    try {
      const eventColor = Object.entries({
        'blue': '#3b82f6',
        'green': '#10b981',
        'red': '#ef4444',
        'yellow': '#f59e0b',
        'purple': '#8b5cf6',
        'pink': '#ec4899',
        'orange': '#f97316',
        'teal': '#14b8a6',
        'indigo': '#6366f1',
      }).find(([, val]) => val === formData.color)?.[0] || formData.color

      await updateCalendarEvent(editingEvent.id, {
        eventDate: new Date(formData.date),
        title: formData.title,
        color: eventColor
      })
      
      setEditingEvent(null)
      setFormData({
        title: '',
        date: '',
        icon: 'calendar',
        color: '#3b82f6',
        isRecurring: false,
        recurringType: 'yearly'
      })
      setShowForm(false)
      loadEvents()
    } catch (error) {
      console.error('Failed to update event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteCalendarEvent(id)
      loadEvents()
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const startEditing = (event: CountdownEventUI) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      date: format(event.date, 'yyyy-MM-dd'),
      icon: event.icon,
      color: event.color,
      isRecurring: event.isRecurring || false,
      recurringType: event.recurringType || 'yearly'
    })
    setShowForm(true)
  }

  const handleUsePreset = (preset: typeof PRESET_EVENTS[0]) => {
    const date = preset.isRecurring 
      ? addYears(new Date(new Date().getFullYear(), 0, 1), new Date().getFullYear() === new Date().getFullYear() ? 0 : 1)
      : addDays(new Date(), 30)
    
    setFormData({
      ...formData,
      title: preset.title,
      icon: preset.icon,
      color: preset.color,
      isRecurring: preset.isRecurring || false,
      recurringType: preset.recurringType || 'yearly',
      date: preset.isRecurring 
        ? format(new Date(new Date().getFullYear() + 1, 0, 1), 'yyyy-MM-dd')
        : format(addDays(new Date(), 30), 'yyyy-MM-dd')
    })
  }

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Загрузка событий...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <button
        onClick={() => {
          setEditingEvent(null)
          setFormData({
            title: '',
            date: '',
            icon: 'calendar',
            color: '#3b82f6',
            isRecurring: false,
            recurringType: 'yearly'
          })
          setShowForm(true)
        }}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
      >
        <Plus className="w-5 h-5" />
        Добавить отсчёт
      </button>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingEvent ? 'Изменить отсчёт' : 'Новый отсчёт'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Presets */}
            {!editingEvent && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Быстрые шаблоны:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_EVENTS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handleUsePreset(preset)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название события</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Новый Год"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Иконка</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ICONS).map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: name as CountdownEventUI['icon'] })}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                        formData.icon === name
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs capitalize">{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    '#3b82f6', '#10b981', '#ef4444', '#f59e0b',
                    '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'
                  ].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all",
                        formData.color === color ? "ring-2 ring-offset-2 ring-gray-400" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.isRecurring}
                  onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700">
                  Повторяется ежегодно
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingEvent ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет событий для отсчёта</p>
            <p className="text-sm text-gray-400 mt-1">Добавьте первое важное событие!</p>
          </div>
        ) : (
          sortedEvents.map(event => {
            const timeLeft = calculateTimeLeft(event.date)
            const Icon = ICONS[event.icon] || Calendar
            
            return (
              <div
                key={event.id}
                className="group relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden"
              >
                {/* Background Progress Bar */}
                {!timeLeft.isExpired && !timeLeft.isToday && (
                  <div
                    className="absolute bottom-0 left-0 h-1 transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, Math.max(5, (timeLeft.totalSeconds / (30 * 24 * 60 * 60)) * 100))}%`,
                      backgroundColor: event.color
                    }}
                  />
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${event.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: event.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {format(event.date, 'd MMMM yyyy', { locale: ru })}
                      {event.isRecurring && ' (ежегодно)'}
                    </p>

                    {/* Timer */}
                    <div className="mt-3">
                      {timeLeft.isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          Событие прошло
                        </span>
                      ) : timeLeft.isToday ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium animate-pulse">
                          <PartyPopper className="w-3.5 h-3.5" />
                          Сегодня! 🎉
                        </span>
                      ) : (
                        <div className="flex items-center gap-3 text-sm">
                          {timeLeft.days > 0 && (
                            <div className="text-center">
                              <span className="block text-xl font-bold" style={{ color: event.color }}>
                                {timeLeft.days}
                              </span>
                              <span className="text-xs text-gray-500">дней</span>
                            </div>
                          )}
                          <div className="text-center">
                            <span className="block text-xl font-bold" style={{ color: event.color }}>
                              {String(timeLeft.hours).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-gray-500">часов</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-xl font-bold" style={{ color: event.color }}>
                              {String(timeLeft.minutes).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-gray-500">мин</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-xl font-bold" style={{ color: event.color }}>
                              {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                            <span className="text-xs text-gray-500">сек</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(event)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Изменить"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CountdownWidget
