-- Add last_room_id to profiles to track active session
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.last_room_id IS 'The ID of the last room the user interacted with (admin or student).';
