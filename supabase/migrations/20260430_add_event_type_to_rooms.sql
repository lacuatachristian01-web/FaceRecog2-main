ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS event_date date;

COMMENT ON COLUMN public.rooms.event_type IS 'Type of event: University Event, College Event, or SubOrg Event';
COMMENT ON COLUMN public.rooms.event_date IS 'The date when the event or session takes place';
