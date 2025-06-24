
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
          role: Database["public"]["Enums"]["user_role"]
          llm_requests_count: number
        }
        Insert: {
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          llm_requests_count?: number
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          llm_requests_count?: number
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
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
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
          duration_minutes: number | null
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
          duration_minutes?: number | null
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
          duration_minutes?: number | null
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
      knowledge_base_documents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          file_name: string;
          description: string | null;
          storage_path: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          file_name: string;
          description?: string | null;
          storage_path: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          file_name?: string;
          description?: string | null;
          storage_path?: string;
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
      increment_quiz_generations: {
        Args: {
          user_id_param: string
        }
        Returns: undefined
      }
      check_llm_request_limit: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      increment_llm_request_count: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      check_gmail_email: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      user_role: "user" | "admin"
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
export type KnowledgeBaseDocument = Database['public']['Tables']['knowledge_base_documents']['Row'];
export type NewKnowledgeBaseDocument = Database['public']['Tables']['knowledge_base_documents']['Insert'];


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
