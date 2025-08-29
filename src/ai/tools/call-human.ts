'use server';
/**
 * @fileOverview A tool for an AI agent to escalate a conversation to a human.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const callHuman = ai.defineTool(
  {
    name: 'callHuman',
    description:
      'Use this tool when you cannot answer the user\'s question or when they explicitly ask to speak to a human. This will connect them to a human expert.',
    inputSchema: z.object({
      reason: z
        .string()
        .describe(
          'The reason for the escalation. This will be passed to the human expert.'
        ),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(
      `Escalation requested. Reason: ${input.reason}. Simulating call to +1 (520) 314-7933.`
    );
    // In a real application, you would integrate with a telephony API (e.g., Twilio) here.
    return "The user has been connected to a human expert. You can now end the conversation.";
  }
);
