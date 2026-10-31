import React, { useState } from 'react';
import { DraftRevision, ContentBlock, RevisionDiff, ApprovalBinding } from '@localpilot/contracts';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ConfirmationDiff } from '../components/ConfirmationDiff.js';

export interface ContentEditorPageProps {
  initialTitle: string;
  initialMetaDescription: string;
  initialBlocks: ContentBlock[];
  currentRevisionNumber: number;
  history: DraftRevision[];
  activeApproval: ApprovalBinding | null;
  factsVersion: number;
  onSave: (command: {
    baseRevisionNumber: number;
    title: string;
    metaDescription: string;
    blocks: ContentBlock[];
    changeType: 'MANUAL_EDIT' | 'AI_SELECTION_REWRITE' | 'RESTORE_PREVIOUS_REVISION';
    changeSummary: string;
  }) => void;
  onApprove: (revisionNumber: number) => void;
  onRestore: (revisionNumber: number) => void;
}

export const ContentEditorPage: React.FC<ContentEditorPageProps> = ({
  initialTitle,
  initialMetaDescription,
  initialBlocks,
  currentRevisionNumber,
  history,
  activeApproval,
  factsVersion,
  onSave,
  onApprove,
  onRestore
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [compareRevNumber, setCompareRevNumber] = useState<number>(
    history.length > 1 ? history[history.length - 2].revisionNumber : 1
  );

  const isApproved = activeApproval !== null && activeApproval.revisionNumber === currentRevisionNumber;

  const handleBlockContentChange = (id: string, newContent: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content: newContent } : b))
    );
  };

  const handleManualSave = () => {
    onSave({
      baseRevisionNumber: currentRevisionNumber,
      title,
      metaDescription,
      blocks,
      changeType: 'MANUAL_EDIT',
      changeSummary: 'Manual content edit'
    });
  };

  const handleAiRewrite = () => {
    if (!selectedBlockId || !aiInstruction.trim()) return;
    const targetBlock = blocks.find((b) => b.id === selectedBlockId);
    if (!targetBlock) return;

    // Simulate AI rewrite in UI
    const rewrittenContent = `${targetBlock.content} (Refined: ${aiInstruction.trim()})`;
    const updatedBlocks = blocks.map((b) =>
      b.id === selectedBlockId ? { ...b, content: rewrittenContent } : b
    );
    setBlocks(updatedBlocks);

    onSave({
      baseRevisionNumber: currentRevisionNumber,
      title,
      metaDescription,
      blocks: updatedBlocks,
      changeType: 'AI_SELECTION_REWRITE',
      changeSummary: `AI Rewrite: ${aiInstruction}`
    });
    setAiInstruction('');
    setSelectedBlockId(null);
  };

  return (
    <div className="lp-content-editor" style={{ padding: '24px', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Structured Content Editor</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
            Revision #{currentRevisionNumber} • Facts Version: v{factsVersion}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isApproved ? (
            <StatusBadge status="published" label="Approved for Publish" />
          ) : (
            <StatusBadge status="needs_review" label="Requires Approval" />
          )}

          <Button
            variant="secondary"
            onClick={() => setIsDiffOpen(!isDiffOpen)}
            aria-label="Toggle version diff"
          >
            {isDiffOpen ? 'Close Diff' : 'View Diff'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleManualSave}
            aria-label="Save draft revision"
          >
            Save Revision
          </Button>

          <Button
            variant="primary"
            disabled={isApproved}
            onClick={() => onApprove(currentRevisionNumber)}
            aria-label="Approve current revision"
          >
            Approve Revision
          </Button>
        </div>
      </div>

      {/* Warning banner when modifying approved draft */}
      {activeApproval && activeApproval.revisionNumber !== currentRevisionNumber && (
        <div
          role="alert"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            color: '#92400E',
            fontSize: '14px'
          }}
        >
          <strong>Notice:</strong> Previous approval was bound to Revision #{activeApproval.revisionNumber}. Changes in this revision void the approval until re-approved.
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Editor Main Canvas */}
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="meta-title" style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>
              SEO Title
            </label>
            <input
              id="meta-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="meta-desc" style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>
              Meta Description (140-160 chars)
            </label>
            <textarea
              id="meta-desc"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
            />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Content Blocks</h2>
          {blocks.map((block) => (
            <div
              key={block.id}
              tabIndex={0}
              role="region"
              aria-label={`Block ${block.type}`}
              onClick={() => setSelectedBlockId(block.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSelectedBlockId(block.id);
              }}
              style={{
                border: selectedBlockId === block.id ? '2px solid #F97316' : '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>{block.type}</span>
                {selectedBlockId === block.id && (
                  <span style={{ fontSize: '12px', color: '#EA580C', fontWeight: 600 }}>Selected for AI rewrite</span>
                )}
              </div>
              <textarea
                value={block.content}
                onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                rows={block.type === 'HEADING' ? 1 : 3}
                style={{ width: '100%', border: 'none', resize: 'vertical', outline: 'none', fontSize: '14px' }}
              />
            </div>
          ))}

          {/* AI Selection Rewrite Panel */}
          {selectedBlockId && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                background: '#FFF7ED',
                border: '1px solid #FFEDD5',
                borderRadius: '6px'
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#C2410C' }}>
                AI Selection Rewrite
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#9A3412' }}>
                Enter prompt instruction to rewrite the selected block. Creates a new revision with reviewable diff.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g., Make it more professional and mention warranty"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #FDBA74', borderRadius: '4px' }}
                />
                <Button variant="primary" onClick={handleAiRewrite}>
                  Apply Rewrite
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Revisions Timeline */}
        <aside style={{ background: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>Revision History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.slice().reverse().map((rev) => (
              <div
                key={rev.revisionId}
                style={{
                  border: rev.revisionNumber === currentRevisionNumber ? '1px solid #F97316' : '1px solid #E5E7EB',
                  padding: '10px',
                  borderRadius: '6px',
                  background: rev.revisionNumber === currentRevisionNumber ? '#FFF7ED' : '#FAFAFA'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Rev #{rev.revisionNumber}</span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>
                    {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#4B5563' }}>{rev.changeSummary}</p>
                {rev.revisionNumber !== currentRevisionNumber && (
                  <button
                    onClick={() => onRestore(rev.revisionNumber)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EA580C',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Restore this version
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
