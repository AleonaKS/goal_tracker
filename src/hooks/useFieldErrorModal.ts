import { useState, useEffect } from 'react'
import type { FieldErrors } from 'react-hook-form'

export function useFieldErrorModal(errors: FieldErrors) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const entries = Object.values(errors)
    if (entries.length > 0) {
      const firstError = entries[0]
      if (firstError && typeof firstError === 'object' && 'message' in firstError) {
        const msg = (firstError as { message: string }).message
        if (msg) {
          setErrorMessage(msg)
        }
      }
    }
  }, [errors])

  const clearError = () => setErrorMessage(null)

  return { errorMessage, clearError }
}
