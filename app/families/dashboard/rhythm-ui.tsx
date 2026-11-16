// Shared look for Family Rhythm and the Summer planner: each child's soft
// colors and the thin line icons.

import { kidColor, type Kid } from '@/lib/calendar-grid';
import { UNASSIGNED } from '@/lib/family-rhythm';

export const SOFT: Record<string, { soft: string; ink: string }> = {
  '#0D5C6E': { soft: '#DCEFF2', ink: '#0A4A5A' },
  '#7B5EA7': { soft: '#EEE8F7', ink: '#4E3A70' },
  '#2E7D5B': { soft: '#E1F2E9', ink: '#1F5A41' },
  '#C0544A': { soft: '#F8E4E1', ink: '#8A3A33' },
  '#3A6EA5': { soft: '#E2ECF7', ink: '#284E76' },
  '#9C4F7E': { soft: '#F4E4EE', ink: '#6E3758' },
  '#6B7F8A': { soft: '#E9EEF1', ink: '#46565F' },
};
export function theme(kids: Kid[], lane: string) {
  const color = kidColor(kids, lane === UNASSIGNED ? null : lane);
  return { color, ...(SOFT[color] ?? SOFT['#6B7F8A']) };
}
// Thin line icons (brand: thin line, warm), picked by the listing's category.
const ICONS: Record<string, string> = {
  vase: 'M9 3h6M10 3c0 3-4 4.5-4 9a6 6 0 0 0 12 0c0-4.5-4-6-4-9M7.5 14h9',
  waves: 'M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2',
  music: 'M9 17V5l10-2v12M9 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 15a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 8V3.5M15.5 10.5l4-1.5M14.2 14.5l2.3 3.8M9.8 14.5l-2.3 3.8M8.5 10.5l-4-1.5',
  tree: 'M12 21v-5M12 3l6 8h-3l4 5H5l4-5H6z',
  laptop: 'M4 6h16v9H4zM2 18h20',
  brush: 'M14 4l6 6-8 8H6v-6zM12 6l6 6',
  chef: 'M7 14v5h10v-5M7 14a4 4 0 1 1 2.5-7.2A4 4 0 0 1 17 8a3 3 0 0 1 0 6z',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16',
  calendar: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16',
};
export function iconFor(category: string | null | undefined): string {
  const c = (category ?? '').toLowerCase();
  if (/swim|aquatic/.test(c)) return 'waves';
  if (/art|pottery|craft/.test(c)) return 'brush';
  if (/music|dance/.test(c)) return 'music';
  if (/sport|martial|gym/.test(c)) return 'ball';
  if (/outdoor|nature|camp/.test(c)) return 'tree';
  if (/stem|tech|science|coding/.test(c)) return 'laptop';
  if (/cook/.test(c)) return 'chef';
  if (/theat|perform/.test(c)) return 'star';
  if (/language|academic|early/.test(c)) return 'book';
  return 'calendar';
}
export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={ICONS[name] ?? ICONS.calendar} />
    </svg>
  );
}
