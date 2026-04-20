import { useState, useMemo, useCallback } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import type { Goal, GoalStatus, GoalFilter } from '@/types'

export type SortField = 'name' | 'deadline' | 'progress' | 'priority' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

interface UseGoalFiltersReturn {
  // Filter state
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string | null
  setSelectedCategory: (categoryId: string | null) => void
  selectedStatus: GoalStatus | null
  setSelectedStatus: (status: GoalStatus | null) => void
  selectedPriority: number | null
  setSelectedPriority: (priority: number | null) => void
  dateFrom: Date | null
  setDateFrom: (date: Date | null) => void
  dateTo: Date | null
  setDateTo: (date: Date | null) => void
  
  // Sort state
  sortField: SortField
  setSortField: (field: SortField) => void
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => void
  toggleSort: (field: SortField) => void
  
  // Filtered and sorted goals
  filteredGoals: Goal[]
  
  // Reset filters
  resetFilters: () => void
  hasActiveFilters: boolean
  
  // Save as favorite filter
  saveAsFavorite: (name: string) => void
}

export function useGoalFilters(goals: Goal[]): UseGoalFiltersReturn {
  const { createFavoriteFilter } = useApiDataStore()
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<GoalStatus | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null)
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // Toggle sort field
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }, [sortField, sortOrder])
  
  // Filter goals
  const filteredGoals = useMemo(() => {
    let result = [...goals]
    
    // Search by name or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(goal => 
        goal.name.toLowerCase().includes(query) ||
        goal.description?.toLowerCase().includes(query)
      )
    }
    
    // Filter by category
    if (selectedCategory) {
      result = result.filter(goal => goal.categoryId === selectedCategory)
    }
    
    // Filter by status
    if (selectedStatus) {
      result = result.filter(goal => goal.status === selectedStatus)
    }
    
    // Filter by priority
    if (selectedPriority !== null) {
      result = result.filter(goal => goal.priority === selectedPriority)
    }
    
    // Filter by date range
    if (dateFrom) {
      result = result.filter(goal => new Date(goal.startDate) >= dateFrom)
    }
    if (dateTo && dateTo) {
      result = result.filter(goal => {
        if (!goal.deadlineValue) return false
        return new Date(goal.deadlineValue) <= dateTo
      })
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'deadline':
          const aDeadline = a.deadlineValue ? new Date(a.deadlineValue).getTime() : Infinity
          const bDeadline = b.deadlineValue ? new Date(b.deadlineValue).getTime() : Infinity
          comparison = aDeadline - bDeadline
          break
        case 'progress':
          comparison = (a.progress || 0) - (b.progress || 0)
          break
        case 'priority':
          comparison = a.priority - b.priority
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [goals, searchQuery, selectedCategory, selectedStatus, selectedPriority, dateFrom, dateTo, sortField, sortOrder])
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!searchQuery || 
           !!selectedCategory || 
           !!selectedStatus || 
           selectedPriority !== null ||
           !!dateFrom || 
           !!dateTo
  }, [searchQuery, selectedCategory, selectedStatus, selectedPriority, dateFrom, dateTo])
  
  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory(null)
    setSelectedStatus(null)
    setSelectedPriority(null)
    setDateFrom(null)
    setDateTo(null)
    setSortField('createdAt')
    setSortOrder('desc')
  }, [])
  
  // Save current filter as favorite
  const saveAsFavorite = useCallback((name: string) => {
    createFavoriteFilter({
      name,
      filterType: selectedCategory ? 'category' : selectedStatus ? 'status' : 'date_range',
      filterValue: {
        searchQuery,
        categoryId: selectedCategory,
        status: selectedStatus,
        priority: selectedPriority,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
      },
      sortBy: sortField,
      sortOrder,
    })
  }, [createFavoriteFilter, searchQuery, selectedCategory, selectedStatus, selectedPriority, dateFrom, dateTo, sortField, sortOrder])
  
  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    toggleSort,
    filteredGoals,
    resetFilters,
    hasActiveFilters,
    saveAsFavorite,
  }
}
