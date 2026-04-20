import { useState, useMemo } from 'react'
import { X, Plus, Search } from 'lucide-react'
import { Modal } from './Modal'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Unit } from '@/types'
import { cn } from '@/lib/utils'

interface UnitSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUnit: (unit: Unit | { id: string; name: string; symbol: string; isCustom: boolean }) => void
  selectedUnit?: string
  mode?: 'full' | 'simple'
}

// Comprehensive predefined units database
const PREDEFINED_UNITS = [
  // Reading
  { value: 'page', label: 'Page', short: 'pg', category: 'Reading' },
  { value: 'chapter', label: 'Chapter', short: 'ch', category: 'Reading' },
  { value: 'book', label: 'Book', short: 'bk', category: 'Reading' },
  
  // Time
  { value: 'min', label: 'Minutes', short: 'min', category: 'Time' },
  { value: 'hour', label: 'Hours', short: 'h', category: 'Time' },
  { value: 'day', label: 'Days', short: 'd', category: 'Time' },
  { value: 'week', label: 'Weeks', short: 'w', category: 'Time' },
  
  // Distance
  { value: 'km', label: 'Kilometers', short: 'km', category: 'Distance' },
  { value: 'm', label: 'Meters', short: 'm', category: 'Distance' },
  { value: 'step', label: 'Steps', short: 'st', category: 'Distance' },
  { value: 'mile', label: 'Miles', short: 'mi', category: 'Distance' },
  
  // Food/Drink
  { value: 'glass', label: 'Glasses', short: 'gl', category: 'Food/Drink' },
  { value: 'cup', label: 'Cups', short: 'cp', category: 'Food/Drink' },
  { value: 'liter', label: 'Liters', short: 'L', category: 'Food/Drink' },
  { value: 'ml', label: 'Milliliters', short: 'mL', category: 'Food/Drink' },
  { value: 'cal', label: 'Calories', short: 'kcal', category: 'Food/Drink' },
  
  // Weight
  { value: 'kg', label: 'Kilograms', short: 'kg', category: 'Weight' },
  { value: 'g', label: 'Grams', short: 'g', category: 'Weight' },
  { value: 'lb', label: 'Pounds', short: 'lb', category: 'Weight' },
  
  // Activity
  { value: 'rep', label: 'Repetitions', short: 'rep', category: 'Activity' },
  { value: 'set', label: 'Sets', short: 'set', category: 'Activity' },
  { value: 'exercise', label: 'Exercises', short: 'ex', category: 'Activity' },
  
  // Quantity
  { value: 'pc', label: 'Pieces', short: 'pc', category: 'Quantity' },
  { value: 'time', label: 'Times', short: 'x', category: 'Quantity' },
  { value: 'percent', label: 'Percent', short: '%', category: 'Quantity' },
  
  // Learning
  { value: 'lesson', label: 'Lessons', short: 'ls', category: 'Learning' },
  { value: 'course', label: 'Courses', short: 'cs', category: 'Learning' },
  { value: 'word', label: 'Words', short: 'wd', category: 'Learning' },
  
  // Health
  { value: 'hr', label: 'Heart Rate', short: 'bpm', category: 'Health' },
  { value: 'sleep', label: 'Sleep Hours', short: 'h', category: 'Health' },
  { value: 'water', label: 'Water Glasses', short: 'gl', category: 'Health' }
]

export function UnitSelectorModal({ 
  isOpen, 
  onClose, 
  onSelectUnit, 
  selectedUnit, 
  mode = 'full' 
}: UnitSelectorModalProps) {
  const { units, createUnit } = useApiDataStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [customUnitName, setCustomUnitName] = useState('')
  const [customUnitSymbol, setCustomUnitSymbol] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  
  // Group predefined units by category
  const groupedPredefined = useMemo(() => {
    const groups = new Map<string, typeof PREDEFINED_UNITS>()
    
    PREDEFINED_UNITS.forEach(unit => {
      if (!groups.has(unit.category)) {
        groups.set(unit.category, [])
      }
      groups.get(unit.category)!.push(unit)
    })
    
    return Array.from(groups.entries()).map(([category, units]) => ({
      category,
      units: units.filter(unit => 
        unit.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.short.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.units.length > 0)
  }, [searchQuery])
  
  // Filter custom units
  const filteredCustomUnits = useMemo(() => {
    return units.filter(unit =>
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [units, searchQuery])
  
  const handleSelectPredefined = (unit: typeof PREDEFINED_UNITS[0]) => {
    onSelectUnit({
      id: unit.value,
      name: unit.label,
      symbol: unit.short,
      isCustom: false
    })
    onClose()
  }
  
  const handleSelectCustom = (unit: Unit) => {
    onSelectUnit(unit)
    onClose()
  }
  
  const handleCreateCustom = async () => {
    if (!customUnitName.trim() || !customUnitSymbol.trim()) return
    
    try {
      const newUnit = await createUnit({
        name: customUnitName.trim(),
        symbol: customUnitSymbol.trim(),
        category: 'Custom',
        isDefault: false
      })
      
      onSelectUnit(newUnit)
      setCustomUnitName('')
      setCustomUnitSymbol('')
      setShowCustomForm(false)
      onClose()
    } catch (error) {
      console.error('Failed to create unit:', error)
    }
  }
  
  const isUnitSelected = (unitId: string) => {
    return selectedUnit === unitId
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Unit" size="large">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="max-h-96 overflow-y-auto space-y-4">
          {/* Predefined Units */}
          {groupedPredefined.map(({ category, units }) => (
            <div key={category}>
              <h4 className="font-medium text-gray-900 mb-2 text-sm">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {units.map(unit => (
                  <button
                    key={unit.value}
                    onClick={() => handleSelectPredefined(unit)}
                    className={cn(
                      'p-3 text-left border rounded-lg transition-colors',
                      isUnitSelected(unit.value)
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="font-medium text-sm">{unit.label}</div>
                    <div className="text-xs text-gray-500">{unit.short}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Custom Units */}
          {filteredCustomUnits.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Custom Units</h4>
              <div className="grid grid-cols-2 gap-2">
                {filteredCustomUnits.map(unit => (
                  <button
                    key={unit.id}
                    onClick={() => handleSelectCustom(unit)}
                    className={cn(
                      'p-3 text-left border rounded-lg transition-colors',
                      isUnitSelected(unit.id)
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="font-medium text-sm">{unit.name}</div>
                    <div className="text-xs text-gray-500">{unit.symbol}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Custom Unit Creation */}
        {mode === 'full' && (
          <div className="border-t pt-4">
            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Custom Unit
              </button>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Create Custom Unit</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Unit name"
                    value={customUnitName}
                    onChange={(e) => setCustomUnitName(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Symbol"
                    value={customUnitSymbol}
                    onChange={(e) => setCustomUnitSymbol(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCustom}
                    disabled={!customUnitName.trim() || !customUnitSymbol.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomForm(false)
                      setCustomUnitName('')
                      setCustomUnitSymbol('')
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Simple version for basic use cases
export function SimpleUnitSelector({ 
  isOpen, 
  onClose, 
  onSelectUnit, 
  selectedUnit 
}: Omit<UnitSelectorModalProps, 'mode'>) {
  return (
    <UnitSelectorModal
      isOpen={isOpen}
      onClose={onClose}
      onSelectUnit={onSelectUnit}
      selectedUnit={selectedUnit}
      mode="simple"
    />
  )
}
