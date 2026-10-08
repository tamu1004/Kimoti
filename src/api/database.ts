export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string
          created_at: string
        }
        Insert: {
          id: string
          nickname?: string
          created_at?: string
        }
        Update: {
          nickname?: string
        }
        Relationships: []
      }
      couples: {
        Row: {
          id: string
          created_at: string
        }
        Insert: {
          id?: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      couple_members: {
        Row: {
          couple_id: string
          user_id: string
          sharing_paused: boolean
          joined_at: string
        }
        Insert: {
          couple_id: string
          user_id: string
          sharing_paused?: boolean
          joined_at?: string
        }
        Update: {
          sharing_paused?: boolean
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          couple_id: string
          created_by: string
          expires_at: string
          used_at: string | null
        }
        Insert: {
          code: string
          couple_id: string
          created_by: string
          expires_at: string
          used_at?: string | null
        }
        Update: {
          used_at?: string | null
        }
        Relationships: []
      }
      current_signals: {
        Row: {
          user_id: string
          couple_id: string
          preset: string
          mood: string
          availability: string
          cause: string | null
          request_tags: string[]
          note: string | null
          revisit_at: string | null
          expires_at: string
          extend_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          couple_id: string
          preset: string
          mood: string
          availability: string
          cause?: string | null
          request_tags?: string[]
          note?: string | null
          revisit_at?: string | null
          expires_at: string
          extend_count?: number
          updated_at?: string
        }
        Update: {
          couple_id?: string
          preset?: string
          mood?: string
          availability?: string
          cause?: string | null
          request_tags?: string[]
          note?: string | null
          revisit_at?: string | null
          expires_at?: string
          extend_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      signal_logs: {
        Row: {
          id: string
          user_id: string
          couple_id: string
          preset: string
          mood: string
          availability: string
          cause: string | null
          request_tags: string[]
          note: string | null
          revisit_at: string | null
          expires_at: string
          extend_count: number
          created_at: string
        }
        Insert: {
          user_id: string
          couple_id: string
          preset: string
          mood: string
          availability: string
          cause?: string | null
          request_tags?: string[]
          note?: string | null
          revisit_at?: string | null
          expires_at: string
          extend_count?: number
        }
        Update: Record<string, never>
        Relationships: []
      }
      reactions: {
        Row: {
          id: string
          couple_id: string
          from_user_id: string
          to_user_id: string
          kind: string
          target_updated_at: string
          created_at: string
        }
        Insert: {
          couple_id: string
          from_user_id: string
          to_user_id: string
          kind: string
          target_updated_at: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Functions: {
      create_invite: { Args: Record<string, never>; Returns: string }
      join_couple: { Args: { code: string }; Returns: string }
      leave_couple: { Args: Record<string, never>; Returns: undefined }
      delete_my_account: { Args: Record<string, never>; Returns: undefined }
      is_same_couple: { Args: { target_user_id: string }; Returns: boolean }
      my_couple_id: { Args: Record<string, never>; Returns: string }
    }
  }
}
