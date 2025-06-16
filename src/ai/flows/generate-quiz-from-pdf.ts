
'use server';
/**
 * @fileOverview Generates a single quiz from one or more PDF documents,
 * distributing questions among the provided documents.
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
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).length(4).describe('Exactly four possible answers to the question.'),
      answer: z.string().describe('The correct answer to the question. This MUST be an exact, verbatim copy of one of the strings from the "options" array.'),
      explanation: z.string().describe('A brief explanation for why the answer is correct.'),
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

    For each of the {{{totalNumberOfQuestions}}} questions:
    1. Provide the question text.
    2. Provide exactly four multiple-choice options. Ensure variety and plausibility in the distractors.
    3. Clearly indicate which of the four options is the correct answer. The "answer" field in the output MUST be an exact, verbatim copy of one of the strings from the "options" array you provide for that question.
    4. Provide a brief and clear explanation for why the correct answer is correct. The explanation should help someone understand the concept.

    The output MUST be a JSON array of question objects, correctly formatted.
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
