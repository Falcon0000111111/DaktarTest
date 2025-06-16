
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
      status: "processing",
      error_message: null,
      // placeholder for new params if we decide to store them on the quiz row later
      // preferred_question_styles: preferredQuestionStyles, 
      // hard_mode: hardMode,
      // topics_focus: topicsToFocus,
      // topics_drop: topicsToDrop,
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
        updated_at: new Date().toISOString()
        // placeholder for new params if we decide to store them
      })
      .eq("id", quizEntryId)
      .eq("user_id", user.id);

    if (updateToProcessingError) {
      console.error("Error updating quiz to processing for retry:", updateToProcessingError);
      throw new Error(updateToProcessingError?.message || "Failed to set quiz to processing for retry.");
    }
  }

  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  revalidatePath(`/dashboard`);

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
      revalidatePath(`/dashboard`);
      throw new Error(updateError?.message || "Failed to update quiz with generated data.");
    }

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    revalidatePath(`/dashboard`);
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
    revalidatePath(`/dashboard`);
    throw new Error(detailedErrorMessage);
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
