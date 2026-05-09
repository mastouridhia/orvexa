import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Trap focus inside a container while `active`. On mount, moves focus into the container
 * (preferring the first focusable child); on unmount, restores focus to whatever was
 * focused before. Tab cycles within the container; Shift+Tab cycles backwards.
 *
 * Wire the returned ref onto your dialog/sheet element.
 *
 * @example
 *   const trapRef = useFocusTrap<HTMLDivElement>();
 *   return <div ref={trapRef} role="dialog" aria-modal="true">...</div>;
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = getFocusables();
      if (els.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = els[0]!;
      const last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Initial focus → first focusable child, falling back to the container itself
    const initial = getFocusables()[0];
    if (initial) {
      initial.focus();
    } else {
      // Make the container itself focusable so screen readers land somewhere
      if (container.tabIndex < 0) container.tabIndex = -1;
      container.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Best-effort restore — the previously focused node may have been removed
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus?.();
      }
    };
  }, [active]);

  return containerRef;
}

/** Calls `onEscape` when the user presses Escape while `active`. */
export function useEscapeKey(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
