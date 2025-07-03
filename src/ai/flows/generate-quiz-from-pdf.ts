
'use server';
/**
 * @fileOverview Generates a single quiz from one or more PDF documents,
 * distributing questions among the provided documents and considering additional parameters.
 *
 * - generateQuizFromPdfs - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuizFromPdfs function.
 * - GenerateQuizOutput - The return type for the generateQuizFromPdfs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PdfDocumentSchema = z.object({
  name: z.string().describe("The original filename of the PDF."),
  category: z.string().optional().describe("The user-assigned category for the document (e.g., 'Biology', 'Physics')."),
  dataUri: z
    .string()
    .describe(
      'The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});

const GenerateQuizInputSchema = z.object({
  pdfDocuments: z.array(PdfDocumentSchema).min(1).describe("An array of PDF documents to process, each potentially with a category."),
  totalNumberOfQuestions: z
    .number()
    .min(1)
    .describe('The total desired number of questions in the quiz, to be distributed among the documents.'),
  preferredQuestionStyles: z
    .string()
    .optional()
    .describe('Optional comma-separated list of preferred styles for questions (e.g., "multiple-choice, short-descriptions, fill-in-the-blanks"). All output must ultimately be in Multiple Choice Question (MCQ) format. If "short-descriptions" or "fill-in-the-blanks" are requested, they MUST be adapted into MCQs.'),
  hardMode: z
    .boolean()
    .optional()
    .describe('If true, questions MUST be made significantly more challenging, requiring deeper understanding or synthesis of information. This is not a suggestion but a requirement.'),
  numericalMode: z
    .boolean()
    .optional()
    .describe('If true, all generated questions MUST be numerical problems that require multi-step solutions. This overrides other style preferences.'),
  topicsToFocus: z
    .string()
    .optional()
    .describe('Optional comma-separated list of topics or keywords. AI MUST prioritize generating questions related to these specific topics.'),
  topicsToDrop: z
    .string()
    .optional()
    .describe('Optional comma-separated list of topics or keywords. AI MUST avoid generating questions related to these specific topics.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GeneratedQuestionSchema = z.object({
    question_text: z.string().describe("The full text of the question."),
    options: z.object({
        A: z.string(),
        B: z.string(),
        C: z.string(),
        D: z.string(),
    }).describe("An object containing four possible answers, with keys 'A', 'B', 'C', 'D'."),
    correct_answer_key: z.enum(['A', 'B', 'C', 'D']).describe("The key ('A', 'B', 'C', or 'D') corresponding to the correct answer in the 'options' object."),
    explanation: z.string().describe("A brief explanation of why the answer is correct. For numerical questions, this MUST be a step-by-step solution, with each step on a new line (using '\\n'), clearly demonstrating how to arrive at the correct option."),
    topic: z.string().describe("The primary topic/keyword this question relates to."),
    difficulty: z.enum(['standard', 'hard']).describe("The difficulty of the question, either 'standard' or 'hard'."),
});

// This is the schema for the object we use throughout the app.
const GenerateQuizOutputSchema = z.object({
  quiz: z.array(GeneratedQuestionSchema)
    .describe('An array of generated quiz question objects.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

// This is the schema for the raw output from the AI, which is just an array.
const AiOutputSchema = z.array(GeneratedQuestionSchema);

export async function generateQuizFromPdfs(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromMultiplePdfsPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: AiOutputSchema},
  prompt: `### ROLE & GOAL ###
You are a specialized AI Quiz Generator. Your primary mission is to create a high-quality quiz by directly analyzing the content of the provided PDF file(s). You will be given one or more PDF files, each potentially with a user-assigned category (e.g., Physics, Biology). You should consider this category as a strong hint about the document's subject matter. You must meticulously follow all configuration parameters.

### STEP 1: CONTENT ANALYSIS & INSPIRATION ###
Your first task is to open, parse, and thoroughly read the content of all provided PDF files. As you analyze, you MUST take inspiration from any example questions present in the PDFs.
- **Take Inspiration from Example Questions:** Scrutinize the PDF, especially towards the end, for any existing quizzes or example questions. **DO NOT COPY THESE QUESTIONS.** Instead, you MUST use them as a primary source of inspiration. Analyze their structure, style (e.g., scenario-based, direct recall), tone, and cognitive level. Your new, unique questions MUST be "principally similar" to these examples to guide the question generation process. If no examples are present, you must infer an appropriate style from the main body of the PDF text.

### STEP 2: QUIZ GENERATION ###
Now, generate a brand new quiz based on your analysis and the user's configuration. You MUST strictly adhere to all of the following rules.

{{#if numericalMode}}
### RULE: NUMERICAL MODE (OVERRIDE) ###
You MUST generate ONLY questions that require multi-step numerical solutions. All other rules regarding question style or topic distribution are secondary to this primary directive. For these numerical questions, the "explanation" field in the JSON output MUST provide a clear, step-by-step walkthrough of the calculation process. Each step of the calculation MUST be on its own line, separated by a newline character (\\\\n). All questions must be designed to be solvable without a calculator, using clean, whole numbers.
{{else}}
### RULES: STANDARD/HARD MODE ###

**A. Core Configuration:**
*   **Total Questions:** You must generate exactly the number of questions specified in \`total_questions\`.
*   **Question Distribution:** If multiple documents are provided, you MUST strive to distribute the total number of questions proportionally among them, based on their content length and relevance. Do not focus on just one document if multiple are given.

**B. Question Style and Format:**
*   **Selected Styles:** The user wants questions that reflect the following styles: \`{{{preferredQuestionStyles}}}\`.
*   **Mandatory MCQ Format:** Regardless of the style, **all output questions must be formatted as Multiple Choice Questions (MCQs)**.
    *   If "Short Descriptions" is selected, create questions like: "Which of the following best describes the concept of X?"
    *   If "Fill in the blanks" is selected, create questions like: "The process of Y uses sunlight to synthesize foods from ___ and water."
    *   Generate a balanced mix of the selected styles.
*   **Natural Phrasing:** Frame questions naturally. You MUST avoid phrases like "According to the PDF," "As explained in the document," or any other direct references to the source material in the question text.

**C. Difficulty and Topic Control:**
*   **Hard Mode:** If \`hard_mode\` is \`true\`, questions MUST be made significantly more challenging. This is not a suggestion but a requirement. A "hard" question requires synthesis of information, logical inference, or application of concepts to new scenarios. For conceptual questions, both the question statement and the answer options should be intentionally tricky, with plausible-sounding but incorrect distractors. For any numerical questions included, they must involve multiple steps.
*   **Topics to Focus On:** If a list is provided in \`focus_on_topics\`, a majority of the questions MUST be directly related to these specific topics.
*   **Topics to Drop:** You MUST NOT generate any questions related to topics listed in \`drop_topics\`.

**D. Numerical Calculation & Explanation Rule:**
*   **Calculation:** All questions involving numbers MUST be solvable without a calculator. Use clean, whole numbers.
*   **Explanation:** For any numerical question, the "explanation" field in the JSON output MUST provide a clear, step-by-step walkthrough of how to arrive at the correct answer. Each step of the calculation MUST be on its own line, separated by a newline character (\\\\n).
{{/if}}

### STEP 3: PROVIDE OUTPUT IN SPECIFIED JSON FORMAT ###
Provide the output as a single, well-formed JSON array. Each object in the array represents a single quiz question and must have the following exact structure:
[
  {
    "question_text": "The full text of the question.",
    "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
    "correct_answer_key": "The key of the correct option (e.g., 'C')",
    "explanation": "A brief explanation of why this is the correct answer. For numerical questions, this MUST be a step-by-step solution, with each step on a new line (using '\\\\n').",
    "topic": "The primary topic/keyword from the PDF this question relates to.",
    "difficulty": "standard" or "hard"
  }
]

---
### PROVIDED MATERIALS FOR THIS TASK ###

**1. Attached File(s):** The primary source material is contained in the PDF file(s) sent with this request.
{{#each pdfDocuments}}
---
**File:** {{{this.name}}}
{{#if this.category}}**Category:** {{{this.category}}}{{/if}}
**Content:**
{{{media url=this.dataUri}}}
---
{{/each}}

**2. User-Defined Configuration:**
\`\`\`json
{
  "total_questions": {{{totalNumberOfQuestions}}},
  "question_styles": "{{#if preferredQuestionStyles}}{{{preferredQuestionStyles}}}{{else}}Multiple choice questions{{/if}}",
  "hard_mode": {{#if hardMode}}true{{else}}false{{/if}},
  "numerical_mode": {{#if numericalMode}}true{{else}}false{{/if}},
  "focus_on_topics": "{{#if topicsToFocus}}{{{topicsToFocus}}}{{else}}None{{/if}}",
  "drop_topics": "{{#if topicsToDrop}}{{{topicsToDrop}}}{{else}}None{{/if}}"
}
\`\`\`
`,
    config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
       {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  }
});

const generateQuizFromPdfFlow = ai.defineFlow(
  {
    name: 'generateQuizFromMultiplePdfsFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema, // The flow's output is the app's data structure
  },
  async input => {
    // The prompt returns a raw array, validated against AiOutputSchema.
    const {output: aiOutputArray} = await prompt(input);
    
    if (!aiOutputArray || !Array.isArray(aiOutputArray) || aiOutputArray.length === 0) {
      throw new Error("AI failed to generate quiz data in the expected format.");
    }
    
    // We wrap the AI's raw array output in the object structure our app expects.
    // This now matches the flow's defined outputSchema.
    return { quiz: aiOutputArray };
  }
);
