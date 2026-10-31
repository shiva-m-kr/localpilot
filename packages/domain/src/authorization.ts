import crypto from 'crypto';
import { Capability, MembershipRole, TenantContext } from '@localpilot/contracts';
import { BaseDomainError, TenantAccessDeniedError, ValidationFailedError } from './errors.js';

export class InsufficientPermissionError extends BaseDomainError {
  readonly code = 'TENANT_ACCESS_DENIED' as const;
  readonly statusCode = 403;
  readonly userAction: string;

  constructor(capability: Capability, role: MembershipRole, message?: string) {
    super(message || `Role '${role}' does not possess capability '${capability}'.`);
    this.userAction = `Your current role (${role}) lacks permission to perform '${capability}'. Contact an organization administrator for elevated access.`;
  }
}

export interface TeamInvite {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  authorizedLocationIds: string[] | null;
  token: string;
  expiresAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  createdAt: Date;
}

export class AuthorizationService {
  /**
   * Complete Role to Capabilities Matrix
   */
  private static roleCapabilities: Record<MembershipRole, Set<Capability>> = {
    owner: new Set<Capability>([
      'content:draft',
      'content:approve',
      'content:publish',
      'facts:edit',
      'integrations:manage',
      'integrations:view_tokens',
      'billing:manage',
      'analytics:view',
      'team:manage',
      'ownership:transfer'
    ]),
    admin: new Set<Capability>([
      'content:draft',
      'content:approve',
      'content:publish',
      'facts:edit',
      'integrations:manage',
      'integrations:view_tokens',
      'billing:manage',
      'analytics:view',
      'team:manage'
      // Cannot transfer organization ownership
    ]),
    approver: new Set<Capability>([
      'content:draft',
      'content:approve',
      'facts:edit',
      'analytics:view'
      // Cannot manage integrations, billing, team, or view tokens
    ]),
    editor: new Set<Capability>([
      'content:draft',
      'facts:edit',
      'analytics:view'
      // Explicitly CANNOT content:approve or content:publish
    ]),
    analyst: new Set<Capability>([
      'analytics:view'
      // Read-only; CANNOT mutate any resources (no draft, approve, publish, edit)
    ]),
    billing_manager: new Set<Capability>([
      'billing:manage',
      'analytics:view'
      // Financial access only; CANNOT view tokens, edit facts, draft or publish content
    ]),
    platform_operator: new Set<Capability>([
      'analytics:view'
    ])
  };

  /**
   * Verifies if a user has a specific capability, respecting optional location restrictions.
   */
  static hasCapability(
    context: TenantContext,
    capability: Capability,
    targetLocationId?: string
  ): boolean {
    const allowedCaps = this.roleCapabilities[context.role];
    if (!allowedCaps || !allowedCaps.has(capability)) {
      return false;
    }

    // Check location scope if a target location is specified and user has location restrictions
    if (targetLocationId && context.authorizedLocationIds && context.authorizedLocationIds.length > 0) {
      if (!context.authorizedLocationIds.includes(targetLocationId as any)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Asserts that a context possesses the required capability, throwing actionable domain errors on failure.
   */
  static assertCapability(
    context: TenantContext,
    capability: Capability,
    targetLocationId?: string
  ): void {
    const allowedCaps = this.roleCapabilities[context.role];
    if (!allowedCaps || !allowedCaps.has(capability)) {
      throw new InsufficientPermissionError(capability, context.role);
    }

    if (targetLocationId && context.authorizedLocationIds && context.authorizedLocationIds.length > 0) {
      if (!context.authorizedLocationIds.includes(targetLocationId as any)) {
        throw new TenantAccessDeniedError(
          context.organizationId,
          targetLocationId,
          {
            authorizedLocations: context.authorizedLocationIds,
            attemptedLocation: targetLocationId
          }
        );
      }
    }
  }

  /**
   * Creates a team invitation with safe expiration (default 7 days).
   */
  static createInvite(
    creatorContext: TenantContext,
    inviteeEmail: string,
    role: MembershipRole,
    authorizedLocationIds: string[] | null = null,
    ttlDays: number = 7
  ): TeamInvite {
    this.assertCapability(creatorContext, 'team:manage');

    // Only owners can invite other owners or admins
    if ((role === 'owner' || role === 'admin') && creatorContext.role !== 'owner') {
      throw new InsufficientPermissionError('team:manage', creatorContext.role, 'Only the organization owner can invite admins or transfer ownership.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    return {
      id: crypto.randomUUID(),
      organizationId: creatorContext.organizationId,
      email: inviteeEmail.toLowerCase().trim(),
      role,
      authorizedLocationIds,
      token,
      expiresAt,
      status: 'PENDING',
      createdAt: now
    };
  }

  /**
   * Validates and accepts a team invitation.
   */
  static acceptInvite(invite: TeamInvite, acceptingUserId: string): { organizationId: string; role: MembershipRole; authorizedLocationIds: string[] | null } {
    if (invite.status !== 'PENDING') {
      throw new ValidationFailedError(`Invitation is no longer active (status: ${invite.status}).`);
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'REVOKED';
      throw new ValidationFailedError('Invitation link has expired. Please ask your administrator to send a new invite.');
    }

    invite.status = 'ACCEPTED';
    return {
      organizationId: invite.organizationId,
      role: invite.role,
      authorizedLocationIds: invite.authorizedLocationIds
    };
  }

  /**
   * Revokes an existing invitation.
   */
  static revokeInvite(actorContext: TenantContext, invite: TeamInvite): void {
    this.assertCapability(actorContext, 'team:manage');
    if (invite.organizationId !== actorContext.organizationId) {
      throw new TenantAccessDeniedError(actorContext.organizationId);
    }
    invite.status = 'REVOKED';
  }

  /**
   * Safe ownership transfer:
   * Only the current primary owner can transfer ownership to another active member.
   */
  static transferOwnership(
    currentOwnerContext: TenantContext,
    targetUserId: string
  ): { previousOwnerRole: MembershipRole; newOwnerRole: MembershipRole } {
    this.assertCapability(currentOwnerContext, 'ownership:transfer');

    if (currentOwnerContext.userId === targetUserId) {
      throw new ValidationFailedError('Cannot transfer ownership to yourself.');
    }

    return {
      previousOwnerRole: 'admin',
      newOwnerRole: 'owner'
    };
  }
}
