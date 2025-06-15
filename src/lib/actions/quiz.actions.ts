"use server";

import { createClient } from "@/lib/supabase/server"; 
import { generateQuizFromPdf, type GenerateQuizInput, type GenerateQuizOutput } from "@/ai/flows/generate-quiz-from-pdf";
import type { Quiz, NewQuiz } from "@/types/supabase";
import { revalidatePath } from "next/cache";


interface GenerateQuizParams {
  workspaceId: string;
  pdfName: string;
  pdfDataUri: string;
  numberOfQuestions: number;
  existingQuizIdToUpdate?: string; 
}

export async function generateQuizFromPdfAction(params: GenerateQuizParams): Promise<Quiz> {
  const supabase = createClient(); 
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { workspaceId, pdfName, pdfDataUri, numberOfQuestions, existingQuizIdToUpdate } = params;

  let quizEntryId = existingQuizIdToUpdate;
  let operationType: 'insert' | 'update' = 'insert';


  if (!quizEntryId) {
    const initialQuizData: NewQuiz = {
      workspace_id: workspaceId,
      user_id: user.id,
      pdf_name: pdfName,
      num_questions: numberOfQuestions,
      status: "processing",
      error_message: null, // Ensure error message is cleared on new attempt
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
    operationType = 'update';
     const { error: updateToProcessingError } = await supabase
      .from("quizzes")
      .update({ 
        status: "processing", 
        error_message: null, // Clear previous errors
        num_questions: numberOfQuestions, // Update num_questions in case it changed
        pdf_name: pdfName, // Update pdf_name in case it changed (though less likely for re-gen)
        updated_at: new Date().toISOString() 
      })
      .eq("id", quizEntryId)
      .eq("user_id", user.id);

    if (updateToProcessingError) {
      console.error("Error updating quiz to processing for retry:", updateToProcessingError);
      throw new Error(updateToProcessingError?.message || "Failed to set quiz to processing for retry.");
    }
  }
  
  // Revalidate immediately after setting to "processing" so UI updates
  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  revalidatePath(`/dashboard`); // Also revalidate main dashboard if quiz lists are there

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
      // Attempt to set status to failed if update fails
      await supabase
        .from("quizzes")
        .update({ status: "failed", error_message: "Failed to save generated quiz content.", updated_at: new Date().toISOString() })
        .eq("id", quizEntryId)
        .eq("user_id", user.id);
      revalidatePath(`/dashboard/workspace/${workspaceId}`);
      revalidatePath(`/dashboard`);
      throw new Error(updateError?.message || "Failed to update quiz with generated data.");
    }
    
    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    revalidatePath(`/dashboard`);
    return updatedQuiz;

  } catch (error) {
    console.error(`Error during AI flow or DB update (Quiz ID: ${quizEntryId}):`, error);
    const errorMessage = (error instanceof Error) ? error.message : "Unknown error during quiz generation.";
    
    if (quizEntryId) {
      await supabase
        .from("quizzes")
        .update({ status: "failed", error_message: errorMessage, updated_at: new Date().toISOString() })
        .eq("id", quizEntryId) 
        .eq("user_id", user.id);
    }
    
    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    revalidatePath(`/dashboard`);
    throw new Error(errorMessage); // Re-throw the specific error
  }
}


export async function getQuizzesForWorkspace(workspaceId: string): Promise<Quiz[]> {
  const supabase = createClient(); 
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn("getQuizzesForWorkspace called without an authenticated user.");
    return [];
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error fetching quizzes for workspace. Raw error:", JSON.stringify(error, null, 2));
    const messageParts = [
      `Failed to fetch quizzes for workspace ${workspaceId}.`,
      error.message ? `Message: ${error.message}` : 'Unknown error.',
      error.code ? `Code: ${error.code}` : null,
      error.details ? `Details: ${error.details}` : null,
      error.hint ? `Hint: ${error.hint}` : null,
    ];
    const errorMessage = messageParts.filter(part => part !== null).join(' ');
    console.error("Constructed error message for throw:", errorMessage);
    throw new Error(errorMessage);
  }
  return data || [];
}
