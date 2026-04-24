-- Add approval status to room participants
ALTER TABLE public.room_participants 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.room_participants.is_approved IS 'Whether the admin has approved the student to join this room.';
