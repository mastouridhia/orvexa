/**
 * Tiny dependency-free IP matcher for the wifi ordering gate.
 *
 * Supports IPv4 (exact or CIDR) and IPv6 (CIDR, or bare address matched on its
 * /64 prefix — phones rotate the host bits of a privacy address, so a bare v6
 * entry is treated as the whole /64 the café network sits in).
 */

type ParsedIp = { version: 4 | 6; value: bigint };
type ParsedNetwork = ParsedIp & { prefix: number };

function ipv4ToBigInt(s: string): bigint | null {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const v = Number(part);
    if (v > 255) return null;
    n = (n << 8n) | BigInt(v);
  }
  return n;
}

function ipv6ToBigInt(input: string): bigint | null {
  let s = input;
  // Expand an embedded IPv4 tail (e.g. 64:ff9b::1.2.3.4) into two hex groups.
  if (s.includes('.')) {
    const lastColon = s.lastIndexOf(':');
    if (lastColon === -1) return null;
    const v4 = ipv4ToBigInt(s.slice(lastColon + 1));
    if (v4 === null) return null;
    const hi = (v4 >> 16n) & 0xffffn;
    const lo = v4 & 0xffffn;
    s = `${s.slice(0, lastColon + 1)}${hi.toString(16)}:${lo.toString(16)}`;
  }

  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];

  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - (head.length + tail.length);
    if (missing < 0) return null;
    groups = [...head, ...Array<string>(missing).fill('0'), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  let value = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    value = (value << 16n) | BigInt(parseInt(g, 16));
  }
  return value;
}

export function parseIp(input: string | undefined | null): ParsedIp | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (s === '') return null;
  const pct = s.indexOf('%'); // strip IPv6 zone id
  if (pct !== -1) s = s.slice(0, pct);
  // IPv4-mapped IPv6 → real IPv4 (Node reports `::ffff:1.2.3.4` on dual stacks).
  if (s.startsWith('::ffff:') && s.includes('.')) s = s.slice('::ffff:'.length);

  if (s.includes(':')) {
    const value = ipv6ToBigInt(s);
    return value === null ? null : { version: 6, value };
  }
  const value = ipv4ToBigInt(s);
  return value === null ? null : { version: 4, value };
}

export function parseNetwork(entry: string): ParsedNetwork | null {
  const trimmed = entry.trim();
  if (trimmed === '') return null;
  const slash = trimmed.indexOf('/');
  const ip = parseIp(slash === -1 ? trimmed : trimmed.slice(0, slash));
  if (!ip) return null;
  const maxBits = ip.version === 4 ? 32 : 128;
  if (slash === -1) {
    // Bare address: IPv4 → exact host, IPv6 → its /64 network.
    return { ...ip, prefix: ip.version === 4 ? 32 : 64 };
  }
  const raw = trimmed.slice(slash + 1);
  if (!/^\d{1,3}$/.test(raw)) return null;
  const prefix = Number(raw);
  if (prefix > maxBits) return null;
  return { ...ip, prefix };
}

export function isValidNetwork(entry: string): boolean {
  return parseNetwork(entry) !== null;
}

/** True when `ip` falls inside any of the allowed addresses/CIDRs. */
export function ipInAllowedList(ip: string | undefined | null, entries: string[]): boolean {
  const cand = parseIp(ip);
  if (!cand || entries.length === 0) return false;
  for (const entry of entries) {
    const net = parseNetwork(entry);
    if (!net || net.version !== cand.version) continue;
    if (net.prefix === 0) return true;
    const shift = BigInt((cand.version === 4 ? 32 : 128) - net.prefix);
    if (cand.value >> shift === net.value >> shift) return true;
  }
  return false;
}
