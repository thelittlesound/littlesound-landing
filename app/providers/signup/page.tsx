'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Camps',
  'Sports & Athletics',
  'Arts & Crafts',
  'Music & Dance',
  'Academic & Tutoring',
  'Outdoor Adventure',
  'STEM & Tech',
  'Swim & Aquatics',
  'Dance & Movement',
  'Theater & Performance',
  'Other',
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  category: string;
  website: string;
  phone: string;
  agreeToTerms: boolean;
}

interface Errors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  businessName?: string;
  category?: string;
  agreeToTerms?: string;
}

export default function ProviderSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    category: '',
    website: '',
    phone: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof Errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Valid email required';
    if (!form.password || form.password.length < 8) e.password = 'At least 8 characters';
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords don't match";
    if (!form.businessName.trim()) e.businessName = 'Required';
    if (!form.category) e.category = 'Select a category';
    if (!form.agreeToTerms) e.agreeToTerms = 'You must agree to continue';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/providers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          businessName: form.businessName,
          category: form.category,
          website: form.website,
          phone: form.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Submission failed');

      if (data.confirmedImmediately) {
        router.push('/providers/listings/new');
      } else {
        setCheckEmail(true);
        setSubmitting(false);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again or email hello@thelittlesound.com.'
      );
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-8 md:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0D5C6E]/8 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="font-['Cormorant_Garamond'] text-[28px] font-light text-[#1C3A4A] mb-3">
            Check your email
          </h1>
          <p className="text-[#3A5A6A] text-[15px] leading-relaxed mb-6">
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate
            your account, then sign in to create your listing.
          </p>
          <Link
            href="/providers/login"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] px-8 hover:bg-[#1A7A8A] transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#0D5C6E]/8 border border-[#0D5C6E]/15 rounded-full px-4 py-1.5 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E]">Provider Portal</span>
        </div>
        <h1 className="font-['Cormorant_Garamond'] text-[clamp(32px,5vw,52px)] font-light leading-[1.1] tracking-tight text-[#1C3A4A] mb-4">
          List your activities<br />
          <em className="italic text-[#0D5C6E]">on Little Sound.</em>
        </h1>
        <p className="text-[#3A5A6A] text-[16px] leading-relaxed max-w-[400px] mx-auto">
          Reach Seattle families already searching for what you offer. Free during our beta launch.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-8 md:p-10">

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="First name"
              value={form.firstName}
              onChange={(v) => set('firstName', v)}
              error={errors.firstName}
              autoComplete="given-name"
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChange={(v) => set('lastName', v)}
              error={errors.lastName}
              autoComplete="family-name"
            />
          </div>

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => set('email', v)}
            error={errors.email}
            autoComplete="email"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => set('password', v)}
              error={errors.password}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => set('confirmPassword', v)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <div className="border-t border-[#E8DFC8]" />

          <Field
            label="Business or organization name"
            value={form.businessName}
            onChange={(v) => set('businessName', v)}
            error={errors.businessName}
            placeholder="e.g. Summit Kids Camp"
            autoComplete="organization"
          />

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#0D5C6E]">Type of activity</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={`w-full h-12 rounded-[12px] border-2 px-4 pr-10 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white appearance-none transition-colors focus:outline-none focus:border-[#0D5C6E] ${
                  errors.category ? 'border-[#C0544A]' : 'border-[#E8DFC8]'
                }`}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#0D5C6E] text-xs">▾</span>
            </div>
            {errors.category && <p className="text-[12px] text-[#C0544A]">{errors.category}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Website (optional)"
              type="url"
              value={form.website}
              onChange={(v) => set('website', v)}
              placeholder="https://..."
              autoComplete="url"
            />
            <Field
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={(v) => set('phone', v)}
              placeholder="206-..."
              autoComplete="tel"
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="terms"
              type="checkbox"
              checked={form.agreeToTerms}
              onChange={(e) => set('agreeToTerms', e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#0D5C6E] cursor-pointer"
            />
            <label htmlFor="terms" className="text-[13px] text-[#3A5A6A] leading-relaxed cursor-pointer">
              I agree to Little Sound&apos;s{' '}
              <Link href="/terms" className="text-[#1A7A8A] underline underline-offset-2">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-[#1A7A8A] underline underline-offset-2">Privacy Policy</Link>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-[12px] text-[#C0544A] -mt-3">{errors.agreeToTerms}</p>
          )}

          {submitError && (
            <p className="text-[13px] text-[#C0544A] bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`h-[52px] rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] tracking-[0.01em] transition-all duration-200 mt-1 ${
              submitting
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-[#1A7A8A] hover:-translate-y-0.5'
            }`}
          >
            {submitting ? 'Creating your account…' : 'Continue to create your listing →'}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#7A9AAA] mt-6">
          Already have an account?{' '}
          <Link href="/providers/login" className="text-[#1A7A8A] underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>

      {/* Trust bar */}
      <div className="flex flex-wrap gap-6 justify-center mt-8">
        {['Free to list', 'No upfront fees', '100+ Seattle families on waitlist'].map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-[12px] text-[#1A7A8A] font-medium">
            <span className="text-[#C4A882] font-bold">✓</span>
            {item}
          </span>
        ))}
      </div>
    </main>
  );
}

// ─── Shared field component ───────────────────────────────────────────────────

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
