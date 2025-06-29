// src/app/actions.ts
'use server';

import { extractMedicineSchedule, type ExtractMedicineScheduleInput, type ExtractMedicineScheduleOutput } from '@/ai/flows/extract-medicine-schedule';
import { getDueMedicationReminders, type CheckDueRemindersInput, type DueMedicationRemindersOutput } from '@/ai/flows/check-due-reminders-flow';

export async function extractScheduleFromText(input: ExtractMedicineScheduleInput): Promise<ExtractMedicineScheduleOutput | { error: string }> {
  try {
    if (!input.naturalLanguageInput?.trim() && !input.prescriptionImageDataUri) {
      return { error: 'Please provide either text input or upload a prescription image.' };
    }
    const result = await extractMedicineSchedule(input);
    return result;
  } catch (error: any) {
    console.error('Error extracting medicine schedule:', error);
    // Try to provide a more specific error message if available
    const message = error.message || 'Failed to extract schedule. Please try again or enter manually.';
    return { error: message.includes("Billing account not configured") ? "AI service is not configured. Please check billing." : message };
  }
}

export async function processAndGetDueMedications(input?: CheckDueRemindersInput): Promise<DueMedicationRemindersOutput | { error: string }> {
  try {
    const result = await getDueMedicationReminders(input);
    console.log('Successfully fetched due medications:', result.dueMedications.length > 0 ? result.dueMedications : 'None currently due.');
    return result;
  } catch (error: any) {
    console.error('Error processing due medications flow:', error);
    return { error: error.message || 'Failed to process and get due medications.' };
  }
}

