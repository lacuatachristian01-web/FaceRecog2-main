"use server";

import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

/**
 * Auth Service
 * Strictly contains all business logic and Supabase queries for authentication.
 * All functions are Server Actions to ensure secure cookie handling and avoid client-side auth issues.
 */

export async function signInWithID(name: string, id: string) {
  try {
    const client = await createClient();
    
    // Sanitize ID for email: remove non-alphanumeric and use standard domain
    const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const email = `u${sanitizedId}@student.com`;
    
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: id,
    });

    if (signInError) return { error: signInError.message };

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An unknown error occurred' };
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    return { success: true, user: data.user };
  } catch (err: any) {
    return { error: err.message || 'An unknown error occurred' };
  }
}

export async function signUpWithID(
  name: string, 
  id: string, 
  role: 'admin' | 'student' = 'student', 
  courseYear?: string
) {
  try {
    // Create Supabase Admin client using Service Role Key to bypass signup rate limits
    const adminClient = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Sanitize ID for email: remove non-alphanumeric and use standard domain
    const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const email = `u${sanitizedId}@student.com`;

    // Create the user bypassing standard rate limits and auto-confirming email
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: id,
      email_confirm: true,
      user_metadata: {
        role,
        full_name: name,
        student_id: id,
        course_year: courseYear,
      }
    });

    if (error) return { error: error.message };

    // Perform a silent login using standard client to establish cookies/sessions
    const client = await createClient();
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: id,
    });

    if (signInError) {
      return { error: `Account created, but auto-login failed: ${signInError.message}` };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    return { error: err.message || 'An unknown error occurred' };
  }
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function forgotPassword(email: string) {
  const headersList = await headers();
  const origin = headersList.get('origin') || headersList.get('host');
  const client = await createClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function resetPassword(password: string) {
  const client = await createClient();
  const { error } = await client.auth.updateUser({
    password: password,
  });
  if (error) throw new Error(error.message);
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
  
  if (error) throw new Error(error.message);
  return { success: true };
}
