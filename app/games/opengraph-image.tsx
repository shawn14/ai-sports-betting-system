import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PredictionMatrix - Today\'s NFL Predictions';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // In production, you could fetch real data here
  // For now, we'll use placeholder data

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
              🏈
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
            }}
          >
            Today's NFL Predictions
          </div>

          {/* Live indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '48px',
              padding: '12px 28px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '999px',
              border: '2px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '999px',
                background: '#ef4444',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div
              style={{
                fontSize: '24px',
                color: '#ef4444',
                fontWeight: 'bold',
              }}
            >
              LIVE PREDICTIONS
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
            }}
          >
            {/* Games Today */}
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
                14
              </div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                  marginTop: '8px',
                }}
              >
                Games Today
              </div>
            </div>

            {/* High Confidence */}
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
                3
              </div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                  marginTop: '8px',
                }}
              >
                Hot Picks
              </div>
            </div>

            {/* Model Accuracy */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '32px 48px',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: 'bold',
                  color: '#a855f7',
                  lineHeight: 1,
                }}
              >
                57%
              </div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                  marginTop: '8px',
                }}
              >
                Accuracy
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
