import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabaseAdmin
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}
