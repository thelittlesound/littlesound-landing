import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ activities: [] });
  }

  // Map Supabase submission shape → activity card shape
  const activities = (data || []).map((s) => ({
    id: `sub_${s.id}`,
    title: s.title,
    provider: s.contact_name,
    category: s.category ?? 'Other',
    subcategory: s.subcategory ?? null,
    neighborhood: s.neighborhood ?? 'Seattle',
    ageMin: s.age_min ?? 0,
    ageMax: s.age_max ?? 18,
    price: s.price ?? 0,
    priceUnit: s.price_unit ?? 'session',
    description: s.description ?? '',
    website: s.website ?? '',
    source: 'provider', // flag so we can distinguish in UI if needed
  }));

  return NextResponse.json({ activities });
}
