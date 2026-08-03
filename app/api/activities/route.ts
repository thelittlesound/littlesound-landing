import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Map provider form categories → Discover page categories
const CATEGORY_MAP: Record<string, string> = {
  'Camps':               'Camps',
  'Sports & Athletics':  'Sports',
  'Arts & Crafts':       'Arts',
  'Music & Dance':       'Music',
  'Academic & Tutoring': 'Academic',
  'Outdoor Adventure':   'Outdoor',
  'STEM & Tech':         'STEM',
  'Swim & Aquatics':     'Swimming',
  'Dance & Movement':    'Dance',
  'Theater & Performance': 'Theater',
  'Other':               'Arts', // fallback
};

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
    category: CATEGORY_MAP[s.category ?? ''] ?? s.category ?? 'Other',
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
