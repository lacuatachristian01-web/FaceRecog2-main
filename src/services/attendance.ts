"use server";

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

export type AttendanceRecord = Database['public']['Tables']['attendance']['Row'];

const parseToMinutes = (timeStr?: string | null) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Attendance Service
 * Handles time-in, time-out, and dashboard data.
 */

export async function timeIn(roomId: string, studentId: string, sessionOverride?: 'AM' | 'PM') {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Get room details
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!room) return { error: 'Room not found' };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 2. Identify the active session window
    let activeSession: 'AM' | 'PM' | null = sessionOverride || null;
    let targetInStart = "";
    let targetInEnd = "";

    const amInStart = parseToMinutes(room.am_time_in_start);
    const amOutEnd = parseToMinutes(room.am_time_out_end);
    const pmInStart = parseToMinutes(room.pm_time_in_start);
    const pmOutEnd = parseToMinutes(room.pm_time_out_end);

    if (activeSession) {
      targetInStart = activeSession === 'AM' ? (room.am_time_in_start || "") : (room.pm_time_in_start || "");
      targetInEnd = activeSession === 'AM' ? (room.am_time_in_end || "") : (room.pm_time_in_end || "");
    } else {
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
    }

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
         activeSession = currentMinutes < (pmInStart || 1440) ? 'AM' : 'PM';
         targetInStart = activeSession === 'AM' ? (room.am_time_in_start || "") : (room.pm_time_in_start || "");
         targetInEnd = activeSession === 'AM' ? (room.am_time_in_end || "") : (room.pm_time_in_end || "");
      }
    }

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

    if (existing) return { error: `Already timed in for ${activeSession} session` };

    const events: string[] = [];
    if (targetInEnd) {
      const [h, m] = targetInEnd.split(':').map(Number);
      const deadline = h * 60 + m;
      if (currentMinutes > deadline) {
        events.push('Late');
      }
    }

    const fineAmount = activeSession === 'AM' ? (room.am_fine_amount || 50) : (room.pm_fine_amount || 50);
    const fine = events.includes('Late') ? fineAmount : 0;

    const insertData: any = {
      room_id: roomId,
      student_id: studentId,
      time_in: new Date().toISOString(),
      events: events.length > 0 ? events : null,
      fines: fine
    };

    // Only add session if it was successfully fetched/detected
    if (activeSession) {
      insertData.session = activeSession;
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert(insertData)
      .select()
      .single();

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || 'An unknown error occurred during time-in' };
  }
}

export async function timeOut(roomId: string, studentId: string) {
  try {
    const supabase = await createClient();
    
    const { data: session, error: findError } = await supabase
      .from('attendance')
      .select('id')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .is('time_out', null)
      .order('time_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !session) return { error: 'No active session found to time out' };

    const { data, error } = await supabase
      .from('attendance')
      .update({
        time_out: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || 'Failed to time out' };
  }
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
export async function getTodayStatus(roomId: string, studentId: string, sessionOverride?: 'AM' | 'PM') {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const supabase = await createClient();
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Fetch room details first
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();

      // Determine current session
      const amInStart = room?.am_time_in_start ? (room.am_time_in_start.split(':').map(Number)[0] * 60 + room.am_time_in_start.split(':').map(Number)[1]) : null;
      const pmInStart = room?.pm_time_in_start ? (room.pm_time_in_start.split(':').map(Number)[0] * 60 + room.pm_time_in_start.split(':').map(Number)[1]) : 720;
      
      const currentSession: 'AM' | 'PM' = sessionOverride || (currentMinutes < pmInStart ? 'AM' : 'PM');

      // Find the record for the CURRENT session
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('room_id', roomId)
        .eq('student_id', studentId)
        .gte('time_in', `${today}T00:00:00`);

      // Try to filter by session if column exists (graceful check)
      // Note: Supabase will return error if session column is missing
      const { data: currentRecord, error: fetchError } = await query
        .eq('session', currentSession)
        .order('time_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.message.includes('column attendance.session does not exist')) {
        // Fallback: Just get the last record of the day if session column is missing
        const { data: fallbackRecord, error: fallbackError } = await supabase
          .from('attendance')
          .select('*')
          .eq('room_id', roomId)
          .eq('student_id', studentId)
          .gte('time_in', `${today}T00:00:00`)
          .order('time_in', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (fallbackError) return { error: fallbackError.message };
        return { data: fallbackRecord, sessionType: currentSession };
      }

      if (fetchError) {
        return { error: fetchError.message };
      }

      return { data: currentRecord, sessionType: currentSession };
    } catch (err: any) {
      attempts++;
      console.error(`Fetch attempt ${attempts} failed:`, err.message);
      
      if (attempts >= maxAttempts) {
        return { error: `Network error: ${err.message}. Please check your connection.` };
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return { error: 'Failed to fetch status after multiple retries' };
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
export async function getStudentFinesSummary(studentId: string) {
  const supabase = await createClient();
  
  // 1. Get all rooms the student is a participant in
  const { data: participations, error: pError } = await supabase
    .from('room_participants')
    .select(`
      room_id,
      is_approved,
      rooms (*)
    `)
    .eq('student_id', studentId)
    .eq('is_approved', true);

  if (pError) throw pError;

  // 2. Get all attendance records for this student
  const { data: attendance, error: aError } = await supabase
    .from('attendance')
    .select(`
      *,
      rooms (name, event_name, event_date)
    `)
    .eq('student_id', studentId);

  if (aError) throw aError;

  // 3. Separate into attended and missed
  // For missed: Any room joined where event_date <= today and no attendance record exists
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attended = attendance.map(a => ({
    id: a.id,
    event_name: a.rooms?.event_name || a.rooms?.name || "Regular Session",
    time_in: a.time_in,
    time_out: a.time_out,
    fines: a.fines || 0
  }));

  const attendedRoomIds = new Set(attendance.map(a => a.room_id));
  
  const missed = (participations as any[])
    .filter(p => {
      if (!p.rooms) return false;
      const eventDate = new Date(p.rooms.event_date);
      // If event was in the past and no attendance record
      return eventDate < today && !attendedRoomIds.has(p.room_id);
    })
    .map(p => ({
      id: p.room_id,
      event_name: p.rooms.event_name || p.rooms.name,
      fines: 100 // Flat fine for missing an entire event
    }));

  const totalFines = attended.reduce((sum, a) => sum + (a.fines || 0), 0) + 
                     missed.reduce((sum, m) => sum + (m.fines || 0), 0);

  return { attended, missed, totalFines };
}
