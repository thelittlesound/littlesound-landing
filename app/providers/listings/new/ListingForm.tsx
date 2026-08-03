'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = [
  'Camps', 'Sports & Athletics', 'Arts & Crafts', 'Music & Dance',
  'Academic & Tutoring', 'Outdoor Adventure', 'STEM & Tech',
  'Swim & Aquatics', 'Dance & Movement', 'Theater & Performance', 'Other',
];

const PRICE_UNITS = ['session', 'class', 'week', 'month', 'camp', 'season', 'year'];

const NEIGHBORHOODS = [
  'Ballard', 'Beacon Hill', 'Capitol Hill', 'Central District', 'Columbia City',
  'Eastlake', 'First Hill', 'Fremont', 'Green Lake', 'Greenwood',
  'Interbay', 'Kirkland', 'Lake City', 'Laurelhurst', 'Leschi',
  'Magnolia', 'Madrona', 'Mercer Island', 'Mount Baker', 'North Seattle',
  'Phinney Ridge', 'Queen Anne', 'Rainier Beach', 'Redmond', 'Shoreline',
  'South Lake Union', 'South Seattle', 'University District', 'Wallingford',
  'West Seattle', 'White Center', 'Citywide',
];

const STEPS = ['Activity details', 'Age & pricing', 'Location', 'Review & submit'];

interface ListingFormState {
  title: string;
  category: string;
  subcategory: string;
  description: string;
  ageMin: string;
  ageMax: string;
  price: string;
  priceUnit: string;
  neighborhood: string;
  website: string;
  phone: string;
}

interface Errors {
  [key: string]: string | undefined;
}

interface Props {
  contactName: string;
  contactEmail: string;
  businessName: string;
  defaultCategory: string;
}

