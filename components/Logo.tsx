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
    <div className="flex flex-col">
      <h1 className={`${s.text} font-bold tracking-tight text-gray-900`}>
        PREDICTION<span className="text-blue-600">MATRIX</span>
      </h1>
      <p className={`${s.subtitle} text-gray-500 tracking-wider uppercase`}>AI Sports Analytics</p>
    </div>
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
