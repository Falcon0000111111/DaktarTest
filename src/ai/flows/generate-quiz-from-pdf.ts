
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

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(GeneratedQuestionSchema)
    .describe('An array of generated quiz question objects.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuizFromPdfs(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromMultiplePdfsPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `### ROLE & GOAL ###
You are an expert AI Quiz Generator. Your mission is to create a high-quality quiz based on the provided raw text content and a strict set of user-defined rules. You must meticulously follow all configuration parameters.

### STEP 1: ANALYZE THE PROVIDED CONTENT ###
The user has uploaded raw text content below under \`[User-Uploaded Content]\`. This content is your **single source of truth**. It might be a clean textbook chapter, or it could contain both a knowledge base and some example questions.

Your first task is to intelligently parse this content.
1.  **Identify the Knowledge Base:** This is the primary factual information (definitions, explanations, processes, data). All questions and answers MUST be derived directly from this.
2.  **Identify any Example Questions (if present):** If you find what looks like a pre-existing quiz or list of questions, **DO NOT COPY THEM**. Instead, analyze them to understand the desired *style* (e.g., scenario-based, direct recall), *tone* (formal, informal), and *cognitive complexity*. Your new, unique questions should be "principally similar" to these examples. If no examples are present, infer the style from the knowledge base text itself.

### STEP 2: GENERATE QUIZ ACCORDING TO STRICT CONFIGURATION ###
Now, generate a brand new quiz. Adherence to the following rules, provided in the \`[User-Defined Configuration]\` block, is mandatory.

**A. Core Configuration:**
*   **Total Questions to Generate:** You must generate exactly this number of questions.

**B. Question Style and Format:**
*   **Selected Styles:** The user wants questions that reflect the following styles: \`{{{preferredQuestionStyles}}}\`.
*   **Mandatory MCQ Format:** Regardless of the style, **all output questions must be formatted as Multiple Choice Questions (MCQs)**.
    *   If "Short Descriptions" is selected, create questions like: "Which of the following best describes [concept]?"
    *   If "Fill in the blanks" is selected, create questions like: "Complete the following sentence: 'The process of photosynthesis uses sunlight to synthesize foods from ___ and water.'" providing the missing word/phrase as the correct option.
    *   Generate a balanced mix of the selected styles.

**C. Difficulty and Complexity:**
*   **Hard Mode:** If this is set to \`true\`, approximately 60% of the questions must be "hard". A "hard" question is tricky but fair and solvable using ONLY the provided content. It should test deeper understanding by requiring:
    *   Synthesizing information from multiple parts of the text.
    *   Making logical inferences or deductions.
    *   Applying a concept to a new, hypothetical scenario.
*   **Numerical Calculation Rule:** For any question involving math, you MUST design it so that the entire solving process can be done mentally. The numbers used in the question, intermediate steps, and the final answer MUST NOT involve decimals or complex fractions. Use clean, whole numbers.

**D. Topic Control:**
*   **Topics/Keywords to Focus On:** If a list is provided, approximately 60% of the total questions MUST be directly related to these specific topics. The remaining 40% should cover other relevant topics from the content (but not from the "dropped" topics).
*   **Topics/Keywords to Drop:** You MUST NOT generate any questions, answers, or distractors related to these topics. They are to be completely ignored and excluded.

### STEP 3: PROVIDE OUTPUT IN SPECIFIED JSON FORMAT ###
You must provide the output as a single, well-formed JSON object. This object must contain a single key, "quiz", which holds an array of question objects. Each object in the array represents a single quiz question and must have the following exact structure:
{
  "quiz": [
    {
      "question_text": "The full text of the question.",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Correct Option C",
        "D": "Option D"
      },
      "correct_answer_key": "C",
      "explanation": "A brief explanation of why this is the correct answer, referencing the source content.",
      "topic": "The primary topic/keyword this question relates to.",
      "difficulty": "standard" or "hard"
    }
  ]
}

---
### PROVIDED MATERIALS ###

**[User-Defined Configuration]**
*   **Total Questions:** {{{totalNumberOfQuestions}}}
*   **Preferred Question Styles:** {{#if preferredQuestionStyles}}{{{preferredQuestionStyles}}}{{else}}Multiple choice questions{{/if}}
*   **Hard Mode:** {{#if hardMode}}true{{else}}false{{/if}}
*   **Topics to Focus On:** {{#if topicsToFocus}}{{{topicsToFocus}}}{{else}}None{{/if}}
*   **Topics to Drop:** {{#if topicsToDrop}}{{{topicsToDrop}}}{{else}}None{{/if}}

**[User-Uploaded Content]**
{{#each pdfDocuments}}{{media url=this.dataUri}}\n\n{{/each}}
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
    if (!output || !output.quiz || output.quiz.length === 0) {
      throw new Error("AI failed to generate quiz data in the expected format.");
    }
    // Zod schema validation is now more comprehensive.
    // It ensures 'options' is an object with keys A,B,C,D and
    // 'correct_answer_key' is one of 'A', 'B', 'C', 'D'.
    // No further manual validation is needed here.
    return output;
  }
);
