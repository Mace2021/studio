
'use server';

/**
 * @fileOverview An AI flow for generating interview questions.
 *
 * - generateQuestions - A function that takes a profession and returns a list of interview questions.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateQuestionsInputSchema = z.object({
  profession: z.string().describe('The profession to generate interview questions for.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of 10 interview questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: { schema: GenerateQuestionsInputSchema },
  output: { schema: GenerateQuestionsOutputSchema },
  prompt: `You are an expert hiring manager. Generate a list of exactly 10 interview questions for a candidate applying for a "{{profession}}" position.

The list must contain a diverse mix of question types:
- 5 general, behavioral, or situational questions.
- 5 technical or role-specific questions relevant to a "{{profession}}".

Return the questions as a flat array of strings. Do not add any introductory text, numbering, or markdown formatting.
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
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
  },
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output || !Array.isArray(output.questions) || output.questions.length === 0) {
        throw new Error('The AI model failed to return a valid list of questions.');
      }
      return output;
    } catch (error: any) {
        console.error("Error generating questions:", error);
        throw new Error(`Failed to generate interview questions. Reason: ${error.message}`);
    }
  }
);
