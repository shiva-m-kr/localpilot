import React, { useState } from 'react';
import { designTokens } from '../tokens.js';
import { Button } from '../components/Button.js';
import { Field } from '../components/Field.js';
import { EmptyState } from '../components/EmptyState.js';

export interface LoginPageProps {
  onGoogleSignIn: () => void;
  onEmailSignIn: (email: string) => void;
  onEnterDemoMode: () => void;
  redirectTarget?: string;
  errorMessage?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onGoogleSignIn,
  onEmailSignIn,
  onEnterDemoMode,
  redirectTarget = '/dashboard',
  errorMessage
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setIsSubmitting(true);
    onEmailSignIn(email);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: designTokens.colors.canvas,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: designTokens.typography.fontBody
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: designTokens.radii.panel,
          border: `1px solid ${designTokens.colors.border}`,
          boxShadow: designTokens.shadows.float,
          padding: '36px 32px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: designTokens.colors.action,
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '20px',
              fontFamily: designTokens.typography.fontDisplay,
              marginBottom: '12px'
            }}
          >
            LP
          </div>
          <h2
            style={{
              fontFamily: designTokens.typography.fontDisplay,
              fontSize: '24px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: designTokens.colors.ink
            }}
          >
            Sign in to LocalPilot
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: designTokens.colors.textSecondary }}>
            Manage your verified presence and local visibility
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            style={{
              padding: '12px',
              borderRadius: designTokens.radii.control,
              backgroundColor: '#fef2f2',
              border: `1px solid ${designTokens.colors.danger}`,
              color: designTokens.colors.danger,
              fontSize: '13px',
              marginBottom: '20px'
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {/* 1. Google OAuth Button */}
        <Button
          variant="secondary"
          size="md"
          onClick={onGoogleSignIn}
          style={{
            width: '100%',
            marginBottom: '20px',
            backgroundColor: '#ffffff',
            borderColor: designTokens.colors.border,
            color: designTokens.colors.ink
          }}
        >
          <span style={{ fontSize: '16px' }}>🇬</span> Continue with Google
        </Button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '20px 0',
            color: designTokens.colors.textMuted,
            fontSize: '12px'
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: designTokens.colors.border }} />
          <span>OR WORK EMAIL</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: designTokens.colors.border }} />
        </div>

        {/* 2. Magic Link Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field
            label="Work Email"
            type="email"
            placeholder="owner@yourbusiness.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            required
          />

          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting} style={{ width: '100%' }}>
            Send Magic Link
          </Button>
        </form>

        {/* 3. Visibly Isolated Demo Mode Access */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: `1px solid ${designTokens.colors.border}`,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '12px', color: designTokens.colors.textMuted, marginBottom: '8px' }}>
            Want to test the platform first?
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEnterDemoMode}
            style={{
              color: designTokens.colors.action,
              backgroundColor: designTokens.colors.surfaceSoft,
              width: '100%'
            }}
          >
            ⚡ Enter Visually Labeled Demo Workspace
          </Button>
        </div>
      </div>
    </div>
  );
};

export interface InviteAcceptancePageProps {
  inviteStatus: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  organizationName: string;
  inviterEmail: string;
  role: string;
  onAccept: () => void;
  onRequestNewInvite?: () => void;
}

export const InviteAcceptancePage: React.FC<InviteAcceptancePageProps> = ({
  inviteStatus,
  organizationName,
  inviterEmail,
  role,
  onAccept,
  onRequestNewInvite
}) => {
  const isInvalid = inviteStatus === 'REVOKED' || inviteStatus === 'EXPIRED';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: designTokens.colors.canvas,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: designTokens.typography.fontBody
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: designTokens.radii.panel,
          border: `1px solid ${designTokens.colors.border}`,
          boxShadow: designTokens.shadows.float,
          padding: '36px 32px',
          textAlign: 'center'
        }}
      >
        {isInvalid ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '22px', fontWeight: 700, margin: '0 0 12px 0', color: designTokens.colors.danger }}>
              Invitation Link Expired or Revoked
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '22px', color: designTokens.colors.textSecondary, marginBottom: '24px' }}>
              This invitation link is no longer valid. For security, invitations expire after 7 days. Please ask an administrator to send a fresh invitation.
            </p>
            {onRequestNewInvite ? (
              <Button variant="primary" size="md" onClick={onRequestNewInvite}>
                Contact Team Administrator
              </Button>
            ) : (
              <a href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="md">
                  Return to Sign In
                </Button>
              </a>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✉️</div>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: designTokens.colors.ink }}>
              Join {organizationName}
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '22px', color: designTokens.colors.textSecondary, marginBottom: '20px' }}>
              <strong>{inviterEmail}</strong> has invited you to collaborate as an <strong>{role}</strong> on LocalPilot.
            </p>
            <Button variant="primary" size="lg" onClick={onAccept} style={{ width: '100%' }}>
              Accept Invitation &amp; Join →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export interface EmptyWorkspaceViewProps {
  organizationName: string;
  onStartOnboarding: () => void;
}

export const EmptyWorkspaceView: React.FC<EmptyWorkspaceViewProps> = ({
  organizationName,
  onStartOnboarding
}) => {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <EmptyState
        icon="🏢"
        title={`Welcome to ${organizationName}`}
        description="Your workspace is ready. To begin measuring visibility and publishing updates, connect your website or add your first business location."
        actionLabel="Start Business Onboarding →"
        onAction={onStartOnboarding}
      />
    </div>
  );
};
