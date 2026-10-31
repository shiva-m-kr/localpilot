import React, { useState } from 'react';
import { designTokens } from '../tokens.js';
import { Button } from '../components/Button.js';
import { Drawer } from '../components/Drawer.js';
import { StatusBadge, SemanticStatus } from '../components/StatusBadge.js';

export type ReputationStatus =
  | 'draft'
  | 'approval'
  | 'sending'
  | 'verified'
  | 'changed_source'
  | 'unavailable'
  | 'unknown_outcome';

export interface ReputationInboxItem {
  id: string;
  locationId: string;
  provider: 'google_business_profile' | 'facebook' | 'direct';
  reviewerName: string;
  rating: number;
  comment: string | null;
  fetchedAt: string;
  expiresAt: string;
  status: ReputationStatus;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  language: string;
  riskFlags: string[];
  existingReply: { comment: string; updateTime: string } | null;
  draftReply: {
    id: string;
    text: string;
    authorType: 'OWNER' | 'AI_ASSISTED' | 'STAFF';
    version: number;
    isQueued: boolean;
  } | null;
  actionHistory: Array<{ timestamp: string; action: string; actor: string }>;
}

export interface ReputationInboxPageProps {
  items: ReputationInboxItem[];
  canReply?: boolean;
  onApproveDraft?: (itemId: string, draftId: string) => void;
  onEditDraft?: (itemId: string, draftId: string, newText: string) => void;
  onRejectDraft?: (itemId: string, draftId: string) => void;
}

