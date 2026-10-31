import React from 'react';
import { designTokens } from '../tokens.js';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const MarketingLandingPage: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: designTokens.colors.canvas,
        color: designTokens.colors.ink,
        fontFamily: designTokens.typography.fontBody,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. Capsule Navigation Header */}
      <header
        style={{
          maxWidth: '1232px',
          margin: '24px auto 0 auto',
          padding: '0 24px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: designTokens.radii.pill,
            padding: '12px 24px',
            border: `1px solid ${designTokens.colors.border}`,
            boxShadow: designTokens.shadows.card
          }}
        >
          {/* Brand Logo */}
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: designTokens.colors.ink
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: designTokens.colors.action,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
                fontFamily: designTokens.typography.fontDisplay
              }}
            >
              LP
            </div>
            <span
              style={{
                fontFamily: designTokens.typography.fontDisplay,
                fontSize: '18px',
                fontWeight: 700
              }}
            >
              LocalPilot
            </span>
          </a>

          {/* Nav Links */}
          <nav
            aria-label="Public Navigation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <a href="#how-it-works" style={{ textDecoration: 'none', color: designTokens.colors.textSecondary }}>
              How it works
            </a>
            <a href="#features" style={{ textDecoration: 'none', color: designTokens.colors.textSecondary }}>
              Features
            </a>
            <a href="#scenarios" style={{ textDecoration: 'none', color: designTokens.colors.textSecondary }}>
              For Local Businesses
            </a>
            <a href="/pricing" style={{ textDecoration: 'none', color: designTokens.colors.textSecondary }}>
              Pricing
            </a>
          </nav>

          {/* CTA Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/login"
              style={{
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: designTokens.colors.ink,
                padding: '8px 14px'
              }}
            >
              Sign in
            </a>
            <a href="/onboarding" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">
                Start Free Trial
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Centered Hero Section with Subtle Glow */}
      <section
        style={{
          position: 'relative',
          padding: '80px 24px 64px 24px',
          maxWidth: '1232px',
          margin: '0 auto',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Subtle orange accent glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(254, 215, 170, 0.45) 0%, rgba(255, 253, 251, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: designTokens.radii.pill,
              backgroundColor: designTokens.colors.surfaceSoft,
              border: `1px solid ${designTokens.colors.brand200}`,
              fontSize: '13px',
              fontWeight: 600,
              color: designTokens.colors.action,
              marginBottom: '24px'
            }}
          >
            <span>✨</span> Honest Local Business Growth SaaS
          </div>

          <h1
            style={{
              fontFamily: designTokens.typography.fontDisplay,
              fontSize: '68px',
              lineHeight: '81.6px',
              fontWeight: 700,
              letterSpacing: '-1.2px',
              color: designTokens.colors.ink,
              margin: '0 auto 24px auto',
              maxWidth: '820px'
            }}
          >
            Keep your local presence accurate.{' '}
            <span style={{ color: designTokens.colors.action }}>Publish with control.</span>
          </h1>

          <p
            style={{
              fontFamily: designTokens.typography.fontBody,
              fontSize: '18px',
              lineHeight: '28px',
              color: designTokens.colors.textSecondary,
              maxWidth: '640px',
              margin: '0 auto 36px auto'
            }}
          >
            Connect your website, Google Business Profile, and social channels. Establish verified business facts, schedule grounded local content, and measure real search visibility without fabricated claims.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <a href="/onboarding" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="lg" style={{ minWidth: '220px' }}>
                Connect Your Business →
              </Button>
            </a>
            <a href="#how-it-works" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="lg">
                Explore How It Works
              </Button>
            </a>
          </div>

          <div
            style={{
              marginTop: '16px',
              fontSize: '13px',
              color: designTokens.colors.textMuted
            }}
          >
            No credit card required for onboarding • Review-first approval policy
          </div>
        </div>
      </section>

      {/* 3. Labeled Product Preview / Live Demo Fixture */}
      <section
        style={{
          maxWidth: '1232px',
          margin: '0 auto 80px auto',
          padding: '0 24px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: designTokens.radii.panel,
            border: `1px solid ${designTokens.colors.border}`,
            boxShadow: designTokens.shadows.float,
            padding: '24px',
            position: 'relative'
          }}
        >
          {/* Labeled Demo Badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '20px',
              display: 'flex',
              gap: '8px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: designTokens.radii.pill,
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a'
              }}
            >
              PRODUCT PREVIEW (DEMO DATA)
            </span>
          </div>

          {/* App preview header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: `1px solid ${designTokens.colors.border}`,
              paddingBottom: '16px',
              marginBottom: '20px'
            }}
          >
            <span style={{ fontSize: '18px' }}>🏢</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Apex Plumbing &amp; HVAC</div>
              <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Bengaluru Service Zone • 4 Connected Accounts</div>
            </div>
            <div style={{ marginLeft: 'auto', marginRight: '160px' }}>
              <StatusBadge status="published" label="Auto-Sync Active" />
            </div>
          </div>

          {/* Metric cards inside preview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}
          >
            <div style={{ padding: '16px', borderRadius: designTokens.radii.card, backgroundColor: designTokens.colors.surfaceSoft }}>
              <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Top-3 Maps Visibility</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.ink, margin: '4px 0' }}>68%</div>
              <div style={{ fontSize: '11px', color: designTokens.colors.textSecondary }}>Sampled over 25 grid points</div>
            </div>
            <div style={{ padding: '16px', borderRadius: designTokens.radii.card, backgroundColor: designTokens.colors.surfaceSoft }}>
              <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Customer Enquiries</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.ink, margin: '4px 0' }}>42 leads</div>
              <div style={{ fontSize: '11px', color: designTokens.colors.textSecondary }}>Verified click-to-call &amp; forms</div>
            </div>
            <div style={{ padding: '16px', borderRadius: designTokens.radii.card, backgroundColor: designTokens.colors.surfaceSoft }}>
              <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Review Response Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: designTokens.colors.ink, margin: '4px 0' }}>100%</div>
              <div style={{ fontSize: '11px', color: designTokens.colors.textSecondary }}>All 18 reviews approved &amp; replied</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Three Steps: How It Works */}
      <section
        id="how-it-works"
        style={{
          backgroundColor: '#ffffff',
          padding: '80px 24px',
          borderTop: `1px solid ${designTokens.colors.border}`,
          borderBottom: `1px solid ${designTokens.colors.border}`
        }}
      >
        <div style={{ maxWidth: '1232px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: designTokens.typography.fontDisplay,
              fontSize: '44px',
              lineHeight: '55px',
              fontWeight: 700,
              letterSpacing: '-0.8px',
              marginBottom: '16px'
            }}
          >
            Three steps to structured growth
          </h2>
          <p
            style={{
              fontFamily: designTokens.typography.fontBody,
              fontSize: '16px',
              color: designTokens.colors.textSecondary,
              maxWidth: '600px',
              margin: '0 auto 48px auto'
            }}
          >
            No complex agency retainers or unsupervised bot posting. You stay in control.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                padding: '24px',
                borderRadius: designTokens.radii.card,
                backgroundColor: designTokens.colors.surfaceSoft,
                border: `1px solid ${designTokens.colors.brand100}`
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>1️⃣</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Connect Your Business</h3>
              <p style={{ fontSize: '14px', lineHeight: '22px', color: designTokens.colors.textSecondary, margin: 0 }}>
                Import your existing website or Google Business Profile. We extract and verify your core business facts: services, hours, coverage area, and public contact.
              </p>
            </div>

            <div
              style={{
                padding: '24px',
                borderRadius: designTokens.radii.card,
                backgroundColor: designTokens.colors.surfaceSoft,
                border: `1px solid ${designTokens.colors.brand100}`
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>2️⃣</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Confirm Your Plan</h3>
              <p style={{ fontSize: '14px', lineHeight: '22px', color: designTokens.colors.textSecondary, margin: 0 }}>
                Review monthly content proposals, keyword targets, and competitor gaps. Every draft is strictly grounded in your confirmed facts.
              </p>
            </div>

            <div
              style={{
                padding: '24px',
                borderRadius: designTokens.radii.card,
                backgroundColor: designTokens.colors.surfaceSoft,
                border: `1px solid ${designTokens.colors.brand100}`
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>3️⃣</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Let Approved Work Run</h3>
              <p style={{ fontSize: '14px', lineHeight: '22px', color: designTokens.colors.textSecondary, margin: 0 }}>
                Approved updates publish directly to WordPress, GBP, and Meta social accounts on your scheduled timezone. If facts change, approvals re-lock automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Supported Integrations Strip */}
      <section
        style={{
          padding: '48px 24px',
          maxWidth: '1232px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, textTransform: 'uppercase', marginBottom: '24px' }}>
          Directly connects with your essential platforms
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '36px',
            flexWrap: 'wrap',
            fontSize: '15px',
            fontWeight: 600,
            color: designTokens.colors.ink
          }}
        >
          <span>🌐 WordPress REST</span>
          <span>📍 Google Business Profile</span>
          <span>🔍 Google Search Console</span>
          <span>📸 Instagram Business</span>
          <span>📘 Facebook Pages</span>
        </div>
      </section>

      {/* 6. Footer & Legal Placeholders */}
      <footer
        style={{
          marginTop: 'auto',
          backgroundColor: '#ffffff',
          borderTop: `1px solid ${designTokens.colors.border}`,
          padding: '48px 24px',
          fontSize: '13px',
          color: designTokens.colors.textMuted
        }}
      >
        <div
          style={{
            maxWidth: '1232px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <strong>LocalPilot</strong> — Built for single &amp; multi-location local businesses.
            <div style={{ marginTop: '4px' }}>© 2026 LocalPilot. All rights reserved.</div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="/legal/terms" style={{ color: designTokens.colors.textSecondary, textDecoration: 'none' }}>
              Terms of Service
            </a>
            <a href="/legal/privacy" style={{ color: designTokens.colors.textSecondary, textDecoration: 'none' }}>
              Privacy Policy
            </a>
            <a href="/pricing" style={{ color: designTokens.colors.textSecondary, textDecoration: 'none' }}>
              Pricing &amp; Quotas
            </a>
            <a href="/contact" style={{ color: designTokens.colors.textSecondary, textDecoration: 'none' }}>
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
