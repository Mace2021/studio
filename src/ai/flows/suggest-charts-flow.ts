
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
import { ChartConfig, ChartType } from '@/lib/types';

const SuggestChartsInputSchema = z.object({
  columnHeaders: z.array(z.string()).describe('The column headers of the data.'),
  dataSample: z.array(z.record(z.any())).describe('A sample of the data rows.'),
});
export type SuggestChartsInput = z.infer<typeof SuggestChartsInputSchema>;

const ChartConfigSchema = z.object({
  id: z.string(),
  type: z.enum(["bar", "line", "pie", "doughnut", "scatter", "stacked-bar", "heatmap", "grouped-bar", "pictogram", "area", "stacked-area", "funnel", "treemap", "radar", "horizontal-bar", "paginated-report", "kpi", "histogram", "pyramid", "combo"]),
  xAxis: z.string(),
  yAxis: z.array(z.string()),
  yAxis2: z.optional(z.array(z.string())),
  yAxis2Type: z.optional(z.enum(['line', 'bar'])),
  stackBy: z.optional(z.string()),
  value: z.optional(z.string()),
  aggregation: z.optional(z.enum(['sum', 'average', 'count', 'min', 'max'])),
  prefix: z.optional(z.string()),
  suffix: z.optional(z.string()),
});

const SuggestChartsOutputSchema = z.object({
  suggestions: z.array(ChartConfigSchema).describe('A list of suggested chart configurations.'),
});
export type SuggestChartsOutput = z.infer<typeof SuggestChartsOutputSchema>;

export async function suggestCharts(input: SuggestChartsInput): Promise<SuggestChartsOutput> {
  return suggestChartsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChartsPrompt',
  input: {schema: SuggestChartsInputSchema},
  output: {schema: SuggestChartsOutputSchema},
  prompt: `You are a data visualization expert. Based on the provided data structure and samples, suggest 4 diverse and insightful chart configurations that would be relevant to visualize the data.

Data Column Headers: {{{json columnHeaders}}}
Data Sample: {{{json dataSample}}}

Identify which columns are categorical and which are numerical.
For each chart, provide a valid configuration object.
- The 'id' field should be a unique string starting with "chart-".
- The 'type' must be one of the allowed chart types.
- The 'xAxis' and 'yAxis' fields must be valid column headers from the data. 'yAxis' must be an array of strings.
- For a 'kpi' chart, you must provide an 'aggregation' type. Choose one of 'sum', 'average', or 'count' that makes sense for the metric.
- Suggest a variety of chart types. Do not suggest the same chart type multiple times.
- One of the suggestions should be a 'combo' chart if the data has at least one clear categorical column (for the x-axis) and at least two numerical columns (for the y-axes).
- For a 'combo' chart, you can optionally define a 'yAxis2' for a dual-axis chart.
- Ensure the columns selected for xAxis and yAxis are appropriate for the chart type (e.g., numerical yAxis for bar/line charts).
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
