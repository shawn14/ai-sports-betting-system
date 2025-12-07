import { useEffect, useState } from 'react';
import {
  Activity, Trophy, Zap, DollarSign, Target, TrendingUp, Eye,
  BarChart3, Brain, Cpu, Database
} from 'lucide-react';

interface AILoadingAnimationProps {
  title?: string;
  subtitle?: string;
  steps?: Array<{ label: string; icon: any; delay: number }>;
}

export default function AILoadingAnimation({
  title = "AI ENGINE ANALYZING",
  subtitle = "Processing real-time data streams...",
  steps
}: AILoadingAnimationProps) {
  // Use client-side state for random numbers to avoid hydration errors
  const [stats, setStats] = useState({
    dataPoints: 5000,
    modelsActive: 15,
    confidence: 70
  });

  useEffect(() => {
    // Generate random numbers only on client side
    setStats({
      dataPoints: Math.floor(Math.random() * 1000 + 5000),
      modelsActive: Math.floor(Math.random() * 10 + 15),
      confidence: Math.floor(Math.random() * 20 + 70)
    });
  }, []);
  const defaultSteps = [
    { label: 'Fetching NFL game data', icon: Trophy, delay: 0 },
    { label: 'Loading ML model predictions', icon: Zap, delay: 200 },
    { label: 'Analyzing Vegas spreads', icon: DollarSign, delay: 400 },
    { label: 'Calculating edge percentages', icon: Target, delay: 600 },
    { label: 'Tracking line movements', icon: TrendingUp, delay: 800 },
    { label: 'Identifying sharp money', icon: Eye, delay: 1000 },
  ];

  const displaySteps = steps || defaultSteps;

  return (
    <div className="text-center py-20 px-4">
      {/* AI Loading Animation */}
      <div className="max-w-2xl mx-auto">
        {/* Pulsing Brain Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full animate-pulse"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <Activity className="w-16 h-16 text-green-400 animate-pulse" />
          </div>
        </div>

        {/* AI Status Text */}
        <h3 className="text-2xl font-black text-white mb-2 animate-pulse">
          {title}
        </h3>
        <p className="text-green-400 font-mono text-sm mb-8">
          {subtitle}
        </p>

        {/* Calculation Steps */}
        <div className="space-y-3 text-left">
          {displaySteps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3"
              style={{ animation: `fadeInSlide 0.5s ease-out ${step.delay}ms forwards`, opacity: 0 }}
            >
              <step.icon className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-slate-300 text-sm font-mono flex-1">{step.label}</span>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Fake Stats Counter */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-4">
            <div className="text-xs text-green-400 mb-1">Data Points</div>
            <div className="text-2xl font-black text-white font-mono animate-pulse">
              {stats.dataPoints.toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-lg p-4">
            <div className="text-xs text-blue-400 mb-1">Models Active</div>
            <div className="text-2xl font-black text-white font-mono animate-pulse">
              {stats.modelsActive}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-4">
            <div className="text-xs text-purple-400 mb-1">Confidence %</div>
            <div className="text-2xl font-black text-white font-mono animate-pulse">
              {stats.confidence}%
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
