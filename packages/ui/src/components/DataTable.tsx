import React from 'react';
import { designTokens } from '../tokens.js';

export interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found.'
}: DataTableProps<T>) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: designTokens.radii.card,
        border: `1px solid ${designTokens.colors.border}`,
        backgroundColor: '#ffffff'
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontFamily: designTokens.typography.fontBody,
          fontSize: '14px'
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: designTokens.colors.surfaceSoft,
              borderBottom: `1px solid ${designTokens.colors.border}`
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  color: designTokens.colors.textSecondary,
                  width: col.width,
                  textAlign: col.align || 'left'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: designTokens.colors.textMuted
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }}
                style={{
                  borderBottom: `1px solid ${designTokens.colors.border}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.1s ease'
                }}
              >
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      color: designTokens.colors.ink,
                      textAlign: col.align || 'left'
                    }}
                  >
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
