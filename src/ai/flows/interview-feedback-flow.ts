
'use server';

/**
 * @fileOverview An AI flow for providing feedback on interview answers.
 *
 * - getInterviewFeedback - A function that takes interview questions and answers and provides feedback.
 * - InterviewFeedbackInput - The input type for the getInterviewFeedback function.
 * - InterviewFeedbackOutput - The return type for the getInterviewFeedback function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const QuestionAndAnswerSchema = z.object({
    question: z.string(),
    answer: z.string(),
});

const InterviewFeedbackInputSchema = z.object({
  profession: z.string().describe('The profession the user is interviewing for.'),
  questionsAndAnswers: z.array(QuestionAndAnswerSchema).describe('A list of questions and the user\'s transcribed answers.'),
});
export type InterviewFeedbackInput = z.infer<typeof InterviewFeedbackInputSchema>;

const InterviewFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Detailed, constructive feedback on the user\'s answers, formatted as HTML.'),
});
export type InterviewFeedbackOutput = z.infer<typeof InterviewFeedbackOutputSchema>;

export async function getInterviewFeedback(input: InterviewFeedbackInput): Promise<InterviewFeedbackOutput> {
  return interviewFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interviewFeedbackPrompt',
  input: { schema: InterviewFeedbackInputSchema },
  output: { schema: InterviewFeedbackOutputSchema },
  prompt: `You are an expert career coach and interview trainer. A user has completed a practice interview for a "{{profession}}" position and needs your feedback.

Analyze their transcribed answers below. For each answer, provide specific, constructive feedback. Consider the following:
- Clarity and conciseness.
- Relevance to the question.
- Use of specific examples (like the STAR method).
- Confidence and professionalism in their language.

Provide overall feedback at the end, summarizing their strengths and areas for improvement. Format your entire response as clean HTML. Use <ul>, <li>, <strong>, and <p> tags to structure your feedback for readability. Do not include <html> or <body> tags.

Conversation History:
{{#each questionsAndAnswers}}
<p><strong>Question:</strong> {{question}}</p>
<p><strong>Answer:</strong> {{answer}}</p>
<hr/>
{{/each}}
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

const interviewFeedbackFlow = ai.defineFlow(
  {
    name: 'interviewFeedbackFlow',
    inputSchema: InterviewFeedbackInputSchema,
    outputSchema: InterviewFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return { feedback: "<p>I'm sorry, I couldn't generate feedback at this time.</p>" };
    }
    return output;
  }
);
