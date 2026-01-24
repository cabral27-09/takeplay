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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      genres: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      movie_genres: {
        Row: {
          created_at: string
          genre_id: string
          id: string
          movie_id: string
        }
        Insert: {
          created_at?: string
          genre_id: string
          id?: string
          movie_id: string
        }
        Update: {
          created_at?: string
          genre_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          age_rating: Database["public"]["Enums"]["age_rating"] | null
          backdrop_url: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          current_episode: number | null
          duration: number | null
          featured: boolean
          id: string
          language: Database["public"]["Enums"]["content_language"] | null
          min_tier: Database["public"]["Enums"]["subscription_tier"]
          producer_name: string | null
          producer_type: string | null
          rating: number | null
          season_number: number | null
          status: Database["public"]["Enums"]["movie_status"]
          synopsis: string | null
          thumbnail_url: string | null
          title: string
          total_episodes: number | null
          total_seasons: number | null
          trailer_url: string | null
          updated_at: string
          video_url: string | null
          year: number | null
        }
        Insert: {
          age_rating?: Database["public"]["Enums"]["age_rating"] | null
          backdrop_url?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          current_episode?: number | null
          duration?: number | null
          featured?: boolean
          id?: string
          language?: Database["public"]["Enums"]["content_language"] | null
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          producer_name?: string | null
          producer_type?: string | null
          rating?: number | null
          season_number?: number | null
          status?: Database["public"]["Enums"]["movie_status"]
          synopsis?: string | null
          thumbnail_url?: string | null
          title: string
          total_episodes?: number | null
          total_seasons?: number | null
          trailer_url?: string | null
          updated_at?: string
          video_url?: string | null
          year?: number | null
        }
        Update: {
          age_rating?: Database["public"]["Enums"]["age_rating"] | null
          backdrop_url?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          current_episode?: number | null
          duration?: number | null
          featured?: boolean
          id?: string
          language?: Database["public"]["Enums"]["content_language"] | null
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          producer_name?: string | null
          producer_type?: string | null
          rating?: number | null
          season_number?: number | null
          status?: Database["public"]["Enums"]["movie_status"]
          synopsis?: string | null
          thumbnail_url?: string | null
          title?: string
          total_episodes?: number | null
          total_seasons?: number | null
          trailer_url?: string | null
          updated_at?: string
          video_url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      age_rating: "L" | "10" | "12" | "14" | "16" | "18"
      app_role: "viewer" | "producer" | "admin"
      content_language: "portugues" | "ingles" | "espanhol" | "outro"
      content_type: "filme" | "serie" | "espetaculo"
      movie_status: "draft" | "published" | "pending_review" | "rejected"
      subscription_tier: "free" | "standard" | "premium"
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
      age_rating: ["L", "10", "12", "14", "16", "18"],
      app_role: ["viewer", "producer", "admin"],
      content_language: ["portugues", "ingles", "espanhol", "outro"],
      content_type: ["filme", "serie", "espetaculo"],
      movie_status: ["draft", "published", "pending_review", "rejected"],
      subscription_tier: ["free", "standard", "premium"],
    },
  },
} as const
