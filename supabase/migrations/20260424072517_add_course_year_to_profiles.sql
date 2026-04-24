-- Add course_year to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS course_year TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.course_year IS 'The student''s course and year level (e.g., BSCS 4A)';
