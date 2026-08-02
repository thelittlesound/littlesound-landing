import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';
const NOTIFY_EMAIL = 'hello@thelittlesound.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, contactName, contactEmail, firstName, lastName, email, businessName, title, ...rest } = body;

    // Normalise contact fields (signup vs listing paths use slightly different keys)
    const name = contactName || `${firstName || ''} ${lastName || ''}`.trim();
    const providerEmail = contactEmail || email;
    // Listing submissions use 'title' rather than 'businessName'
    const resolvedBusinessName = businessName || title;

    if (!providerEmail || !resolvedBusinessName) {
      return NextResponse.json(
        { error: 'Email and business name are required' },
        { status: 400 }
      );
    }

    // ── 1. Add provider as a Brevo contact (provider list) ───────────────────
    // TODO: Set BREVO_PROVIDER_LIST_ID in your environment variables.
    // Use a different list ID from the family waitlist (list 2).
    const PROVIDER_LIST_ID = Number(process.env.BREVO_PROVIDER_LIST_ID) || 3;

    if (BREVO_API_KEY) {
      await fetch(`${BREVO_API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: providerEmail,
          attributes: {
            FIRSTNAME: name.split(' ')[0] || name,
            LASTNAME: name.split(' ').slice(1).join(' ') || '',
            COMPANY: resolvedBusinessName,
          },
          listIds: [PROVIDER_LIST_ID],
          updateEnabled: true,
        }),
      });
    }

    // ── 2. Send notification email to hello@ with all submission details ─────
    if (BREVO_API_KEY) {
      const isListing = type === 'listing';

      const htmlContent = isListing
        ? buildListingEmail({ name, email: providerEmail, businessName: resolvedBusinessName, title: resolvedBusinessName, ...rest })
        : buildSignupEmail({ name, email: providerEmail, businessName: resolvedBusinessName, ...rest });

      const emailRes = await fetch(`${BREVO_API_URL}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Little Sound Providers', email: NOTIFY_EMAIL },
          to: [{ email: NOTIFY_EMAIL, name: 'Little Sound Team' }],
          replyTo: { email: providerEmail, name },
          subject: isListing
            ? `New listing submission: ${resolvedBusinessName}`
            : `New provider signup: ${resolvedBusinessName}`,
          htmlContent,
        }),
      });

      const emailData = await emailRes.json();
      console.log('Brevo email response:', emailRes.status, JSON.stringify(emailData));
    }

    return NextResponse.json(
      { success: true, message: 'Submission received' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Provider submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Email builders ───────────────────────────────────────────────────────────

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px;font-weight:600;color:#0D5C6E;white-space:nowrap;vertical-align:top;font-size:13px;">${label}</td>
    <td style="padding:8px 12px;color:#1C3A4A;font-size:14px;">${value || '—'}</td>
  </tr>`;
}

function buildSignupEmail(data: Record<string, string>) {
  return `
<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;margin:0 0 4px;">New provider signup</h2>
  <p style="color:#3A5A6A;font-size:14px;margin:0 0 24px;">Someone just signed up on <a href="https://thelittlesound.com/providers/signup" style="color:#1A7A8A;">thelittlesound.com</a></p>
  <table style="width:100%;border-collapse:collapse;background:#F5EFE0;border-radius:12px;overflow:hidden;">
    ${row('Name', data.name)}
    ${row('Email', data.email)}
    ${row('Business', data.businessName)}
    ${row('Category', data.category || '')}
    ${row('Website', data.website || '')}
    ${row('Phone', data.phone || '')}
  </table>
  <p style="font-size:13px;color:#7A9AAA;margin-top:24px;">
    Reply directly to this email to reach the provider.
  </p>
</div>`;
}

function buildListingEmail(data: Record<string, string>) {
  return `
<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0D5C6E;margin:0 0 4px;">New listing submission</h2>
  <p style="color:#3A5A6A;font-size:14px;margin:0 0 24px;">Ready to review and go live.</p>
  <table style="width:100%;border-collapse:collapse;background:#F5EFE0;border-radius:12px;overflow:hidden;">
    ${row('Title', data.title || '')}
    ${row('Category', [data.category, data.subcategory].filter(Boolean).join(' › '))}
    ${row('Ages', `${data.ageMin}–${data.ageMax} years`)}
    ${row('Price', `$${data.price} / ${data.priceUnit}`)}
    ${row('Neighborhood', data.neighborhood || '')}
    ${row('Website', data.website || '')}
    ${row('Contact', data.name)}
    ${row('Email', data.email)}
    ${row('Phone', data.phone || '')}
  </table>
  <div style="margin-top:16px;background:#fff;border:1px solid #E8DFC8;border-radius:12px;padding:16px 20px;">
    <p style="font-size:12px;font-weight:600;color:#7A9AAA;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Description</p>
    <p style="font-size:14px;color:#1C3A4A;line-height:1.6;margin:0;">${data.description || ''}</p>
  </div>
  <p style="font-size:13px;color:#7A9AAA;margin-top:24px;">
    Reply directly to this email to reach the provider.
  </p>
</div>`;
}
