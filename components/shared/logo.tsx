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
        <path d="M12 30L17 10H20L15 30H12Z" fill="#7C3AED" />
        <path d="M20 30L25 10H28L23 30H20Z" fill="#7C3AED" fillOpacity="0.6" />
        <circle cx="20" cy="22" r="3" fill="#FBBF24" />
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
      <path d="M8 30L13 10H16L11 30H8Z" fill="#7C3AED" />
      <path d="M16 30L21 10H24L19 30H16Z" fill="#7C3AED" fillOpacity="0.6" />
      <circle cx="16" cy="22" r="3" fill="#FBBF24" />
      
      <text
        x="35"
        y="28"
        fill={isDark ? '#F3F4F6' : '#0E0E10'}
        style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: '24px' }}
      >
        AUDIT
      </text>
      <text
        x="115"
        y="28"
        fill="#7C3AED"
        style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontWeight: 500, fontSize: '24px', letterSpacing: '1px' }}
      >
        GO
      </text>
    </svg>
  );
}
