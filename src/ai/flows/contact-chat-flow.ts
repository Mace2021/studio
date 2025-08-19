
'use server';

/**
 * @fileOverview An AI flow for a contact page chatbot.
 * 
 * - contactChat - A function that takes a user message and chat history and returns a bot response.
 * - ContactChatInput - The input type for the contactChat function.
 * - ContactChatOutput - The return type for the contactChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
    sender: z.enum(['user', 'bot']),
    text: z.string(),
});

const ContactChatInputSchema = z.object({
  message: z.string().describe('The user\'s latest message.'),
  history: z.array(MessageSchema).describe('The history of the conversation.'),
});
export type ContactChatInput = z.infer<typeof ContactChatInputSchema>;

const ContactChatOutputSchema = z.object({
  reply: z.string().describe('The AI-generated response to the user\'s message.'),
});
export type ContactChatOutput = z.infer<typeof ContactChatOutputSchema>;

export async function contactChat(input: ContactChatInput): Promise<ContactChatOutput> {
  return contactChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contactChatPrompt',
  input: { schema: ContactChatInputSchema },
  output: { schema: ContactChatOutputSchema },
  prompt: `You are a friendly and helpful customer support bot for a company called "DataSight".
DataSight is a powerful, open-source data visualization tool that empowers users to turn raw data into beautiful, interactive dashboards. Users can upload CSV, XLS, or XLSX files, and the intelligent engine generates insightful charts and key metrics. It also has AI-powered chart suggestions to help uncover hidden patterns and make data-driven decisions.

Your role is to answer user questions based on the information above. Be concise and polite. If you don't know the answer, politely say that you can't help with that and suggest they contact support at elvizbiz@gmail.com.

Here is the conversation history:
{{#each history}}
{{sender}}: {{{text}}}
{{/each}}

User's new message: {{{message}}}

Your reply:
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

const contactChatFlow = ai.defineFlow(
  {
    name: 'contactChatFlow',
    inputSchema: ContactChatInputSchema,
    outputSchema: ContactChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
