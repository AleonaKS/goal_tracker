import { useState } from 'react'
import { Plus, X, Edit2, Check, Trash2 } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'

interface UnitsManagerProps {
  isOpen: boolean
  onClose: () => void
}

const UNIT_CATEGORIES = [
  { value: 'pages', label: 'Страницы' },
  { value: 'minutes', label: 'Время (минуты)' },
  { value: 'hours', label: 'Время (часы)' },
  { value: 'distance', label: 'Расстояние' },
  { value: 'weight', label: 'Вес' },
  { value: 'currency', label: 'Валюта' },
  { value: 'count', label: 'Количество' },
  { value: 'custom', label: 'Пользовательская' },
] as const

export function UnitsManager({ isOpen, onClose }: UnitsManagerProps) {
  const { units, createUnit, deleteUnit } = useApiDataStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUnit, setEditingUnit] = useState<string | null>(null)
  const [newUnit, setNewUnit] = useState({
    name: '',
    symbol: '',
    category: 'custom' as const,
  })

  const handleCreate = () => {
    if (newUnit.name.trim() && newUnit.symbol.trim()) {
      createUnit({
        name: newUnit.name.trim(),
        symbol: newUnit.symbol.trim(),
        category: newUnit.category,
        isDefault: false,
      })
      setNewUnit({ name: '', symbol: '', category: 'custom' })
      setShowCreate(false)
    }
  }

  const handleDelete = (id: string) => {
    const unit = units.find(u => u.id === id)
    if (unit?.isDefault) {
      alert('Нельзя удалить стандартную единицу измерения')
      return
    }
    if (confirm('Удалить эту единицу измерения?')) {
      deleteUnit(id)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Единицы измерения">
      <div className="space-y-4">
        {/* Default Units */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Стандартные единицы</h3>
          <div className="grid grid-cols-2 gap-2">
            {units.filter(u => u.isDefault).map(unit => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <span className="font-medium text-gray-900">{unit.name}</span>
                  <span className="text-gray-500 ml-1">({unit.symbol})</span>
                </div>
                <span className="text-xs text-gray-400">Стандартная</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Units */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Пользовательские единицы</h3>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-secondary text-sm py-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </button>
          </div>

          {showCreate && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="Например: Километры"
                  className="w-full input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сокращение
                </label>
                <input
                  type="text"
                  value={newUnit.symbol}
                  onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                  placeholder="Например: км"
                  className="w-full input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Категория
                </label>
                <select
                  value={newUnit.category}
                  onChange={(e) => setNewUnit({ ...newUnit, category: e.target.value as any })}
                  className="w-full input-field"
                >
                  {UNIT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 btn-primary py-2"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Сохранить
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 btn-secondary py-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Отмена
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {units.filter(u => !u.isDefault).map(unit => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div>
                  <span className="font-medium text-gray-900">{unit.name}</span>
                  <span className="text-gray-500 ml-1">({unit.symbol})</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {UNIT_CATEGORIES.find(c => c.value === unit.category)?.label}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(unit.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {units.filter(u => !u.isDefault).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Нет пользовательских единиц. Нажмите "Добавить" чтобы создать.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
