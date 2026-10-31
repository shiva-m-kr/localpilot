import React, { useState } from 'react';
import { SiteBlock, SiteRevision, RevisionCompareResult } from '@localpilot/contracts';

export interface SiteEditorPageProps {
  siteSubdomain: string;
  customDomain?: string;
  currentDraft: SiteRevision;
  publishedRevision?: SiteRevision;
  diffResult?: RevisionCompareResult;
  onSaveBlocks: (updatedBlocks: SiteBlock[]) => Promise<void>;
  onPublish: () => Promise<void>;
  onRestore: (revisionId: string) => Promise<void>;
}

export const SiteEditorPage: React.FC<SiteEditorPageProps> = ({
  siteSubdomain,
  customDomain,
  currentDraft,
  publishedRevision,
  diffResult,
  onSaveBlocks,
  onPublish,
  onRestore,
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [blocks, setBlocks] = useState<SiteBlock[]>(currentDraft.blocks);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);

    // Update orderIndex
    const reordered = newBlocks.map((b, i) => ({ ...b, orderIndex: i }));
    setBlocks(reordered);
    onSaveBlocks(reordered);
  };

  const toggleVisibility = (blockId: string) => {
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, isVisible: !b.isVisible } : b));
    setBlocks(updated);
    onSaveBlocks(updated);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);
    try {
      await onPublish();
      setStatusMessage('Website published successfully! Changes are live.');
    } catch (err: any) {
      setStatusMessage(`Publish failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.875rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            Website & Block Editor
          </h1>
          <p style={{ color: '#64748B', marginTop: '0.25rem' }}>
            Live at: <span style={{ fontWeight: 600, color: '#E0580C' }}>{customDomain || `${siteSubdomain}.localpilot.site`}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Responsive device preview toggle */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.25rem', borderRadius: '8px' }}>
            <button
              onClick={() => setDeviceMode('desktop')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: deviceMode === 'desktop' ? '#FFFFFF' : 'transparent',
                fontWeight: 600,
                color: deviceMode === 'desktop' ? '#0F172A' : '#64748B',
                boxShadow: deviceMode === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              Desktop
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: deviceMode === 'mobile' ? '#FFFFFF' : 'transparent',
                fontWeight: 600,
                color: deviceMode === 'mobile' ? '#0F172A' : '#64748B',
                boxShadow: deviceMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              Mobile (390px)
            </button>
          </div>

          <button
            onClick={() => setShowDiff(!showDiff)}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showDiff ? 'Hide Diff' : 'Compare Live vs Draft'}
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: '#E0580C',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              opacity: isPublishing ? 0.7 : 1,
            }}
          >
            {isPublishing ? 'Publishing...' : 'Publish to Live'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: '0.75rem 1rem', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px', marginBottom: '1.5rem', color: '#92400E' }}>
          {statusMessage}
        </div>
      )}

      {/* Main split grid: Block list on left, responsive preview on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        {/* Block management list */}
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1E293B' }}>
            Page Sections ({blocks.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  opacity: block.isVisible ? 1 : 0.5,
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E0580C', textTransform: 'uppercase' }}>
                    {block.type}
                  </span>
                  <div style={{ fontWeight: 600, color: '#1E293B' }}>{block.heading || '(No heading)'}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    disabled={idx === 0}
                    onClick={() => moveBlock(idx, 'up')}
                    style={{ padding: '0.25rem 0.5rem', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    disabled={idx === blocks.length - 1}
                    onClick={() => moveBlock(idx, 'down')}
                    style={{ padding: '0.25rem 0.5rem', cursor: idx === blocks.length - 1 ? 'not-allowed' : 'pointer' }}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => toggleVisibility(block.id)}
                    style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                    title="Toggle Visibility"
                  >
                    {block.isVisible ? '👁' : '🚫'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FFF7ED', borderRadius: '8px', border: '1px solid #FED7AA' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#9A3412', fontSize: '0.875rem' }}>Anti-Doorway Page Protection</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#7C2D12' }}>
              Local landing pages must correspond to verified service areas with unique local proof. Duplicate thin city pages are rejected.
            </p>
          </div>
        </div>

        {/* Device preview or Diff View */}
        <div>
          {showDiff && diffResult ? (
            <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Live vs Draft Revision Diff</h3>
              <p>Blocks Added: {diffResult.blocksAdded.length}</p>
              <p>Blocks Removed: {diffResult.blocksRemoved.length}</p>
              <p>Blocks Modified: {diffResult.blocksModified.length}</p>
              <p>Metadata Modified: {diffResult.isMetaModified ? 'Yes' : 'No'}</p>
              {publishedRevision && (
                <button
                  onClick={() => onRestore(publishedRevision.revisionId)}
                  style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Restore Published Version
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#F1F5F9',
                padding: '2rem',
                borderRadius: '12px',
                minHeight: '600px',
              }}
            >
              <div
                style={{
                  width: deviceMode === 'mobile' ? '390px' : '100%',
                  background: '#FFFFFF',
                  borderRadius: deviceMode === 'mobile' ? '24px' : '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  border: deviceMode === 'mobile' ? '8px solid #1E293B' : '1px solid #CBD5E1',
                  transition: 'width 0.3s ease',
                  padding: '1.5rem',
                }}
              >
                <div style={{ textAlign: 'center', paddingBottom: '1rem', borderBottom: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PREVIEW ({deviceMode.toUpperCase()})</span>
                  <h3 style={{ margin: '0.25rem 0', color: '#E0580C' }}>{currentDraft.metaTitle}</h3>
                </div>

                {blocks.filter(b => b.isVisible).map(b => (
                  <div key={b.id} style={{ padding: '1rem 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{b.type}</div>
                    <div style={{ fontWeight: 600 }}>{b.heading}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
