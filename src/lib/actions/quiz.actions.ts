
"use server";

import { createClient } from "@/lib/supabase/server";
import { generateQuizFromPdfs, type GenerateQuizInput, type GenerateQuizOutput } from "@/ai/flows/generate-quiz-from-pdf";
import type { Quiz, NewQuiz, StoredQuizData } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { getKnowledgeBaseFileAsDataUri } from "./knowledge.actions";
import { cookies } from "next/headers";

interface GenerateQuizFromPdfsParams {
  workspaceId: string;
  knowledgeFileStoragePaths: string[];
  totalNumberOfQuestions: number;
  passingScorePercentage?: number | null;
  durationMinutes?: number | null;
  quizTitle?: string;
  existingQuizIdToUpdate?: string;
  preferredQuestionStyles?: string;
  hardMode?: boolean;
  numericalMode?: boolean;
  topicsToFocus?: string;
  topicsToDrop?: string;
}

export async function generateQuizFromPdfsAction(params: GenerateQuizFromPdfsParams): Promise<Quiz> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to generate a quiz.");
  }

  // Manually check the user's request limit before proceeding.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("llm_requests_count, llm_request_limit")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Could not find your profile to check your quiz generation limit.");
  }

  if (profile.llm_requests_count >= profile.llm_request_limit) {
    throw new Error("You have reached your maximum quiz generation limit.");
  }

  const { 
    workspaceId, 
    knowledgeFileStoragePaths, 
    totalNumberOfQuestions, 
    passingScorePercentage,
    durationMinutes,
    quizTitle, 
    existingQuizIdToUpdate,
    preferredQuestionStyles,
    hardMode,
    numericalMode,
    topicsToFocus,
    topicsToDrop 
  } = params;

  if (!knowledgeFileStoragePaths || knowledgeFileStoragePaths.length === 0) {
    throw new Error("Please select at least one document from the Knowledge Base.");
  }
  if (passingScorePercentage !== undefined && passingScorePercentage !== null && (passingScorePercentage < 0 || passingScorePercentage > 100)) {
    throw new Error("Passing score must be between 0 and 100.");
  }

  // Increment the user's request count BEFORE calling the AI.
  const { error: incrementError } = await supabase
    .from("profiles")
    .update({ llm_requests_count: profile.llm_requests_count + 1 })
    .eq("id", user.id);
  
  if (incrementError) {
      throw new Error("Failed to update your request count. Please try again.");
  }
  
  const pdfDocuments = await Promise.all(
    knowledgeFileStoragePaths.map(path => getKnowledgeBaseFileAsDataUri(path))
  );

  let dbQuizName = quizTitle;
  if (!dbQuizName) {
    if (pdfDocuments.length > 1) {
      dbQuizName = `Quiz from ${pdfDocuments.length} files`;
    } else if (pdfDocuments.length === 1) {
      dbQuizName = pdfDocuments[0].name;
    } else {
      dbQuizName = "Untitled Quiz";
    }
  }

  let quizEntryId = existingQuizIdToUpdate;

  if (!quizEntryId) {
    const initialQuizData: NewQuiz = {
      workspace_id: workspaceId,
      user_id: user.id,
      pdf_name: dbQuizName,
      num_questions: totalNumberOfQuestions,
      passing_score_percentage: passingScorePercentage,
      duration_minutes: durationMinutes,
      status: "processing",
    };

    const { data: newQuizEntry, error: createError } = await supabase
      .from("quizzes")
      .insert(initialQuizData)
      .select("id")
      .single();

    if (createError || !newQuizEntry) {
      console.error("Error creating initial quiz entry:", createError);
      throw new Error("Failed to create a new quiz entry in the database.");
    }
    quizEntryId = newQuizEntry.id;
  } else {
     const { error: updateToProcessingError } = await supabase
      .from("quizzes")
      .update({
        status: "processing",
        error_message: null,
        generated_quiz_data: null,
        num_questions: totalNumberOfQuestions,
        pdf_name: dbQuizName, 
        passing_score_percentage: passingScorePercentage,
        duration_minutes: durationMinutes,
        last_attempt_score_percentage: null, 
        last_attempt_passed: null, 
      })
      .eq("id", quizEntryId)
      .eq("user_id", user.id);

    if (updateToProcessingError) {
      console.error("Error updating quiz to processing for retry:", updateToProcessingError);
      throw new Error("Failed to prepare the quiz for re-generation.");
    }
  }

  revalidatePath(`/dashboard/workspace/${workspaceId}`);

  try {
    const aiInput: GenerateQuizInput = {
      pdfDocuments: pdfDocuments,
      totalNumberOfQuestions: totalNumberOfQuestions,
      preferredQuestionStyles: preferredQuestionStyles,
      hardMode: hardMode,
      numericalMode: numericalMode,
      topicsToFocus: topicsToFocus,
      topicsToDrop: topicsToDrop,
    };

    const generatedData: GenerateQuizOutput = await generateQuizFromPdfs(aiInput);

    const quizDataToStore: StoredQuizData = {
      ...generatedData,
      source_document_paths: knowledgeFileStoragePaths,
    };

    const { data: updatedQuiz, error: updateError } = await supabase
      .from("quizzes")
      .update({
        generated_quiz_data: quizDataToStore as any,
        status: "completed",
        error_message: null,
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
          .update({ status: "failed", error_message: "Failed to save the generated quiz content." })
          .eq("id", quizEntryId)
          .eq("user_id", user.id);
      }
      revalidatePath(`/dashboard/workspace/${workspaceId}`); 
      throw new Error("Failed to save the newly generated quiz data.");
    }

    revalidatePath(`/dashboard/workspace/${workspaceId}`);
    return updatedQuiz;

  } catch (error) {
    let detailedErrorMessage = "An unknown error occurred during quiz generation.";
    if (error instanceof Error) {
      detailedErrorMessage = error.message;
    }
    
    // Make AI-specific errors more user-friendly
    if (detailedErrorMessage.includes("unsuitable for quiz generation")) {
       detailedErrorMessage = "The AI had trouble with the selected document(s). Please try a different file or adjust your settings.";
    }

    if (quizEntryId) {
        await supabase
          .from("quizzes")
          .update({ status: "failed", error_message: detailedErrorMessage })
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
  passed: boolean | null
): Promise<Quiz> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to save your quiz results.");
  }

  const { data: updatedQuiz, error } = await supabase
    .from("quizzes")
    .update({
      last_attempt_score_percentage: scorePercentage,
      last_attempt_passed: passed,
    })
    .eq("id", quizId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updatedQuiz) {
    console.error("Error updating quiz attempt result:", error);
    throw new Error("Could not save your quiz results. Please try again.");
  }
  revalidatePath(`/dashboard/workspace/${updatedQuiz.workspace_id}`);
  return updatedQuiz;
}


