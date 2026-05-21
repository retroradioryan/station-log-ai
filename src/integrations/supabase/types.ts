export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      capture_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number
          error: string | null
          id: string
          picked_up_at: string | null
          recording_id: string | null
          station_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          error?: string | null
          id?: string
          picked_up_at?: string | null
          recording_id?: string | null
          station_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          error?: string | null
          id?: string
          picked_up_at?: string | null
          recording_id?: string | null
          station_id?: string
          status?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          created_at: string
          generated_summary: string | null
          highlights: Json | null
          id: string
          pdf_url: string | null
          report_date: string
          station_id: string | null
        }
        Insert: {
          created_at?: string
          generated_summary?: string | null
          highlights?: Json | null
          id?: string
          pdf_url?: string | null
          report_date: string
          station_id?: string | null
        }
        Update: {
          created_at?: string
          generated_summary?: string | null
          highlights?: Json | null
          id?: string
          pdf_url?: string | null
          report_date?: string
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          recording_date: string
          started_at: string | null
          station_id: string
          status: Database["public"]["Enums"]["recording_status"]
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_date: string
          started_at?: string | null
          station_id: string
          status?: Database["public"]["Enums"]["recording_status"]
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_date?: string
          started_at?: string | null
          station_id?: string
          status?: Database["public"]["Enums"]["recording_status"]
        }
        Relationships: [
          {
            foreignKeyName: "recordings_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          locations: string[] | null
          organizations: string[] | null
          people: string[] | null
          recording_id: string | null
          segment_date: string
          segment_time: string
          segment_type: Database["public"]["Enums"]["segment_type"]
          station_id: string
          summary: string | null
          title: string
          tone: string | null
          topics: string[] | null
          transcript_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          locations?: string[] | null
          organizations?: string[] | null
          people?: string[] | null
          recording_id?: string | null
          segment_date: string
          segment_time: string
          segment_type?: Database["public"]["Enums"]["segment_type"]
          station_id: string
          summary?: string | null
          title: string
          tone?: string | null
          topics?: string[] | null
          transcript_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          locations?: string[] | null
          organizations?: string[] | null
          people?: string[] | null
          recording_id?: string | null
          segment_date?: string
          segment_time?: string
          segment_type?: Database["public"]["Enums"]["segment_type"]
          station_id?: string
          summary?: string | null
          title?: string
          tone?: string | null
          topics?: string[] | null
          transcript_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          active: boolean
          color: string | null
          country: string | null
          created_at: string
          genre: string | null
          id: string
          logo_url: string | null
          monitoring_days: number[] | null
          monitoring_end: string
          monitoring_start: string
          name: string
          stream_url: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          country?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          logo_url?: string | null
          monitoring_days?: number[] | null
          monitoring_end?: string
          monitoring_start?: string
          name: string
          stream_url: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          country?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          logo_url?: string | null
          monitoring_days?: number[] | null
          monitoring_end?: string
          monitoring_start?: string
          name?: string
          stream_url?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          confidence: number | null
          created_at: string
          end_time: number
          id: string
          recording_id: string
          start_time: number
          transcript: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          end_time?: number
          id?: string
          recording_id: string
          start_time?: number
          transcript: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          end_time?: number
          id?: string
          recording_id?: string
          start_time?: number
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      recording_status:
        | "pending"
        | "recording"
        | "processing"
        | "completed"
        | "failed"
      segment_type:
        | "news"
        | "interview"
        | "music"
        | "ad"
        | "sports"
        | "weather"
        | "travel"
        | "listener_call"
        | "political"
        | "entertainment"
        | "discussion"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      recording_status: [
        "pending",
        "recording",
        "processing",
        "completed",
        "failed",
      ],
      segment_type: [
        "news",
        "interview",
        "music",
        "ad",
        "sports",
        "weather",
        "travel",
        "listener_call",
        "political",
        "entertainment",
        "discussion",
        "other",
      ],
    },
  },
} as const
