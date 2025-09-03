
'use server';

/**
 * @fileOverview An AI flow to generate a structured Gantt chart from a natural language prompt.
 *
 * - generateGanttChart - A function that takes a text-based project plan and returns structured task data.
 * - GenerateGanttChartOutput - The return type for the generateGanttChart function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Task } from '@/lib/types';

const GanttTaskSchema = z.object({
    id: z.number().describe("A unique integer ID for the task, starting from 1."),
    name: z.string().describe("The name of the task or milestone."),
    start: z.string().describe("The calculated start date of the task in 'YYYY-MM-DD' format."),
    end: z.string().describe("The calculated end date of the task in 'YYYY-MM-DD' format."),
    type: z.enum(['task', 'milestone', 'group']).describe("The type of the item. Milestones are single-day events."),
    progress: z.number().describe("The progress of the task, from 0 to 100. Default to 0."),
    dependencies: z.array(z.number()).describe("A list of task IDs that this task depends on."),
    parentId: z.nullable(z.number()).describe("The ID of the parent task if this is a sub-task.")
});

const GenerateGanttChartOutputSchema = z.object({
  tasks: z.array(GanttTaskSchema).describe('The structured list of tasks and milestones.'),
});
export type GenerateGanttChartOutput = z.infer<typeof GenerateGanttChartOutputSchema>;


export async function generateGanttChart(prompt: string): Promise<GenerateGanttChartOutput> {
  return generateGanttChartFlow(prompt);
}

const ganttPrompt = ai.definePrompt({
  name: 'generateGanttChartPrompt',
  input: { schema: z.string() },
  output: { schema: GenerateGanttChartOutputSchema },
  prompt: `You are an expert project manager. Your task is to parse a user's project plan and convert it into a structured list of tasks for a Gantt chart.

Follow these instructions carefully:
1.  **Parse the Project Plan**: Read the user's entire prompt to understand the project name, goal, start date, tasks, durations, dependencies, and milestones.
2.  **Calculate Dates**:
    *   Use the "Project Start Date" as the anchor for all calculations.
    *   Calculate the start and end date for each task based on its duration and its dependencies. Assume a standard 5-day work week (Monday-Friday). Do not include weekends in duration calculations.
    *   A "finish-to-start" dependency means a task starts on the next working day after its predecessor finishes.
    *   If a task has multiple dependencies, it should start after the latest-finishing predecessor.
3.  **Assign IDs**: Assign a unique integer ID to each task, starting from 1, corresponding to its number in the user's list.
4.  **Identify Milestones**: Tasks listed under "Key Milestones" should be of type 'milestone'. A milestone is a single-day event, so its start and end dates should be the same.
5.  **Structure the Output**: Format the final output as a JSON object that strictly conforms to the provided output schema. Ensure all dates are in 'YYYY-MM-DD' format.

User's Project Plan:
\`\`\`
{{{input}}}
\`\`\`
`,
  config: {
    temperature: 0, // Low temperature for deterministic output
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const generateGanttChartFlow = ai.defineFlow(
  {
    name: 'generateGanttChartFlow',
    inputSchema: z.string(),
    outputSchema: GenerateGanttChartOutputSchema,
  },
  async (prompt) => {
    const { output } = await ganttPrompt(prompt);
    if (!output) {
      throw new Error("The AI model did not return a valid task structure.");
    }
    return output;
  }
);
