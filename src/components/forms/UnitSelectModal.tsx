import { useState } from 'react'
import { Modal } from '../Modal'
import { Search, Plus, X } from 'lucide-react'

interface UnitSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (unit: string) => void
  currentUnit?: string
}

const predefinedUnits = [
  { value: 'page', label: 'Страница', short: 'стр', category: 'Чтение' },
  { value: 'min', label: 'Минуты', short: 'мин', category: 'Время' },
  { value: 'hour', label: 'Часы', short: 'ч', category: 'Время' },
  { value: 'glass', label: 'Стаканы', short: 'ст', category: 'Еда/Напитки' },
  { value: 'km', label: 'Километры', short: 'км', category: 'Расстояние' },
  { value: 'm', label: 'Метры', short: 'м', category: 'Расстояние' },
  { value: 'step', label: 'Шаги', short: 'шаг', category: 'Активность' },
  { value: 'cal', label: 'Калории', short: 'ккал', category: 'Еда/Напитки' },
  { value: 'kg', label: 'Килограммы', short: 'кг', category: 'Вес' },
  { value: 'g', label: 'Граммы', short: 'г', category: 'Вес' },
  { value: 'ml', label: 'Миллилитры', short: 'мл', category: 'Объем' },
  { value: 'l', label: 'Литры', short: 'л', category: 'Объем' },
  { value: 'pc', label: 'Штуки', short: 'шт', category: 'Количество' },
  { value: 'time', label: 'Раз', short: 'раз', category: 'Количество' },
  { value: 'percent', label: 'Процент', short: '%', category: 'Другое' },
]

export function UnitSelectModal({ isOpen, onClose, onSelect, currentUnit }: UnitSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customUnit, setCustomUnit] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const filteredUnits = predefinedUnits.filter(unit =>
    unit.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.short.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedUnits = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.category]) acc[unit.category] = []
    acc[unit.category].push(unit)
    return acc
  }, {} as Record<string, typeof predefinedUnits>)

  const handleSelect = (unit: string) => {
    onSelect(unit)
    onClose()
  }

  const handleCustomAdd = () => {
    if (customUnit.trim()) {
      onSelect(customUnit.trim())
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Единица измерения" className="max-w-md">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск единиц измерения..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Custom Unit Toggle */}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          {showCustom ? 'Скрыть' : 'Добавить свою единицу'}
        </button>

        {/* Custom Unit Input */}
        {showCustom && (
          <div className="flex gap-2">
            <input
              type="text"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="Например: кг, км, мин..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleCustomAdd}
              disabled={!customUnit.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Добавить
            </button>
          </div>
        )}

        {/* Units List */}
        <div className="max-h-80 overflow-y-auto space-y-4">
          {Object.entries(groupedUnits).map(([category, units]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-500 mb-2">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {units.map(unit => (
                  <button
                    key={unit.value}
                    onClick={() => handleSelect(unit.short)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      currentUnit === unit.short
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{unit.label}</span>
                    <span className="text-sm text-gray-500">{unit.short}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Current Selection */}
        {currentUnit && (
          <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
            <span className="text-sm text-gray-600">Текущая единица:</span>
            <span className="font-medium text-primary-700">{currentUnit}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
