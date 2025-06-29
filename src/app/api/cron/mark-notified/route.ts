// src/app/api/cron/mark-notified/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { medicationId } = body;

    if (!medicationId) {
      return NextResponse.json({ error: 'Missing medicationId' }, { status: 400 });
    }

    const todayDateString = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('medications')
      .update({ last_notified: todayDateString })
      .eq('id', medicationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating medication in Supabase (mark-notified):', error);
      return NextResponse.json({ error: 'Failed to mark as notified', details: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Medication not found or no update occurred' }, { status: 404 });
    }

    return NextResponse.json({ success: true, medication: data }, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error in /api/cron/mark-notified:', error);
    if (error.name === 'SyntaxError') { // Handle JSON parsing errors
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
