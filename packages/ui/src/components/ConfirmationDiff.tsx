import React from 'react';
import { designTokens } from '../tokens.js';

export interface DiffField {
  fieldName: string;
  previousValue: string | null;
  proposedValue: string | null;
}

export interface ConfirmationDiffProps {
  title: string;
  description?: string;
  fields: DiffField[];
  revisionFrom?: string;
  revisionTo?: string;
}

export const ConfirmationDiff: React.FC<ConfirmationDiffProps> = ({
  title,
  description,
  fields,
  revisionFrom = 'v1.0',
  revisionTo = 'v2.0'
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: designTokens.radii.card,
        border: `1px solid ${designTokens.colors.border}`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4
            style={{
              margin: 0,
              fontFamily: designTokens.typography.fontDisplay,
              fontSize: '16px',
              fontWeight: 700,
              color: designTokens.colors.ink
            }}
          >
            {title}
          </h4>
          <span
            style={{
              fontSize: '12px',
              fontFamily: designTokens.typography.fontBody,
              color: designTokens.colors.textMuted
            }}
          >
            {revisionFrom} → {revisionTo}
          </span>
        </div>
        {description ? (
          <p
            style={{
              margin: '4px 0 0 0',
              fontFamily: designTokens.typography.fontBody,
              fontSize: '13px',
              color: designTokens.colors.textSecondary
            }}
          >
            {description}
          </p>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {fields.map((f, idx) => {
          const isChanged = f.previousValue !== f.proposedValue;
          return (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 1fr',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: designTokens.radii.control,
                backgroundColor: isChanged ? designTokens.colors.surfaceSoft : '#fafaf9',
                fontSize: '13px',
                fontFamily: designTokens.typography.fontBody
              }}
            >
              <span style={{ fontWeight: 600, color: designTokens.colors.ink }}>
                {f.fieldName}
              </span>
              <span
                style={{
                  color: isChanged ? designTokens.colors.danger : designTokens.colors.textMuted,
                  textDecoration: isChanged ? 'line-through' : 'none'
                }}
              >
                {f.previousValue || '(empty)'}
              </span>
              <span
                style={{
                  fontWeight: isChanged ? 600 : 400,
                  color: isChanged ? designTokens.colors.success : designTokens.colors.ink
                }}
              >
                {f.proposedValue || '(empty)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
