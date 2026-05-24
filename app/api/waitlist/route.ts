import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName } = body;

    // Validate input
    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'Email and first name are required' },
        { status: 400 }
      );
    }

    // Add contact to Brevo
    const response = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName || '',
        },
        listIds: [2], // Replace with your actual Brevo list ID
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo error:', errorData);
      
      // If contact already exists, that's ok
      if (errorData.code === 'duplicate_parameter') {
        return NextResponse.json(
          { success: true, message: 'Already on waitlist' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add to waitlist' },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Successfully added to waitlist' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
