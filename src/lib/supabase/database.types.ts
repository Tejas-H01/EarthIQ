export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id?: string;
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Omit<ProfileInsert, "user_id">> & {
  user_id?: string;
};

export type AssessmentRow = {
  id: string;
  user_id: string;
  carbon_breakdown: Json;
  context_profile: Json;
  hotspot: Json | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentInsert = {
  id?: string;
  user_id: string;
  carbon_breakdown: Json;
  context_profile: Json;
  hotspot?: Json | null;
  created_at?: string;
  updated_at?: string;
};

export type AssessmentUpdate = Partial<AssessmentInsert>;

export type RecommendationRow = {
  id: string;
  user_id: string;
  assessment_id: string | null;
  recommendations: Json;
  created_at: string;
  updated_at: string;
};

export type RecommendationInsert = {
  id?: string;
  user_id: string;
  assessment_id?: string | null;
  recommendations: Json;
  created_at?: string;
  updated_at?: string;
};

export type RecommendationUpdate = Partial<RecommendationInsert>;

export type PlanRow = {
  id: string;
  user_id: string;
  recommendation_set_id: string | null;
  plan: Json;
  created_at: string;
  updated_at: string;
};

export type PlanInsert = {
  id?: string;
  user_id: string;
  recommendation_set_id?: string | null;
  plan: Json;
  created_at?: string;
  updated_at?: string;
};

export type PlanUpdate = Partial<PlanInsert>;

export type ProgressRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  action_id: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgressInsert = {
  id?: string;
  user_id: string;
  plan_id?: string | null;
  action_id: string;
  status?: string;
  notes?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProgressUpdate = Partial<ProgressInsert>;

export type EarthIqDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      assessments: {
        Row: AssessmentRow;
        Insert: AssessmentInsert;
        Update: AssessmentUpdate;
        Relationships: [];
      };
      recommendations: {
        Row: RecommendationRow;
        Insert: RecommendationInsert;
        Update: RecommendationUpdate;
        Relationships: [];
      };
      plans: {
        Row: PlanRow;
        Insert: PlanInsert;
        Update: PlanUpdate;
        Relationships: [];
      };
      progress: {
        Row: ProgressRow;
        Insert: ProgressInsert;
        Update: ProgressUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
