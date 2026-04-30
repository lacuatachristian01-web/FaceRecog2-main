-- RPC function to check for face duplicates across all profiles
-- Bypasses RLS to ensure uniqueness security
CREATE OR REPLACE FUNCTION public.check_face_duplicate(
    target_embedding JSONB,
    current_user_id UUID,
    threshold FLOAT DEFAULT 0.45
)
RETURNS TABLE (match_found BOOLEAN, matched_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
    dist FLOAT;
    i INT;
    sum_sq FLOAT;
    arr1 FLOAT[];
    arr2 FLOAT[];
BEGIN
    -- Convert input JSONB to FLOAT[]
    arr1 := ARRAY(SELECT jsonb_array_elements_text(target_embedding)::FLOAT);

    FOR profile_record IN 
        SELECT id, full_name, face_embedding 
        FROM public.profiles 
        WHERE face_embedding IS NOT NULL AND id != current_user_id
    LOOP
        -- Convert stored JSONB to FLOAT[]
        arr2 := ARRAY(SELECT jsonb_array_elements_text(profile_record.face_embedding)::FLOAT);
        
        sum_sq := 0;
        -- Standard 128-dimensional comparison
        FOR i IN 1..128 LOOP
            IF arr1[i] IS NOT NULL AND arr2[i] IS NOT NULL THEN
                sum_sq := sum_sq + (arr1[i] - arr2[i]) * (arr1[i] - arr2[i]);
            END IF;
        END LOOP;
        dist := sqrt(sum_sq);
        
        IF dist < threshold THEN
            RETURN QUERY SELECT TRUE, profile_record.full_name;
            RETURN;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT FALSE, NULL::TEXT;
END;
$$;
