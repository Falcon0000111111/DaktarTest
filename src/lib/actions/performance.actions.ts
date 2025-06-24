'use server';

import { createClient } from "@/lib/supabase/server";
import type { Quiz } from "@/types/supabase";

export interface PerformanceData {
  overallAverageScore: number;
  totalQuizzesTaken: number;
  quizzesPassed: number;
  quizzesFailed: number;
  performanceBySource: {
    sourceName: string;
    averageScore: number;
    quizzesTaken: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}

export async function getPerformanceData(): Promise<PerformanceData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("pdf_name, last_attempt_score_percentage, last_attempt_passed")
    .eq("user_id", user.id)
    .not("last_attempt_score_percentage", "is", null);

  if (error) {
    console.error("Error fetching performance data:", error);
    throw new Error(error.message || "Failed to fetch performance data.");
  }

  if (!quizzes || quizzes.length === 0) {
    return {
      overallAverageScore: 0,
      totalQuizzesTaken: 0,
      quizzesPassed: 0,
      quizzesFailed: 0,
      performanceBySource: [],
      strengths: [],
      weaknesses: [],
    };
  }

  const totalQuizzesTaken = quizzes.length;
  const overallAverageScore = Math.round(
    quizzes.reduce((acc, q) => acc + (q.last_attempt_score_percentage || 0), 0) / totalQuizzesTaken
  );
  
  const quizzesPassed = quizzes.filter(q => q.last_attempt_passed === true).length;
  const quizzesFailed = quizzes.filter(q => q.last_attempt_passed === false).length;

  const sourcePerformance: Record<string, { totalScore: number; count: number }> = {};
  quizzes.forEach(quiz => {
    const sourceName = quiz.pdf_name || "Untitled Quizzes";
    if (!sourcePerformance[sourceName]) {
      sourcePerformance[sourceName] = { totalScore: 0, count: 0 };
    }
    sourcePerformance[sourceName].totalScore += quiz.last_attempt_score_percentage || 0;
    sourcePerformance[sourceName].count++;
  });

  const performanceBySource = Object.entries(sourcePerformance).map(([sourceName, data]) => ({
    sourceName,
    averageScore: Math.round(data.totalScore / data.count),
    quizzesTaken: data.count,
  })).sort((a, b) => b.averageScore - a.averageScore);

  const strengths = performanceBySource.filter(p => p.averageScore >= 80).map(p => p.sourceName);
  const weaknesses = performanceBySource.filter(p => p.averageScore < 60).map(p => p.sourceName);

  return {
    overallAverageScore,
    totalQuizzesTaken,
    quizzesPassed,
    quizzesFailed,
    performanceBySource,
    strengths,
    weaknesses,
  };
}
