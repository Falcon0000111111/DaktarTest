
"use server";

import { createClient } from "@/lib/supabase/server";
import { generateQuizFromPdfs, type GenerateQuizInput, type GenerateQuizOutput } from "@/ai/flows/generate-quiz-from-pdf";
import type { Quiz, NewQuiz } from "@/types/supabase";
import { revalidatePath } from "next/cache";

interface PdfDocumentInput {
  name: string;
  dataUri: string;
}

interface GenerateQuizFromPdfsParams {
  workspaceId: string;
  pdfDocuments: PdfDocumentInput[];
  totalNumberOfQuestions: number;
  passingScorePercentage?: number | null; // New
  quizTitle?: string;
  existingQuizIdToUpdate?: string;
  preferredQuestionStyles?: string;
  hardMode?: boolean;
  topicsToFocus?: string;
  topicsToDrop?: string;
}

export async function generateQuizFromPdfsAction(params: GenerateQuizFromPdfsParams): Promise<Quiz> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { 
    workspaceId, 
    pdfDocuments, 
    totalNumberOfQuestions, 
    passingScorePercentage, // New
    quizTitle, 
    existingQuizIdToUpdate,
    preferredQuestionStyles,
    hardMode,
    topicsToFocus,
    topicsToDrop 
  } = params;

  if (!pdfDocuments || pdfDocuments.length === 0) {
    throw new Error("At least one PDF document is required.");
  }
  if (passingScorePercentage !== undefined && passingScorePercentage !== null && (passingScorePercentage < 0 || passingScorePercentage > 100)) {
    throw new Error("Passing score percentage must be between 0 and 100.");
  }


  let quizEntryId = existingQuizIdToUpdate;

  let dbQuizName = quizTitle;
  if (!dbQuizName) {
    if (pdfDocuments.length > 1) {
      dbQuizName = `Quiz from ${pdfDocuments.length} documents`;
    } else if (pdfDocuments.length === 1) {
      dbQuizName = pdfDocuments[0].name;
    } else {
      dbQuizName = "Untitled Quiz";
    }
  }

  if (!quizEntryId) {
    const initialQuizData: NewQuiz = {
      workspace_id: workspaceId,
      user_id: user.id,
      pdf_name: dbQuizName,
      num_questions: totalNumberOfQuestions,
      passing_score_percentage: passingScorePercentage, // New
      last_attempt_score_percentage: null, // Initialize
      last_attempt_passed: null, // Initialize
      status: "processing",
      error_message: null,
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
      .update({
        status: "processing",
        error_message: null,
        num_questions: totalNumberOfQuestions,
        pdf_name: dbQuizName, 
        passing_score_percentage: passingScorePercentage, // Update if regenerating
        last_attempt_score_percentage: null, // Reset attempt on regeneration
        last_attempt_passed: null, // Reset attempt on regeneration
        updated_at: new Date().toISOString()
      })
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
      pdfDocuments: pdfDocuments.map(doc => ({ name: doc.name, dataUri: doc.dataUri })),
      totalNumberOfQuestions: totalNumberOfQuestions,
      preferredQuestionStyles: preferredQuestionStyles,
      hardMode: hardMode,
      topicsToFocus: topicsToFocus,
      topicsToDrop: topicsToDrop,
    };

    const generatedData: GenerateQuizOutput = await generateQuizFromPdfs(aiInput);

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
      if (quizEntryId) {
        await supabase
          .from("quizzes")
          .update({ status: "failed", error_message: updateError?.message || "Failed to save generated quiz content.", updated_at: new Date().toISOString() })
          .eq("id", quizEntryId)
          .eq("user_id", user.id);
      }
      revalidatePath(`/dashboard/workspace/${workspaceId}`); 
      throw new Error(updateError?.message || "Failed to update quiz with generated data.");
    }

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    return updatedQuiz;

  } catch (error) {
    console.error(`Error during AI flow or DB update (Quiz ID: ${quizEntryId}):`, error);

    let detailedErrorMessage = "An unknown error occurred during quiz generation.";
    if (error instanceof Error) {
      detailedErrorMessage = error.message;
    } else if (typeof error === 'string') {
      detailedErrorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      detailedErrorMessage = error.message;
    }
    
    if (quizEntryId) {
      await supabase
        .from("quizzes")
        .update({ status: "failed", error_message: detailedErrorMessage, updated_at: new Date().toISOString() })
        .eq("id", quizEntryId)
        .eq("user_id", user.id);
    }

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    throw new Error(detailedErrorMessage);
  }
}

export async function updateQuizAttemptResultAction(
  quizId: string, 
  scorePercentage: number, 
  passed: boolean,
  numQuestions: number, // Kept for potential future use, not directly stored now
  passingScorePercentage: number | null // Kept for potential future use, not directly stored now
  ): Promise<Quiz> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: updatedQuiz, error } = await supabase
    .from("quizzes")
    .update({
      last_attempt_score_percentage: scorePercentage,
      last_attempt_passed: passed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quizId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updatedQuiz) {
    console.error("Error updating quiz attempt result:", error);
    throw new Error(error?.message || "Failed to update quiz attempt result.");
  }
  revalidatePath(`/dashboard/workspace/${updatedQuiz.workspace_id}`);
  return updatedQuiz;
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

export async function deleteQuizAction(quizId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: quizData, error: fetchError } = await supabase
    .from("quizzes")
    .select("workspace_id")
    .eq("id", quizId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !quizData) {
    console.error("Error fetching quiz for deletion or quiz not found:", fetchError);
    throw new Error(fetchError?.message || "Quiz not found or permission denied.");
  }
  
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting quiz:", error);
    throw new Error(error.message || "Failed to delete quiz.");
  }
  revalidatePath(`/dashboard/workspace/${quizData.workspace_id}`);
  revalidatePath(`/dashboard`);
}

export async function renameQuizAction(quizId: string, newName: string): Promise<Quiz> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }
  if (!newName.trim()) {
    throw new Error("Quiz name cannot be empty.");
  }

  const { data: updatedQuiz, error } = await supabase
    .from("quizzes")
    .update({ pdf_name: newName, updated_at: new Date().toISOString() })
    .eq("id", quizId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updatedQuiz) {
    console.error("Error renaming quiz:", error);
    throw new Error(error?.message || "Failed to rename quiz.");
  }
  revalidatePath(`/dashboard/workspace/${updatedQuiz.workspace_id}`);
  revalidatePath(`/dashboard`);
  return updatedQuiz;
}

export async function renameSourcePdfInQuizzesAction(workspaceId: string, oldPdfName: string, newPdfName: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }
  if (!newPdfName.trim()) {
    throw new Error("New PDF name cannot be empty.");
  }
  if (oldPdfName === newPdfName) {
    return; 
  }

  const { error } = await supabase
    .from("quizzes")
    .update({ pdf_name: newPdfName, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("pdf_name", oldPdfName);

  if (error) {
    console.error("Error renaming source PDF in quizzes:", error);
    throw new Error(error.message || "Failed to rename source PDF in quizzes.");
  }
  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  revalidatePath(`/dashboard`);
}

export async function deleteQuizzesBySourcePdfAction(workspaceId: string, pdfName: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("pdf_name", pdfName);

  if (error) {
    console.error("Error deleting quizzes by source PDF name:", error);
    throw new Error(error.message || "Failed to delete quizzes by source PDF name.");
  }
  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  revalidatePath(`/dashboard`);
}
