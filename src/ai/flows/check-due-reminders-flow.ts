
// src/ai/flows/check-due-reminders-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow to check for due medication reminders, considering start date and duration.
 *
 * - getDueMedicationReminders - A function that fetches due medication reminders from Supabase.
 * - CheckDueRemindersInput - The input type for the getDueMedicationReminders function.
 * - DueMedicationRemindersOutput - The return type for the getDueMedicationReminders function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {supabase} from '@/lib/supabaseClient';
import type {Medication} from '@/types/medication';
import { format, parseISO, isFuture, addDays, isPast, startOfDay, isToday } from 'date-fns';

const CheckDueRemindersInputSchema = z.object({
  currentDate: z
    .string()
    .optional()
    .describe(
      'Optional current date in YYYY-MM-DD format for testing. Defaults to now.'
    ),
  currentTime: z
    .string()
    .optional()
    .describe(
      'Optional current time in HH:MM format for testing. Defaults to now.'
    ),
});
export type CheckDueRemindersInput = z.infer<
  typeof CheckDueRemindersInputSchema
>;

const DueMedicationReminderSchema = z.object({
  id: z.string(),
  name: z.string(),
  time: z.string().describe('The time the medicine should be taken (HH:MM).'),
  originalInput: z.string().optional().nullable(),
  lastNotified: z.string().optional().nullable(),
  frequencyDescription: z.string().optional().nullable(),
  durationDays: z.number().int().min(0).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" }).optional().nullable(),
});

const DueMedicationRemindersOutputSchema = z.object({
  dueMedications: z.array(DueMedicationReminderSchema),
});
export type DueMedicationRemindersOutput = z.infer<
  typeof DueMedicationRemindersOutputSchema
>;

export async function getDueMedicationReminders(
  input?: CheckDueRemindersInput
): Promise<DueMedicationRemindersOutput> {
  return checkDueRemindersFlow(input || {});
}

const checkDueRemindersFlow = ai.defineFlow(
  {
    name: 'checkDueRemindersFlow',
    inputSchema: CheckDueRemindersInputSchema,
    outputSchema: DueMedicationRemindersOutputSchema,
  },
  async (input: CheckDueRemindersInput) => {
    const now = new Date(); // Use actual 'now' for date calculations
    const todayDateString = input.currentDate || format(now, 'yyyy-MM-dd');
    
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTimeString = input.currentTime || `${currentHour}:${currentMinute}`;
    const timeToQuery = `${currentTimeString}:00`;

    let query = supabase
      .from('medications')
      .select('*')
      .eq('time', timeToQuery) 
      .or(`last_notified.neq.${todayDateString},last_notified.is.null`)
      // Medication must have started or has no specific start date (assume immediate)
      .or(`start_date.is.null,start_date.lte.${todayDateString}`);

    const {data, error} = await query;

    if (error) {
      console.error('Error fetching due medications from Supabase:', error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const todayForLogic = input.currentDate ? parseISO(input.currentDate) : startOfDay(new Date());

    const dueMedications: Medication[] = data
      ? data.filter(dbRecord => {
          // Additional filtering for duration_days client-side as complex date arithmetic in Supabase query is tricky
          if (dbRecord.start_date && dbRecord.duration_days && dbRecord.duration_days > 0) {
            const startDateObj = parseISO(dbRecord.start_date);
            const endDate = addDays(startDateObj, dbRecord.duration_days - 1); // last day of medication
            // It's due if today is not past the end date.
            // (isPast(endDate) && !isToday(endDate)) means duration has fully passed.
            if (isPast(endDate) && !isToday(endDate)) { 
                return false; // Duration has passed
            }
          }
          // If start_date is in the future, it's not due yet.
          if (dbRecord.start_date && isFuture(parseISO(dbRecord.start_date))) {
            return false;
          }
          return true; // If no duration or duration not passed, it's due
        }).map(dbRecord => ({
          id: dbRecord.id,
          name: dbRecord.name,
          time: dbRecord.time ? dbRecord.time.substring(0, 5) : '00:00', 
          originalInput: dbRecord.original_input,
          lastNotified: dbRecord.last_notified,
          frequencyDescription: dbRecord.frequency_description,
          durationDays: dbRecord.duration_days,
          startDate: dbRecord.start_date,
        }))
      : [];

    return {dueMedications};
  }
);
