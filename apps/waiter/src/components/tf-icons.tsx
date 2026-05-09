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

export function IconChevronLeft({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
export function IconChevronRight({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M9 6l6 6-6 6" />
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
export function IconBell({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function IconBellRing({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0M22 4l-2 2M2 4l2 2" />
    </svg>
  );
}
export function IconReceipt({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
export function IconLeaf({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M20 4c-3 0-9 1-13 5s-5 10-3 13c3 2 9 1 13-3s5-10 3-15zM4 22l8-8" />
    </svg>
  );
}
export function IconUser({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
export function IconMap({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3-6-3zM9 4v13M15 7v13" />
    </svg>
  );
}
export function IconTable({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 12h18M12 6v12" />
    </svg>
  );
}
export function IconBolt({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
export function IconLogout({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
export function IconSettings({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
