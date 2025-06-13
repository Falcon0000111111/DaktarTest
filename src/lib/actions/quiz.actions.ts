"use server";

import { createClient } from "@/lib/supabase/server"; // Updated import
import { generateQuizFromPdf, type GenerateQuizInput, type GenerateQuizOutput } from "@/ai/flows/generate-quiz-from-pdf";
import type { Quiz, NewQuiz } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers'; // Required for server client

interface GenerateQuizParams {
  workspaceId: string;
  pdfName: string;
  pdfDataUri: string;
  numberOfQuestions: number;
  existingQuizIdToUpdate?: string; 
}

export async function generateQuizFromPdfAction(params: GenerateQuizParams): Promise<Quiz> {
  const supabase = createClient(); // Updated client creation
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { workspaceId, pdfName, pdfDataUri, numberOfQuestions, existingQuizIdToUpdate } = params;

  let quizEntryId = existingQuizIdToUpdate;

  if (!quizEntryId) {
    const initialQuizData: NewQuiz = {
      workspace_id: workspaceId,
      user_id: user.id,
      pdf_name: pdfName,
      num_questions: numberOfQuestions,
      status: "processing",
    };

    const { data: newQuizEntry, error: createError } = await supabase
      .from("quizzes")
      .insert(initialQuizData)
      .select()
      .single();

    if (createError || !newQuizEntry) {
      console.error("Error creating initial quiz entry:", createError);
      throw new Error(createError?.message || "Failed to create quiz entry.");
    }
    quizEntryId = newQuizEntry.id;
  } else {
     const { error: updateToProcessingError } = await supabase
      .from("quizzes")
      .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", quizEntryId)
      .eq("user_id", user.id);

    if (updateToProcessingError) {
      console.error("Error updating quiz to processing for retry:", updateToProcessingError);
      throw new Error(updateToProcessingError?.message || "Failed to set quiz to processing for retry.");
    }
  }
  
  revalidatePath(`/dashboard/workspace/${workspaceId}`);

  try {
    const aiInput: GenerateQuizInput = {
      pdfDataUri,
      numberOfQuestions,
    };
    
    const generatedData: GenerateQuizOutput = await generateQuizFromPdf(aiInput);

    const { data: updatedQuiz, error: updateError } = await supabase
      .from("quizzes")
      .update({
        generated_quiz_data: generatedData as any, 
        status: "completed",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quizEntryId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updatedQuiz) {
      console.error("Error updating quiz with generated data:", updateError);
      await supabase.from("quizzes").update({ status: "failed", error_message: "Failed to save generated quiz" }).eq("id", quizEntryId);
      throw new Error(updateError?.message || "Failed to update quiz with generated data.");
    }
    
    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    return updatedQuiz;

  } catch (error) {
    console.error("Error during quiz generation AI flow or DB update:", error);
    const errorMessage = (error instanceof Error) ? error.message : "Unknown error during quiz generation.";
    
    const { data: failedQuiz, error: failUpdateError } = await supabase
      .from("quizzes")
      .update({ status: "failed", error_message: errorMessage, updated_at: new Date().toISOString() })
      .eq("id", quizEntryId!) 
      .eq("user_id", user.id)
      .select()
      .single();
    
    if (failUpdateError) {
        console.error("Critical error: Failed to even update quiz status to failed:", failUpdateError);
    }

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    throw new Error(errorMessage);
  }
}


export async function getQuizzesForWorkspace(workspaceId: string): Promise<Quiz[]> {
  const supabase = createClient(); // Updated client creation
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quizzes for workspace:", error);
    throw new Error(error.message || "Failed to fetch quizzes.");
  }
  return data || [];
}
