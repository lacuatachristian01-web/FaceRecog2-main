"use server";

import { createClient } from '@/utils/supabase/server';

/**
 * Face Service
 * Handles facial embedding storage and verification.
 */

export async function registerFace(embedding: any[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({
      face_embedding: embedding,
      face_registered: true
    })
    .eq('id', user.id);

  if (error) throw error;
  return { success: true };
}

export async function getFaceEmbedding(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('face_embedding')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data?.face_embedding;
}

export async function verifyFace(studentId: string, currentEmbedding: any[]) {
  // In a real implementation, we would fetch the stored embedding
  // and use a library like face-api.js to calculate the Euclidean distance.
  // This is typically done on the client for performance, 
  // but we provide the service for retrieval.
  const storedEmbedding = await getFaceEmbedding(studentId);
  if (!storedEmbedding) throw new Error('Student has no face registered');
  
  return storedEmbedding;
}
