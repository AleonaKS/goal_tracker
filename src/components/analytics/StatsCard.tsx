import { HelpCircle } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string | number
  unit?: string
  tooltip?: string
  color?: string
}

export function StatsCard({ label, value, unit, tooltip, color = '#22c55e' }: StatsCardProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 text-sm">{label}</span>
        {tooltip && (
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
            </div>
          </div>
        )}
      </div>
      <div className="text-right">
        <span className="font-semibold" style={{ color }}>
          {value}
        </span>
        {unit && (
          <span className="text-gray-500 text-sm ml-1">{unit}</span>
        )}
      </div>
    </div>
  )
}
