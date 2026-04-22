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
  
  // If user exists with same email but different id, update the id to match current auth user
  if (existingUserByEmail) {
    const { error: updateError } = await getClient()
      .from('users')
      .update({ id: authUser.id })
      .eq('email', authUser.email)
    
    if (updateError) {
      console.error('Error updating user id:', updateError)
      throw updateError
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
  if (isDemoMode()) {
    // Demo mode - return demo user profile
    return demoUser
  }

  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
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
