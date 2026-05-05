"use server";

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

export type Room = Database['public']['Tables']['rooms']['Row'];

/**
 * Room Service
 * Handles room creation, joining, and listing.
 */

export async function createRoom(
  name: string, 
  startTime?: string, 
  endTime?: string, 
  eventName?: string,
  startTimeAm?: string,
  endTimeAm?: string,
  startTimePm?: string,
  endTimePm?: string,
  amTimeInStart?: string,
  amTimeInEnd?: string,
  amTimeOutStart?: string,
  amTimeOutEnd?: string,
  pmTimeInStart?: string,
  pmTimeInEnd?: string,
  pmTimeOutStart?: string,
  pmTimeOutEnd?: string,
  sessionDate?: string,
  eventType?: string,
  id?: string,
  amFineAmount?: number,
  pmFineAmount?: number,
  isActive?: boolean
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    if (id) {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          name,
          admin_id: user.id,
          start_time: startTime,
          end_time: endTime,
          event_name: eventName,
          start_time_am: startTimeAm,
          end_time_am: endTimeAm,
          start_time_pm: startTimePm,
          end_time_pm: endTimePm,
          am_time_in_start: amTimeInStart,
          am_time_in_end: amTimeInEnd,
          am_time_out_start: amTimeOutStart,
          am_time_out_end: amTimeOutEnd,
          pm_time_in_start: pmTimeInStart,
          pm_time_in_end: pmTimeInEnd,
          pm_time_out_start: pmTimeOutStart,
          pm_time_out_end: pmTimeOutEnd,
          event_date: sessionDate,
          event_type: eventType,
          am_fine_amount: amFineAmount,
          pm_fine_amount: pmFineAmount,
          is_active: isActive
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return { error: error.message };
      revalidatePath('/dashboard');
      return { success: true, data };
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        code,
        admin_id: user.id,
        start_time: startTime,
        end_time: endTime,
        event_name: eventName,
        start_time_am: startTimeAm,
        end_time_am: endTimeAm,
        start_time_pm: startTimePm,
        end_time_pm: endTimePm,
        am_time_in_start: amTimeInStart,
        am_time_in_end: amTimeInEnd,
        am_time_out_start: amTimeOutStart,
        am_time_out_end: amTimeOutEnd,
        pm_time_in_start: pmTimeInStart,
        pm_time_in_end: pmTimeInEnd,
        pm_time_out_start: pmTimeOutStart,
        pm_time_out_end: pmTimeOutEnd,
        event_date: sessionDate,
        event_type: eventType,
        am_fine_amount: amFineAmount,
        pm_fine_amount: pmFineAmount,
        is_active: isActive ?? true
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await supabase
      .from('profiles')
      .update({ last_room_id: data.id })
      .eq('id', user.id);

    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || 'Failed to create room' };
  }
}


export async function joinRoom(code: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, is_active')
      .eq('code', code.toUpperCase())
      .single();

    if (roomError || !room) return { error: 'Invalid room code' };
    if (room.is_active === false) return { error: 'This room is currently inactive' };

    const { error: joinError } = await supabase
      .from('room_participants')
      .insert({
        room_id: room.id,
        student_id: user.id,
        is_approved: false
      });

    if (joinError) {
      if (joinError.code === '23505') {
        return { error: 'You are already in this room' };
      }
      return { error: joinError.message };
    }

    await supabase
      .from('profiles')
      .update({ last_room_id: room.id })
      .eq('id', user.id);

    return { success: true, roomId: room.id };
  } catch (err: any) {
    return { error: err.message || 'Failed to join room' };
  }
}

export async function getAdminRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch all rooms - RLS will handle security
  // Admins see everything, students see joined rooms (if they ever call this)
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStudentRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('room_participants')
    .select('rooms (*)')
    .eq('student_id', user.id)
    .eq('is_approved', true);

  if (error) throw error;
  return data.map(d => d.rooms) || [];
}
export async function deleteRoom(roomId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) throw error;
  revalidatePath('/dashboard');
  return { success: true };
}


export async function updateRoom(roomId: string, updates: Partial<Room>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeStudentFromRoom(roomId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('room_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('student_id', studentId);

  if (error) throw error;
  return { success: true };
}

export async function approveStudent(roomId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('room_participants')
    .update({ is_approved: true })
    .eq('room_id', roomId)
    .eq('student_id', studentId);

  if (error) throw error;
  return { success: true };
}

export async function getRoomParticipants(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('room_participants')
    .select(`
      joined_at,
      is_approved,
      profiles:student_id (
        id,
        full_name,
        student_id,
        course_year
      )
    `)
    .eq('room_id', roomId);

  if (error) throw error;
  return data;
}

export async function toggleRoomStatus(roomId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const newStatus = !currentStatus;

    const { error } = await supabase
      .from('rooms')
      .update({ is_active: newStatus })
      .eq('id', roomId)
      .eq('admin_id', user.id);

    if (error) return { error: error.message };
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle status' };
  }
}
