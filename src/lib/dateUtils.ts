// Date utility functions for proper date formatting

export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  
  if (typeof date === 'string') {
    // If already a string, ensure it's in YYYY-MM-DD format
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }
  
  // If Date object, convert to YYYY-MM-DD format
  return date.toISOString().split('T')[0]
}

export const formatDateForDatetimeInput = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  
  if (typeof date === 'string') {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  }
  
  return date.toISOString().slice(0, 16)
}
