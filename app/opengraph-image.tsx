import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PREDICTIONMATRIX - AI Sports Analytics';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Blue accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Main content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            padding: '80px',
          }}
        >
          {/* Brand name */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '48px',
            }}
          >
            <div
              style={{
                fontSize: '96px',
                fontWeight: 'bold',
                letterSpacing: '-0.05em',
                textAlign: 'center',
                color: 'white',
                marginBottom: '8px',
              }}
            >
              PREDICTION<span style={{ color: '#3b82f6' }}>MATRIX</span>
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#9ca3af',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              AI Sports Analytics
            </div>
          </div>

          {/* Value proposition */}
          <div
            style={{
              fontSize: '42px',
              color: '#d1d5db',
              textAlign: 'center',
              maxWidth: '900px',
              lineHeight: 1.4,
              marginBottom: '60px',
            }}
          >
            Machine learning models find profitable edges before the market moves
          </div>

          {/* Key stats */}
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginBottom: '48px',
            }}
          >
            {/* Accuracy stat */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 40px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  lineHeight: 1,
                }}
              >
                54%+
              </div>
              <div
                style={{
                  fontSize: '22px',
                  color: '#9ca3af',
                  marginTop: '12px',
                }}
              >
                ATS Accuracy
              </div>
            </div>

            {/* Real-time indicator */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 40px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '2px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '999px',
                    background: '#10b981',
                  }}
                />
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                  }}
                >
                  LIVE
                </div>
              </div>
              <div
                style={{
                  fontSize: '22px',
                  color: '#9ca3af',
                }}
              >
                Real-Time Analysis
              </div>
            </div>

            {/* Model indicator */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 40px',
                background: 'rgba(168, 85, 247, 0.08)',
                border: '2px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '52px',
                  marginBottom: '8px',
                }}
              >
                🤖
              </div>
              <div
                style={{
                  fontSize: '22px',
                  color: '#9ca3af',
                }}
              >
                AI-Powered
              </div>
            </div>
          </div>

          {/* Call to action badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 36px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '999px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '26px',
                color: '#3b82f6',
                fontWeight: 'bold',
              }}
            >
              Week 15 Predictions Available Now
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
