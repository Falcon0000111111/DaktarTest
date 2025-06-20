
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
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      quizzes: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          pdf_name: string | null
          num_questions: number
          generated_quiz_data: Json | null 
          status: "pending" | "processing" | "completed" | "failed"
          error_message: string | null
          created_at: string
          updated_at: string
          passing_score_percentage: number | null // New
          last_attempt_score_percentage: number | null // New
          last_attempt_passed: boolean | null // New
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          pdf_name?: string | null
          num_questions: number
          generated_quiz_data?: Json | null
          status?: "pending" | "processing" | "completed" | "failed"
          error_message?: string | null
          created_at?: string
          updated_at?: string
          passing_score_percentage?: number | null // New
          last_attempt_score_percentage?: number | null // New
          last_attempt_passed?: boolean | null // New
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          pdf_name?: string | null
          num_questions?: number
          generated_quiz_data?: Json | null
          status?: "pending" | "processing" | "completed" | "failed"
          error_message?: string | null
          created_at?: string
          updated_at?: string
          passing_score_percentage?: number | null // New
          last_attempt_score_percentage?: number | null // New
          last_attempt_passed?: boolean | null // New
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type NewWorkspace = Database['public']['Tables']['workspaces']['Insert'];
export type Quiz = Database['public']['Tables']['quizzes']['Row'];
export type NewQuiz = Database['public']['Tables']['quizzes']['Insert'];

export type GeneratedQuizQuestion = {
  question: string;
  options: string[]; 
  answer: string;
  explanation: string; 
};

export type StoredQuizData = {
  quiz: GeneratedQuizQuestion[];
};

export type UserAnswers = Record<number, string>;
