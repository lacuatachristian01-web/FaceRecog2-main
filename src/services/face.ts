"use server";

import { createClient } from '@/utils/supabase/server';

/**
 * Face Service
 * Handles facial embedding storage and verification.
 */

export async function registerFace(embedding: number[], faceImage: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return { error: 'Authentication session expired. Please log in again.' };
    }

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // 1. Check for duplication via RPC
    if (embedding && embedding.length > 0) {
      const { data: duplicateCheck, error: rpcError } = await supabase.rpc('check_face_duplicate', {
        target_embedding: embedding,
        current_user_id: user.id,
        threshold: 0.45
      });

      if (rpcError) {
        console.warn("Face duplication check was bypassed because the RPC 'check_face_duplicate' is not installed in Supabase yet. Run the SQL migration to enable this security layer.", rpcError.message);
      } else if (duplicateCheck && Array.isArray(duplicateCheck) && duplicateCheck.length > 0) {
        const { match_found, matched_name } = duplicateCheck[0];
        if (match_found) {
          return { error: "This Face is Already Registered in other User!" };
        }
      }
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

    if (error) return { error: error.message };

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An unknown error occurred during registration' };
  }
}

export async function getFaceEmbedding(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('face_embedding, face_image')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function matchFace(embedding: number[], threshold: number = 0.4) {
  try {
    const supabase = await createClient();
    
    // Call the high-speed match_face RPC
    const { data, error } = await supabase.rpc('match_face', {
      query_embedding: embedding,
      match_threshold: 1 - threshold, // Convert distance threshold to similarity
      match_count: 1
    });

    if (error) {
      console.error("RPC Match Error:", error);
      return { error: error.message };
    }

    if (data && data.length > 0) {
      return { data: data[0] };
    }

    return { data: null };
  } catch (err: any) {
    return { error: err.message };
  }
}
