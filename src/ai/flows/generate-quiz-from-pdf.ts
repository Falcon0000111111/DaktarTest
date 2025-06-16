
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
    .describe('Optional preferred styles for questions, e.g., "scenario-based", "fill-in-the-blanks if possible". Output must still primarily be MCQ.'),
  hardMode: z
    .boolean()
    .optional()
    .describe('If true, questions should be made more challenging.'),
  topicsToFocus: z
    .string()
    .optional()
    .describe('Optional comma-separated list of topics or keywords to prioritize for questions.'),
  topicsToDrop: z
    .string()
    .optional()
    .describe('Optional comma-separated list of topics or keywords to avoid for questions.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).length(4).describe('Exactly four possible answers to the question.'),
      answer: z.string().describe('The correct answer to the question. CRITICAL: This MUST be an exact, verbatim, character-for-character copy of one of the strings from the "options" array for THIS question. No extra text, no summaries.'),
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
  prompt: `You are an expert quiz generator. You will generate a single quiz based on the content of ALL the PDF documents provided.

    The quiz should have a total of exactly {{{totalNumberOfQuestions}}} questions.

    There are {{pdfDocuments.length}} PDF document(s) provided. You MUST strive to distribute the {{{totalNumberOfQuestions}}} questions as evenly as possible among these {{pdfDocuments.length}} document(s). For example, if {{{totalNumberOfQuestions}}} is 10 and there are 2 documents, aim for 5 questions from each. If {{{totalNumberOfQuestions}}} is 10 and there are 3 documents, aim for roughly 3-4 questions per document, ensuring the total is 10.

    The PDF documents are provided below. Each document is clearly marked with "--- START OF DOCUMENT: [filename] ---" and "--- END OF DOCUMENT: [filename] ---".

    {{#each pdfDocuments}}
    --- START OF DOCUMENT: {{{this.name}}} ---
    {{media url=this.dataUri}}
    --- END OF DOCUMENT: {{{this.name}}} ---
    {{/each}}

    ADDITIONAL INSTRUCTIONS:
    {{#if preferredQuestionStyles}}
    - Preferred Question Styles: Attempt to incorporate the following styles or themes if possible: "{{{preferredQuestionStyles}}}". However, ensure the final output for each question strictly adheres to the multiple-choice format: a question, exactly four options, one correct answer, and an explanation.
    {{/if}}
    {{#if hardMode}}
    - Difficulty Level: Hard Mode is ON. Questions should be more challenging, requiring deeper understanding, synthesis of information, or complex application of concepts from the document(s). Avoid trivial or very direct recall questions unless they are framed in a complex way.
    {{else}}
    - Difficulty Level: Standard. Questions should be of moderate difficulty, suitable for general understanding and assessment.
    {{/if}}
    {{#if topicsToFocus}}
    - Topics to Focus On: Prioritize generating questions related to these topics/keywords: "{{{topicsToFocus}}}".
    {{/if}}
    {{#if topicsToDrop}}
    - Topics to Drop: Avoid generating questions related to these topics/keywords: "{{{topicsToDrop}}}".
    {{/if}}

    For each of the {{{totalNumberOfQuestions}}} questions:
    1. Provide the question text.
    2. Provide exactly four multiple-choice options. Ensure variety and plausibility in the distractors.
    3. CRITICAL REQUIREMENT: The "answer" field for each question in your JSON output MUST be an EXACT, VERBATIM, CHARACTER-FOR-CHARACTER copy of one of the strings from the "options" array you provided for that specific question. DO NOT add any extra text, summarize, or modify the chosen option string in the "answer" field. It must be identical to one of the option strings.
    4. Provide a brief and clear explanation in the "explanation" field for why the correct answer is correct. The explanation should help someone understand the concept and can elaborate beyond the option text.

    The output MUST be a JSON array of question objects, correctly formatted according to the schema.
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

