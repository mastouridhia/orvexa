import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toast } from '@orvexa/ui';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('renders the message with role=status', () => {
    render(<Toast message="Hello" onDone={() => undefined} />);
    const node = screen.getByRole('status');
    expect(node).toHaveTextContent('Hello');
    expect(node).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDone after 2.2s', () => {
    const onDone = vi.fn();
    render(<Toast message="Bye" onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not call onDone after unmount', () => {
    const onDone = vi.fn();
    const { unmount } = render(<Toast message="Bye" onDone={onDone} />);
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });
});
