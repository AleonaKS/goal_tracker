import type { User } from '@/types'

export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

export const demoUser: User = {
  id: 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31',
  login: 'demo',
  email: 'demo@example.com',
  registrationDate: new Date('2024-01-01'),
  settings: {
    theme: 'light',
    language: 'ru',
    monthYearHandling: 'end',
    yearHandling: 'end'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}
