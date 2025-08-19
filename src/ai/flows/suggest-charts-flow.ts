'use server';

/**
 * @fileOverview AI-powered chart suggestion flow.
 *
 * - suggestCharts - A function that takes column headers and data samples and returns chart suggestions.
 * - SuggestChartsInput - The input type for the suggestCharts function.
 * - SuggestChartsOutput - The return type for the suggestCharts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestChartsInputSchema = z.object({
  columnHeaders: z.array(z.string()).describe('The column headers of the data.'),
  dataSample: z.array(z.record(z.any())).describe('A sample of the data rows.'),
});
export type SuggestChartsInput = z.infer<typeof SuggestChartsInputSchema>;

const SuggestChartsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested chart types.'),
});
export type SuggestChartsOutput = z.infer<typeof SuggestChartsOutputSchema>;

export async function suggestCharts(input: SuggestChartsInput): Promise<SuggestChartsOutput> {
  return suggestChartsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChartsPrompt',
  input: {schema: SuggestChartsInputSchema},
  output: {schema: SuggestChartsOutputSchema},
  prompt: `You are a data visualization expert. Based on the provided data structure and samples, suggest 3-5 creative and insightful chart types that would be relevant to visualize the data.

Data Column Headers: {{{columnHeaders}}}
Data Sample: {{{dataSample}}}

Return your suggestions as a list of chart types. Be specific about the columns that you suggest visualizing, and what relationships they might show. For example, if column headers are 'date', 'product', and 'sales', suggest 'Line chart of sales over time' or 'Bar chart of sales by product'.`,config: {
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

const suggestChartsFlow = ai.defineFlow(
  {
    name: 'suggestChartsFlow',
    inputSchema: SuggestChartsInputSchema,
    outputSchema: SuggestChartsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