export const ReputationInboxPage: React.FC<ReputationInboxPageProps> = ({
  items,
  canReply = true,
  onApproveDraft,
  onEditDraft,
  onRejectDraft
}) => {
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ReputationInboxItem | null>(null);

  const filteredItems = items.filter((item) => {
    if (providerFilter !== 'all' && item.provider !== providerFilter) return false;
    if (ratingFilter !== 'all' && item.rating.toString() !== ratingFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (riskFilter === 'high_risk' && item.riskFlags.length === 0) return false;
    return true;
  });

  const getSemanticStatus = (status: ReputationStatus): SemanticStatus => {
    switch (status) {
      case 'verified':
        return 'published';
      case 'sending':
      case 'approval':
        return 'pending';
      case 'changed_source':
        return 'needs_review';
      case 'unavailable':
      case 'unknown_outcome':
        return 'failed';
      case 'draft':
      default:
        return 'draft';
    }
  };

  const minimizePersonalName = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return name;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: designTokens.typography.fontBody }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: designTokens.colors.ink, margin: '0 0 8px 0', fontFamily: designTokens.typography.fontDisplay }}>
          Reputation Inbox & Reviews
        </h1>
        <p style={{ color: designTokens.colors.textSecondary, margin: 0 }}>
          Authorized review streams, customer sentiment analysis, and controlled owner response drafts.
        </p>
      </header>

      {/* Filter Bar */}
      <section
        aria-label="Filter Reviews"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px',
          backgroundColor: designTokens.colors.surfaceSoft,
          borderRadius: designTokens.radii.control,
          border: `1px solid ${designTokens.colors.border}`,
          marginBottom: '24px'
        }}
      >
        <div>
          <label htmlFor="filter-provider" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: designTokens.colors.ink, marginBottom: '4px' }}>
            Provider
          </label>
          <select
            id="filter-provider"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: designTokens.radii.control, border: `1px solid ${designTokens.colors.border}`, backgroundColor: '#fff' }}
          >
            <option value="all">All Providers</option>
            <option value="google_business_profile">Google Business Profile</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-rating" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: designTokens.colors.ink, marginBottom: '4px' }}>
            Rating
          </label>
          <select
            id="filter-rating"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: designTokens.radii.control, border: `1px solid ${designTokens.colors.border}`, backgroundColor: '#fff' }}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-status" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: designTokens.colors.ink, marginBottom: '4px' }}>
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: designTokens.radii.control, border: `1px solid ${designTokens.colors.border}`, backgroundColor: '#fff' }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft Ready</option>
            <option value="approval">Awaiting Approval</option>
            <option value="sending">Sending</option>
            <option value="verified">Verified Published</option>
            <option value="changed_source">Source Changed</option>
            <option value="unavailable">Unavailable / Deleted</option>
            <option value="unknown_outcome">Unknown Outcome</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-risk" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: designTokens.colors.ink, marginBottom: '4px' }}>
            Risk Flags
          </label>
          <select
            id="filter-risk"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: designTokens.radii.control, border: `1px solid ${designTokens.colors.border}`, backgroundColor: '#fff' }}
          >
            <option value="all">All</option>
            <option value="high_risk">Has Risk Flags</option>
          </select>
        </div>
      </section>

      {/* Review List */}
      <div role="region" aria-label="Review List" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(item)}
            style={{
              padding: '16px',
              backgroundColor: designTokens.colors.surface,
              border: `1px solid ${designTokens.colors.border}`,
              borderRadius: designTokens.radii.card,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: designTokens.shadows.card,
              outline: 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: designTokens.colors.ink }}>
                  {minimizePersonalName(item.reviewerName)}
                </span>
                <span style={{ color: '#eab308' }}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>
                <span style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>
                  ({item.provider})
                </span>
              </div>
              <StatusBadge status={getSemanticStatus(item.status)} label={item.status.toUpperCase()} />
            </div>

            <p style={{ color: designTokens.colors.textSecondary, fontSize: '14px', margin: 0 }}>
              {item.comment ? (item.comment.length > 140 ? `${item.comment.slice(0, 140)}...` : item.comment) : '(Rating only review)'}
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: designTokens.colors.textMuted }}>
              <span>Fetched: {new Date(item.fetchedAt).toLocaleDateString()}</span>
              {item.riskFlags.length > 0 && (
                <span style={{ color: designTokens.colors.danger, fontWeight: 600 }}>
                  ⚠️ {item.riskFlags.join(', ')}
                </span>
              )}
              {item.draftReply && (
                <span style={{ color: designTokens.colors.brand600, fontWeight: 600 }}>
                  📝 Draft Prepared (NOT YET PUBLIC)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Detail Drawer */}
      {selectedItem && (
        <Drawer
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Review Details - ${minimizePersonalName(selectedItem.reviewerName)}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
            {/* Status & Provider info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '18px', color: '#eab308' }}>
                  {'★'.repeat(selectedItem.rating)}{'☆'.repeat(5 - selectedItem.rating)}
                </span>
                <span style={{ marginLeft: '8px', fontSize: '14px', color: designTokens.colors.textMuted }}>
                  Provider: {selectedItem.provider}
                </span>
              </div>
              <StatusBadge status={getSemanticStatus(selectedItem.status)} label={selectedItem.status.toUpperCase()} />
            </div>

            {/* Source Content */}
            <div style={{ backgroundColor: designTokens.colors.surfaceSoft, padding: '16px', borderRadius: designTokens.radii.control, border: `1px solid ${designTokens.colors.border}` }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '6px' }}>
                SOURCE REVIEW (Expires {new Date(selectedItem.expiresAt).toLocaleDateString()})
              </div>
              <p style={{ margin: 0, color: designTokens.colors.ink, fontSize: '14px' }}>
                {selectedItem.comment || 'No comment provided (Rating only).'}
              </p>
            </div>

            {/* Classification Assessment */}
            <div style={{ border: `1px solid ${designTokens.colors.border}`, padding: '12px', borderRadius: designTokens.radii.control }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textSecondary }}>
                AI CLASSIFICATION & REASONING
              </div>
              <div style={{ fontSize: '13px', color: designTokens.colors.ink, marginTop: '4px' }}>
                Sentiment: <strong>{selectedItem.sentiment}</strong> | Language: <strong>{selectedItem.language}</strong>
              </div>
              {selectedItem.riskFlags.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: designTokens.colors.danger, fontWeight: 600 }}>
                  Active Risk Flags: {selectedItem.riskFlags.join(', ')}
                </div>
              )}
            </div>

            {/* Live Existing Reply */}
            {selectedItem.existingReply && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: designTokens.radii.control }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
                  LIVE PUBLIC RESPONSE (VERIFIED ON GOOGLE)
                </div>
                <p style={{ margin: 0, color: '#14532d', fontSize: '14px' }}>
                  {selectedItem.existingReply.comment}
                </p>
              </div>
            )}

            {/* Response Draft */}
            {selectedItem.draftReply && (
              <div style={{ border: `2px dashed ${designTokens.colors.brand400}`, backgroundColor: designTokens.colors.brand50, padding: '16px', borderRadius: designTokens.radii.control }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: designTokens.colors.brand700 }}>
                    ⚠️ QUEUED DRAFT — NOT YET PUBLIC
                  </span>
                  <span style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>
                    Author: {selectedItem.draftReply.authorType} (v{selectedItem.draftReply.version})
                  </span>
                </div>
                <p style={{ margin: 0, color: designTokens.colors.ink, fontSize: '14px' }}>
                  {selectedItem.draftReply.text}
                </p>

                {/* Reply Actions */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  {canReply ? (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => {
                          onApproveDraft?.(selectedItem.id, selectedItem.draftReply!.id);
                          setSelectedItem(null);
                        }}
                      >
                        Approve & Publish Response
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          onRejectDraft?.(selectedItem.id, selectedItem.draftReply!.id);
                          setSelectedItem(null);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: designTokens.colors.danger }}>
                      🔒 You do not have permission to approve or publish replies.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action History */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '6px' }}>
                ACTION HISTORY
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: designTokens.colors.textSecondary }}>
                {selectedItem.actionHistory.map((act, idx) => (
                  <li key={idx}>
                    {new Date(act.timestamp).toLocaleTimeString()}: {act.action} by {act.actor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
