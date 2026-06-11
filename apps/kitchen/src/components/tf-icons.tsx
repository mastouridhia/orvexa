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

export function IconBolt({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
export function IconPlay({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 4l14 8-14 8z" />
    </svg>
  );
}
export function IconPause({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
export function IconBell({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function IconBellRing({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0M22 4l-2 2M2 4l2 2" />
    </svg>
  );
}
export function IconBellOff({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M3 3l18 18M9 4a6 6 0 0 1 9 4c0 4 1 6 2 7M5 8c0 7-3 8-3 8h13M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function IconCheck({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
export function IconUser({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
export function IconInfo({ size = 11, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v0M12 12v5" />
    </svg>
  );
}
export function IconLeaf({ size = 40, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M20 4c-3 0-9 1-13 5s-5 10-3 13c3 2 9 1 13-3s5-10 3-15zM4 22l8-8" />
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
export function IconScreen({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
export function IconTablet({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
export function IconWifi({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 12.5a9.7 9.7 0 0 1 14 0M1.5 8.5a15 15 0 0 1 21 0M8.5 16.5a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconWifiOff({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 5.2-1.2M5 12.5a9.7 9.7 0 0 1 8.3-2.7M1.5 8.5a15 15 0 0 1 8.7-4.2M19 12.5a9.7 9.7 0 0 0-2.7-1.9" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
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
