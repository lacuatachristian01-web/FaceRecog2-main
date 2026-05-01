"use server";

import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

/**
 * Auth Service
 * Strictly contains all business logic and Supabase queries for authentication.
 * All functions are Server Actions to ensure secure cookie handling and avoid client-side auth issues.
 */

export async function signInWithID(name: string, id: string) {
  const client = await createClient();
  
  // Sanitize ID for email: remove non-alphanumeric and use standard domain
  const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const email = `u${sanitizedId}@student.com`;
  
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: id,
  });

  if (signInError) throw signInError;

  return { success: true };
}

export async function signInWithEmail(email: string, password: string) {
  const client = await createClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return { success: true, user: data.user };
}

export async function signUpWithID(
  name: string, 
  id: string, 
  role: 'admin' | 'student' = 'student', 
  courseYear?: string
) {
  const client = await createClient();
  
  // Sanitize ID for email: remove non-alphanumeric and use standard domain
  const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const email = `u${sanitizedId}@student.com`;

  const { data, error } = await client.auth.signUp({
    email,
    password: id,
    options: {
      data: {
        role,
        full_name: name,
        student_id: id,
        course_year: courseYear,
      }
    }
  });
  if (error) throw error;
  return { success: true, user: data.user };
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
  return { success: true };
}

export async function forgotPassword(email: string) {
  const headersList = await headers();
  const origin = headersList.get('origin') || headersList.get('host');
  const client = await createClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) throw error;
  return { success: true };
}

export async function resetPassword(password: string) {
  const client = await createClient();
  const { error } = await client.auth.updateUser({
    password: password,
  });
  if (error) throw error;
  return { success: true };
}

export async function updatePassword(password: string, currentPassword?: string) {
  const client = await createClient();

  if (currentPassword) {
    // 1. Get current user email
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user?.email) throw new Error('Authentication required');

    // 2. Silent re-auth
    const { error: reAuthError } = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reAuthError) {
      throw new Error('Incorrect current password');
    }
  }

  // 3. Proceed with update
  const { error } = await client.auth.updateUser({
    password: password,
  });
  
  if (error) throw error;
  return { success: true };
}
