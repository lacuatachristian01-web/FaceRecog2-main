-- Add face_image column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS face_image TEXT;

COMMENT ON COLUMN public.profiles.face_image IS 'Base64 encoded image of the registered face.';
