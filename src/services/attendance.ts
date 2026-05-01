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
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Get room details
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (!room) throw new Error('Room not found');

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 2. Identify the active session window
  let activeSession: 'AM' | 'PM' | null = null;
  let targetInStart = "";
  let targetInEnd = "";

  const parseToMinutes = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const amInStart = parseToMinutes(room.am_time_in_start);
  const amOutEnd = parseToMinutes(room.am_time_out_end);
  const pmInStart = parseToMinutes(room.pm_time_in_start);
  const pmOutEnd = parseToMinutes(room.pm_time_out_end);

  // Check if we are in AM window (from AM In Start to AM Out End)
  if (amInStart !== null && amOutEnd !== null && currentMinutes >= amInStart && currentMinutes <= amOutEnd) {
    activeSession = 'AM';
    targetInStart = room.am_time_in_start!;
    targetInEnd = room.am_time_in_end!;
  } 
  // Check if we are in PM window (from PM In Start to PM Out End)
  else if (pmInStart !== null && pmOutEnd !== null && currentMinutes >= pmInStart && currentMinutes <= pmOutEnd) {
    activeSession = 'PM';
    targetInStart = room.pm_time_in_start!;
    targetInEnd = room.pm_time_in_end!;
  }

  // If no session is active based on time windows, we might be outside any window
  // but let's allow it if it's the only session enabled
  if (!activeSession) {
    if (room.am_time_in_start && !room.pm_time_in_start) {
      activeSession = 'AM';
      targetInStart = room.am_time_in_start;
      targetInEnd = room.am_time_in_end;
    } else if (room.pm_time_in_start && !room.am_time_in_start) {
      activeSession = 'PM';
      targetInStart = room.pm_time_in_start;
      targetInEnd = room.pm_time_in_end;
    } else {
       // Default to latest if both exist but we are between them
       activeSession = currentMinutes < (pmInStart || 1440) ? 'AM' : 'PM';
       targetInStart = activeSession === 'AM' ? (room.am_time_in_start || "") : (room.pm_time_in_start || "");
       targetInEnd = activeSession === 'AM' ? (room.am_time_in_end || "") : (room.pm_time_in_end || "");
    }
  }

  // 3. Check if already timed in for THIS session today
  // We define "this session" by the presence of a record that is still "open" 
  // or a record created within the session's time range.
  const sessionStartTime = activeSession === 'AM' ? `${today}T00:00:00` : `${today}T12:00:00`;
  const sessionEndTime = activeSession === 'AM' ? `${today}T12:00:00` : `${today}T23:59:59`;

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('room_id', roomId)
    .eq('student_id', studentId)
    .gte('time_in', sessionStartTime)
    .lt('time_in', sessionEndTime)
    .is('time_out', null)
    .maybeSingle();

  if (existing) throw new Error(`Already timed in for ${activeSession} session`);

  // 4. Calculate Lateness
  const events: string[] = [];
  if (targetInEnd) {
    const [h, m] = targetInEnd.split(':').map(Number);
    const deadline = h * 60 + m;
    if (currentMinutes > deadline) {
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
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Fetch the most recent record today
  const { data: lastRecord, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('room_id', roomId)
    .eq('student_id', studentId)
    .gte('time_in', `${today}T00:00:00`)
    .order('time_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  // If there's no record, they definitely need to time in
  if (!lastRecord) return null;

  // If they have an open session (no time_out), they need to time out
  if (!lastRecord.time_out) return lastRecord;

  // If they have a completed session, check if we are now in a DIFFERENT session window
  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (room) {
    const pmInStart = room.pm_time_in_start ? (room.pm_time_in_start.split(':').map(Number)[0] * 60 + room.pm_time_in_start.split(':').map(Number)[1]) : null;
    
    // If last record was AM (before 12 PM) and now it's PM (after PM In Start)
    const lastInTime = new Date(lastRecord.time_in);
    const wasAm = lastInTime.getHours() < 12;
    const isNowPm = currentMinutes >= (pmInStart || 720); // Default to 12 PM if not set

    if (wasAm && isNowPm && room.pm_time_in_start) {
      // Allow a new clock in for the afternoon!
      return null; 
    }
  }

  return lastRecord;
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

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('attendance')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
export async function getRoomParticipantsWithFaces(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('room_participants')
    .select(`
      profiles:student_id (
        id,
        full_name,
        face_embedding
      )
    `)
    .eq('room_id', roomId)
    .eq('is_approved', true);

  if (error) throw error;
  
  return (data as any[] || [])
    .map(d => d.profiles)
    .filter(p => p && p.face_embedding);
}
export async function getAllRegisteredFaces() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, face_embedding, face_image')
    .not('face_embedding', 'is', null);

  if (error) throw error;
  return data || [];
}
