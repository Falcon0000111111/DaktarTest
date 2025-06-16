
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
    ALL questions you generate MUST be in a Multiple Choice Question (MCQ) format. This means each question must have:
    1. The question text.
    2. Exactly four multiple-choice options. Ensure variety and plausibility in the distractors.
    3. A correct answer field. CRITICAL REQUIREMENT: The "answer" field for each question in your JSON output MUST be an EXACT, VERBATIM, CHARACTER-FOR-CHARACTER copy of one of the strings from the "options" array you provided for that specific question. DO NOT add any extra text, summarize, or modify the chosen option string in the "answer" field. It must be identical to one of the option strings.
    4. A brief and clear explanation in the "explanation" field for why the correct answer is correct.

    {{#if preferredQuestionStyles}}
    - Preferred Question Styles: The user has indicated preferences for styles like: "{{{preferredQuestionStyles}}}".
      - If "multiple-choice" is mentioned, this aligns with the primary requirement.
      - If styles like "short-descriptions" or "fill-in-the-blanks" are mentioned, you MUST ADAPT these into an MCQ format. For example:
        - For "short-descriptions": You could ask a question like "Which of the following best describes [concept]?" and the options would be descriptions.
        - For "fill-in-the-blanks": You could present a sentence with a blank, and the options would be words or phrases to fill that blank.
      - Regardless of the suggested styles, the final output for EACH question MUST strictly adhere to the MCQ format (question, 4 options, 1 verbatim answer, 1 explanation).
    {{/if}}
    {{#if hardMode}}
    - Difficulty Level: Hard Mode is ON. Questions MUST be made more challenging, requiring deeper understanding, synthesis of information, or complex application of concepts from the document(s). Avoid trivial or very direct recall questions unless they are framed in a complex way.
    {{else}}
    - Difficulty Level: Standard. Questions should be of moderate difficulty, suitable for general understanding and assessment.
    {{/if}}
    {{#if topicsToFocus}}
    - Topics to Focus On: You MUST prioritize generating questions related to these topics/keywords: "{{{topicsToFocus}}}". Ensure these topics are well-represented.
    {{/if}}
    {{#if topicsToDrop}}
    - Topics to Drop: You MUST avoid generating questions related to these topics/keywords: "{{{topicsToDrop}}}". Do not include questions on these topics.
    {{/if}}

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

