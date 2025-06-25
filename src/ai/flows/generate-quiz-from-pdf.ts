
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

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).length(4).describe('Exactly four possible answers to the question.'),
      answer: z.string().describe('The correct answer to the question. CRITICAL: This MUST be an exact, verbatim, character-for-character copy of one of the strings from the "options" array for THIS question. No extra text, no summaries, no modifications.'),
      explanation: z.string().describe('A brief explanation for why the answer is correct. This field can elaborate on the concept.'),
    })
  ).describe('The generated quiz questions, options, answers, and explanations.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuizFromPdfs(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromMultiplePdfsPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `**QUIZ GENERATION TASK**

**YOUR ROLE:**
You are an expert quiz generation assistant. Your primary task is to create a single high-quality, unique quiz based on the content of ALL the PDF documents provided and adhering strictly to the user's Quiz Configuration.

**INPUTS:**
There are {{pdfDocuments.length}} PDF document(s) provided. Each document may contain "Knowledge Base Content" and possibly "Example Quiz Questions" for style reference. Your quiz MUST be based ONLY on the "Knowledge Base Content". Do not copy from any example questions.

{{#each pdfDocuments}}
--- START OF DOCUMENT: {{{this.name}}} ---
**Knowledge Base Content (This is the SOLE source of truth for this document):**
{{media url=this.dataUri}}

**Example Quiz Questions (For style reference ONLY for this document):**
No example questions section found in the uploaded file.
--- END OF DOCUMENT: {{{this.name}}} ---
{{/each}}

**QUIZ CONFIGURATION (Strictly Adhere to these settings for the ENTIRE quiz):**
*   **Total Questions to Generate:** {{{totalNumberOfQuestions}}}
*   **Question Distribution:** You MUST strive to distribute the {{{totalNumberOfQuestions}}} questions as evenly as possible among the {{pdfDocuments.length}} document(s).
*   **Preferred Question Styles:** {{#if preferredQuestionStyles}}{{{preferredQuestionStyles}}}{{else}}Multiple choice questions{{/if}}.
    *   If "Short Descriptions (as MCQs)" or "Fill in the blanks (as MCQs)" are selected, you MUST adapt these conceptual question types into a well-formed multiple-choice question format. Each MCQ must have one clearly correct answer and three plausible but incorrect distractors.
*   **Hard Mode:** {{#if hardMode}}Enabled{{else}}Disabled{{/if}}
    *   If Hard Mode is **Enabled**:
        *   Approximately 60% of the {{{totalNumberOfQuestions}}} generated should be 'hard.'
        *   'Hard' questions are defined as tricky but solvable, requiring deeper understanding, synthesis, or distinguishing plausible distractors, based *only* on the "Knowledge Base Content."
*   **Topics/Keywords to Focus On (Optional):** {{#if topicsToFocus}}{{{topicsToFocus}}}{{else}}None{{/if}}
    *   If topics are provided and not "None":
        *   Approximately 60% of the {{{totalNumberOfQuestions}}} should directly relate to these topics/keywords.
*   **Topics/Keywords to Drop (Optional):** {{#if topicsToDrop}}{{{topicsToDrop}}}{{else}}None{{/if}}
    *   If topics are provided and not "None":
        *   Absolutely NO questions should be generated from these topics/keywords. This is a strict exclusion.

**CRITICAL INSTRUCTIONS & CONSTRAINTS:**
1.  **Source Material:** All questions and answers MUST be derived *exclusively* from the provided "Knowledge Base Content" sections of the documents. Do not use external knowledge.
2.  **Uniqueness:** Generate *new and unique* questions.
3.  **Numerical Questions:** If any questions involve numericals or calculations, ensure that all necessary math can be performed mentally or with simple arithmetic, without the need for a calculator. Problem-solving steps required by the user should not involve complex decimal calculations. Whole numbers or simple fractions are preferred.
4.  **Clarity and Accuracy:** Questions should be clear, unambiguous, and grammatically correct. Correct answers must be unequivocally supported by the Knowledge Base Content. Distractors should be plausible but clearly incorrect.
5.  **Distribution Logic:**
    *   If both "Hard Mode" and "Topics to Focus On" are active, strive to meet both percentage requirements. For example, if 10 questions are requested, 6 should be hard, and 6 should be on focus topics. This means some hard questions might also be focus topic questions. Prioritize the "Topics to Drop" constraint above all others.
6.  **Output Format:** Your output MUST be a JSON object that strictly conforms to the provided output schema. It must have a single key "quiz" which is an array of question objects. Each object must contain: "question", "options" (an array of exactly 4 strings), "answer" (which MUST be an exact, verbatim, character-for-character copy of one of the strings from the "options" array for that question), and "explanation".

**BEGIN QUIZ GENERATION.**
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
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate quiz data in the expected format.");
    }
    // Validate that each question has 4 options and the answer is one of them
    output.quiz.forEach(q => {
      if (q.options.length !== 4) {
        console.error(`Validation Error: Question "${q.question}" does not have 4 options. Options: [${q.options.join(', ')}]`);
        throw new Error(`Question "${q.question}" does not have 4 options.`);
      }
      if (!q.options.includes(q.answer)) {
        console.error(`Validation Error: Answer "${q.answer}" not found in options: [${q.options.join(', ')}] for question: "${q.question}"`);
        throw new Error(`Answer for question "${q.question}" is not one of the provided options. The AI returned "${q.answer}" as the answer, but the options were [${q.options.join(', ')}].`);
      }
    });
    return output;
  }
);


