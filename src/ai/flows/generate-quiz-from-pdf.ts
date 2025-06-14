
'use server';
/**
 * @fileOverview Generates a quiz from a PDF document.
 *
 * - generateQuizFromPdf - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuizFromPdf function.
 * - GenerateQuizOutput - The return type for the generateQuizFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
  numberOfQuestions: z
    .number()
    .describe('The desired number of questions in the quiz.'),
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

export async function generateQuizFromPdf(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromPdfPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are an expert quiz generator. You will generate a quiz based on the content of the PDF document.

    The quiz should have exactly {{{numberOfQuestions}}} questions.

    The PDF document is provided as a data URI:
    {{media url=pdfDataUri}}

    For each question:
    1. Provide the question text.
    2. Provide exactly four multiple-choice options. Ensure variety and plausibility in the distractors.
    3. Clearly indicate which of the four options is the correct answer. The "answer" field in the output MUST be an exact, verbatim copy of one of the strings from the "options" array you provide for that question.
    4. Provide a brief and clear explanation for why the correct answer is correct. The explanation should help someone understand the concept.

    The output MUST be a JSON array of question objects, where each object contains:
    - "question": The question text (string).
    - "options": An array of exactly 4 strings representing the multiple-choice options.
    - "answer": The correct answer text (string), which must be an exact copy of one of the provided options.
    - "explanation": A brief explanation for the correct answer (string).
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
    name: 'generateQuizFromPdfFlow',
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
        throw new Error(`Question "${q.question}" does not have 4 options.`);
      }
      if (!q.options.includes(q.answer)) {
        // Log the problematic answer and options for debugging
        console.error(`Validation Error: Answer "${q.answer}" not found in options: [${q.options.join(', ')}] for question: "${q.question}"`);
        throw new Error(`Answer for question "${q.question}" is not one of the provided options.`);
      }
    });
    return output;
  }
);

