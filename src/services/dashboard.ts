"use server";

import { createClient } from '@/utils/supabase/server';


export async function getVibeCheckDataPaginated({ pageParam = 0 }: { pageParam?: number } = {}) {
  try {
    const limit = 5; // default page scale
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .range(pageParam * limit, (pageParam + 1) * limit - 1);

    if (error) {
      console.warn("Vibe Check Error. Check your tables:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
}

// Keeping original for Server Component base render fallback
export async function getVibeCheckData() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (error) {
      console.warn("Vibe Check Error. Check your tables:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
}

export async function getUserProfile() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { user, profile };
  } catch (err) {
    return null;
  }
}
export async function getAllStudents() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Failed to fetch students:", err);
    return [];
  }
}

export async function updateStudentProfile(studentId: string, updates: any) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', studentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStudentAccount(studentId: string) {
  const supabase = await createClient();
  
  // 1. Delete from profiles (Cascade will handle other tables if configured, but let's be safe)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', studentId);

  if (profileError) throw profileError;

  // Note: Supabase Auth user deletion usually requires service_role or admin API.
  // For this demo, we'll just delete the profile and assume the student is "gone" from the app.
  return { success: true };
}
