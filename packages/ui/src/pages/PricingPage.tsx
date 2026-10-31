import React, { useState } from 'react';
import { designTokens } from '../tokens.js';
import { Button } from '../components/Button.js';

export interface PlanTier {
  id: string;
  name: string;
  priceMonthlyInr: number;
  priceMonthlyUsd: number;
  description: string;
  isPopular?: boolean;
  quotas: {
    locations: number;
    blogsPerMonth: number;
    channelVariants: string;
    gridScanPointsMonthly: number;
    keywordTracking: number;
    reviewsSync: string;
    directories: number;
  };
}

export const PRICING_TIERS: PlanTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthlyInr: 4999,
    priceMonthlyUsd: 59,
    description: 'Perfect for single-location home service and retail businesses.',
    quotas: {
      locations: 1,
      blogsPerMonth: 4,
      channelVariants: 'WordPress + GBP Updates',
      gridScanPointsMonthly: 100, // e.g. 4 scans of 5x5 grid
      keywordTracking: 5,
      reviewsSync: 'Google Reviews (30-day cache)',
      directories: 5
    }
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthlyInr: 9999,
    priceMonthlyUsd: 119,
    description: 'For growing businesses expanding local reach across social and search.',
    isPopular: true,
    quotas: {
      locations: 2,
      blogsPerMonth: 12,
      channelVariants: 'WordPress + GBP + Instagram + FB',
      gridScanPointsMonthly: 300,
      keywordTracking: 15,
      reviewsSync: 'Google Reviews with grounded drafts',
      directories: 15
    }
  },
  {
    id: 'pro',
    name: 'Agency / Multi-Location',
    priceMonthlyInr: 19999,
    priceMonthlyUsd: 239,
    description: 'Comprehensive presence management with custom domains and competitor gap intelligence.',
    quotas: {
      locations: 5,
      blogsPerMonth: 30,
      channelVariants: 'All supported channels + Hosted Sites',
      gridScanPointsMonthly: 800,
      keywordTracking: 40,
      reviewsSync: 'Priority sync + automated response policies',
      directories: 30
    }
  }
];

export const FAQS = [
  {
    q: 'Do you guarantee #1 rankings on Google Maps?',
    a: 'No. LocalPilot does not make fabricated ranking promises or claim to know Google’s private ranking algorithms. We measure real local visibility and help you maintain accurate facts and helpful local content.'
  },
  {
    q: 'Does LocalPilot automatically publish without my review?',
    a: 'By default, LocalPilot operates in review-first mode. All blog articles, profile edits, and review responses require your explicit approval. You can opt-in to automatic positive review replies only when specific safety conditions are met.'
  },
  {
    q: 'What happens if I change my business phone or hours?',
    a: 'Whenever you update confirmed business facts, any previously approved draft referencing the old facts is automatically flagged and invalidated until you review and re-approve the updated diff.'
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your subscription at any time from your billing settings. Your hosted sites and connected data remain accessible through the end of your prepaid billing period.'
  }
];

export const PricingPage: React.FC = () => {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

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
      {/* Header */}
      <header
        style={{
          maxWidth: '1232px',
          margin: '24px auto 0 auto',
          padding: '0 24px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ textDecoration: 'none', color: designTokens.colors.ink, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔙</span>
            <span style={{ fontFamily: designTokens.typography.fontDisplay, fontWeight: 700, fontSize: '18px' }}>LocalPilot</span>
          </a>

          {/* Currency Toggle */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              backgroundColor: '#ffffff',
              borderRadius: designTokens.radii.pill,
              border: `1px solid ${designTokens.colors.border}`
            }}
          >
            <button
              onClick={() => setCurrency('INR')}
              style={{
                border: 'none',
                background: currency === 'INR' ? designTokens.colors.action : 'transparent',
                color: currency === 'INR' ? '#ffffff' : designTokens.colors.textSecondary,
                padding: '6px 14px',
                borderRadius: designTokens.radii.pill,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              style={{
                border: 'none',
                background: currency === 'USD' ? designTokens.colors.action : 'transparent',
                color: currency === 'USD' ? '#ffffff' : designTokens.colors.textSecondary,
                padding: '6px 14px',
                borderRadius: designTokens.radii.pill,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              $ USD
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '64px 24px 48px 24px', maxWidth: '1232px', margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: designTokens.typography.fontDisplay,
            fontSize: '56px',
            lineHeight: '70px',
            fontWeight: 700,
            letterSpacing: '-1.44px',
            margin: '0 0 16px 0'
          }}
        >
          Predictable pricing with <span style={{ color: designTokens.colors.action }}>exact quotas</span>
        </h1>
        <p style={{ fontSize: '18px', color: designTokens.colors.textSecondary, maxWidth: '640px', margin: '0 auto' }}>
          No hidden overages or surprise cloud bills. All map grid scans, AI content drafts, and channel updates are clearly metered.
        </p>
      </section>

      {/* Pricing Cards Grid */}
      <section style={{ maxWidth: '1232px', margin: '0 auto 80px auto', padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'stretch'
          }}
        >
          {PRICING_TIERS.map((tier) => {
            const price = currency === 'INR' ? `₹${tier.priceMonthlyInr.toLocaleString('en-IN')}` : `$${tier.priceMonthlyUsd}`;
            return (
              <div
                key={tier.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: designTokens.radii.card,
                  padding: '32px 24px',
                  border: tier.isPopular ? `2px solid ${designTokens.colors.action}` : `1px solid ${designTokens.colors.border}`,
                  boxShadow: tier.isPopular ? designTokens.shadows.float : designTokens.shadows.card,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {tier.isPopular ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: designTokens.colors.action,
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: designTokens.radii.pill
                    }}
                  >
                    MOST POPULAR
                  </span>
                ) : null}

                <h3 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0' }}>
                  {tier.name}
                </h3>
                <p style={{ fontSize: '13px', color: designTokens.colors.textSecondary, margin: '0 0 20px 0', minHeight: '38px' }}>
                  {tier.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                  <span style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '38px', fontWeight: 700 }}>
                    {price}
                  </span>
                  <span style={{ fontSize: '14px', color: designTokens.colors.textMuted }}>/ month</span>
                </div>

                {/* Quota details */}
                <div style={{ borderTop: `1px solid ${designTokens.colors.border}`, paddingTop: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: designTokens.colors.textSecondary }}>Active Locations</span>
                    <strong>{tier.quotas.locations}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: designTokens.colors.textSecondary }}>Articles &amp; Posts</span>
                    <strong>{tier.quotas.blogsPerMonth} / mo</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: designTokens.colors.textSecondary }}>Grid Scan Points</span>
                    <strong>{tier.quotas.gridScanPointsMonthly} / mo</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: designTokens.colors.textSecondary }}>Keyword Tracking</span>
                    <strong>{tier.quotas.keywordTracking} keywords</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: designTokens.colors.textSecondary }}>Channels</span>
                    <strong style={{ textAlign: 'right', maxWidth: '160px' }}>{tier.quotas.channelVariants}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '32px' }}>
                  <a href={`/onboarding?plan=${tier.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant={tier.isPopular ? 'primary' : 'secondary'} size="md" style={{ width: '100%' }}>
                      Select {tier.name} Plan
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQs Section */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 24px', borderTop: `1px solid ${designTokens.colors.border}` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {FAQS.map((faq, idx) => (
              <div key={idx} style={{ padding: '20px', borderRadius: designTokens.radii.card, backgroundColor: designTokens.colors.surfaceSoft }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700 }}>
                  {faq.q}
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '22px', color: designTokens.colors.textSecondary }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
