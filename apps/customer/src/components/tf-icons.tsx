import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export function IconChevronLeft({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
export function IconChevronDown({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
export function IconChevronRight({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
export function IconSearch({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
export function IconPlus({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function IconMinus({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 12h14" />
    </svg>
  );
}
export function IconCheck({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
export function IconClock({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
export function IconBell({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function IconBellRing({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0M22 4l-2 2M2 4l2 2" />
    </svg>
  );
}
export function IconReceipt({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
export function IconBag({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8zM9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
export function IconLang({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
export function IconArrowRight({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
export function IconQR({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" />
    </svg>
  );
}
export function IconSettings({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
export function IconWifiOff({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.7 16.7A7.5 7.5 0 0 1 12 18c-2.1 0-4-.8-5.4-2.1" />
      <path d="M6.6 6.6A10.5 10.5 0 0 0 2 12c2.8-2.8 6.5-4.5 10.5-4.5.4 0 .8 0 1.2.1" />
      <path d="M10.7 10.7A3.5 3.5 0 0 1 12 10.5c2 0 3.5 1.5 3.5 3.5" />
      <path d="M19 12.3C20.3 10.8 21 8.9 21 7c-2.5 0-4.8.8-6.7 2.2" />
    </svg>
  );
}
export function IconLock({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
