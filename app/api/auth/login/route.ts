import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database logic
    // For now, we'll simulate successful login
    // In production, you would:
    // 1. Query user from database by email
    // 2. Compare hashed password
    // 3. Generate JWT token
    // 4. Set secure cookie

    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock user (in production, fetch from database)
    const user = {
      id: crypto.randomUUID(),
      name: 'Demo User',
      email: email
    };

    // In production, set a secure HTTP-only cookie with JWT
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      { status: 200 }
    );

    // Set a simple session cookie (in production use JWT)
    response.cookies.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
