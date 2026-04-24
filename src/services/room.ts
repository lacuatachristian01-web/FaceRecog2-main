"use server";

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

export type Room = Database['public']['Tables']['rooms']['Row'];

/**
 * Room Service
 * Handles room creation, joining, and listing.
 */

export async function createRoom(name: string, startTime?: string, endTime?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate a random 6-character code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name,
      code,
      admin_id: user.id,
      start_time: startTime,
      end_time: endTime
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinRoom(code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Find the room by code
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('code', code.toUpperCase())
    .single();

  if (roomError || !room) throw new Error('Invalid room code');

  // 2. Add student to participants (pending approval)
  const { error: joinError } = await supabase
    .from('room_participants')
    .insert({
      room_id: room.id,
      student_id: user.id,
      is_approved: false
    });

  if (joinError) {
    if (joinError.code === '23505') {
      throw new Error('You are already in this room');
    }
    throw joinError;
  }

  return { success: true, roomId: room.id };
}

export async function getAdminRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('admin_id', user.id)
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
    .eq('student_id', user.id);

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
