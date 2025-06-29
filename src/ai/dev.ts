import { config } from 'dotenv';
config();

import '@/ai/flows/extract-medicine-schedule.ts';
import '@/ai/flows/check-due-reminders-flow.ts';
