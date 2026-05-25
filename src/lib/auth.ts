import { getClient } from './supabase'
import { isDemoMode, demoUser } from './demo'
import * as api from './supabase-api'
import type { User } from '@/types'

// Вспомогательная функция для проверки существования пользователя
async function ensureUserExists(authUser: any) {
  // Проверка существования пользователя по id
  const { data: existingUserById, error: selectError } = await getClient()
    .from('users')
    .select('id, email')
    .eq('id', authUser.id)
    .maybeSingle()
  
  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Error checking user existence by id:', selectError)
  }
  
  // Пользователь уже существует с этим id
  if (existingUserById) {
    return
  }
  
  // Проверка пользователя по email (другой auth id, но тот же email)
  const { data: existingUserByEmail, error: emailSelectError } = await getClient()
    .from('users')
    .select('id, email')
    .eq('email', authUser.email)
    .maybeSingle()
  
  if (emailSelectError && emailSelectError.code !== 'PGRST116') {
    console.error('Error checking user existence by email:', emailSelectError)
  }
  
  // Если пользователь с тем же email, но другим id, удалить старую запись и создать новую
  // with correct id, then migrate all related data
  if (existingUserByEmail) {
    const oldUserId = existingUserByEmail.id
    const newUserId = authUser.id
    
    console.log(`Migrating user data from ${oldUserId} to ${newUserId}`)
    
    // Сначала перенести все связанные данные на новый user_id
    const tablesToUpdate = [
      'goals', 'tasks', 'metrics', 'categories', 'stages', 
      'metric_entries', 'user_achievements', 'favorite_filters'
    ]
    
    for (const table of tablesToUpdate) {
      const { error: migrateError } = await getClient()
        .from(table)
        .update({ user_id: newUserId })
        .eq('user_id', oldUserId)
      
      if (migrateError) {
        console.warn(`Warning: could not migrate ${table}:`, migrateError)
        // Не выбрасывать ошибку - продолжить с другими таблицами
      } else {
        console.log(`Migrated ${table} to new user_id`)
      }
    }
    
    // Удаление старой записи пользователя и вставка новой с правильным id
    // Это необходимо, т.к. обновление PK может не сработать из-за FK ограничений
    const { data: oldUserData } = await getClient()
      .from('users')
      .select('*')
      .eq('id', oldUserId)
      .single()
    
    if (oldUserData) {
      // Удаление старой записи
      const { error: deleteError } = await getClient()
        .from('users')
        .delete()
        .eq('id', oldUserId)
      
      if (deleteError) {
        console.error('Error deleting old user record:', deleteError)
        // Продолжить - попробовать вставить новую запись
      }
      
      // Вставка новой записи с правильным id
      const { error: insertError } = await getClient()
        .from('users')
        .insert({
          id: newUserId,
          email: authUser.email,
          login: oldUserData.login || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
          registration_date: oldUserData.registration_date || new Date().toISOString(),
          settings: oldUserData.settings || { theme: 'light', language: 'ru' },
          points: oldUserData.points || 0,
          level: oldUserData.level || 1,
          avatar_url: oldUserData.avatar_url || null
        })
      
      if (insertError) {
        // Если вставка не удалась из-за дубликата, запись уже существует
        if (insertError.code === '23505') {
          console.log('User record with new id already exists')
        } else {
          console.error('Error creating new user record:', insertError)
          throw insertError
        }
      } else {
        console.log('Created new user record with migrated id')
      }
    }
    
    return
  }
  
  // Создание новой записи пользователя
  const { error: insertError } = await getClient()
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email,
      login: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
      registration_date: new Date().toISOString(),
      settings: { theme: 'light', language: 'ru' }
    })
  
  if (insertError) {
    // Обработка нарушения уникальности ключа
    if (insertError.code === '23505') {
      console.warn('User record already exists (duplicate key), skipping creation')
      return
    }
    console.error('Error creating user record:', insertError)
    throw insertError
  }
}

export async function signIn(email: string, password: string) {
  if (isDemoMode()) {
    // Демо-режим - принимает любой email/пароль
    if (email === 'demo@example.com' && password === 'demo123') {
      return { user: demoUser, session: { user: demoUser } }
    }
    throw new Error('Invalid demo credentials. Use demo@example.com / demo123')
  }

  const { data, error } = await getClient().auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  // Проверка существования пользователя в таблице users
  if (data.user) {
    await ensureUserExists(data.user)
  }
  
  return data
}

export async function signUp(email: string, password: string, username: string) {
  if (isDemoMode()) {
    // Демо-режим - имитация регистрации
    return { user: { ...demoUser, email, login: username }, session: { user: demoUser } }
  }

  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  })
  
  if (error) throw error
  
  // Создание записи пользователя после успешной регистрации
  if (data.user) {
    await ensureUserExists(data.user)
  }
  
  return data
}

export async function signOut() {
  if (isDemoMode()) {
    // Демо-режим - просто вернуть успех
    return
  }

  const { error } = await getClient().auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  if (isDemoMode()) {
    // Демо-режим - вернуть демо-пользователя напрямую
    // Клиент с ролью service должен обрабатывать операции с БД
    console.log('Demo mode: returning demo user')
    return demoUser
  }

  const { data: { user } } = await getClient().auth.getUser()
  return user
}

export async function getUserProfile(userId: string): Promise<User | null> {
  console.log('[Auth] getUserProfile called for userId:', userId)
  
  // Всегда пытаться получить свежие данные из БД
  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()  // Use maybeSingle instead of single to avoid error if not found
  
  if (error) {
    console.error('[Auth] Error fetching user profile:', error)
    if (isDemoMode()) {
      // Запасной вариант демо-режима - вернуть пользователя с обновлёнными очками
      return { ...demoUser, id: userId }
    }
    throw error
  }
  
  if (!data) {
    console.log('[Auth] getUserProfile - user not found')
    return null
  }
  
  // Сопоставление полей БД с TypeScript интерфейсом
  const user: User = {
    id: data.id,
    login: data.login,
    email: data.email,
    name: data.name,
    passwordHash: data.password_hash,
    settings: data.settings,
    totalPoints: data.total_points || 0,  // Map total_points to totalPoints
    level: data.level || 1,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
  
  console.log('[Auth] getUserProfile result:', user)
  return user
}

export async function onAuthStateChange(callback: (user: any) => void) {
  if (isDemoMode()) {
    // Демо-режим - немедленный вызов колбэка с демо-пользователем
    setTimeout(() => callback(demoUser), 0)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  return getClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user)
  })
}
