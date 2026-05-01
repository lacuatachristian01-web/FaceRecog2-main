export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          room_id: string
          student_id: string
          time_in: string
          time_out: string | null
          events: string[] | null
          fines: number | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          student_id: string
          time_in?: string
          time_out?: string | null
          events?: string[] | null
          fines?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          student_id?: string
          time_in?: string
          time_out?: string | null
          events?: string[] | null
          fines?: number | null
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          code: string
          admin_id: string
          event_name: string | null
          event_date: string | null
          event_type: string | null
          start_time: string | null
          end_time: string | null
          start_time_am: string | null
          end_time_am: string | null
          start_time_pm: string | null
          end_time_pm: string | null
          am_time_in_start: string | null
          am_time_in_end: string | null
          am_time_out_start: string | null
          am_time_out_end: string | null
          pm_time_in_start: string | null
          pm_time_in_end: string | null
          pm_time_out_start: string | null
          pm_time_out_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          admin_id: string
          event_name?: string | null
          event_date?: string | null
          event_type?: string | null
          start_time?: string | null
          end_time?: string | null
          start_time_am?: string | null
          end_time_am?: string | null
          start_time_pm?: string | null
          end_time_pm?: string | null
          am_time_in_start?: string | null
          am_time_in_end?: string | null
          am_time_out_start?: string | null
          am_time_out_end?: string | null
          pm_time_in_start?: string | null
          pm_time_in_end?: string | null
          pm_time_out_start?: string | null
          pm_time_out_end?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          admin_id?: string
          event_name?: string | null
          event_date?: string | null
          event_type?: string | null
          start_time?: string | null
          end_time?: string | null
          start_time_am?: string | null
          end_time_am?: string | null
          start_time_pm?: string | null
          end_time_pm?: string | null
          am_time_in_start?: string | null
          am_time_in_end?: string | null
          am_time_out_start?: string | null
          am_time_out_end?: string | null
          pm_time_in_start?: string | null
          pm_time_in_end?: string | null
          pm_time_out_start?: string | null
          pm_time_out_end?: string | null
          created_at?: string
        }
      }
      room_participants: {
        Row: {
          id: string
          room_id: string
          student_id: string
          is_approved: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          student_id: string
          is_approved?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          student_id?: string
          is_approved?: boolean
          joined_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          student_id: string | null
          course_year: string | null
          face_embedding: number[] | null
          face_image: string | null
          last_room_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          student_id?: string | null
          course_year?: string | null
          face_embedding?: number[] | null
          face_image?: string | null
          last_room_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          student_id?: string | null
          course_year?: string | null
          face_embedding?: number[] | null
          face_image?: string | null
          last_room_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
