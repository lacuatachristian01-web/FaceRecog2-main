"use server";

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

export type AttendanceRecord = Database['public']['Tables']['attendance']['Row'];

/**
 * Attendance Service
 * Handles time-in, time-out, and dashboard data.
 */

export async function timeIn(roomId: string, studentId: string) {
  const supabase = await createClient();
  
  // 1. Check if already timed in today for this room
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing, error: checkError } = await supabase
    .from('attendance')
    .select('id')
    .eq('room_id', roomId)
    .eq('student_id', studentId)
    .gte('time_in', `${today}T00:00:00`)
    .is('time_out', null)
    .single();

  if (existing) throw new Error('Already timed in');

  // 2. Get room start time
  const { data: room } = await supabase
    .from('rooms')
    .select('start_time')
    .eq('id', roomId)
    .single();

  const events: string[] = [];
  if (room?.start_time) {
    const now = new Date();
    const [hours, minutes] = room.start_time.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (now > scheduledTime) {
      events.push('Late');
    }
  }

  const fine = events.includes('Late') ? 50 : 0;

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      room_id: roomId,
      student_id: studentId,
      time_in: new Date().toISOString(),
      events: events.length > 0 ? events : null,
      fines: fine
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function timeOut(roomId: string, studentId: string) {
  const supabase = await createClient();
  
  // 1. Find the active time-in session
  const { data: session, error: findError } = await supabase
    .from('attendance')
    .select('id')
    .eq('room_id', roomId)
    .eq('student_id', studentId)
    .is('time_out', null)
    .order('time_in', { ascending: false })
    .limit(1)
    .single();

  if (findError || !session) throw new Error('No active session found to time out');

  const { data, error } = await supabase
    .from('attendance')
    .update({
      time_out: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAdminDashboard(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify ownership of the room
  const { data: room } = await supabase
    .from('rooms')
    .select('admin_id')
    .eq('id', roomId)
    .single();

  if (room?.admin_id !== user.id) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      profiles:student_id (
        full_name,
        student_id
      )
    `)
    .eq('room_id', roomId)
    .order('time_in', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getStudentAttendance(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      rooms (name)
    `)
    .eq('student_id', studentId)
    .order('time_in', { ascending: false });

  if (error) throw error;
  return data;
}
export async function getTodayStatus(roomId: string, studentId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('room_id', roomId)
    .eq('student_id', studentId)
    .gte('time_in', `${today}T00:00:00`)
    .order('time_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteAttendanceRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}
export async function checkApproval(roomId: string, studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('room_participants')
    .select('is_approved')
    .eq('room_id', roomId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) return false;
  return data?.is_approved || false;
}
export async function getAbsentStudents(roomId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Get all participants
  const { data: participants, error: pError } = await supabase
    .from('room_participants')
    .select(`
      profiles:student_id (
        id,
        full_name,
        student_id,
        course_year
      )
    `)
    .eq('room_id', roomId)
    .eq('is_approved', true);

  if (pError) throw pError;

  // 2. Get today's attendance
  const { data: attendance, error: aError } = await supabase
    .from('attendance')
    .select('student_id')
    .eq('room_id', roomId)
    .gte('time_in', `${today}T00:00:00`);

  if (aError) throw aError;

  const attendedIds = new Set(attendance.map(a => a.student_id));
  
  // 3. Filter absents
  return (participants as any[])
    .filter(p => p.profiles && !attendedIds.has(p.profiles.id))
    .map(p => p.profiles);
}
