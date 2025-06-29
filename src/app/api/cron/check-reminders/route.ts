// src/app/api/cron/check-reminders/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getDueMedicationReminders } from '@/ai/flows/check-due-reminders-flow';

export async function GET(request: NextRequest) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const CRON_SECRET = process.env.CRON_SECRET;

  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    if (GITHUB_TOKEN && authHeader === `Bearer ${GITHUB_TOKEN}`) {
      // Allow GitHub Actions to bypass for testing/CI if needed
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Input for getDueMedicationReminders can be empty to use current date/time
    const result = await getDueMedicationReminders({}); 
    
    if ('error' in result) {
      console.error('Error fetching due medications in API route:', result.error);
      return NextResponse.json({ error: 'Failed to fetch due reminders', details: result.error }, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error in /api/cron/check-reminders:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
