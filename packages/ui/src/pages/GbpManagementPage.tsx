import React, { useState } from 'react';
import {
  GbpPostPayload,
  GbpFieldProposal
} from '@localpilot/contracts';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ConfirmationDiff } from '../components/ConfirmationDiff.js';

export interface GbpManagementPageProps {
  proposals: GbpFieldProposal[];
  posts: GbpPostPayload[];
  onApproveProposal: (proposalId: string) => void;
  onApplyProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
}

export const GbpManagementPage: React.FC<GbpManagementPageProps> = ({
  proposals,
  posts,
  onApproveProposal,
  onApplyProposal,
  onRejectProposal
}) => {
  const [selectedProposal, setSelectedProposal] = useState<GbpFieldProposal | null>(null);

  return (
    <div className="lp-gbp-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Truth-in-SEO Disclaimer Banner */}
      <div
        role="region"
        aria-label="Compliance Notice"
        style={{
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '24px',
          color: '#92400E',
          fontSize: '13px'
        }}
      >
        <strong>Truth-in-SEO Principle:</strong> Google Business Profile updates are synchronized for NAP accuracy and customer transparency. LocalPilot does not guarantee or claim that updating GBP profile details or publishing posts causes search rank increases.
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>GBP Profile & Updates Management</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
          Review sensitive profile changes and manage authorized Google Business Profile updates.
        </p>
      </div>

      {/* Sensitive Profile Field Proposals */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Sensitive Profile Change Proposals ({proposals.filter((p) => p.status === 'PROPOSED').length} Pending)
        </h2>

        {proposals.length === 0 ? (
          <div style={{ padding: '24px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB', color: '#6B7280' }}>
            No pending sensitive profile field proposals.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {proposals.map((prop) => (
              <div
                key={prop.proposalId}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px' }}>
                      {prop.fieldType}
                    </span>
                    <strong style={{ fontSize: '15px' }}>Rationale: {prop.rationale}</strong>
                  </div>
                  <div>
                    {prop.status === 'PROPOSED' && <StatusBadge status="needs_review" label="Pending Owner Approval" />}
                    {prop.status === 'APPROVED' && <StatusBadge status="pending" label="Approved - Ready to Apply" />}
                    {prop.status === 'APPLIED' && <StatusBadge status="published" label="Synchronized to GBP" />}
                    {prop.status === 'REJECTED' && <StatusBadge status="failed" label="Rejected" />}
                  </div>
                </div>

                {/* Before / After Diff */}
                <ConfirmationDiff
                  title={`Proposed Update: ${prop.fieldType}`}
                  fields={[
                    {
                      fieldName: prop.fieldType,
                      previousValue: prop.currentValue,
                      proposedValue: prop.proposedValue
                    }
                  ]}
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                  {prop.status === 'PROPOSED' && (
                    <>
                      <Button variant="secondary" onClick={() => onRejectProposal(prop.proposalId)}>
                        Reject Proposal
                      </Button>
                      <Button variant="primary" onClick={() => onApproveProposal(prop.proposalId)}>
                        Approve Profile Update
                      </Button>
                    </>
                  )}
                  {prop.status === 'APPROVED' && (
                    <Button variant="primary" onClick={() => onApplyProposal(prop.proposalId)}>
                      Apply to Google Business Profile
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GBP Posts & Updates List (including rejected posts) */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          GBP Updates & Posts History
        </h2>
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Summary</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.topicType}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '400px' }}>{p.summary}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.status === 'PUBLISHED' && <StatusBadge status="published" label="Published" />}
                    {p.status === 'REJECTED_BY_GBP' && <StatusBadge status="failed" label="Rejected by Google" />}
                    {p.status === 'DRAFT' && <StatusBadge status="needs_review" label="Draft" />}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#B91C1C', fontSize: '13px' }}>
                    {p.rejectionReason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
