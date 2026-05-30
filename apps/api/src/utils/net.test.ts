import { describe, it, expect } from 'vitest';
import { ipInAllowedList, isValidNetwork } from './net.js';

describe('ipInAllowedList', () => {
  it('returns false for empty entries list', () => {
    expect(ipInAllowedList('192.168.1.1', [])).toBe(false);
  });

  it('returns false for null/undefined IP', () => {
    expect(ipInAllowedList(null, ['192.168.1.1'])).toBe(false);
    expect(ipInAllowedList(undefined, ['192.168.1.1'])).toBe(false);
    expect(ipInAllowedList('', ['192.168.1.1'])).toBe(false);
  });

  it('IPv4 exact match', () => {
    expect(ipInAllowedList('192.168.1.1', ['192.168.1.1'])).toBe(true);
  });

  it('IPv4 exact no match', () => {
    expect(ipInAllowedList('192.168.1.2', ['192.168.1.1'])).toBe(false);
  });

  it('IPv4 CIDR /24 match', () => {
    expect(ipInAllowedList('10.0.0.55', ['10.0.0.0/24'])).toBe(true);
    expect(ipInAllowedList('10.0.0.255', ['10.0.0.0/24'])).toBe(true);
  });

  it('IPv4 CIDR /24 no match (different subnet)', () => {
    expect(ipInAllowedList('10.0.1.1', ['10.0.0.0/24'])).toBe(false);
  });

  it('IPv4 CIDR /16 match', () => {
    expect(ipInAllowedList('172.16.200.5', ['172.16.0.0/16'])).toBe(true);
  });

  it('IPv4-mapped IPv6 (::ffff:x.x.x.x) matches IPv4 entry', () => {
    // Node/Express may present the socket address as ::ffff:192.168.1.1
    expect(ipInAllowedList('::ffff:192.168.1.5', ['192.168.1.0/24'])).toBe(true);
    expect(ipInAllowedList('::ffff:192.168.2.5', ['192.168.1.0/24'])).toBe(false);
  });

  it('bare IPv6 address uses /64 prefix for matching', () => {
    // A bare v6 entry covers the whole /64 because phones rotate host bits.
    const entry = '2001:db8:cafe:1::1';
    expect(ipInAllowedList('2001:db8:cafe:1::aaaa', [entry])).toBe(true);
    expect(ipInAllowedList('2001:db8:cafe:2::1', [entry])).toBe(false);
  });

  it('IPv6 CIDR /64 match', () => {
    expect(ipInAllowedList('2001:db8:cafe:1::dead', ['2001:db8:cafe:1::/64'])).toBe(true);
    expect(ipInAllowedList('2001:db8:cafe:2::1', ['2001:db8:cafe:1::/64'])).toBe(false);
  });

  it('IPv6 exact match', () => {
    expect(ipInAllowedList('2001:db8::1', ['2001:db8::1/128'])).toBe(true);
    expect(ipInAllowedList('2001:db8::2', ['2001:db8::1/128'])).toBe(false);
  });

  it('does not mix IPv4 and IPv6 versions', () => {
    // IPv6 entry does not match IPv4 request
    expect(ipInAllowedList('10.0.0.1', ['::1/128'])).toBe(false);
    expect(ipInAllowedList('::1', ['10.0.0.0/8'])).toBe(false);
  });

  it('matches against multiple entries — first hit wins', () => {
    expect(ipInAllowedList('10.5.0.1', ['192.168.0.0/16', '10.5.0.0/24'])).toBe(true);
  });
});

describe('isValidNetwork', () => {
  it('accepts IPv4 exact', () => expect(isValidNetwork('192.168.1.1')).toBe(true));
  it('accepts IPv4 CIDR', () => expect(isValidNetwork('10.0.0.0/24')).toBe(true));
  it('accepts IPv6 bare', () => expect(isValidNetwork('2001:db8::1')).toBe(true));
  it('accepts IPv6 CIDR', () => expect(isValidNetwork('2001:db8::/32')).toBe(true));
  it('rejects garbage', () => expect(isValidNetwork('not-an-ip')).toBe(false));
  it('rejects prefix > 32 for v4', () => expect(isValidNetwork('10.0.0.0/33')).toBe(false));
  it('rejects empty string', () => expect(isValidNetwork('')).toBe(false));
});
