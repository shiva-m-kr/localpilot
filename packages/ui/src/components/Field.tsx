import React from 'react';
import { designTokens } from '../tokens.js';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  error,
  helperText,
  disabled,
  style,
  ...props
}) => {
  const generatedId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${generatedId}-error`;
  const helperId = `${generatedId}-helper`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <label
        htmlFor={generatedId}
        style={{
          fontFamily: designTokens.typography.fontBody,
          fontSize: '13px',
          fontWeight: 600,
          color: error ? designTokens.colors.danger : designTokens.colors.ink
        }}
      >
        {label}
      </label>
      <input
        id={generatedId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        style={{
          fontFamily: designTokens.typography.fontBody,
          fontSize: '14px',
          padding: '10px 12px',
          minHeight: '44px', // Touch friendly mobile target
          borderRadius: designTokens.radii.control,
          border: `1px solid ${error ? designTokens.colors.danger : designTokens.colors.border}`,
          backgroundColor: disabled ? designTokens.colors.surfaceSoft : '#ffffff',
          color: designTokens.colors.ink,
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          ...style
        }}
        {...props}
      />
      {error ? (
        <span
          id={errorId}
          role="alert"
          style={{
            fontFamily: designTokens.typography.fontBody,
            fontSize: '12px',
            color: designTokens.colors.danger
          }}
        >
          {error}
        </span>
      ) : helperText ? (
        <span
          id={helperId}
          style={{
            fontFamily: designTokens.typography.fontBody,
            fontSize: '12px',
            color: designTokens.colors.textMuted
          }}
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
