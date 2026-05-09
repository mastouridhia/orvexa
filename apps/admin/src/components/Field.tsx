import { useState, type ReactNode } from 'react';

export type FieldProps = {
  label: ReactNode;
  required?: boolean;
  /** Render-prop receives an `onBlur` handler that flips the field into "touched" state. */
  children: (control: { onBlur: () => void; touched: boolean }) => ReactNode;
  /** Optional manually-driven error message (shown when truthy + touched OR after submit). */
  error?: string | null;
  /** Optional hint shown under the field when there's no error. */
  hint?: string | null;
};

/**
 * Lightweight form field wrapper that surfaces "touched + invalid" inline.
 * Wraps any input/select/textarea — the consumer wires onBlur via the render prop.
 *
 * Pairs with browser-native `:user-invalid` (covers HTML5 required/email/pattern). For custom
 * validation, pass a manual `error` string.
 */
export function Field({ label, required, children, error, hint }: FieldProps) {
  const [touched, setTouched] = useState(false);
  const showError = touched && Boolean(error);
  return (
    <div className="field" data-touched={touched ? 'true' : 'false'}>
      <label>
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      {children({ onBlur: () => setTouched(true), touched })}
      <span className="field-error" role={showError ? 'alert' : undefined}>
        {showError ? error : touched || !hint ? '' : hint}
      </span>
    </div>
  );
}
