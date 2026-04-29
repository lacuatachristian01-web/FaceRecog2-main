-- Add time windows (ranges) for morning and afternoon sessions
ALTER TABLE public.rooms 
ADD COLUMN am_time_in_start text,
ADD COLUMN am_time_in_end text,
ADD COLUMN am_time_out_start text,
ADD COLUMN am_time_out_end text,
ADD COLUMN pm_time_in_start text,
ADD COLUMN pm_time_in_end text,
ADD COLUMN pm_time_out_start text,
ADD COLUMN pm_time_out_end text;
