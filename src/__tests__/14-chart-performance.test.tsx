import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { LineChart } from '@/components/analytics/LineChart'
import { BarChart } from '@/components/analytics/BarChart'
import { RadarChart } from '@/components/analytics/RadarChart'
import { AreaChart } from '@/components/analytics/AreaChart'
import { MultiLineChart } from '@/components/analytics/MultiLineChart'
import { StackedBarChart } from '@/components/analytics/StackedBarChart'
import { ScatterChart } from '@/components/analytics/ScatterChart'
import { CircularProgressChart } from '@/components/analytics/CircularProgressChart'
import { LinearProgressBar } from '@/components/analytics/LinearProgressBar'
import { HeatmapCalendar } from '@/components/analytics/HeatmapCalendar'
import { GanttChart } from '@/components/analytics/GanttChart'

interface PerfResult {
  component: string
  dataset: string
  renderMs: number
  rerenderMs: number
}

const results: PerfResult[] = []

function suppressLogs() {
  const orig = { error: console.error, warn: console.warn, log: console.log }
  console.error = () => {}
  console.warn = () => {}
  console.log = () => {}
  return () => {
    console.error = orig.error
    console.warn = orig.warn
    console.log = orig.log
  }
}

function measureRender(name: string, label: string, fn: () => void): { renderMs: number; rerenderMs: number } {
  const restore = suppressLogs()

  const start = performance.now()
  try { fn() } catch {}
  const renderMs = performance.now() - start

  const start2 = performance.now()
  try { fn() } catch {}
  const rerenderMs = performance.now() - start2

  restore()

  results.push({ component: name, dataset: label, renderMs: Math.round(renderMs * 100) / 100, rerenderMs: Math.round(rerenderMs * 100) / 100 })
  return { renderMs, rerenderMs }
}

function genLineData(n: number) {
  const data: { date: string; value: number }[] = []
  const start = new Date('2024-01-01')
  for (let i = 0; i < n; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    data.push({ date: d.toISOString().slice(0, 10), value: Math.floor(Math.random() * 100) })
  }
  return data
}

function genBarData(n: number) {
  const data: { day: number; value: number }[] = []
  for (let i = 0; i < n; i++) {
    data.push({ day: i + 1, value: Math.floor(Math.random() * 50) })
  }
  return data
}

function genRadarData(n: number) {
  const skills = ['Скорость', 'Качество', 'Объём', 'Эффективность', 'Точность', 'Креативность', 'Работа в команде', 'Лидерство']
  return Array.from({ length: n }, (_, i) => ({
    skill: skills[i % skills.length] + (i >= skills.length ? ` ${Math.floor(i / skills.length)}` : ''),
    value: Math.floor(Math.random() * 100),
    fullMark: 100,
  }))
}

function genCategoryData(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    category: `Кат ${i + 1}`,
    completed: Math.floor(Math.random() * 20),
    pending: Math.floor(Math.random() * 10),
    overdue: Math.floor(Math.random() * 5),
  }))
}

function genScatterSeries(n: number) {
  return [{
    key: 'series1',
    name: 'Тестовая серия',
    color: '#3b82f6',
    data: Array.from({ length: n }, () => ({
      x: Math.floor(Math.random() * 10),
      y: Math.floor(Math.random() * 100),
      z: Math.floor(Math.random() * 200),
    })),
  }]
}

function genHeatmapData(n: number) {
  const start = new Date('2024-01-01')
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return { date: d, value: Math.floor(Math.random() * 20) }
  })
}

