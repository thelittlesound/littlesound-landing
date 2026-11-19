// Little Sound line icons (approved 2026-11-19, canvas
// https://claude.ai/artifact/R78x5j3JzcoqkCg6LTDMry). 24px grid, 1.5px stroke,
// round ends: the same drawing style as Discover's category icons. Category
// keys match the catalog's category names. Tan #A8865A (gold-dark) on light
// surfaces, #C4A882 (gold) on dark teal. Never emoji.

export const ICONS: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M16 16l5 5',
  tabs: 'M3 8h14v12H3zM6 5h14v12M3 11h14',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5',
  full: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M10 13l4 4M14 13l-4 4',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  sparkle: 'M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  go: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M8 12h8M13 9l3 3-3 3',
  fit: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2',
  fresh: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  compare: 'M3 5h7v14H3zM14 5h7v14h-7zM5.5 9h2M16.5 9h2M5.5 12h2M16.5 12h2',
  connect: 'M10 14L20 4M14 4h6v6M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  clipboard: 'M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M8 11h8M8 15h5',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 6.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  chart: 'M4 4v16h16M8 15l4-4 3 3 5-6',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  layers: 'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5',
  honest: 'M4 5h16v11H10l-5 4v-4H4zM9 10.5l2 2 4-4',
  people: 'M9 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 11a2.5 2.5 0 1 0 0-5M18 14c2 .6 3 2.8 3 6',
  "Sports": 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3.6 9.5c5 1.6 11.8 1.6 16.8 0M3.6 14.5c5-1.6 11.8-1.6 16.8 0',
  "Camps": 'M3 20L12 4l9 16zM12 4v16M9 20l3-5 3 5',
  "Swimming": 'M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4-2 6 0M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4-2 6 0',
  "Arts": 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 3-2 3-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  "Martial Arts": 'M3 10h18v3H3zM10 13l-2 7M14 13l2 7M10 9.5h4v4h-4z',
  "Music": 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  "Outdoor": 'M12 3l-6 9h4l-4 6h12l-4-6h4zM12 18v3',
  "Theater": 'M4 4h10v6a5 5 0 0 1-10 0zM7 8h.01M11 8h.01M7 11c1 1 3 1 4 0M15 9h5v5a5 5 0 0 1-8 4',
  "Dance": 'M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z',
  "Early Childhood": 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3 2-5 6-5 0 3-2 5-6 5z',
  "Language": 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
  "STEM": 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9',
  "Cooking": 'M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h20M9 6.5c0-1 1-1 1-2.5M14 6.5c0-1 1-1 1-2.5',
  "Academic": 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
};

export type IconName = keyof typeof ICONS;

export function LineIcon({ name, size = 24, color = 'currentColor', className = '' }: {
  name: string; size?: number; color?: string; className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICONS[name] ?? ICONS.search} />
    </svg>
  );
}

/** The round badge an icon sits in on cards: white on light, translucent on dark teal. */
export function IconChip({ name, dark = false, className = '' }: { name: string; dark?: boolean; className?: string }) {
  return (
    <div
      className={`w-14 h-14 rounded-pill flex items-center justify-center flex-shrink-0 border ${
        dark ? 'bg-white/[0.07] border-gold/35' : 'bg-white border-cream-700'
      } ${className}`}
    >
      <LineIcon name={name} size={28} color={dark ? '#C4A882' : '#A8865A'} />
    </div>
  );
}
