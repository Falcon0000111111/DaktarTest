
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
  dataUri: z
    .string()
    .describe(
      'The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});

const GenerateQuizInputSchema = z.object({
  pdfDocuments: z.array(PdfDocumentSchema).min(1).describe("An array of PDF documents to process."),
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
    explanation: z.string().describe("A brief explanation of why this is the correct answer, referencing the source content."),
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
You are a specialized AI Quiz Generator. Your primary mission is to create a high-quality quiz by directly analyzing the content of the provided PDF file(s). You will be given one or more PDF files and a strict set of user-defined rules. You must meticulously follow all configuration parameters.

### STEP 1: PROCESS THE PROVIDED PDF FILE(S) ###
Your first task is to **open, parse, and thoroughly read the content of the user-uploaded PDF file(s) attached to this request.** This file is your single source of truth.

As you analyze the file, perform the following two sub-tasks:
1.  **Identify the Knowledge Base:** This is the core factual information (definitions, explanations, processes, data) within the PDF. All questions and answers you generate MUST be derived directly from this knowledge base.
2.  **Identify any Example Questions (if present):** The PDF might contain a pre-existing quiz or list of questions. **DO NOT COPY THESE QUESTIONS.** Instead, analyze them to understand the desired *style* (e.g., scenario-based, direct recall), *tone*, and *cognitive complexity*. Your new, unique questions should be "principally similar" to these examples. If no examples are present, infer an appropriate style from the main body of the PDF text.

### STEP 2: GENERATE QUIZ ACCORDING TO STRICT CONFIGURATION ###
Now, generate a brand new quiz based on your analysis of the PDF. Adherence to the following rules, provided in the \`[User-Defined Configuration]\` block, is mandatory.

**A. Core Configuration:**
*   **Total Questions to Generate:** You must generate exactly this number of questions.

**B. Question Style and Format:**
*   **Selected Styles:** The user wants questions that reflect the following styles: \`{{{preferredQuestionStyles}}}\`.
*   **Mandatory MCQ Format:** Regardless of the style, **all output questions must be formatted as Multiple Choice Questions (MCQs)**.
    *   If "Short Descriptions" is selected, create questions like: "Which of the following best describes the concept of X?"
    *   If "Fill in the blanks" is selected, create questions like: "The process of Y uses sunlight to synthesize foods from ___ and water."
    *   Generate a balanced mix of the selected styles.
*   **Natural Phrasing:** Frame questions naturally. You MUST avoid phrases like "According to the PDF," "As explained in the document," or any other direct references to the source material in the question text. The user should feel like they are taking a standard test, not one that is constantly reminding them of the source document.

**C. Difficulty and Complexity:**
*   **Hard Mode:** If this is set to \`true\`, approximately 60% of the questions must be "hard". A "hard" question is tricky but fair and solvable using ONLY the provided PDF content. It should test deeper understanding by requiring synthesis of information from different sections of the PDF, logical inference, or application of concepts to new scenarios.

**D. Topic Control:**
*   **Topics/Keywords to Focus On:** If a list is provided, approximately 60% of the total questions MUST be directly related to these specific topics found within the PDF.
*   **Topics/Keywords to Drop:** You MUST NOT generate any questions, answers, or distractors related to these topics. Completely ignore any sections of the PDF discussing these topics.

**E. Numerical Calculation Rule:**
*   For any question involving numbers or calculations derived from the PDF, design it so that the entire solving process can be done mentally. Use clean, whole numbers. Avoid decimals or complex fractions.

### STEP 3: PROVIDE OUTPUT IN SPECIFIED JSON FORMAT ###
Provide the output as a single, well-formed JSON array. Each object in the array represents a single quiz question and must have the following exact structure:
[
  {
    "question_text": "The full text of the question.",
    "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
    "correct_answer_key": "The key of the correct option (e.g., 'C')",
    "explanation": "A brief explanation of why this is the correct answer, referencing information found in the PDF.",
    "topic": "The primary topic/keyword from the PDF this question relates to.",
    "difficulty": "standard" or "hard"
  }
]

---
### PROVIDED MATERIALS FOR THIS TASK ###

**1. Attached File(s):** The primary source material is contained in the PDF file(s) sent with this request.
{{#each pdfDocuments}}{{media url=this.dataUri}}\n\n{{/each}}

**2. User-Defined Configuration:**
\`\`\`json
{
  "total_questions": {{{totalNumberOfQuestions}}},
  "question_styles": "{{#if preferredQuestionStyles}}{{{preferredQuestionStyles}}}{{else}}Multiple choice questions{{/if}}",
  "hard_mode": {{#if hardMode}}true{{else}}false{{/if}},
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
