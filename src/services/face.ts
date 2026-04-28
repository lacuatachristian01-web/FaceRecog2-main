"use server";

import { createClient } from '@/utils/supabase/server';

/**
 * Face Service
 * Handles facial embedding storage and verification.
 */

export async function registerFace(embedding: number[], faceImage: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const hasEmbedding = embedding && Array.isArray(embedding) && embedding.length === 128;

  // Check for duplication only if a valid face embedding is provided
  if (hasEmbedding) {
  const { data: allProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, face_embedding')
    .not('face_embedding', 'is', null)
    .neq('id', user.id); // STOPS comparing against yourself

  if (fetchError) throw fetchError;

  if (allProfiles && allProfiles.length > 0) {
    for (const profile of allProfiles) {
      const storedEmbedding = profile.face_embedding as number[];
      
      // Only compare against valid 128-dimension embeddings
      if (Array.isArray(storedEmbedding) && storedEmbedding.length === 128) {
        let sum = 0;
        for (let i = 0; i < 128; i++) {
          const diff = embedding[i] - storedEmbedding[i];
          sum += diff * diff;
        }
        const distance = Math.sqrt(sum);
        
        // 0.40 is extremely strict. 
        // Rejects only if the faces are nearly identical (same person).
        if (distance < 0.40) {
          throw new Error('Face ID already taken!!');
        }
      }
    }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      face_embedding: hasEmbedding ? embedding : null,
      face_image: faceImage,
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
