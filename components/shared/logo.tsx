'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export function Logo({ className, variant = 'full' }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  if (variant === 'icon') {
    return (
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect x="10" y="8" width="5" height="24" rx="2.5" fill="#2DD4BF" />
        <rect x="18" y="16" width="5" height="16" rx="2.5" fill="#2DD4BF" fillOpacity="0.4" />
        <circle cx="30" cy="12" r="4" fill="#FBBF24" />
      </svg>
    );
  }

  return (
    <svg
      width="220"
      height="40"
      viewBox="0 0 220 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" y="10" width="4" height="20" rx="2" fill="#2DD4BF" />
      <rect x="12" y="18" width="4" height="12" rx="2" fill="#2DD4BF" fillOpacity="0.4" />
      <circle cx="24" cy="14" r="3.5" fill="#FBBF24" />
      
      <text
        x="40"
        y="28"
        fill={isDark ? '#F9FAFB' : '#0E0E10'}
        style={{ fontFamily: 'var(--font-outfit), sans-serif', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.5px' }}
      >
        AUDIT
      </text>
      <text
        x="122"
        y="28"
        fill="#2DD4BF"
        style={{ fontFamily: 'var(--font-instrument), serif', fontStyle: 'italic', fontSize: '28px', letterSpacing: '1px' }}
      >
        Go
      </text>
    </svg>
  );
}
