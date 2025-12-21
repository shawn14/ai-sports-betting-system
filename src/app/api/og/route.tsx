import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: 80,
          paddingRight: 80,
          background: 'linear-gradient(145deg, #0a0f0a 0%, #0d1a12 35%, #132918 70%, #0a0f0a 100%)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Soft vignette */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          }}
        />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 82,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 20,
            letterSpacing: '-3px',
            lineHeight: 1,
            position: 'relative',
          }}
        >
          Prediction Matrix
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.65)',
            letterSpacing: '1px',
            position: 'relative',
          }}
        >
          AI Sports Predictions
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
