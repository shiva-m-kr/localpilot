import React from 'react';
import { designTokens } from '../tokens.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  style,
  ...props
}) => {
  const isActuallyDisabled = disabled || isLoading;

  const baseStyles: React.CSSProperties = {
    fontFamily: designTokens.typography.fontDisplay,
    fontWeight: 600,
    borderRadius: designTokens.radii.control,
    cursor: isActuallyDisabled ? 'not-allowed' : 'pointer',
    opacity: isActuallyDisabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    outline: 'none',
    border: '1px solid transparent',
    minHeight: size === 'sm' ? '36px' : '44px', // Touch-friendly mobile target >= 44px
    textDecoration: 'none'
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '16px', borderRadius: designTokens.radii.pill }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: designTokens.colors.action,
      color: '#ffffff',
      border: 'none'
    },
    secondary: {
      backgroundColor: designTokens.colors.surfaceSoft,
      color: designTokens.colors.action,
      border: `1px solid ${designTokens.colors.brand200}`
    },
    danger: {
      backgroundColor: designTokens.colors.danger,
      color: '#ffffff',
      border: 'none'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: designTokens.colors.ink,
      border: '1px solid transparent'
    }
  };

  return (
    <button
      disabled={isActuallyDisabled}
      aria-busy={isLoading}
      aria-disabled={isActuallyDisabled}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style
      }}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
      ) : null}
      {children}
    </button>
  );
};
