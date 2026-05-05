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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          student_id: string | null
          face_registered: boolean
          face_embedding: any | null
          face_image: string | null
          role: 'admin' | 'student'
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          student_id?: string | null
          face_registered?: boolean
          face_embedding?: any | null
          face_image?: string | null
          role?: 'admin' | 'student'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          student_id?: string | null
          face_registered?: boolean
          face_embedding?: any | null
          face_image?: string | null
          role?: 'admin' | 'student'
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          admin_id: string
          name: string
          code: string
          created_at: string
          am_time_in_start: string | null
          am_time_in_end: string | null
          am_time_out_start: string | null
          am_time_out_end: string | null
          pm_time_in_start: string | null
          pm_time_in_end: string | null
          pm_time_out_start: string | null
          pm_time_out_end: string | null
          am_fine_amount: number | null
          pm_fine_amount: number | null
        }
        Insert: {
          id?: string
          admin_id: string
          name: string
          code: string
          created_at?: string
          am_time_in_start?: string | null
          am_time_in_end?: string | null
          am_time_out_start?: string | null
          am_time_out_end?: string | null
          pm_time_in_start?: string | null
          pm_time_in_end?: string | null
          pm_time_out_start?: string | null
          pm_time_out_end?: string | null
          am_fine_amount?: number | null
          pm_fine_amount?: number | null
        }
        Update: {
          id?: string
          admin_id?: string
          name?: string
          code?: string
          created_at?: string
          am_time_in_start?: string | null
          am_time_in_end?: string | null
          am_time_out_start?: string | null
          am_time_out_end?: string | null
          pm_time_in_start?: string | null
          pm_time_in_end?: string | null
          pm_time_out_start?: string | null
          pm_time_out_end?: string | null
          am_fine_amount?: number | null
          pm_fine_amount?: number | null
        }
      }
      attendance: {
        Row: {
          id: string
          room_id: string
          student_id: string
          time_in: string | null
          time_out: string | null
          session: string | null
          events: string[] | null
          fines: number | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          student_id: string
          time_in?: string | null
          time_out?: string | null
          session?: string | null
          events?: string[] | null
          fines?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          student_id?: string
          time_in?: string | null
          time_out?: string | null
          session?: string | null
          events?: string[] | null
          fines?: number | null
          created_at?: string
        }
      }
      room_participants: {
        Row: {
          room_id: string
          student_id: string
          joined_at: string
          is_approved: boolean
        }
        Insert: {
          room_id: string
          student_id: string
          joined_at?: string
          is_approved?: boolean
        }
        Update: {
          room_id?: string
          student_id?: string
          joined_at?: string
          is_approved?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'student'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