function genGanttData(n: number) {
  const start = new Date('2024-06-01')
  return Array.from({ length: n }, (_, i) => {
    const s = new Date(start)
    s.setDate(s.getDate() + i * 2)
    const e = new Date(s)
    e.setDate(e.getDate() + Math.floor(Math.random() * 14) + 1)
    const statuses = ['in_progress', 'completed', 'planned', 'overdue'] as const
    return {
      id: `g-${i}`,
      name: `Цель ${i + 1}`,
      start: s,
      end: e,
      progress: Math.floor(Math.random() * 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      type: 'goal' as const,
    }
  })
}

describe('14. Chart render performance', () => {
  it('LineChart — малые (10), средние (100), большие (1000) данные', () => {
    const sizes = [10, 100, 1000]
    sizes.forEach(n => {
      const data = genLineData(n)
      measureRender('LineChart', `${n} точек`, () => {
        render(<LineChart data={data} />)
      })
    })
  })

  it('BarChart — малые (10), средние (100), большие (1000) данные', () => {
    const sizes = [10, 100, 1000]
    sizes.forEach(n => {
      const data = genBarData(n)
      measureRender('BarChart', `${n} точек`, () => {
        render(<BarChart data={data} />)
      })
    })
  })

  it('RadarChart — 5, 10, 20 навыков', () => {
    const sizes = [5, 10, 20]
    sizes.forEach(n => {
      const data = genRadarData(n)
      measureRender('RadarChart', `${n} навыков`, () => {
        render(<RadarChart data={data} />)
      })
    })
  })

  it('AreaChart — малые (10), средние (100), большие (1000) данные', () => {
    const areas = [
      { key: 'completed', name: 'Выполнено', color: '#22c55e' },
      { key: 'pending', name: 'В процессе', color: '#3b82f6' },
    ]
    const sizes = [10, 100, 1000]
    sizes.forEach(n => {
      const data = genCategoryData(n)
      measureRender('AreaChart', `${n} категорий`, () => {
        render(<AreaChart data={data} areas={areas} />)
      })
    })
  })

  it('MultiLineChart — малые (10), средние (100), большие (1000) данные', () => {
    const lines = [
      { key: 'completed', name: 'Выполнено', color: '#22c55e' },
      { key: 'pending', name: 'В процессе', color: '#3b82f6' },
    ]
    const sizes = [10, 100, 1000]
    sizes.forEach(n => {
      const data = genCategoryData(n)
      measureRender('MultiLineChart', `${n} точек`, () => {
        render(<MultiLineChart data={data} lines={lines} />)
      })
    })
  })

  it('StackedBarChart — малые (10), средние (100), большие (1000) данные', () => {
    const stacks = [
      { key: 'completed', name: 'Выполнено', color: '#22c55e' },
      { key: 'pending', name: 'В процессе', color: '#3b82f6' },
    ]
    const sizes = [10, 100, 1000]
    sizes.forEach(n => {
      const data = genCategoryData(n)
      measureRender('StackedBarChart', `${n} категорий`, () => {
        render(<StackedBarChart data={data} stacks={stacks} />)
      })
    })
  })

  it('ScatterChart — малые (10), средние (100), большие (1000) точки', () => {
    const sizes = [10, 100, 1000]
    sizes.forEach(n => {
      const series = genScatterSeries(n)
      measureRender('ScatterChart', `${n} точек`, () => {
        render(<ScatterChart series={series} />)
      })
    })
  })

  it('CircularProgressChart — рендер и ререндер', () => {
    measureRender('CircularProgressChart', 'стандарт', () => {
      render(<CircularProgressChart current={75} target={100} />)
    })
  })

  it('LinearProgressBar — рендер и ререндер', () => {
    measureRender('LinearProgressBar', 'стандарт', () => {
      render(<LinearProgressBar current={50} target={100} startDate={new Date('2024-01-01')} endDate={new Date('2024-12-31')} />)
    })
  })

  it('HeatmapCalendar — 31, 365, 730 дней', () => {
    const sizes = [31, 365, 730]
    sizes.forEach(n => {
      const data = genHeatmapData(n)
      measureRender('HeatmapCalendar', `${n} дней`, () => {
        render(<HeatmapCalendar data={data} month={new Date('2024-06-01')} />)
      })
    })
  })

  it('GanttChart — 10, 50, 200 целей', () => {
    const sizes = [10, 50, 200]
    sizes.forEach(n => {
      const data = genGanttData(n)
      measureRender('GanttChart', `${n} целей`, () => {
        render(<GanttChart data={data} />)
      })
    })
  })

  afterAll(() => {
    console.log('\n')
    console.log('='.repeat(90))
    console.log(' 📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ПРОИЗВОДИТЕЛЬНОСТИ ГРАФИКОВ')
    console.log('='.repeat(90))
    console.log('')
    console.log(` ${'Компонент'.padEnd(22)} ${'Датасет'.padEnd(16)} ${'Рендер (ms)'.padEnd(14)} ${'Ререндер (ms)'.padEnd(14)}`)
    console.log(` ${'─'.repeat(20)}  ${'─'.repeat(14)}  ${'─'.repeat(12)}  ${'─'.repeat(12)}`)
    const sorted = [...results].sort((a, b) => b.renderMs - a.renderMs)
    sorted.forEach(r => {
      console.log(` ${r.component.padEnd(22)} ${r.dataset.padEnd(16)} ${String(r.renderMs).padEnd(14)} ${String(r.rerenderMs).padEnd(14)}`)
    })
    console.log('')
    console.log('='.repeat(90))

    const avgRender = results.reduce((s, r) => s + r.renderMs, 0) / results.length
    const maxRender = Math.max(...results.map(r => r.renderMs))
    console.log(` Среднее время рендера: ${avgRender.toFixed(2)} ms`)
    console.log(` Максимальное время:    ${maxRender.toFixed(2)} ms`)
    console.log(` Всего замеров:         ${results.length}`)
    console.log('='.repeat(90))
  })
})
