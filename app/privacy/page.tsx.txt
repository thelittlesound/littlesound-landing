export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "4rem 1.5rem", fontFamily: "'DM Sans', sans-serif", color: "#1C3A4A", lineHeight: "1.7" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "3rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#7A9AAA", fontSize: "0.875rem", marginBottom: "3rem" }}>Last updated: June 2026</p>

      <p>Little Sound ("we," "us," or "our") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>What We Collect</h2>
      <p>When you join our waitlist, we collect your <strong>email address</strong>. That's it. We don't collect your name, location, payment information, or any information about your children at this stage.</p>
      <p>We also collect standard analytics data through Google Analytics 4 — including pages visited, time on site, and general device/browser information. This data is aggregated and anonymous.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>How We Use It</h2>
      <p>We use your email address to:</p>
      <ul style={{ paddingLeft: "1.5rem" }}>
        <li>Send you updates about Little Sound's launch and beta access</li>
        <li>Notify you when the platform is available in your area</li>
        <li>Occasionally share relevant news about the product</li>
      </ul>
      <p>We will never sell your email address or share it with third parties for marketing purposes.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>How We Store It</h2>
      <p>Your email is stored securely in <a href="https://www.brevo.com" style={{ color: "#1A7A8A" }}>Brevo</a>, our email platform. Brevo is GDPR-compliant and follows industry-standard security practices. Our website is hosted on <a href="https://vercel.com" style={{ color: "#1A7A8A" }}>Vercel</a>.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>Your Rights</h2>
      <p>You can unsubscribe from our emails at any time using the unsubscribe link in any email we send. You can also request that we delete your data entirely by emailing us at <a href="mailto:hello@thelittlesound.com" style={{ color: "#1A7A8A" }}>hello@thelittlesound.com</a>.</p>

      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "1.25rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>Children's Privacy</h2>
      <p>Our waitlist is intended for parents and adults only. We do not knowingly collect information from children under 13. If you believe a child has submitted information to us, please contact us immediately at <a href="mailto:hello@thelittlesound.com" style={{ color: "#1A7A8A" }}>hello@thelittlesound.com</a> and we will delete it promptly.</p>

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
