-- Add session column to attendance to distinguish between morning and afternoon
ALTER TABLE public.attendance 
ADD COLUMN session TEXT; -- 'AM' or 'PM'

-- Update existing records based on time_in (best guess)
UPDATE public.attendance 
SET session = CASE 
    WHEN EXTRACT(HOUR FROM time_in) < 12 THEN 'AM' 
    ELSE 'PM' 
END
WHERE session IS NULL;
