import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Modal } from './Modal'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Unit } from '@/types'

interface UnitSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUnit: (unit: Unit | { id: string; name: string; symbol: string; isCustom: boolean }) => void
  selectedUnit?: string
}

// 15 базовых вариантов согласно ТЗ + дополнительные
const predefinedUnits: Array<{ category: string; units: Array<{ name: string; symbol: string }> }> = [
  {
    category: 'Часто используемые',
    units: [
      { name: 'Страница', symbol: 'стр' },
      { name: 'Минута', symbol: 'мин' },
      { name: 'Час', symbol: 'ч' },
      { name: 'Километр', symbol: 'км' },
      { name: 'Метр', symbol: 'м' },
    ]
  },
  {
    category: 'Вес и объем',
    units: [
      { name: 'Килограмм', symbol: 'кг' },
      { name: 'Грамм', symbol: 'г' },
      { name: 'Литр', symbol: 'л' },
      { name: 'Стакан', symbol: 'стакан' },
      { name: 'Чашка', symbol: 'чашка' },
    ]
  },
  {
    category: 'Физическая активность',
    units: [
      { name: 'Упражнение', symbol: 'упр' },
      { name: 'Повторение', symbol: 'повт' },
      { name: 'Подход', symbol: 'подход' },
      { name: 'Шаг', symbol: 'шаг' },
    ]
  },
  {
    category: 'Другое',
    units: [
      { name: 'Штука', symbol: 'шт' },
      { name: 'Раз', symbol: 'раз' },
      { name: 'Процент', symbol: '%' },
      { name: 'Калория', symbol: 'ккал' },
    ]
  }
]

export function UnitSelectorModal({ isOpen, onClose, onSelectUnit, selectedUnit }: UnitSelectorModalProps) {
  const { units, createUnit } = useApiDataStore()
  const [customUnitName, setCustomUnitName] = useState('')
  const [customUnitSymbol, setCustomUnitSymbol] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)

  const handleCreateCustomUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUnitName.trim() || !customUnitSymbol.trim()) return

    try {
      await createUnit({
        name: customUnitName.trim(),
        symbol: customUnitSymbol.trim(),
        category: 'custom',
        isDefault: false
      })

      onSelectUnit({
        id: `custom_${Date.now()}`,
        name: customUnitName.trim(),
        symbol: customUnitSymbol.trim(),
        isCustom: true
      })

      setCustomUnitName('')
      setCustomUnitSymbol('')
      setShowCustomForm(false)
      onClose()
    } catch (error) {
      console.error('Failed to create custom unit:', error)
    }
  }

  const handleSelectUnit = (unit: Unit | { id?: string; name: string; symbol: string; isCustom?: boolean }) => {
    if ('isCustom' in unit || !unit.id) {
      onSelectUnit({
        id: unit.id || `custom_${Date.now()}`,
        name: unit.name,
        symbol: unit.symbol,
        isCustom: true
      })
    } else {
      onSelectUnit(unit as Unit)
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Unit">
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {/* Predefined units */}
        {predefinedUnits.map((category) => (
          <div key={category.category}>
            <h3 className="font-medium text-gray-900 mb-2">{category.category}</h3>
            <div className="grid grid-cols-2 gap-2">
              {category.units.map((unit) => (
                <button
                  key={`${category.category}_${unit.symbol}`}
                  onClick={() => handleSelectUnit(unit)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedUnit === unit.symbol
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{unit.name}</div>
                  <div className="text-xs text-gray-500">{unit.symbol}</div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Custom units from database */}
        {units.filter(u => !u.isDefault).length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Custom Units</h3>
            <div className="grid grid-cols-2 gap-2">
              {units.filter(u => !u.isDefault).map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedUnit === unit.symbol
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{unit.name}</div>
                  <div className="text-xs text-gray-500">{unit.symbol}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add custom unit */}
        <div className="pt-4 border-t border-gray-200">
          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              className="flex items-center gap-2 w-full p-3 text-left border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm text-gray-600">Add Custom Unit</span>
            </button>
          ) : (
            <form onSubmit={handleCreateCustomUnit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  value={customUnitName}
                  onChange={(e) => setCustomUnitName(e.target.value)}
                  placeholder="e.g., Glass"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={customUnitSymbol}
                  onChange={(e) => setCustomUnitSymbol(e.target.value)}
                  placeholder="e.g., glass"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Unit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomForm(false)
                    setCustomUnitName('')
                    setCustomUnitSymbol('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  )
}
