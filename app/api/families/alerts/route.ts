import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Email alerts on/off (the dashboard switch).
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('profiles').update({ email_alerts: body.enabled }).eq('id', user.id);
  if (error) {
    console.error('email_alerts update error:', error);
    return NextResponse.json({ error: 'Could not save that. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, enabled: body.enabled });
}
