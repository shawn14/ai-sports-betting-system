'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AILoadingAnimation from '@/components/AILoadingAnimation';

export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/backtest-results');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <AILoadingAnimation />
        <p className="text-slate-300 mt-4">Redirecting to Backtest Results...</p>
      </div>
    </div>
  );
}
