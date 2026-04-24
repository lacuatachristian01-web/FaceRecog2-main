-- 1. Update user_role enum
-- Note: PostgreSQL doesn't support adding values to enums within a transaction easily in some versions, 
-- but Supabase allows it.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';

-- 2. Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS face_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS face_embedding JSONB;

-- 3. Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create room_participants table
CREATE TABLE IF NOT EXISTS public.room_participants (
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, student_id)
);

-- 5. Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    time_in TIMESTAMPTZ DEFAULT NOW(),
    time_out TIMESTAMPTZ,
    events TEXT[] DEFAULT '{}',
    fines NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Rooms: Admins can do everything, Students can view rooms they are in
CREATE POLICY "Admins can manage rooms" ON public.rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Students can view joined rooms" ON public.rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_participants.room_id = rooms.id AND room_participants.student_id = auth.uid()
        )
    );

-- Room Participants: Admins can manage, Students can join
CREATE POLICY "Admins can manage participants" ON public.room_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rooms
            WHERE rooms.id = room_participants.room_id AND rooms.admin_id = auth.uid()
        )
    );

CREATE POLICY "Students can join rooms via code" ON public.room_participants
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own participations" ON public.room_participants
    FOR SELECT USING (auth.uid() = student_id);

-- Attendance: Admins can manage, Students can view their own
CREATE POLICY "Admins can manage attendance" ON public.attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rooms
            WHERE rooms.id = attendance.room_id AND rooms.admin_id = auth.uid()
        )
    );

CREATE POLICY "Students can view their own attendance" ON public.attendance
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own attendance (Time In)" ON public.attendance
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own attendance (Time Out)" ON public.attendance
    FOR UPDATE USING (auth.uid() = student_id);
