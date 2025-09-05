
'use server';
/**
 * @fileOverview An AI voice agent that can answer questions or escalate to a human.
 *
 * - voiceAgent - A function that handles the voice agent conversation.
 * - VoiceAgentInput - The input type for the voiceAgent function.
 * - VoiceAgentOutput - The return type for the voiceAgent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { callHuman } from '@/ai/tools/call-human';

const VoiceAgentInputSchema = z.object({
  message: z.string().describe("The user's spoken message to the agent."),
});
export type VoiceAgentInput = z.infer<typeof VoiceAgentInputSchema>;

const VoiceAgentOutputSchema = z.object({
  reply: z
    .string()
    .describe('The AI-generated response to be spoken to the user.'),
  escalated: z
    .boolean()
    .describe(
      'Whether the conversation was escalated to a human.'
    ),
});
export type VoiceAgentOutput = z.infer<typeof VoiceAgentOutputSchema>;

export async function voiceAgent(
  input: VoiceAgentInput
): Promise<VoiceAgentOutput> {
  return voiceAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceAgentPrompt',
  input: { schema: VoiceAgentInputSchema },
  output: { schema: VoiceAgentOutputSchema },
  tools: [callHuman],
  prompt: `You are a friendly and helpful AI voice agent for a company called "Visual Dashboard".
Visual Dashboard is a powerful, open-source data visualization tool that empowers users to turn raw data into beautiful, interactive dashboards. Users can upload CSV, XLS, or XLSX files, and the intelligent engine generates insightful charts and key metrics. It also has AI-powered chart suggestions to help uncover hidden patterns and make data-driven decisions.

Your primary role is to answer user questions based on the information above. Be concise and polite.

If you do not know the answer to a question, or if the user explicitly asks to speak to a person, you MUST use the 'callHuman' tool to escalate the conversation. Do not make up answers. When you use the tool, your final reply to the user should be a polite message informing them that they are being connected to a human expert.

User's message: {{{message}}}
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

const voiceAgentFlow = ai.defineFlow(
  {
    name: 'voiceAgentFlow',
    inputSchema: VoiceAgentInputSchema,
    outputSchema: VoiceAgentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('The AI model did not return a response.');
    }
    
    // The prompt is configured to return a structured output object,
    // so we can directly return it. The 'escalated' field will be true if the tool was called.
    return output;
  }
);
