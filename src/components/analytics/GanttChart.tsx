import { useMemo, useState, useRef, useCallback } from 'react'
import { format, eachDayOfInterval, differenceInDays, startOfDay, addDays, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'

interface GanttItem {
  id: string
  name: string
  start: Date
  end: Date
  progress?: number
  status?: string
  categoryColor?: string
  goalName?: string
  type?: 'goal' | 'task'
}

interface GanttChartProps {
  data: GanttItem[]
  height?: number
  onItemClick?: (item: GanttItem) => void
}

const COLORS = {
  overdue:     '#ef4444',
  in_progress: '#3b82f6',
  planned:     '#9ca3af',
  completed:   '#10b981',
} as const

const LABELS: Record<string, string> = {
  overdue: 'Просрочено', in_progress: 'В процессе', planned: 'Запланировано', completed: 'Завершено',
}

function statusKey(s?: string): keyof typeof COLORS {
  return (s && s in COLORS ? s : 'planned') as keyof typeof COLORS
}

const MAX_DAYS = 60

export function GanttChart({ data, height = 500, onItemClick }: GanttChartProps) {
  const today = startOfDay(new Date())

  const [viewDate, setViewDate] = useState(today)
  const [tip, setTip] = useState<{ item: GanttItem & { duration: number; sk: keyof typeof COLORS }; x: number; y: number } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const viewStart = useMemo(() => startOfDay(subDays(viewDate, Math.floor(MAX_DAYS / 2))), [viewDate])
  const viewEnd = useMemo(() => addDays(viewStart, MAX_DAYS - 1), [viewStart])
  const headers = useMemo(() => eachDayOfInterval({ start: viewStart, end: viewEnd }), [viewStart, viewEnd])
  const todayOff = differenceInDays(today, viewStart)

  const cellWidth = 28
  const nameW = 220

  // Разделение целей и задач, построение иерархии
  const { goals, tasksByGoal, orphanTasks } = useMemo(() => {
    const goalsList: (GanttItem & { duration: number; sk: keyof typeof COLORS; leftPct: number; widthPct: number })[] = []
    const tasksMap: Record<string, (GanttItem & { duration: number; sk: keyof typeof COLORS; leftPct: number; widthPct: number })[]> = {}
    const orphans: typeof goalsList = []

    const order = { overdue: 0, in_progress: 1, planned: 2, completed: 3 }

    data.forEach(item => {
      const s = startOfDay(item.start)
      const e = startOfDay(item.end)
      const dur = Math.max(differenceInDays(e, s) + 1, 1)
      const sk = statusKey(item.status)
      const startOffset = differenceInDays(s, viewStart)
      const visible = startOffset < MAX_DAYS && (startOffset + dur) > 0
      if (!visible) return

      const row = {
        ...item,
        start: s, end: e, duration: dur, sk,
        leftPct: Math.max(0, (startOffset / MAX_DAYS) * 100),
        widthPct: Math.max(2, (dur / MAX_DAYS) * 100),
      }

      if (item.type === 'task') {
        const key = item.goalName || '__orphan__'
        if (!tasksMap[key]) tasksMap[key] = []
        tasksMap[key].push(row)
      } else {
        goalsList.push(row)
      }
    })

    // Присоединение задач без родителя
    const goalNames = new Set(goalsList.map(g => g.name))
    Object.entries(tasksMap).forEach(([key, tasks]) => {
      if (key === '__orphan__' || !goalNames.has(key)) {
        orphans.push(...tasks)
        delete tasksMap[key]
      }
    })

    // Сортировка
    goalsList.sort((a, b) => order[a.sk] - order[b.sk])
    Object.values(tasksMap).forEach(t => t.sort((a, b) => order[a.sk] - order[b.sk]))
    orphans.sort((a, b) => order[a.sk] - order[b.sk])

    return { goals: goalsList, tasksByGoal: tasksMap, orphanTasks: orphans }
  }, [data, viewStart])

  const toggleGoal = useCallback((goalId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }, [])

  // Разворачивание всех целей с задачами по умолчанию при изменении данных
  useMemo(() => {
    const hasTasks = new Set(data.filter(d => d.type === 'task').map(d => d.goalName).filter(Boolean))
    const toExpand = new Set(goals.filter(g => hasTasks.has(g.name)).map(g => g.id))
    if (toExpand.size > 0) {
      setExpanded(prev => {
        const next = new Set(prev)
        toExpand.forEach(id => next.add(id))
        return next
      })
    }
  }, [data, goals])

  const totalRows = goals.length + orphanTasks.length +
    goals.reduce((sum, g) => sum + (expanded.has(g.id) ? (tasksByGoal[g.name]?.length || 0) : 0), 0)

  const totalH = Math.max(height, totalRows * 48 + 64)

  const monthHeaders = useMemo(() => {
    const m: { label: string; startIdx: number }[] = []
    headers.forEach((d, i) => {
      if (i === 0 || d.getMonth() !== headers[i - 1].getMonth()) {
        m.push({ label: format(d, 'LLLL', { locale: ru }), startIdx: i })
      }
    })
    return m
  }, [headers])

  const navPeriod = useCallback((dir: 'prev' | 'next') => {
    setViewDate(prev => addDays(prev, dir === 'prev' ? -MAX_DAYS : MAX_DAYS))
  }, [])

  const goToToday = useCallback(() => setViewDate(today), [today])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-600 mb-1">Нет данных для отображения</p>
          <p className="text-sm text-gray-400">Добавьте цели с датами или задачи с дедлайнами</p>
        </div>
      </div>
    )
  }

  return (
    <div className="select-none">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navPeriod('prev')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">
            {format(viewStart, 'd MMM', { locale: ru })} — {format(viewEnd, 'd MMM yyyy', { locale: ru })}
          </span>
          <button onClick={() => navPeriod('next')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            Сегодня
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{data.filter(d => d.status === 'in_progress').length}</span>
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>{data.filter(d => d.status === 'completed').length}</span>
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>{data.filter(d => d.status === 'overdue').length}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto" style={{ height: totalH }}>
          <div style={{ width: nameW + headers.length * cellWidth + 24, minWidth: '100%' }}>

            {/* ── Header ── */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
              <div className="flex h-8 items-end pb-1" style={{ marginLeft: nameW, marginRight: 24 }}>
                {monthHeaders.map((m, i) => (
                  <div key={i} className="flex-shrink-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wider" style={{ width: `${((headers.length - m.startIdx) / headers.length) * 100}%` }}>{m.label}</div>
                ))}
              </div>
              <div className="flex h-7 border-b border-gray-50" style={{ marginLeft: nameW, marginRight: 24 }}>
                {headers.map((d, i) => (
                  <div key={i} className={`flex-shrink-0 text-[10px] flex items-center justify-center border-l border-gray-50 ${sameDay(d, today) ? 'text-red-500 font-bold' : 'text-gray-400'}`} style={{ width: cellWidth }}>
                    {format(d, 'd')}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="relative">
              {/* Grid */}
              <div className="absolute inset-0 pointer-events-none z-0" style={{ marginLeft: nameW, marginRight: 24 }}>
                {headers.map((d, i) => (
                  <div key={i} className="absolute top-0 h-full border-l" style={{
                    left: i * cellWidth,
                    borderColor: i % 7 === 0 ? '#e5e7eb' : '#f3f4f6',
                    backgroundColor: sameDay(d, today) ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }} />
                ))}
              </div>

              {/* Today marker */}
              {todayOff >= 0 && todayOff < MAX_DAYS && (
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: nameW + todayOff * cellWidth + cellWidth / 2, width: 2 }}>
                  <div className="w-full h-full bg-red-400/60" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-400 rounded-full ring-2 ring-white" />
                </div>
              )}

              {/* ── Render rows ── */}
              {goals.map(goal => {
                const gColor = goal.categoryColor || COLORS[goal.sk]
                const tasks = tasksByGoal[goal.name] || []
                const isOpen = expanded.has(goal.id)
                const taskCount = tasks.length

                return (
                  <div key={goal.id}>
                    {/* Goal row */}
                    <div
                      className="flex items-center h-[52px] border-b border-gray-100 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer group sticky left-0"
                      onClick={() => onItemClick?.(goal)}
                    >
                      {/* Name + collapse toggle */}
                      <div className="flex-shrink-0 px-3 w-[220px] flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleGoal(goal.id) }}
                          className={`p-0.5 rounded transition-transform ${isOpen ? 'rotate-90' : ''} ${taskCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm" style={{ backgroundColor: gColor }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-800 truncate block">{goal.name}</span>
                          {taskCount > 0 && (
                            <span className="text-[10px] text-gray-400">{taskCount} {taskCount === 1 ? 'задача' : 'задачи'}</span>
                          )}
                        </div>
                      </div>

                      {/* Goal bar */}
                      <div className="relative h-full flex-1">
                        <div
                          className="absolute top-1/2 rounded-lg h-8 flex items-center transition-all hover:shadow-lg hover:-translate-y-0.5"
                          style={{
                            left: `${goal.leftPct}%`,
                            width: `${goal.widthPct}%`,
                            transform: 'translateY(-50%)',
                            backgroundColor: gColor,
                            opacity: goal.sk === 'completed' ? 0.45 : goal.sk === 'planned' ? 0.65 : 0.85,
                          }}
                          onMouseEnter={(e) => {
                            const r = e.currentTarget.getBoundingClientRect()
                            setTip({ item: goal, x: r.left + r.width / 2, y: r.top })
                          }}
                          onMouseLeave={() => setTip(null)}
                        >
                          {goal.progress && goal.progress > 0 && goal.progress < 100 && (
                            <div className="absolute inset-y-0 left-0 rounded-l-lg" style={{ width: `${goal.progress}%`, backgroundColor: gColor, opacity: 1 }} />
                          )}
                          {goal.progress === 100 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {goal.widthPct > 14 && (
                            <span className="relative z-10 px-2.5 text-xs text-white font-medium truncate drop-shadow-sm">{goal.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Task rows (collapsible) */}
                    {isOpen && tasks.map(task => {
                      const tColor = task.categoryColor || COLORS[task.sk]
                      return (
                        <div
                          key={task.id}
                          className="flex items-center h-10 border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                          onClick={() => onItemClick?.(task)}
                        >
                          {/* Name (indented) */}
                          <div className="flex-shrink-0 px-3 w-[220px] flex items-center gap-2 pl-10">
                            <div className="w-5 h-5 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600 truncate">{task.name}</span>
                          </div>

                          {/* Task bar */}
                          <div className="relative h-full flex-1">
                            <div
                              className="absolute top-1/2 rounded-md h-5 flex items-center transition-all hover:shadow hover:-translate-y-0.5"
                              style={{
                                left: `${task.leftPct}%`,
                                width: `${task.widthPct}%`,
                                transform: 'translateY(-50%)',
                                backgroundColor: tColor,
                                opacity: task.sk === 'completed' ? 0.4 : 0.75,
                              }}
                              onMouseEnter={(e) => {
                                const r = e.currentTarget.getBoundingClientRect()
                                setTip({ item: task, x: r.left + r.width / 2, y: r.top })
                              }}
                              onMouseLeave={() => setTip(null)}
                            >
                              {task.progress === 100 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* Orphan tasks (tasks without a goal) */}
              {orphanTasks.length > 0 && (
                <div>
                  <div className="flex items-center h-8 px-4 bg-gradient-to-r from-gray-50 to-gray-25 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-600">Без цели</span>
                      <span className="text-xs text-gray-400">({orphanTasks.length})</span>
                    </div>
                  </div>
                  {orphanTasks.map(task => {
                    const tColor = task.categoryColor || COLORS[task.sk]
                    return (
                      <div key={task.id} className="flex items-center h-10 border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => onItemClick?.(task)}>
                        <div className="flex-shrink-0 px-3 w-[220px] flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tColor }} />
                          <span className="text-sm text-gray-600 truncate">{task.name}</span>
                        </div>
                        <div className="relative h-full flex-1">
                          <div className="absolute top-1/2 rounded-md h-5 flex items-center transition-all hover:shadow hover:-translate-y-0.5" style={{
                            left: `${task.leftPct}%`,
                            width: `${task.widthPct}%`,
                            transform: 'translateY(-50%)',
                            backgroundColor: tColor,
                            opacity: task.sk === 'completed' ? 0.4 : 0.75,
                          }}
                            onMouseEnter={(e) => {
                              const r = e.currentTarget.getBoundingClientRect()
                              setTip({ item: task, x: r.left + r.width / 2, y: r.top })
                            }}
                            onMouseLeave={() => setTip(null)}
                          >
                            {task.progress === 100 && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tip && (
        <div className="fixed z-50 pointer-events-none" style={{ left: tip.x, top: tip.y - 8, transform: 'translate(-50%, -100%)' }}>
          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-2xl min-w-[200px] border border-gray-800/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tip.item.categoryColor || COLORS[tip.item.sk] }} />
              <p className="text-sm font-semibold text-white truncate">{tip.item.name}</p>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Период</span>
                <span className="text-gray-200">{format(tip.item.start, 'd MMM', { locale: ru })} — {format(tip.item.end, 'd MMM', { locale: ru })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Длительность</span>
                <span className="text-gray-200">{tip.item.duration} {tip.item.duration === 1 ? 'день' : 'дн.'}</span>
              </div>
              {tip.item.progress !== undefined && tip.item.progress > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Прогресс</span>
                    <span className="text-gray-200">{tip.item.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${tip.item.progress}%`, backgroundColor: tip.item.categoryColor || COLORS[tip.item.sk] }} />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-800/50">
              <span className="text-xs font-medium" style={{ color: tip.item.categoryColor || COLORS[tip.item.sk] }}>{LABELS[tip.item.sk]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Просрочено</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>В процессе</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Завершено</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Запланировано</span>
        </div>
        <div className="w-px h-3 bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-red-400 rounded-full" />
          <span>Сегодня</span>
        </div>
      </div>
    </div>
  )
}

function sameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}