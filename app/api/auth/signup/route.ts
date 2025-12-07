import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database logic
    // For now, we'll simulate successful signup
    // In production, you would:
    // 1. Hash the password
    // 2. Check if email already exists
    // 3. Create user in database
    // 4. Generate JWT token
    // 5. Set secure cookie

    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create mock user
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      createdAt: new Date().toISOString()
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
      { status: 201 }
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
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
