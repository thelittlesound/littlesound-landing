export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "4rem 1.5rem", fontFamily: "'DM Sans', sans-serif", color: "#1C3A4A", lineHeight: "1.7" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "3rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#7A9AAA", fontSize: "0.875rem", marginBottom: "3rem" }}>Last updated: August 2026</p>

      <p>Little Sound ("we," "us," or "our") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights. It covers our waitlist, family accounts, and provider accounts.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>What We Collect</h2>
      <p><strong>If you join our waitlist</strong>, we collect your email address only.</p>
      <p><strong>If you create a family account</strong>, we collect your first and last name, email address, and password (encrypted — we never see or store it in plain text). Optionally, you can also share your neighborhood, your kids' ages, and your activity interests, so we can personalize what we show you. All of this is optional except name, email, and password.</p>
      <p><strong>If you create a provider account</strong>, we collect your name, email, business or organization name, category, and any listing details you submit (description, pricing, age ranges, location, website, phone).</p>
      <p>We also collect standard analytics data through Google Analytics 4 — including pages visited, time on site, and general device/browser information. This data is aggregated and anonymous.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>How We Use It</h2>
      <p>We use waitlist and account information to:</p>
      <ul style={{ paddingLeft: "1.5rem" }}>
        <li>Send you updates about Little Sound's launch and beta access</li>
        <li>Create and secure your family or provider account</li>
        <li>Personalize activity recommendations based on your family profile, if you've shared one</li>
        <li>Review and approve provider listings for the Discover page</li>
        <li>Occasionally share relevant news about the product</li>
      </ul>
      <p>We will never sell your data or share it with third parties for marketing purposes.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>How We Store It</h2>
      <p>Waitlist emails are stored in <a href="https://www.brevo.com" style={{ color: "#1A7A8A" }}>Brevo</a>, our email platform. Account data (family and provider accounts, profiles, and listings) is stored in <a href="https://supabase.com" style={{ color: "#1A7A8A" }}>Supabase</a>, our database and authentication provider. Both are industry-standard providers with encryption in transit and at rest. Our website is hosted on <a href="https://vercel.com" style={{ color: "#1A7A8A" }}>Vercel</a>.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>Your Rights</h2>
      <p>You can unsubscribe from our emails at any time using the unsubscribe link in any email we send. You can update or delete your family profile information at any time from your dashboard. You can also request that we delete your account and data entirely by emailing us at <a href="mailto:hello@thelittlesound.com" style={{ color: "#1A7A8A" }}>hello@thelittlesound.com</a>.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>Children's Privacy</h2>
      <p>Little Sound accounts are created and managed by parents and adults only — children do not create accounts or submit information directly to us. When a parent chooses to share their kids' ages as part of their family profile, that information is provided by the parent, used only to personalize activity recommendations for that family, and is never shared publicly or with providers without the parent's action. We do not knowingly collect information directly from children under 13. If you believe a child has submitted information to us directly, please contact us immediately at <a href="mailto:hello@thelittlesound.com" style={{ color: "#1A7A8A" }}>hello@thelittlesound.com</a> and we will delete it promptly.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>Changes to This Policy</h2>
      <p>As Little Sound grows, this policy will evolve. We'll update the "last updated" date at the top and, for material changes, notify you by email.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>Contact</h2>
      <p>Questions? Reach us at <a href="mailto:hello@thelittlesound.com" style={{ color: "#1A7A8A" }}>hello@thelittlesound.com</a>.</p>

      <p style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid #E8DFC8", color: "#7A9AAA", fontSize: "0.875rem" }}>
        © {new Date().getFullYear()} Little Sound. All rights reserved.
      </p>
    </main>
  );
}
