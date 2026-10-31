import React, { useState } from 'react';
import { AssetRecord, BrandVoicePreferences } from '@localpilot/contracts';
import { StatusBadge } from './StatusBadge.js';
import { Button } from './Button.js';

export interface AssetLibraryViewProps {
  preferences: BrandVoicePreferences;
  assets: AssetRecord[];
  onUpload?: (files: FileList) => void;
  onPreviewAsset?: (assetId: string) => void;
}

export const AssetLibraryView: React.FC<AssetLibraryViewProps> = ({
  preferences,
  assets,
  onUpload,
  onPreviewAsset
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'real_portfolio' | 'generated'>('all');

  const realPortfolioAssets = assets.filter(
    (a) => a.assetClass === 'REAL_PORTFOLIO' || a.assetClass === 'LOGO'
  );
  const generatedAssets = assets.filter((a) => a.assetClass === 'GENERATED_ILLUSTRATION');

  const displayedAssets =
    activeTab === 'all'
      ? assets
      : activeTab === 'real_portfolio'
      ? realPortfolioAssets
      : generatedAssets;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Brand Voice & Terminology Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)'
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>
            Brand Voice & Tone
          </div>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-ink-default)', marginTop: 'var(--space-1)' }}>
            {preferences.tone.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>
            Approved Terminology
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
            {preferences.approvedTerminology.length > 0 ? (
              preferences.approvedTerminology.map((term, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {term}
                </span>
              ))
            ) : (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-ink-muted)' }}>None defined</span>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
            Forbidden Claims Guard
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
            {preferences.forbiddenClaims.length > 0 ? (
              preferences.forbiddenClaims.map((claim, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #fecaca'
                  }}
                >
                  {claim}
                </span>
              ))
            ) : (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-ink-muted)' }}>None defined</span>
            )}
          </div>
        </div>
      </div>

      {/* Strict Separation Notice */}
      <div
        role="alert"
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--font-size-sm)',
          color: '#1e40af'
        }}
      >
        <strong>Asset Integrity Notice:</strong> Real completed job photos and genuine storefront premises are strictly separated from AI-generated decorative illustrations. Generated illustrations cannot be attributed as actual completed customer work. EXIF metadata is stripped from all public deliveries.
      </div>

      {/* Tabs and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'all' ? 'var(--color-brand-default)' : 'var(--color-surface)',
              color: activeTab === 'all' ? '#ffffff' : 'var(--color-ink-default)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            All Assets ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('real_portfolio')}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'real_portfolio' ? 'var(--color-brand-default)' : 'var(--color-surface)',
              color: activeTab === 'real_portfolio' ? '#ffffff' : 'var(--color-ink-default)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Real Portfolio Evidence ({realPortfolioAssets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generated')}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: activeTab === 'generated' ? 'var(--color-brand-default)' : 'var(--color-surface)',
              color: activeTab === 'generated' ? '#ffffff' : 'var(--color-ink-default)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            AI Illustrations ({generatedAssets.length})
          </button>
        </div>

        <Button variant="primary" onClick={() => {}}>
          + Upload Asset
        </Button>
      </div>

      {/* Asset Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)'
        }}
      >
        {displayedAssets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
            No assets found in this view.
          </div>
        ) : (
          displayedAssets.map((asset) => (
            <div
              key={asset.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Thumbnail Container */}
              <div
                style={{
                  height: '180px',
                  backgroundColor: 'var(--color-surface-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
                  {asset.filename} ({asset.width}x{asset.height})
                </div>

                {/* Badge Overlay */}
                <div style={{ position: 'absolute', top: 'var(--space-2)', right: 'var(--space-2)' }}>
                  {asset.isGeneratedIllustration ? (
                    <StatusBadge status="needs_review" label="AI ILLUSTRATION" />
                  ) : (
                    <StatusBadge status="published" label="VERIFIED REAL" />
                  )}
                </div>
              </div>

              {/* Asset Meta */}
              <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-ink-default)' }}>
                  {asset.caption || asset.filename}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
                  Alt: "{asset.altText}"
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-ink-muted)',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 'var(--space-2)',
                    marginTop: 'var(--space-2)'
                  }}
                >
                  <span>Rights: {asset.rightsHolder}</span>
                  <span>{asset.exifStripped ? 'EXIF Cleaned' : 'Raw'}</span>
                </div>

                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={() => onPreviewAsset?.(asset.id)}
                  >
                    View Private Preview
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
