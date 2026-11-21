'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineIcon } from '@/app/components/LineIcon';
import { CATEGORY_NAMES } from '@/lib/categories';

const NEIGHBORHOODS = [
  'Ballard', 'Beacon Hill', 'Capitol Hill', 'Central District', 'Columbia City',
  'Eastlake', 'First Hill', 'Fremont', 'Green Lake', 'Greenwood',
  'Interbay', 'Kirkland', 'Lake City', 'Laurelhurst', 'Leschi',
  'Magnolia', 'Madrona', 'Mercer Island', 'Mount Baker', 'North Seattle',
  'Phinney Ridge', 'Queen Anne', 'Rainier Beach', 'Redmond', 'Shoreline',
  'South Lake Union', 'South Seattle', 'University District', 'Wallingford',
  'West Seattle', 'White Center', 'Citywide',
];

// Discover's 14 categories (lib/categories.ts, 2026-11-20).
const INTERESTS = CATEGORY_NAMES;

const STEPS = ['Your account', 'Your family'];

interface Kid {
  age: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  neighborhood: string;
  kids: Kid[];
  preferences: string[];
}

interface Errors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function FamilySignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    neighborhood: '',
    kids: [{ age: '' }],
    preferences: [],
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

  function validateStep1(): Errors {
    const e: Errors = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 8) e.password = 'At least 8 characters';
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords don't match";
    return e;
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setStep(1);
  }

  function toggleInterest(interest: string) {
    setForm((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(interest)
        ? prev.preferences.filter((p) => p !== interest)
        : [...prev.preferences, interest],
    }));
  }

  function updateKidAge(index: number, age: string) {
    setForm((prev) => ({
      ...prev,
      kids: prev.kids.map((k, i) => (i === index ? { age } : k)),
    }));
  }

  function addKid() {
    setForm((prev) => ({ ...prev, kids: [...prev.kids, { age: '' }] }));
  }

  function removeKid(index: number) {
    setForm((prev) => ({ ...prev, kids: prev.kids.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/families/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          neighborhood: form.neighborhood,
          kids: form.kids
            .filter((k) => k.age.trim() !== '')
            .map((k) => ({ age: Number(k.age) })),
          preferences: form.preferences,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.confirmedImmediately) {
        router.push('/families/dashboard');
      } else {
        setCheckEmail(true);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen bg-cream-500 flex flex-col items-center px-4 py-16 pt-28">
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-8 md:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-800/[0.08] flex items-center justify-center mx-auto mb-5">
            <LineIcon name="mail" size={26} color="#A8865A" />
          </div>
          <h1 className="font-display text-[28px] font-light text-text-dark mb-3">
            Check your email
          </h1>
          <p className="text-text-mid text-[15px] leading-relaxed mb-6">
            We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate
            your account, then sign in to see your dashboard.
          </p>
          <Link
            href="/families/login"
            className="inline-flex h-12 items-center justify-center rounded-full bg-teal-800 text-white font-semibold text-[15px] px-8 hover:bg-teal-700 transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-500 flex flex-col items-center px-4 py-16 pt-28">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-teal-800/[0.08] border border-teal-800/15 rounded-full px-4 py-1.5 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-800">Family Portal</span>
        </div>
        <h1 className="font-display text-[clamp(32px,5vw,52px)] font-light leading-[1.1] tracking-tight text-text-dark mb-4">
          Create your<br />
          <em className="italic text-teal-800">Little Sound account.</em>
        </h1>
        <p className="text-text-mid text-[16px] leading-relaxed max-w-[400px] mx-auto">
          Save activities, plan your family&apos;s week, and see what fits each child. Free to join.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                i <= step ? 'bg-teal-800 text-white' : 'bg-white text-text-muted border border-cream-700'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-[13px] font-medium ${i <= step ? 'text-teal-800' : 'text-text-muted'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-cream-700 mx-1" />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[480px] p-8 md:p-10">

        {step === 0 ? (
          <form onSubmit={handleContinue} noValidate className="flex flex-col gap-5">
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

            <button
              type="submit"
              className="h-[52px] rounded-full bg-teal-800 text-white font-semibold text-[15px] tracking-[0.01em] transition-all duration-200 mt-1 hover:bg-teal-700 hover:-translate-y-0.5"
            >
              Continue →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Neighborhood */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-teal-800">Neighborhood (optional)</label>
              <div className="relative">
                <select
                  value={form.neighborhood}
                  onChange={(e) => set('neighborhood', e.target.value)}
                  className="w-full h-12 rounded-[12px] border-2 border-cream-700 px-4 pr-10 text-[15px] font-body text-text-dark bg-white appearance-none transition-colors focus:outline-none focus:border-teal-800"
                >
                  <option value="">Select a neighborhood</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-teal-800 text-xs">▾</span>
              </div>
            </div>

            {/* Kids' ages */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-teal-800">Kids' ages (optional)</label>
              {form.kids.map((kid, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={18}
                    value={kid.age}
                    onChange={(e) => updateKidAge(i, e.target.value)}
                    placeholder={`Kid ${i + 1} age`}
                    className="h-12 flex-1 rounded-[12px] border-2 border-cream-700 px-4 text-[15px] font-body text-text-dark bg-white transition-colors focus:outline-none focus:border-teal-800"
                  />
                  {form.kids.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKid(i)}
                      className="text-text-muted hover:text-error text-sm px-2"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addKid}
                className="self-start text-[13px] font-medium text-teal-700 hover:text-teal-800 mt-1"
              >
                + Add another kid
              </button>
            </div>

            {/* Interests */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-teal-800">
                What are you interested in? (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const active = form.preferences.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      aria-pressed={active}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-[13px] font-medium border-2 transition-colors inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-teal-800 border-teal-800 text-white'
                          : 'bg-white border-cream-700 text-text-mid hover:border-blue-grey-300'
                      }`}
                    >
                      <LineIcon name={interest} size={16} color={active ? '#F5EFE0' : '#A8865A'} className="shrink-0" />
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <p className="text-[13px] text-error bg-error/[0.08] border border-error/20 rounded-[10px] px-4 py-3">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="h-[52px] rounded-full border-2 border-cream-700 text-text-mid font-semibold text-[15px] px-6 hover:border-blue-grey-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`h-[52px] flex-1 rounded-full bg-teal-800 text-white font-semibold text-[15px] tracking-[0.01em] transition-all duration-200 ${
                  submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-700 hover:-translate-y-0.5'
                }`}
              >
                {submitting ? 'Creating your account…' : 'Create account'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[13px] text-text-muted mt-6">
          Already have an account?{' '}
          <Link href="/families/login" className="text-teal-700 underline underline-offset-2">
            Sign in
          </Link>
        </p>
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
