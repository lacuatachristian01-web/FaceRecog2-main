"use server";

import { createClient } from '@/utils/supabase/server';

/**
 * Face Service
 * Handles facial embedding storage and verification.
 */

export async function registerFace(embedding: number[], faceImage: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('[FaceRegistration] Auth Error:', authError);
    throw new Error('Authentication session expired. Please log in again.');
  }

  if (!user) {
    throw new Error('Not authenticated');
  }

  console.log(`[FaceRegistration] Attempting to register face for user: ${user.id}`);

  // 1. Check for duplication via RPC (Bypasses RLS on server-side)
  if (embedding && embedding.length > 0) {
    console.log('[FaceRegistration] Calling check_face_duplicate RPC...');
    const { data: duplicateCheck, error: rpcError } = await supabase.rpc('check_face_duplicate', {
      target_embedding: embedding,
      current_user_id: user.id,
      threshold: 0.45 // Stricter matching
    });

    if (rpcError) {
      console.error('[FaceRegistration] RPC Error:', rpcError);
      throw new Error('Security Check Error: Please ensure the face duplication RPC is installed in the database.');
    }

    console.log('[FaceRegistration] RPC Result:', JSON.stringify(duplicateCheck));

    if (duplicateCheck && Array.isArray(duplicateCheck) && duplicateCheck.length > 0) {
      const { match_found, matched_name } = duplicateCheck[0];
      if (match_found) {
        console.warn(`[FaceRegistration] REJECTED: Match found with ${matched_name}`);
        throw new Error(`SECURITY ALERT: This face is already registered. Duplicate registrations are strictly prohibited.`);
      }
    }
  } else {
    console.log('[FaceRegistration] No embedding provided, skipping duplicate check.');
  }

  // 2. Proceed with registration
  const { error } = await supabase
    .from('profiles')
    .update({
      face_embedding: embedding,
      face_image: faceImage,
      face_registered: true
    })
    .eq('id', user.id);

  if (error) {
    console.error('[FaceRegistration] Update error:', error);
    throw error;
  }

  console.log('[FaceRegistration] SUCCESS: Profile updated with facial data.');
  return { success: true };
}

export async function getFaceEmbedding(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('face_embedding, face_image')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return {
    embedding: data?.face_embedding,
    image: data?.face_image
  };
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
export async function updateProfileImage(userId: string, faceImage: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ face_image: faceImage })
    .eq('id', userId);

  if (error) throw error;
  return { success: true };
}