export default function ListingForm({ contactName, contactEmail, businessName, defaultCategory }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingFormState>({
    title: '',
    category: defaultCategory,
    subcategory: '',
    description: '',
    ageMin: '',
    ageMax: '',
    price: '',
    priceUnit: 'week',
    neighborhood: '',
    website: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof ListingFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateStep(s: number): Errors {
    const e: Errors = {};
    if (s === 0) {
      if (!form.title.trim()) e.title = 'Required';
      if (!form.category) e.category = 'Select a category';
      if (form.description.trim().length < 20) e.description = 'At least 20 characters';
    }
    if (s === 1) {
      if (!form.ageMin) e.ageMin = 'Required';
      if (!form.ageMax) e.ageMax = 'Required';
      if (Number(form.ageMin) > Number(form.ageMax)) e.ageMin = 'Must be less than max age';
      if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
        e.price = 'Enter a valid price';
    }
    if (s === 2) {
      if (!form.neighborhood) e.neighborhood = 'Select a neighborhood';
    }
    return e;
  }

  function next() {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/providers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName, contactEmail, ...form }),
      });
      if (res.status === 401) {
        router.push('/providers/login?next=/providers/listings/new');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again or email hello@thelittlesound.com.' });
      setSubmitting(false);
    }
  }

  if (submitted) return <SuccessScreen businessName={form.title} />;

  return (
    <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">

      {/* Header */}
      <div className="text-center mb-8">
        <Link href="/providers/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-[#1A7A8A] font-medium mb-5 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="font-['Cormorant_Garamond'] text-[clamp(28px,4vw,44px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A]">
          Create your listing
        </h1>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[560px] mb-8">
        <div className="flex items-start gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 relative">
              {i < STEPS.length - 1 && (
                <div className={`absolute top-[13px] left-1/2 w-full h-[2px] ${i < step ? 'bg-[#0D5C6E]' : 'bg-[#E8DFC8]'}`} />
              )}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-200 ${
                i < step
                  ? 'bg-[#1A7A8A] text-white'
                  : i === step
                  ? 'bg-[#0D5C6E] text-white shadow-[0_0_0_4px_rgba(13,92,110,0.15)]'
                  : 'bg-[#E8DFC8] text-[#7A9AAA]'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[11px] text-center leading-tight max-w-[64px] font-medium ${
                i === step ? 'text-[#0D5C6E]' : 'text-[#7A9AAA]'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[560px] p-8 md:p-10">

        {step === 0 && <StepDetails form={form} set={set} errors={errors} />}
        {step === 1 && <StepPricing form={form} set={set} errors={errors} />}
        {step === 2 && (
          <StepLocation
            form={form}
            set={set}
            errors={errors}
            contactName={contactName}
            contactEmail={contactEmail}
            businessName={businessName}
          />
        )}
        {step === 3 && <StepReview form={form} contactName={contactName} contactEmail={contactEmail} />}

        {/* Nav */}
        <div className={`flex items-center mt-8 pt-6 border-t border-[#E8DFC8] ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <button
              onClick={back}
              className="h-11 px-6 rounded-full border-2 border-[#E8DFC8] text-[#0D5C6E] font-semibold text-[14px] hover:border-[#C5D8E8] transition-colors"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="h-11 px-8 rounded-full bg-[#0D5C6E] text-white font-semibold text-[14px] hover:bg-[#1A7A8A] hover:-translate-y-0.5 transition-all duration-200"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className={`h-11 px-8 rounded-full bg-[#0D5C6E] text-white font-semibold text-[14px] transition-all duration-200 ${
                submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A7A8A] hover:-translate-y-0.5'
              }`}
            >
              {submitting ? 'Submitting…' : 'Submit listing →'}
            </button>
          )}
        </div>

        {errors.submit && (
          <p className="mt-4 text-[13px] text-[#C0544A] bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3">
            {errors.submit}
          </p>
        )}
      </div>

      <p className="mt-5 text-[13px] text-[#7A9AAA]">
        Need help?{' '}
        <a href="mailto:hello@thelittlesound.com" className="text-[#1A7A8A] underline underline-offset-2">
          Email us
        </a>
      </p>
    </main>
  );
}

// ─── Step 1: Activity details ─────────────────────────────────────────────────

function StepDetails({ form, set, errors }: { form: ListingFormState; set: (f: keyof ListingFormState, v: string) => void; errors: Errors }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1C3A4A] mb-1">
          Tell us about your activity
        </h2>
        <p className="text-[14px] text-[#3A5A6A]">This is what families will see on your listing.</p>
      </div>

      <Field
        label="Activity title"
        value={form.title}
        onChange={(v) => set('title', v)}
        error={errors.title}
        placeholder="e.g. Summer Art Intensive, Soccer Skills Camp"
      />

      <SelectField
        label="Category"
        value={form.category}
        onChange={(v) => set('category', v)}
        options={CATEGORIES}
        placeholder="Select a category"
        error={errors.category}
      />

      <Field
        label="Subcategory (optional)"
        value={form.subcategory}
        onChange={(v) => set('subcategory', v)}
        placeholder="e.g. Ceramics, Flag Football, Robotics"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-[#0D5C6E]">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What will kids do? What makes this special? What should families know before signing up?"
          rows={5}
          className={`rounded-[12px] border-2 px-4 py-3 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full resize-y leading-relaxed transition-colors focus:outline-none focus:border-[#0D5C6E] ${
            errors.description ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
          }`}
        />
        <div className="flex items-center justify-between">
          <p className={`text-[12px] ${errors.description ? 'text-[#C0544A]' : 'text-[#7A9AAA]'}`}>
            {errors.description || `${form.description.length} characters`}
          </p>
          {form.description.length > 0 && form.description.length < 20 && (
            <p className="text-[12px] text-[#C0544A]">{20 - form.description.length} more needed</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Age & Pricing ────────────────────────────────────────────────────

function StepPricing({ form, set, errors }: { form: ListingFormState; set: (f: keyof ListingFormState, v: string) => void; errors: Errors }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1C3A4A] mb-1">Age range & pricing</h2>
        <p className="text-[14px] text-[#3A5A6A]">Helps families filter to the right fit for their kids.</p>
      </div>

      <div>
        <p className="text-[13px] font-medium text-[#0D5C6E] mb-2">Age range (years)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#7A9AAA]">Minimum age</label>
            <input
              type="number"
              min={0}
              max={17}
              value={form.ageMin}
              onChange={(e) => set('ageMin', e.target.value)}
              placeholder="e.g. 5"
              className={`h-12 rounded-[12px] border-2 px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E] ${
                errors.ageMin ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
              }`}
            />
            {errors.ageMin && <p className="text-[12px] text-[#C0544A]">{errors.ageMin}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#7A9AAA]">Maximum age</label>
            <input
              type="number"
              min={0}
              max={18}
              value={form.ageMax}
              onChange={(e) => set('ageMax', e.target.value)}
              placeholder="e.g. 12"
              className={`h-12 rounded-[12px] border-2 px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E] ${
                errors.ageMax ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
              }`}
            />
            {errors.ageMax && <p className="text-[12px] text-[#C0544A]">{errors.ageMax}</p>}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-[#0D5C6E] mb-2">Pricing</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#7A9AAA]">Price ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A9AAA] text-[15px] pointer-events-none">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0"
                className={`h-12 rounded-[12px] border-2 pl-8 pr-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E] ${
                  errors.price ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
                }`}
              />
            </div>
            {errors.price && <p className="text-[12px] text-[#C0544A]">{errors.price}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#7A9AAA]">Per</label>
            <div className="relative">
              <select
                value={form.priceUnit}
                onChange={(e) => set('priceUnit', e.target.value)}
                className="h-12 rounded-[12px] border-2 border-[#E8DFC8] px-4 pr-8 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full appearance-none transition-colors focus:outline-none focus:border-[#0D5C6E]"
              >
                {PRICE_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0D5C6E] text-xs">▾</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[14px] px-5 py-4">
        <p className="text-[13px] text-[#3A5A6A] leading-relaxed">
          <strong className="text-[#0D5C6E]">Not sure on pricing?</strong> You can update this any time. Families see pricing as a range, so approximate is fine for now.
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Location ─────────────────────────────────────────────────────────

function StepLocation({
  form, set, errors, contactName, contactEmail, businessName,
}: {
  form: ListingFormState;
  set: (f: keyof ListingFormState, v: string) => void;
  errors: Errors;
  contactName: string;
  contactEmail: string;
  businessName: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1C3A4A] mb-1">Location & contact</h2>
        <p className="text-[14px] text-[#3A5A6A]">Where do families find you?</p>
      </div>

      <SelectField
        label="Neighborhood"
        value={form.neighborhood}
        onChange={(v) => set('neighborhood', v)}
        options={NEIGHBORHOODS}
        placeholder="Select a neighborhood"
        error={errors.neighborhood}
      />

      <Field
        label="Website"
        type="url"
        value={form.website}
        onChange={(v) => set('website', v)}
        placeholder="https://yoursite.com"
        autoComplete="url"
      />

      <Field
        label="Phone (optional)"
        type="tel"
        value={form.phone}
        onChange={(v) => set('phone', v)}
        placeholder="206-555-0100"
        autoComplete="tel"
      />

      <div className="border-t border-[#E8DFC8] pt-4 flex flex-col gap-1.5">
        <p className="text-[13px] font-medium text-[#0D5C6E]">Your account</p>
        <p className="text-[13px] text-[#7A9AAA] mb-3">From your provider account — only visible to the Little Sound team.</p>
        <div className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[12px] px-5 py-4 flex flex-col gap-1">
          <p className="text-[14px] text-[#1C3A4A] font-medium">{businessName || '—'}</p>
          <p className="text-[13px] text-[#3A5A6A]">{contactName || '—'} · {contactEmail || '—'}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({ form, contactName, contactEmail }: { form: ListingFormState; contactName: string; contactEmail: string }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Title', value: form.title },
    { label: 'Category', value: [form.category, form.subcategory].filter(Boolean).join(' › ') },
    { label: 'Ages', value: `${form.ageMin}–${form.ageMax} years` },
    { label: 'Price', value: `$${form.price} / ${form.priceUnit}` },
    { label: 'Neighborhood', value: form.neighborhood },
    { label: 'Website', value: form.website || '—' },
    { label: 'Contact', value: `${contactName} · ${contactEmail}` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1C3A4A] mb-1">Review your listing</h2>
        <p className="text-[14px] text-[#3A5A6A]">Looks good? Hit submit — we&apos;ll review and go live within 24 hours.</p>
      </div>

      <div className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[16px] overflow-hidden">
        {rows.map((row, i) => (
          <div key={row.label} className={`flex gap-4 px-5 py-3.5 ${i !== rows.length - 1 ? 'border-b border-[#E8DFC8]' : ''}`}>
            <span className="text-[12px] font-semibold text-[#7A9AAA] uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">{row.label}</span>
            <span className="text-[14px] text-[#1C3A4A] leading-relaxed">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-[#7A9AAA] uppercase tracking-wide">Description</span>
        <p className="text-[14px] text-[#3A5A6A] leading-relaxed bg-[#F5EFE0] border border-[#E8DFC8] rounded-[12px] px-5 py-4">
          {form.description}
        </p>
      </div>

      <div className="bg-[#0D5C6E]/5 border border-[#0D5C6E]/15 rounded-[14px] px-5 py-4">
        <p className="text-[13px] text-[#0D5C6E] leading-relaxed font-medium">
          After submission: our team reviews your listing within 24 hours, then it goes live in the Little Sound directory. You&apos;ll hear from us at {contactEmail}.
        </p>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ businessName }: { businessName: string }) {
  return (
    <main className="min-h-screen bg-[#F5EFE0] flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-10 text-center">
        <div className="text-5xl mb-5">🎉</div>
        <h2 className="font-['Cormorant_Garamond'] text-[32px] font-light text-[#1C3A4A] mb-3">
          You&apos;re submitted!
        </h2>
        <p className="text-[15px] text-[#3A5A6A] leading-relaxed mb-8">
          <strong className="text-[#1C3A4A]">{businessName}</strong> is in review. We&apos;ll have your listing live within 24 hours — and notify the Seattle families already waiting.
        </p>
        <div className="flex flex-col gap-3">
          {/* Plain <a>, not next/link — a full navigation guarantees the
              dashboard re-fetches fresh data server-side. A client-side
              Link can serve a router-cached snapshot from before this
              listing was submitted, showing a stale empty state. */}
          <a
            href="/providers/dashboard"
            className="inline-flex items-center justify-center h-12 rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] hover:bg-[#1A7A8A] transition-colors"
          >
            Go to your dashboard →
          </a>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center h-12 rounded-full border-2 border-[#E8DFC8] text-[#0D5C6E] font-semibold text-[14px] hover:border-[#C5D8E8] transition-colors"
          >
            See the directory
          </Link>
        </div>
        <p className="text-[12px] text-[#7A9AAA] mt-6">
          Questions? <a href="mailto:hello@thelittlesound.com" className="underline underline-offset-2 text-[#1A7A8A]">hello@thelittlesound.com</a>
        </p>
      </div>
    </main>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ label, type = 'text', value, onChange, error, placeholder, autoComplete }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#0D5C6E]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`h-12 rounded-[12px] border-2 px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E] ${
          error ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
        }`}
      />
      {error && <p className="text-[12px] text-[#C0544A]">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  error?: string;
}

function SelectField({ label, value, onChange, options, placeholder, error }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#0D5C6E]">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-12 rounded-[12px] border-2 px-4 pr-10 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white appearance-none transition-colors focus:outline-none focus:border-[#0D5C6E] ${
            error ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#0D5C6E] text-xs">▾</span>
      </div>
      {error && <p className="text-[12px] text-[#C0544A]">{error}</p>}
    </div>
  );
}
