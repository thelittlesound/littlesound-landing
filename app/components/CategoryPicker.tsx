'use client';

import { LineIcon } from './LineIcon';
import { CATEGORY_NAMES } from '@/lib/categories';

// Provider forms: pick one of Discover's 14 (approved 2026-11-20, canvas
// https://claude.ai/artifact/95ChP6iycRLC8Mwdt9RxoE). Two columns on phones.
export default function CategoryPicker({ label, value, onChange, error, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
      <legend className="text-[13px] font-medium text-teal-800 mb-2">{label}</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CATEGORY_NAMES.map((c) => {
          const on = value === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(c)}
              className={`min-h-[48px] px-3 rounded-[14px] flex items-center gap-2.5 text-left text-[14px] bg-white transition-colors ${
                on ? 'border-2 border-teal-800 text-teal-800 font-semibold' : 'border-[1.5px] border-cream-700 text-text-dark font-medium hover:border-teal-700'
              }`}
            >
              <LineIcon name={c} size={20} color={on ? '#0D5C6E' : '#A8865A'} className="shrink-0" />
              {c}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[13px] leading-relaxed text-text-mid">{hint}</p>}
      {error && <p className="text-[12px] text-error">{error}</p>}
    </fieldset>
  );
}
