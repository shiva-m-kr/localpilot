export type ReviewEscalationCategory =
  | 'STANDARD_RESPONSE'
  | 'CUSTOMER_COMPLAINT'
  | 'LEGAL_SAFETY_DISPUTE'
  | 'BILLING_REFUND'
  | 'SERVICE_RECOVERY';

export interface InternalSupportNote {
  noteId: string;
  authorUserId: string;
  text: string;
  createdAt: string;
  isPrivateSupportNote: true;
}

export interface ReviewTaskAssignment {
  taskId: string;
  reviewResourceId: string;
  organizationId: string;
  locationId: string;
  assignedUserId: string;
  escalationCategory: ReviewEscalationCategory;
  deadlineAt: string;
  internalNotes: InternalSupportNote[];
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
}

export interface ReplyApprovalBinding {
  approvalId: string;
  draftId: string;
  reviewResourceId: string;
  boundSourceRevision: string;
  boundDraftHash: string;
  approvedByUserId: string;
  approvedAt: string;
  isValid: boolean;
  invalidationReason: string | null;
}
