import { getClient } from './supabase'
import { isDemoMode, demoUser } from './demo'
import * as api from './supabase-api'
import type { User } from '@/types'

// Helper function to ensure user exists in users table
async function ensureUserExists(authUser: any) {
  // Check if user exists by id
  const { data: existingUserById, error: selectError } = await getClient()
    .from('users')
    .select('id, email')
    .eq('id', authUser.id)
    .maybeSingle()
  
  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Error checking user existence by id:', selectError)
  }
  
  // User already exists with this id
  if (existingUserById) {
    return
  }
  
  // Check if user exists by email (different auth id but same email)
  const { data: existingUserByEmail, error: emailSelectError } = await getClient()
    .from('users')
    .select('id, email')
    .eq('email', authUser.email)
    .maybeSingle()
  
  if (emailSelectError && emailSelectError.code !== 'PGRST116') {
    console.error('Error checking user existence by email:', emailSelectError)
  }
  
  // If user exists with same email but different id, delete old record and create new one
  // with correct id, then migrate all related data
  if (existingUserByEmail) {
    const oldUserId = existingUserByEmail.id
    const newUserId = authUser.id
    
    console.log(`Migrating user data from ${oldUserId} to ${newUserId}`)
    
    // First, migrate all related data to new user_id (before deleting old user record)
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
        // Don't throw - continue with other tables
      } else {
        console.log(`Migrated ${table} to new user_id`)
      }
    }
    
    // Delete old user record and insert new one with correct id
    // We need to do this because updating PK can fail due to FK constraints
    const { data: oldUserData } = await getClient()
      .from('users')
      .select('*')
      .eq('id', oldUserId)
      .single()
    
    if (oldUserData) {
      // Delete old record
      const { error: deleteError } = await getClient()
        .from('users')
        .delete()
        .eq('id', oldUserId)
      
      if (deleteError) {
        console.error('Error deleting old user record:', deleteError)
        // Continue anyway - try to insert new record
      }
      
      // Insert new record with correct id
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
        // If insert failed due to duplicate, it means the record already exists
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
  
  // Create new user record
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
    // Handle duplicate key violation gracefully
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
    // Demo mode - accept any email/password
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
  
  // Ensure user exists in users table
  if (data.user) {
    await ensureUserExists(data.user)
  }
  
  return data
}

export async function signUp(email: string, password: string, username: string) {
  if (isDemoMode()) {
    // Demo mode - simulate signup
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
  
  // Create user record in users table after successful registration
  if (data.user) {
    await ensureUserExists(data.user)
  }
  
  return data
}

export async function signOut() {
  if (isDemoMode()) {
    // Demo mode - just return success
    return
  }

  const { error } = await getClient().auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  if (isDemoMode()) {
    // Demo mode - return demo user directly
    // The service role client should handle database operations
    console.log('Demo mode: returning demo user')
    return demoUser
  }

  const { data: { user } } = await getClient().auth.getUser()
  return user
}

export async function getUserProfile(userId: string): Promise<User | null> {
  console.log('[Auth] getUserProfile called for userId:', userId)
  
  // Always try to get fresh data from database
  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()  // Use maybeSingle instead of single to avoid error if not found
  
  if (error) {
    console.error('[Auth] Error fetching user profile:', error)
    if (isDemoMode()) {
      // Demo mode fallback - return demo user with updated totalPoints
      return { ...demoUser, id: userId }
    }
    throw error
  }
  
  if (!data) {
    console.log('[Auth] getUserProfile - user not found')
    return null
  }
  
  // Map database fields to TypeScript interface
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
    // Demo mode - immediately call callback with demo user
    setTimeout(() => callback(demoUser), 0)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  return getClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user)
  })
}
