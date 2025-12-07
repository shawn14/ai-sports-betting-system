import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ href = '/', className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: {
      container: 'w-8 h-8',
      inner: 'w-6 h-6',
      text: 'text-base',
      letter: 'text-sm',
      subtitle: 'text-[8px]'
    },
    md: {
      container: 'w-10 h-10',
      inner: 'w-8 h-8',
      text: 'text-xl',
      letter: 'text-xl',
      subtitle: 'text-[10px]'
    },
    lg: {
      container: 'w-12 h-12',
      inner: 'w-10 h-10',
      text: 'text-2xl',
      letter: 'text-2xl',
      subtitle: 'text-xs'
    }
  };

  const s = sizes[size];

  const content = (
    <>
      <div className="relative">
        <div className={`${s.container} bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50`}>
          <div className={`${s.inner} bg-slate-900 rounded-full flex items-center justify-center`}>
            <span className={`${s.letter} font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent`}>P</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 rounded-full animate-ping opacity-20"></div>
      </div>
      <div className="flex flex-col">
        <h1 className={`${s.text} font-black tracking-tight`}>
          <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">PREDICTION</span>
          <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">MATRIX</span>
        </h1>
        <p className={`${s.subtitle} text-slate-400 tracking-widest uppercase`}>AI Sports Analytics</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {content}
    </div>
  );
}
