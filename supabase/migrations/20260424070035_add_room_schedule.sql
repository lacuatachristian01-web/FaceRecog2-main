-- Add schedule columns to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comment for clarity
COMMENT ON COLUMN public.rooms.start_time IS 'The scheduled start time for the attendance session';
COMMENT ON COLUMN public.rooms.end_time IS 'The scheduled end time for the attendance session';
