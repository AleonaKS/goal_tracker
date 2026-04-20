import { useState, useMemo } from 'react'
import { Star, Plus, Trash2, Edit, Filter, ChevronDown } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal } from '@/components/Modal'
import type { FavoriteFilter } from '@/types'

interface FavoriteFiltersProps {
  entityType: 'goals' | 'tasks' | 'metrics'
  onFilterChange: (filter: FavoriteFilter | null) => void
}

export function FavoriteFiltersNew({ entityType, onFilterChange }: FavoriteFiltersProps) {
  const { favoriteFilters, createFavoriteFilter, updateFavoriteFilter, deleteFavoriteFilter } = useApiDataStore()
  const [showModal, setShowModal] = useState(false)
  const [editingFilter, setEditingFilter] = useState<FavoriteFilter | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const entityFilters = useMemo(() => 
    favoriteFilters.filter(f => f.filterType && f.filterValue && 
      (f.filterValue as any)?.entityType === entityType),
    [favoriteFilters, entityType]
  )
  
  const handleCreateFilter = async (name: string, filterType: string, filterValue: any) => {
    try {
      const newFilter = await createFavoriteFilter({
        name,
        filterType,
        filterValue,
        isDefault: false
      })
      setShowModal(false)
      setEditingFilter(null)
      
      // Apply the new filter
      onFilterChange(newFilter)
    } catch (error) {
      console.error('Failed to create filter:', error)
    }
  }
  
  const handleUpdateFilter = async (filter: FavoriteFilter) => {
    try {
      const updatedFilter = await updateFavoriteFilter(filter.id, filter)
      setEditingFilter(null)
      
      // Apply the updated filter
      onFilterChange(updatedFilter)
    } catch (error) {
      console.error('Failed to update filter:', error)
    }
  }
  
  const handleDeleteFilter = async (filterId: string) => {
    if (confirm('Удалить этот фильтр?')) {
      try {
        await deleteFavoriteFilter(filterId)
        // Clear filter if it was active
        onFilterChange(null)
      } catch (error) {
        console.error('Failed to delete filter:', error)
      }
    }
  }
  
  const applyFilter = (filter: FavoriteFilter) => {
    onFilterChange(filter)
    setShowDropdown(false)
  }
  
  const clearFilter = () => {
    onFilterChange(null)
    setShowDropdown(false)
  }
  
  const getFilterDescription = (filter: FavoriteFilter) => {
    if (!filter.filterValue) return 'Все фильтры'
    
    const filterValue = filter.filterValue as any
    const parts = []
    
    if (filterValue.status) {
      parts.push(`Статус: ${filterValue.status}`)
    }
    if (filterValue.categoryId) {
      parts.push(`Категория: ${filterValue.categoryId}`)
    }
    if (filterValue.priority) {
      parts.push(`Приоритет: ${filterValue.priority}`)
    }
    if (filterValue.dateRange) {
      parts.push(`Период: ${filterValue.dateRange}`)
    }
    
    return parts.join(', ') || 'Все фильтры'
  }
  
  const FilterModal = () => (
    <Modal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false)
        setEditingFilter(null)
      }}
      title={editingFilter ? 'Редактировать фильтр' : 'Создать фильтр'}
      size="medium"
    >
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        
        if (editingFilter) {
          handleUpdateFilter({
            ...editingFilter,
            name: formData.get('name') as string,
            filterValue: {
              ...editingFilter.filterValue,
              status: formData.get('status') as string,
              priority: formData.get('priority') as string,
              dateRange: formData.get('dateRange') as string
            }
          })
        } else {
          handleCreateFilter(
            formData.get('name') as string,
            formData.get('filterType') as string,
            {
              entityType,
              status: formData.get('status') as string,
              priority: formData.get('priority') as string,
              dateRange: formData.get('dateRange') as string
            }
          )
        }
      }}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название фильтра
          </label>
          <input
            name="name"
            type="text"
            defaultValue={editingFilter?.name || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Например: Активные цели на этой неделе"
          />
        </div>
        
        <div className="space-y-3">
          {/* Status filter */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Статус</label>
            <select 
              name="status"
              defaultValue={editingFilter?.filterValue?.status || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Все статусы</option>
              <option value="in_progress">В процессе</option>
              <option value="completed">Завершено</option>
              <option value="overdue">Просрочено</option>
              <option value="planned">Запланировано</option>
            </select>
          </div>
          
          {/* Priority filter */}
          {entityType === 'goals' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Приоритет</label>
              <select 
                name="priority"
                defaultValue={editingFilter?.filterValue?.priority || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Все приоритеты</option>
                <option value="high">Высокий</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
            </div>
          )}
          
          {/* Date range filter */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Период</label>
            <select 
              name="dateRange"
              defaultValue={editingFilter?.filterValue?.dateRange || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Все время</option>
              <option value="today">Сегодня</option>
              <option value="week">Эта неделя</option>
              <option value="month">Этот месяц</option>
              <option value="quarter">Этот квартал</option>
              <option value="year">Этот год</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setShowModal(false)
              setEditingFilter(null)
            }}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingFilter ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  )
  
  return (
    <div className="relative">
      {/* Filter Button with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Избранные фильтры</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <div className="p-2">
              {/* Clear filter option */}
              <button
                onClick={clearFilter}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Сбросить фильтр
              </button>
              
              {/* Separator */}
              <div className="border-t border-gray-200 my-2" />
              
              {/* Favorite filters */}
              {entityFilters.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  Нет избранных фильтров
                </div>
              ) : (
                <div className="space-y-1">
                  {entityFilters.map(filter => (
                    <div
                      key={filter.id}
                      className="group flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg"
                    >
                      <button
                        onClick={() => applyFilter(filter)}
                        className="flex-1 text-left text-sm text-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{filter.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {getFilterDescription(filter)}
                        </div>
                      </button>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingFilter(filter)
                            setShowModal(true)
                            setShowDropdown(false)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteFilter(filter.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Create new filter */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => {
                  setEditingFilter(null)
                  setShowModal(true)
                  setShowDropdown(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Создать новый фильтр
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal */}
      <FilterModal />
    </div>
  )
}
