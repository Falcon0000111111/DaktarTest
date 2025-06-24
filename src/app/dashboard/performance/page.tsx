import { Header } from "@/components/layout/header";
import { getPerformanceData } from "@/lib/actions/performance.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { PerformanceChart } from "@/components/dashboard/performance-chart";

export default async function PerformanceDashboardPage() {
    const performanceData = await getPerformanceData();

    const {
        overallAverageScore,
        totalQuizzesTaken,
        quizzesPassed,
        quizzesFailed,
        performanceBySource,
        strengths,
        weaknesses,
    } = performanceData;

    return (
        <div className="flex flex-col h-full">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Performance Dashboard</h1>
                    <p className="text-muted-foreground">Your overall progress and insights across all quizzes.</p>
                </div>

                {totalQuizzesTaken === 0 ? (
                    <Card className="text-center py-16">
                        <CardHeader>
                            <CardTitle>No Data Yet</CardTitle>
                            <CardDescription>
                                Take some quizzes to see your performance analysis here.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : (
                  <>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overall Average Score</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{overallAverageScore}%</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Quizzes Taken</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalQuizzesTaken}</div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Quizzes Passed</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{quizzesPassed}</div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Quizzes Failed</CardTitle>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{quizzesFailed}</div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="grid gap-6 mt-6 grid-cols-1 lg:grid-cols-2">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                                    Strengths
                                </CardTitle>
                                <CardDescription>Topics where you consistently score high (Avg. &gt;= 80%).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {strengths.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {strengths.map(s => <Badge key={s} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/80">{s}</Badge>)}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No specific strengths identified yet. Keep practicing!</p>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
                                    Areas for Improvement
                                </CardTitle>
                                <CardDescription>Topics where your score could be better (Avg. &lt; 60%).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {weaknesses.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {weaknesses.map(w => <Badge key={w} variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/80">{w}</Badge>)}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No specific areas for improvement found. Great job!</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {performanceBySource.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Performance by Source</CardTitle>
                                <CardDescription>Average scores for quizzes grouped by their source document.</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-0">
                                <PerformanceChart data={performanceBySource} />
                            </CardContent>
                        </Card>
                    )}
                  </>
                )}
            </main>
        </div>
    );
}