export async function getQuizzesForWorkspace(workspaceId: string): Promise<Quiz[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn("getQuizzesForWorkspace called without an authenticated user.");
    return [];
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("id, workspace_id, user_id, pdf_name, num_questions, status, error_message, created_at, updated_at, passing_score_percentage, last_attempt_score_percentage, last_attempt_passed, duration_minutes, generated_quiz_data")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error fetching quizzes for workspace:", error);
    throw new Error(`Failed to load quizzes for this workspace. Please refresh the page.`);
  }
  return data || [];
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to view a quiz.");
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*") 
    .eq("id", quizId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error("Error fetching quiz by ID:", error);
    throw new Error("Could not load the selected quiz. Please try again.");
  }
  return data;
}


export async function deleteQuizAction(quizId: string): Promise<void> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to delete a quiz.");
  }

  const { data: quizData, error: fetchError } = await supabase
    .from("quizzes")
    .select("workspace_id")
    .eq("id", quizId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !quizData) {
    console.error("Error fetching quiz for deletion or quiz not found:", fetchError);
    throw new Error("The quiz could not be found or you don't have permission to delete it.");
  }
  
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting quiz:", error);
    throw new Error("Failed to delete the quiz. Please try again.");
  }
  revalidatePath(`/dashboard/workspace/${quizData.workspace_id}`);
  revalidatePath(`/dashboard`);
}

export async function renameQuizAction(quizId: string, newName: string): Promise<Quiz> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to rename a quiz.");
  }
  if (!newName.trim()) {
    throw new Error("Quiz name cannot be empty.");
  }

  const { data: updatedQuiz, error } = await supabase
    .from("quizzes")
    .update({ pdf_name: newName })
    .eq("id", quizId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updatedQuiz) {
    console.error("Error renaming quiz:", error);
    throw new Error("Failed to rename the quiz. Please try again.");
  }
  revalidatePath(`/dashboard/workspace/${updatedQuiz.workspace_id}`);
  revalidatePath(`/dashboard`);
  return updatedQuiz;
}

export async function renameQuizzesBySourcePdfAction(workspaceId: string, oldName: string, newName: string): Promise<void> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to perform this action.");
  }
  if (!newName.trim()) {
    throw new Error("The new name cannot be empty.");
  }

  const { error } = await supabase
    .from("quizzes")
    .update({ pdf_name: newName, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("pdf_name", oldName);

  if (error) {
    console.error("Error renaming quizzes by source PDF name:", error);
    throw new Error("Failed to rename the quizzes. Please try again.");
  }
  revalidatePath(`/dashboard/workspace/${workspaceId}`);
}
