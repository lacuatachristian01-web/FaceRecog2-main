-- Add morning and afternoon session times to rooms table
ALTER TABLE public.rooms 
ADD COLUMN start_time_am text,
ADD COLUMN end_time_am text,
ADD COLUMN start_time_pm text,
ADD COLUMN end_time_pm text;
