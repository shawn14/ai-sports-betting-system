import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get optional parameters
    const title = searchParams.get('title') || 'AI-Powered NFL Predictions';
    const highConfidence = searchParams.get('highConfidence') || '3';
    const accuracy = searchParams.get('accuracy') || '57%';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1a1a1a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a1a1a 2%, transparent 0%)',
            backgroundSize: '100px 100px',
          }}
        >
          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px',
              zIndex: 1,
            }}
          >
            {/* Logo/Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                }}
              >
                🎯
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                  backgroundClip: 'text',
                  color: 'transparent',
                  letterSpacing: '-0.05em',
                }}
              >
                PredictionMatrix
              </div>
            </div>

            {/* Main title */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'white',
                textAlign: 'center',
                marginBottom: '32px',
                lineHeight: 1.2,
                maxWidth: '900px',
              }}
            >
              {title}
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'flex',
                gap: '32px',
                marginBottom: '40px',
              }}
            >
              {/* High Confidence Picks */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '32px 48px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    lineHeight: 1,
                  }}
                >
                  {highConfidence}
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    color: '#9ca3af',
                    marginTop: '8px',
                  }}
                >
                  Hot Picks Today
                </div>
              </div>

              {/* Accuracy */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '32px 48px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 'bold',
                    color: '#3b82f6',
                    lineHeight: 1,
                  }}
                >
                  {accuracy}
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    color: '#9ca3af',
                    marginTop: '8px',
                  }}
                >
                  Model Accuracy
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: '28px',
                color: '#9ca3af',
                textAlign: 'center',
                maxWidth: '800px',
              }}
            >
              Machine learning models analyzing real-time data to find profitable edges
            </div>

            {/* Footer badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '48px',
                padding: '16px 32px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                }}
              >
                🤖
              </div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                }}
              >
                Powered by Advanced AI
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
