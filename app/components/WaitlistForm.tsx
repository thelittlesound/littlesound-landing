'use client';

import { FormEvent, useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Track conversion event for analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'waitlist_signup', {
            email: email,
          });
        }

        setSuccess(true);
        setEmail('');
        setFirstName('');
        setLastName('');
        
        // Hide success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || 'Failed to join waitlist. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="input"
          disabled={loading}
        />
      </div>
      
      <div>
        <input
          type="text"
          placeholder="Last Name (optional)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="input"
          disabled={loading}
        />
      </div>

      <div>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? 'Joining...' : 'Join the Waitlist'}
      </button>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
          <p className="text-green-700 font-medium">
            ✓ Welcome to Little Sound! Check your email for next steps.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <p className="text-xs text-text-muted text-center">
        We respect your privacy. No spam, ever.
      </p>
    </form>
  );
}
