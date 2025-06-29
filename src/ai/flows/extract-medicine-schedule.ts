
// src/ai/flows/extract-medicine-schedule.ts
'use server';

/**
 * @fileOverview Extracts medicine name, time, frequency, duration, and start date from natural language input or a prescription file (image/PDF).
 *
 * - extractMedicineSchedule - A function that extracts the medicine schedule.
 * - ExtractMedicineScheduleInput - The input type for the extractMedicineSchedule function.
 * - ExtractMedicineScheduleOutput - The return type for the extractMedicineSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format, addDays } from 'date-fns';


const ExtractMedicineScheduleInputSchema = z.object({
  naturalLanguageInput: z
    .string()
    .optional()
    .describe('A natural language sentence describing the medicine, time, frequency, duration, and start date. Can be supplementary if a file is provided.'),
  prescriptionImageDataUri: // Keep name generic as it handles different file types via data URI
    z
    .string()
    .optional()
    .describe("A prescription file (image or PDF) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ExtractMedicineScheduleInput = z.infer<
  typeof ExtractMedicineScheduleInputSchema
>;

const ExtractMedicineScheduleOutputSchema = z.object({
  medicine: z.string().describe('The name of the medicine.'),
  time: z.string().describe('The time the medicine should be taken in HH:MM format.'),
  frequencyDescription: z.string().describe('How often the medicine should be taken (e.g., "once a day", "every 8 hours").').optional(),
  durationDays: z.number().int().min(0).describe('For how many days the medicine should be taken as an integer (e.g., 7 for "a week", 0 or omit for indefinite).').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" }).describe('The start date in YYYY-MM-DD format. If "today" or not clearly specified, use today\'s date. If "tomorrow", use tomorrow\'s date.').optional(),
});
export type ExtractMedicineScheduleOutput = z.infer<
  typeof ExtractMedicineScheduleOutputSchema
>;

export async function extractMedicineSchedule(
  input: ExtractMedicineScheduleInput
): Promise<ExtractMedicineScheduleOutput> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const contextualizedInput = {
    naturalLanguageInput: input.naturalLanguageInput || "", 
    prescriptionImageDataUri: input.prescriptionImageDataUri,
    currentDate: todayStr,
    tomorrowDate: tomorrowStr,
  };
  
  return extractMedicineScheduleFlow(contextualizedInput);
}

const prompt = ai.definePrompt({
  name: 'extractMedicineSchedulePrompt',
  input: {schema: z.object({
    naturalLanguageInput: ExtractMedicineScheduleInputSchema.shape.naturalLanguageInput.unwrap().optional(),
    prescriptionImageDataUri: ExtractMedicineScheduleInputSchema.shape.prescriptionImageDataUri,
    currentDate: z.string(), 
    tomorrowDate: z.string(), 
  })},
  output: {schema: ExtractMedicineScheduleOutputSchema},
  prompt: `You are a helpful assistant that extracts medicine details from the provided information.
  Today's date is {{currentDate}}. Tomorrow's date is {{tomorrowDate}}.

  {{#if prescriptionImageDataUri}}
  A file (image or PDF) of a prescription has been provided. Prioritize extracting information from this file:
  {{media url=prescriptionImageDataUri}}
  {{/if}}

  {{#if naturalLanguageInput}}
  Additionally, consider the following text input. If no file was provided, use this text as the primary source. If a file was provided, use this text to supplement or clarify information from the file if needed.
  Text input: "{{naturalLanguageInput}}"
  {{else}}
  {{#unless prescriptionImageDataUri}}
  No text input or file was provided. You must have at least one.
  {{/unless}}
  {{/if}}

  Extract the following details based on the available information:
  - Medicine name.
  - Time in HH:MM format. If multiple times, pick the first one or the most prominent. If a time like "9 AM" is found, convert to "09:00". If "5 PM", convert to "17:00".
  - Frequency description (e.g., "once a day", "twice daily", "every 8 hours"). If not specified, omit.
  - Duration in days (as an integer. For example, if the input is "for a week", return 7. If "for 10 days", return 10. If "for 2 weeks", return 14. If duration is indefinite or not specified, omit this field or return 0).
  - Start date in YYYY-MM-DD format. (If the input implies "today" or if no start date is specified, use {{currentDate}}. If it implies "tomorrow", use {{tomorrowDate}}. If a specific date like "August 1st of the current year", convert to YYYY-MM-DD using {{currentDate}} to infer the year if not specified).

  Ensure your output strictly adheres to the schema for 'medicine', 'time', 'frequencyDescription', 'durationDays', and 'startDate'.
  If crucial information like medicine name or time cannot be extracted, try your best but indicate if fields are missing.
  `,
});

const extractMedicineScheduleFlow = ai.defineFlow(
  {
    name: 'extractMedicineScheduleFlow',
    inputSchema: prompt.inputSchema!, 
    outputSchema: ExtractMedicineScheduleOutputSchema,
  },
  async (input) => { 
    if (!input.naturalLanguageInput && !input.prescriptionImageDataUri) {
      throw new Error("Either natural language input or a prescription file (image/PDF) must be provided.");
    }

    const {output} = await prompt(input);
    
    const result: ExtractMedicineScheduleOutput = {
        medicine: output!.medicine,
        time: output!.time,
        frequencyDescription: output!.frequencyDescription,
        durationDays: output!.durationDays, 
        startDate: output!.startDate,
    };

    if (result.frequencyDescription === "") result.frequencyDescription = undefined;
    if (result.startDate === "") result.startDate = undefined;

    return result;
  }
);
