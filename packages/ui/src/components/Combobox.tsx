import React, { useState } from 'react';
import { designTokens } from '../tokens.js';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  label: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  options,
  value,
  onChange,
  id,
  disabled
}) => {
  const generatedId = id || `combobox-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <label
        htmlFor={generatedId}
        style={{
          fontFamily: designTokens.typography.fontBody,
          fontSize: '13px',
          fontWeight: 600,
          color: designTokens.colors.ink
        }}
      >
        {label}
      </label>
      <select
        id={generatedId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: designTokens.typography.fontBody,
          fontSize: '14px',
          padding: '10px 12px',
          minHeight: '44px',
          borderRadius: designTokens.radii.control,
          border: `1px solid ${designTokens.colors.border}`,
          backgroundColor: disabled ? designTokens.colors.surfaceSoft : '#ffffff',
          color: designTokens.colors.ink,
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
