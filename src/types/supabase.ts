
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
          role: string
        }
        Insert: {
          id: string
          role?: string
        }
        Update: {
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
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
          status: string
          error_message: string | null
          created_at: string
          updated_at: string
          passing_score_percentage: number | null
          last_attempt_score_percentage: number | null
          last_attempt_passed: boolean | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          pdf_name?: string | null
          num_questions: number
          generated_quiz_data?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
          passing_score_percentage?: number | null
          last_attempt_score_percentage?: number | null
          last_attempt_passed?: boolean | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          pdf_name?: string | null
          num_questions?: number
          generated_quiz_data?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string
          updated_at?: string
          passing_score_percentage?: number | null
          last_attempt_score_percentage?: number | null
          last_attempt_passed?: boolean | null
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
      knowledge_base_files: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          file_name: string;
          file_path: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          file_name: string;
          file_path: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          file_name?: string;
          file_path?: string;
        };
        Relationships: [];
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type NewWorkspace = Database['public']['Tables']['workspaces']['Insert'];
export type Quiz = Database['public']['Tables']['quizzes']['Row'];
export type NewQuiz = Database['public']['Tables']['quizzes']['Insert'];
export type KnowledgeBaseFile = Database['public']['Tables']['knowledge_base_files']['Row'];
export type NewKnowledgeBaseFile = Database['public']['Tables']['knowledge_base_files']['Insert'];


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
