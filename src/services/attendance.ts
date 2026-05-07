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

    if (targetInStart) {
      const [h, m] = targetInStart.split(':').map(Number);
      const startLimit = h * 60 + m;
      if (currentMinutes < startLimit) {
        return { error: `Time In has not started yet. Starts at ${targetInStart}.` };
      }
    }

    if (targetInEnd) {
      const [h, m] = targetInEnd.split(':').map(Number);
      const deadline = h * 60 + m;
      if (currentMinutes > deadline) {
        return { error: `Time In window has ended. Cutoff was ${targetInEnd}.` };
      }
    }

    const events: string[] = [];

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
      .select('id, session')
      .eq('room_id', roomId)
      .eq('student_id', studentId)
      .is('time_out', null)
      .order('time_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !session) return { error: 'No active session found to time out' };

    // Fetch room details for Time Out windows
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!room) return { error: 'Room not found' };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activeSession = session.session || (currentMinutes < 720 ? 'AM' : 'PM');

    const targetOutStart = activeSession === 'AM' ? room.am_time_out_start : room.pm_time_out_start;
    const targetOutEnd = activeSession === 'AM' ? room.am_time_out_end : room.pm_time_out_end;

    if (targetOutStart) {
      const [h, m] = targetOutStart.split(':').map(Number);
      const startLimit = h * 60 + m;
      if (currentMinutes < startLimit) {
        return { error: `Time Out has not started yet. Starts at ${targetOutStart}.` };
      }
    }

    if (targetOutEnd) {
      const [h, m] = targetOutEnd.split(':').map(Number);
      const endLimit = h * 60 + m;
      if (currentMinutes > endLimit) {
        return { error: `Time Out window has closed. Ended at ${targetOutEnd}.` };
      }
    }

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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  
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

  if (error) throw new Error(error.message);
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
      rooms (*)
    `)
    .eq('student_id', studentId);

  if (aError) throw aError;

  // 3. Separate into attended and missed
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // We split the attendance table records:
  // - Real attended records: time_in is NOT null
  // - Explicit missed records: time_in IS null
  const realAttendance = attendance.filter(a => a.time_in !== null);
  const explicitMissed = attendance.filter(a => a.time_in === null);

  const attended = realAttendance.map(a => {
    const rawEventName = a.rooms?.event_name || a.rooms?.name || "Regular Session";
    const sessionLabel = a.session === 'AM' ? 'Morning' : (a.session === 'PM' ? 'Afternoon' : '');
    const isHalfDay = !a.time_out;
    const isWholeDayEvent = !!(a.rooms?.am_time_in_start && a.rooms?.pm_time_in_start);
    
    let eventName = rawEventName;
    if (sessionLabel) {
      eventName = `${eventName} (${sessionLabel})`;
    }
    if (isHalfDay) {
      eventName = `${eventName} (Half Day)`;
    }

    const roomFine = a.rooms?.am_fine_amount || a.rooms?.pm_fine_amount || 50;
    // If fines has been explicitly updated in the database, respect that value. Otherwise calculate dynamic default.
    const calculatedFines = a.fines !== null ? a.fines : (isHalfDay ? (roomFine / 2) : 0);

    return {
      id: a.id,
      event_name: eventName,
      time_in: a.time_in,
      time_out: a.time_out,
      fines: calculatedFines,
      is_whole_day: isWholeDayEvent
    };
  });

  // Track room IDs that have any attendance record (attended or explicit missed)
  const recordedRoomIds = new Set(attendance.map(a => a.room_id));
  
  // Dynamic missed sessions (participated rooms with event date < today, and NO attendance record yet)
  const dynamicMissed = (participations as any[])
    .filter(p => {
      if (!p.rooms) return false;
      const eventDate = new Date(p.rooms.event_date);
      return eventDate < today && !recordedRoomIds.has(p.room_id);
    })
    .map(p => {
      const isWholeDayEvent = !!(p.rooms.am_time_in_start && p.rooms.pm_time_in_start);
      return {
        id: p.room_id,
        event_name: p.rooms.event_name || p.rooms.name,
        fines: 100, // Flat fine for missing an entire event
        is_whole_day: isWholeDayEvent,
        is_explicit: false
      };
    });

  // Explicit missed sessions (those that exist in the attendance table with time_in = null)
  const mappedExplicitMissed = explicitMissed.map(a => {
    const rawEventName = a.rooms?.event_name || a.rooms?.name || "Regular Session";
    const isWholeDayEvent = !!(a.rooms?.am_time_in_start && a.rooms?.pm_time_in_start);
    return {
      id: a.id, // Use attendance record ID so it can be updated directly when paying
      event_name: `${rawEventName} (Missed)`,
      fines: a.fines !== null ? a.fines : 100,
      is_whole_day: isWholeDayEvent,
      is_explicit: true
    };
  });

  // Combined missed sessions
  const missed = [...dynamicMissed, ...mappedExplicitMissed];

  const totalFines = attended.reduce((sum, a) => sum + (a.fines || 0), 0) + 
                     missed.reduce((sum, m) => sum + (m.fines || 0), 0);

  return { attended, missed, totalFines };
}

export async function payStudentFines(studentId: string, amountPaid: number) {
  const supabase = await createClient();
  
  // 1. Get the current summary of the student to know which records are attended and which are missed
  const summary = await getStudentFinesSummary(studentId);
  let remainingPayment = amountPaid;
  
  const attendanceSnapshot: { id: string, fines: number | null }[] = [];
  const insertedRecordIds: string[] = [];
  
  // 2. Get all existing attendance records for the student
  const { data: attendanceRecords, error: fetchError } = await supabase
    .from('attendance')
    .select(`
      id, 
      fines, 
      time_in, 
      time_out, 
      room_id,
      rooms (*)
    `)
    .eq('student_id', studentId);
    
  if (fetchError) throw fetchError;
  
  if (attendanceRecords && attendanceRecords.length > 0) {
    for (const record of attendanceRecords) {
      if (remainingPayment <= 0) break;
      
      // Determine current fine
      let currentFine = 0;
      if (record.fines !== null) {
        currentFine = record.fines;
      } else {
        // Calculate dynamic fine
        if (record.time_in === null) {
          currentFine = 100;
        } else if (record.time_out === null) {
          const roomsObj = record.rooms as any;
          const roomFine = roomsObj?.am_fine_amount || roomsObj?.pm_fine_amount || 50;
          currentFine = roomFine / 2;
        }
      }
      
      if (currentFine > 0) {
        // Capture original fines value
        attendanceSnapshot.push({ id: record.id, fines: record.fines });
        
        if (remainingPayment >= currentFine) {
          remainingPayment -= currentFine;
          await supabase
            .from('attendance')
            .update({ fines: 0 })
            .eq('id', record.id);
        } else {
          const newFine = currentFine - remainingPayment;
          remainingPayment = 0;
          await supabase
            .from('attendance')
            .update({ fines: newFine })
            .eq('id', record.id);
        }
      }
    }
  }
  
  // 3. If there is still remaining payment, instantiate dynamic missed sessions (rooms) to record paid fines
  if (remainingPayment > 0 && summary.missed && summary.missed.length > 0) {
    for (const missedItem of summary.missed) {
      if (remainingPayment <= 0) break;
      if (missedItem.is_explicit) continue; // Already handled in the loop above
      
      const baseMissedFine = missedItem.fines || 100;
      let fineToApply = baseMissedFine;
      
      if (remainingPayment >= baseMissedFine) {
        remainingPayment -= baseMissedFine;
        fineToApply = 0;
      } else {
        fineToApply = baseMissedFine - remainingPayment;
        remainingPayment = 0;
      }
      
      const { data: inserted, error: insertError } = await supabase
        .from('attendance')
        .insert({
          student_id: studentId,
          room_id: missedItem.id,
          fines: fineToApply,
          time_in: null,
          time_out: null,
          session: 'AM'
        })
        .select('id')
        .single();
        
      if (!insertError && inserted) {
        insertedRecordIds.push(inserted.id);
      }
    }
  }
  
  return { success: true, snapshot: { attendanceSnapshot, insertedRecordIds } };
}

export async function restoreFinesSnapshot(snapshot: {
  attendanceSnapshot: { id: string, fines: number | null }[],
  insertedRecordIds: string[]
}) {
  const supabase = await createClient();
  
  // 1. Restore previous fines
  if (snapshot.attendanceSnapshot && snapshot.attendanceSnapshot.length > 0) {
    for (const item of snapshot.attendanceSnapshot) {
      await supabase
        .from('attendance')
        .update({ fines: item.fines })
        .eq('id', item.id);
    }
  }
  
  // 2. Delete inserted missed records
  if (snapshot.insertedRecordIds && snapshot.insertedRecordIds.length > 0) {
    await supabase
      .from('attendance')
      .delete()
      .in('id', snapshot.insertedRecordIds);
  }
  
  return { success: true };
}
