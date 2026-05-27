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

export function IconBolt({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
export function IconUtensils({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M3 3v6c0 2 1 3 3 3v9M9 3v9M6 3v9M15 14h6v8h-6zM18 2c-2 2-3 5-3 8v4h6V2z" />
    </svg>
  );
}
export function IconReceipt({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
export function IconHome({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M3 10.5l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
export function IconGlobe({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a12 12 0 0 1 0 18" />
      <path d="M12 3a12 12 0 0 0 0 18" />
    </svg>
  );
}
export function IconMonitor({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
export function IconTable({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 12h18M12 6v12" />
    </svg>
  );
}
export function IconUser({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
export function IconLeaf({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M20 4c-3 0-9 1-13 5s-5 10-3 13c3 2 9 1 13-3s5-10 3-15zM4 22l8-8" />
    </svg>
  );
}
export function IconMap({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3-6-3zM9 4v13M15 7v13" />
    </svg>
  );
}
export function IconSettings({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2.1-1.6-2-3.4-2.5 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.5-1-2 3.4 2.1 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2.1 1.6 2 3.4 2.5-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.5 1 2-3.4-2.1-1.6c.1-.4.1-.8.1-1.2z" />
    </svg>
  );
}

export function IconLogout({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
export function IconArrowUp({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
export function IconArrowDown({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
export function IconCheck({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
export function IconBell({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
export function IconX({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
