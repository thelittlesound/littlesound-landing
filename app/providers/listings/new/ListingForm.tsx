'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconChip } from '@/app/components/LineIcon';
import CategoryPicker from '@/app/components/CategoryPicker';
import { formCategory } from '@/lib/categories';


const PRICE_UNITS = ['session', 'class', 'week', 'month', 'camp', 'season', 'year'];

// A listing being edited can carry a value that isn't in these option lists —
// e.g. a claimed seed listing in "Martial Arts" or priced per "lesson". Keep
// that value selectable so saving an edit doesn't silently change it.
function withCurrent(options: string[], current: string): string[] {
  return !current || options.includes(current) ? options : [current, ...options];
}

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
  mode?: 'create' | 'edit';
  listingId?: string;
  initial?: Partial<ListingFormState>;
  currentStatus?: 'pending' | 'approved' | 'rejected';
}

export default function ListingForm({
  contactName,
  contactEmail,
  businessName,
  defaultCategory,
  mode = 'create',
  listingId,
  initial,
  currentStatus,
}: Props) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingFormState>({
    title: '',
    subcategory: '',
    description: '',
    ageMin: '',
    ageMax: '',
    price: '',
    priceUnit: 'week',
    neighborhood: '',
    website: '',
    phone: '',
    ...initial,
    // Discover's 14 since 11-20: an old label opens on its first subject; "Other" asks for a pick.
    category: formCategory(initial?.category ?? defaultCategory),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ status?: string; reapprovalNeeded?: boolean }>({});

  function set(field: keyof ListingFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateStep(s: number): Errors {
    const e: Errors = {};
    if (s === 0) {
      if (!form.title.trim()) e.title = 'Required';
      if (!form.category) e.category = 'Pick a category';
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
      const endpoint = isEdit ? `/api/providers/listings/${listingId}` : '/api/providers/submit';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName, contactEmail, ...form }),
      });
      if (res.status === 401) {
        const next = isEdit ? `/providers/listings/${listingId}/edit` : '/providers/listings/new';
        router.push(`/providers/login?next=${next}`);
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const data = await res.json().catch(() => ({}));
      setResult({ status: data.status, reapprovalNeeded: data.reapprovalNeeded });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again or email hello@thelittlesound.com.' });
      setSubmitting(false);
    }
  }

  if (submitted) {
    return isEdit ? (
      <EditSuccessScreen title={form.title} status={result.status} reapprovalNeeded={result.reapprovalNeeded} />
    ) : (
      <SuccessScreen businessName={form.title} />
    );
  }

  return (
    <main className="min-h-screen bg-cream-500 flex flex-col items-center px-4 py-16 pt-28">

      {/* Header */}
      <div className="text-center mb-8">
        <Link href="/providers/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-teal-700 font-medium mb-5 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] font-light leading-[1.15] tracking-tight text-text-dark">
          {isEdit ? 'Edit your listing' : 'Create your listing'}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[560px] mb-8">
        <div className="flex items-start gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 relative">
              {i < STEPS.length - 1 && (
                <div className={`absolute top-[13px] left-1/2 w-full h-[2px] ${i < step ? 'bg-teal-800' : 'bg-cream-700'}`} />
              )}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-200 ${
                i < step
                  ? 'bg-teal-700 text-white'
                  : i === step
                  ? 'bg-teal-800 text-white shadow-[0_0_0_4px_rgba(13,92,110,0.15)]'
                  : 'bg-cream-700 text-text-muted'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[11px] text-center leading-tight max-w-[64px] font-medium ${
                i === step ? 'text-teal-800' : 'text-text-muted'
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
        {step === 3 && <StepReview form={form} contactName={contactName} contactEmail={contactEmail} isEdit={isEdit} currentStatus={currentStatus} />}

        {/* Nav */}
        <div className={`flex items-center mt-8 pt-6 border-t border-cream-700 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <button
              onClick={back}
              className="h-11 px-6 rounded-full border-2 border-cream-700 text-teal-800 font-semibold text-[14px] hover:border-blue-grey-300 transition-colors"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="h-11 px-8 rounded-full bg-teal-800 text-white font-semibold text-[14px] hover:bg-teal-700 hover:-translate-y-0.5 transition-all duration-200"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className={`h-11 px-8 rounded-full bg-teal-800 text-white font-semibold text-[14px] transition-all duration-200 ${
                submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-700 hover:-translate-y-0.5'
              }`}
            >
              {submitting
                ? (isEdit ? 'Saving…' : 'Submitting…')
                : (isEdit ? 'Save changes →' : 'Submit listing →')}
            </button>
          )}
        </div>

        {errors.submit && (
          <p className="mt-4 text-[13px] text-error bg-error/[0.08] border border-error/20 rounded-[10px] px-4 py-3">
            {errors.submit}
          </p>
        )}
      </div>

      <p className="mt-5 text-[13px] text-text-muted">
        Need help?{' '}
        <a href="mailto:hello@thelittlesound.com" className="text-teal-700 underline underline-offset-2">
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
        <h2 className="font-display text-[26px] font-light text-text-dark mb-1">
          Tell us about your activity
        </h2>
        <p className="text-[14px] text-text-mid">This is what families will see on your listing.</p>
      </div>

      <Field
        label="Activity title"
        value={form.title}
        onChange={(v) => set('title', v)}
        error={errors.title}
        placeholder="e.g. Summer Art Intensive, Soccer Skills Camp"
      />

      <CategoryPicker
        label="What kind of program is it?"
        value={form.category}
        onChange={(v) => set('category', v)}
        error={errors.category}
        hint="Families find it under this on Discover. Mainly a camp? Choose Camps. Doesn't fit neatly? Pick the closest, and say more in the description."
      />

      <Field
        label="Subcategory (optional)"
        value={form.subcategory}
        onChange={(v) => set('subcategory', v)}
        placeholder="e.g. Ceramics, Flag Football, Robotics"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-teal-800">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What will kids do? What makes this special? What should families know before signing up?"
          rows={5}
          className={`rounded-[12px] border-2 px-4 py-3 text-[15px] font-body text-text-dark bg-white w-full resize-y leading-relaxed transition-colors focus:outline-none focus:border-teal-800 ${
            errors.description ? 'border-error' : 'border-cream-700'
          }`}
        />
        <div className="flex items-center justify-between">
          <p className={`text-[12px] ${errors.description ? 'text-error' : 'text-text-muted'}`}>
            {errors.description || `${form.description.length} characters`}
          </p>
          {form.description.length > 0 && form.description.length < 20 && (
            <p className="text-[12px] text-error">{20 - form.description.length} more needed</p>
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
        <h2 className="font-display text-[26px] font-light text-text-dark mb-1">Age range & pricing</h2>
        <p className="text-[14px] text-text-mid">Helps families filter to the right fit for their kids.</p>
      </div>

      <div>
        <p className="text-[13px] font-medium text-teal-800 mb-2">Age range (years)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-text-muted">Minimum age</label>
            <input
              type="number"
              min={0}
              max={17}
              value={form.ageMin}
              onChange={(e) => set('ageMin', e.target.value)}
              placeholder="e.g. 5"
              className={`h-12 rounded-[12px] border-2 px-4 text-[15px] font-body text-text-dark bg-white w-full transition-colors focus:outline-none focus:border-teal-800 ${
                errors.ageMin ? 'border-error' : 'border-cream-700'
              }`}
            />
            {errors.ageMin && <p className="text-[12px] text-error">{errors.ageMin}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-text-muted">Maximum age</label>
            <input
              type="number"
              min={0}
              max={18}
              value={form.ageMax}
              onChange={(e) => set('ageMax', e.target.value)}
              placeholder="e.g. 12"
              className={`h-12 rounded-[12px] border-2 px-4 text-[15px] font-body text-text-dark bg-white w-full transition-colors focus:outline-none focus:border-teal-800 ${
                errors.ageMax ? 'border-error' : 'border-cream-700'
              }`}
            />
            {errors.ageMax && <p className="text-[12px] text-error">{errors.ageMax}</p>}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-teal-800 mb-2">Pricing</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-text-muted">Price ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-[15px] pointer-events-none">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0"
                className={`h-12 rounded-[12px] border-2 pl-8 pr-4 text-[15px] font-body text-text-dark bg-white w-full transition-colors focus:outline-none focus:border-teal-800 ${
                  errors.price ? 'border-error' : 'border-cream-700'
                }`}
              />
            </div>
            {errors.price && <p className="text-[12px] text-error">{errors.price}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-text-muted">Per</label>
            <div className="relative">
              <select
                value={form.priceUnit}
                onChange={(e) => set('priceUnit', e.target.value)}
                className="h-12 rounded-[12px] border-2 border-cream-700 px-4 pr-8 text-[15px] font-body text-text-dark bg-white w-full appearance-none transition-colors focus:outline-none focus:border-teal-800"
              >
                {withCurrent(PRICE_UNITS, form.priceUnit).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-teal-800 text-xs">▾</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cream-500 border border-cream-700 rounded-[14px] px-5 py-4">
        <p className="text-[13px] text-text-mid leading-relaxed">
          <strong className="text-teal-800">Not sure on pricing?</strong> You can update this any time. Families see pricing as a range, so approximate is fine for now.
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
        <h2 className="font-display text-[26px] font-light text-text-dark mb-1">Location & contact</h2>
        <p className="text-[14px] text-text-mid">Where do families find you?</p>
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

      <div className="border-t border-cream-700 pt-4 flex flex-col gap-1.5">
        <p className="text-[13px] font-medium text-teal-800">Your account</p>
        <p className="text-[13px] text-text-muted mb-3">From your provider account — only visible to the Little Sound team.</p>
        <div className="bg-cream-500 border border-cream-700 rounded-[12px] px-5 py-4 flex flex-col gap-1">
          <p className="text-[14px] text-text-dark font-medium">{businessName || '—'}</p>
          <p className="text-[13px] text-text-mid">{contactName || '—'} · {contactEmail || '—'}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({
  form,
  contactName,
  contactEmail,
  isEdit,
  currentStatus,
}: {
  form: ListingFormState;
  contactName: string;
  contactEmail: string;
  isEdit?: boolean;
  currentStatus?: 'pending' | 'approved' | 'rejected';
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Title', value: form.title },
    { label: 'Category', value: [form.category, form.subcategory].filter(Boolean).join(' › ') },
    { label: 'Ages', value: `${form.ageMin}–${form.ageMax} years` },
    { label: 'Price', value: `$${form.price} / ${form.priceUnit}` },
    { label: 'Neighborhood', value: form.neighborhood },
    { label: 'Website', value: form.website || '—' },
    { label: 'Contact', value: `${contactName} · ${contactEmail}` },
  ];

  const subhead = isEdit
    ? 'Review your changes before saving.'
    : 'Looks good? Hit submit — we’ll review and go live within 24 hours.';

  const note = !isEdit
    ? `After submission: our team reviews your listing within 24 hours, then it goes live in the Little Sound directory. You’ll hear from us at ${contactEmail}.`
    : currentStatus === 'approved'
    ? 'Your listing stays live on Discover while our team reviews these changes — usually within 24 hours.'
    : currentStatus === 'rejected'
    ? 'Saving resubmits your listing for review. We’ll take another look within 24 hours.'
    : 'Your listing is still in review — these changes will be part of that review.';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[26px] font-light text-text-dark mb-1">
          {isEdit ? 'Review your changes' : 'Review your listing'}
        </h2>
        <p className="text-[14px] text-text-mid">{subhead}</p>
      </div>

      <div className="bg-cream-500 border border-cream-700 rounded-[16px] overflow-hidden">
        {rows.map((row, i) => (
          <div key={row.label} className={`flex gap-4 px-5 py-3.5 ${i !== rows.length - 1 ? 'border-b border-cream-700' : ''}`}>
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">{row.label}</span>
            <span className="text-[14px] text-text-dark leading-relaxed">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Description</span>
        <p className="text-[14px] text-text-mid leading-relaxed bg-cream-500 border border-cream-700 rounded-[12px] px-5 py-4">
          {form.description}
        </p>
      </div>

      <div className="bg-teal-800/5 border border-teal-800/15 rounded-[14px] px-5 py-4">
        <p className="text-[13px] text-teal-800 leading-relaxed font-medium">
          {note}
        </p>
      </div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ businessName }: { businessName: string }) {
  return (
    <main className="min-h-screen bg-cream-500 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-10 text-center">
        <IconChip name="sparkle" className="mx-auto mb-5" />
        <h2 className="font-display text-[32px] font-light text-text-dark mb-3">
          You&apos;re submitted!
        </h2>
        <p className="text-[15px] text-text-mid leading-relaxed mb-8">
          <strong className="text-text-dark">{businessName}</strong> is in review. We&apos;ll have your listing live within 24 hours.
        </p>
        <div className="flex flex-col gap-3">
          {/* Plain <a>, not next/link — a full navigation guarantees the
              dashboard re-fetches fresh data server-side. A client-side
              Link can serve a router-cached snapshot from before this
              listing was submitted, showing a stale empty state. */}
          <a
            href="/providers/dashboard"
            className="inline-flex items-center justify-center h-12 rounded-full bg-teal-800 text-white font-semibold text-[15px] hover:bg-teal-700 transition-colors"
          >
            Go to your dashboard →
          </a>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center h-12 rounded-full border-2 border-cream-700 text-teal-800 font-semibold text-[14px] hover:border-blue-grey-300 transition-colors"
          >
            See the directory
          </Link>
        </div>
        <p className="text-[12px] text-text-muted mt-6">
          Questions? <a href="mailto:hello@thelittlesound.com" className="underline underline-offset-2 text-teal-700">hello@thelittlesound.com</a>
        </p>
      </div>
    </main>
  );
}

// ─── Edit success screen ──────────────────────────────────────────────────────

function EditSuccessScreen({
  title,
  status,
  reapprovalNeeded,
}: {
  title: string;
  status?: string;
  reapprovalNeeded?: boolean;
}) {
  const heading = reapprovalNeeded
    ? 'Changes saved — your listing stays live'
    : status === 'pending'
    ? 'Submitted for review'
    : 'Changes saved';

  const body = reapprovalNeeded
    ? 'It stays live on Discover while our team reviews your edits — usually within 24 hours.'
    : status === 'pending'
    ? 'Your updated listing is in review. We will take another look within 24 hours.'
    : 'Your listing has been updated.';

  return (
    <main className="min-h-screen bg-cream-500 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-teal-800/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-teal-800 text-2xl">✓</span>
        </div>
        <h2 className="font-display text-[30px] font-light text-text-dark mb-2">
          {heading}
        </h2>
        <p className="text-[15px] text-text-dark font-semibold leading-relaxed mb-1">
          {title}
        </p>
        <p className="text-[15px] text-text-mid leading-relaxed mb-8">
          {body}
        </p>
        <div className="flex flex-col gap-3">
          {/* Plain <a>, not next/link — a full navigation guarantees the
              dashboard re-fetches fresh data server-side instead of serving a
              router-cached snapshot from before this edit. */}
          <a
            href="/providers/dashboard"
            className="inline-flex items-center justify-center h-12 rounded-full bg-teal-800 text-white font-semibold text-[15px] hover:bg-teal-700 transition-colors"
          >
            Back to your dashboard →
          </a>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center h-12 rounded-full border-2 border-cream-700 text-teal-800 font-semibold text-[14px] hover:border-blue-grey-300 transition-colors"
          >
            See the directory
          </Link>
        </div>
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
      <label className="text-[13px] font-medium text-teal-800">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`h-12 rounded-[12px] border-2 px-4 text-[15px] font-body text-text-dark bg-white w-full transition-colors focus:outline-none focus:border-teal-800 ${
          error ? 'border-error' : 'border-cream-700'
        }`}
      />
      {error && <p className="text-[12px] text-error">{error}</p>}
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
      <label className="text-[13px] font-medium text-teal-800">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-12 rounded-[12px] border-2 px-4 pr-10 text-[15px] font-body text-text-dark bg-white appearance-none transition-colors focus:outline-none focus:border-teal-800 ${
            error ? 'border-error' : 'border-cream-700'
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-teal-800 text-xs">▾</span>
      </div>
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
