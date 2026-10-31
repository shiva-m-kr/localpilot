import React, { useState } from 'react';
import { designTokens } from '../tokens.js';
import { Button } from '../components/Button.js';
import { Field } from '../components/Field.js';
import { Combobox } from '../components/Combobox.js';
import { OnboardingDraftData, OnboardingPath } from '@localpilot/contracts';

export interface OnboardingFlowProps {
  initialData?: Partial<OnboardingDraftData>;
  initialStep?: number;
  onSaveStep: (step: number, data: Partial<OnboardingDraftData>) => void;
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialData,
  initialStep = 1,
  onSaveStep,
  onComplete
}) => {
  const [step, setStep] = useState(initialStep);
  const [formData, setFormData] = useState<OnboardingDraftData>({
    path: initialData?.path || 'from-scratch',
    businessName: initialData?.businessName || '',
    primaryCategory: initialData?.primaryCategory || '',
    brandVoice: initialData?.brandVoice || 'reliable_honest',
    websiteUrl: initialData?.websiteUrl || '',
    countryCode: initialData?.countryCode || 'IN',
    timezone: initialData?.timezone || 'Asia/Kolkata',
    language: initialData?.language || 'en-IN',
    addressVisibility: initialData?.addressVisibility || 'PUBLIC',
    streetAddress: initialData?.streetAddress || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postalCode: initialData?.postalCode || '',
    serviceCoverageRadiusKm: initialData?.serviceCoverageRadiusKm || 20,
    publicPhone: initialData?.publicPhone || '',
    publicEmail: initialData?.publicEmail || '',
    services: initialData?.services || ['General Repair', 'Inspection'],
    bookingGoal: initialData?.bookingGoal || 'PHONE_CALL',
    bookingUrl: initialData?.bookingUrl || '',
    skippedIntegrations: initialData?.skippedIntegrations || false
  });

  const [serviceInput, setServiceInput] = useState('');

  const updateField = <K extends keyof OnboardingDraftData>(field: K, value: OnboardingDraftData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    onSaveStep(step, formData);
    if (step < 5) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleAddService = () => {
    if (serviceInput.trim() && !formData.services.includes(serviceInput.trim())) {
      updateField('services', [...formData.services, serviceInput.trim()]);
      setServiceInput('');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: designTokens.colors.canvas,
        padding: '36px 24px',
        fontFamily: designTokens.typography.fontBody,
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: designTokens.radii.panel,
          border: `1px solid ${designTokens.colors.border}`,
          boxShadow: designTokens.shadows.card,
          padding: '40px'
        }}
      >
        {/* Progress Bar & Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: designTokens.colors.action, textTransform: 'uppercase' }}>
              Step {step} of 5
            </span>
            <span style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Progress autosaved</span>
          </div>

          <div style={{ height: '6px', width: '100%', backgroundColor: '#f3f4f6', borderRadius: designTokens.radii.pill, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(step / 5) * 100}%`,
                backgroundColor: designTokens.colors.action,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Step 1: Onboarding Path & Business Identity */}
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Let's set up your business presence
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: designTokens.colors.textSecondary }}>
              Choose your starting point:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { id: 'from-scratch', label: 'From Scratch', icon: '📝' },
                { id: 'existing-website', label: 'Existing Website', icon: '🌐' },
                { id: 'gbp-first', label: 'Google Profile', icon: '📍' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateField('path', p.id as OnboardingPath)}
                  style={{
                    padding: '16px 12px',
                    borderRadius: designTokens.radii.card,
                    border: formData.path === p.id ? `2px solid ${designTokens.colors.action}` : `1px solid ${designTokens.colors.border}`,
                    backgroundColor: formData.path === p.id ? designTokens.colors.surfaceSelected : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{p.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: designTokens.colors.ink }}>{p.label}</div>
                </button>
              ))}
            </div>

            <Field
              label="Business Name"
              value={formData.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder="e.g. Apex Plumbing & HVAC"
              required
            />

            <Field
              label="Primary Business Category"
              value={formData.primaryCategory}
              onChange={(e) => updateField('primaryCategory', e.target.value)}
              placeholder="e.g. Plumber, Beauty Salon, Auto Repair"
              required
            />

            {formData.path === 'existing-website' ? (
              <Field
                label="Existing Website URL"
                type="url"
                value={formData.websiteUrl || ''}
                onChange={(e) => updateField('websiteUrl', e.target.value)}
                placeholder="https://apexplumbing.example.in"
              />
            ) : null}
          </div>
        ) : null}

        {/* Step 2: Location, Timezone & Address Privacy */}
        {step === 2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Location &amp; Address Privacy
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: designTokens.colors.textSecondary }}>
              Service area businesses operating from home can keep residential addresses strictly private.
            </p>

            <Combobox
              label="Address Privacy Mode"
              value={formData.addressVisibility}
              onChange={(val) => updateField('addressVisibility', val as any)}
              options={[
                { value: 'PUBLIC', label: 'Public Storefront / Commercial Office (Address Shown)' },
                { value: 'HIDDEN_RESIDENTIAL', label: 'Service-Area Business (Residential Address Hidden)' },
                { value: 'SERVICE_AREA_ONLY', label: 'Service Area Only (No Physical Walk-ins)' }
              ]}
            />

            <Field
              label={formData.addressVisibility === 'HIDDEN_RESIDENTIAL' ? 'Private Residential Street Address' : 'Street Address'}
              value={formData.streetAddress || ''}
              onChange={(e) => updateField('streetAddress', e.target.value)}
              placeholder="142 Main Road"
              helperText={formData.addressVisibility === 'HIDDEN_RESIDENTIAL' ? '🔒 Strictly hidden from public websites and Google Maps' : undefined}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Field label="City" value={formData.city} onChange={(e) => updateField('city', e.target.value)} required />
              <Field label="State" value={formData.state} onChange={(e) => updateField('state', e.target.value)} required />
              <Field label="Postal Code" value={formData.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} required />
            </div>

            <Field
              label="Public Customer Phone Number"
              type="tel"
              value={formData.publicPhone}
              onChange={(e) => updateField('publicPhone', e.target.value)}
              placeholder="+91 80 4123 4567"
              required
            />
          </div>
        ) : null}

        {/* Step 3: Country, Timezone & Hours */}
        {step === 3 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Operating Hours &amp; Timezone
            </h2>

            <Combobox
              label="Timezone"
              value={formData.timezone}
              onChange={(val) => updateField('timezone', val)}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST — UTC+5:30)' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'Europe/London', label: 'Europe/London (GMT)' }
              ]}
            />

            <div style={{ padding: '16px', borderRadius: designTokens.radii.card, backgroundColor: designTokens.colors.surfaceSoft }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Standard Operating Schedule:</div>
              <div style={{ fontSize: '13px', color: designTokens.colors.textSecondary }}>
                Monday – Saturday: 9:00 AM – 7:00 PM (Emergency Callout Available)
              </div>
            </div>
          </div>
        ) : null}

        {/* Step 4: Services Offered */}
        {step === 4 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Services Offered
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: designTokens.colors.textSecondary }}>
              Add the specific services your business provides. These form the factual grounding for your content.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                placeholder="e.g. Emergency Drain Cleaning"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: designTokens.radii.control,
                  border: `1px solid ${designTokens.colors.border}`,
                  fontSize: '14px'
                }}
              />
              <Button variant="secondary" size="md" onClick={handleAddService}>
                Add Service
              </Button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {formData.services.map((svc, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '6px 12px',
                    borderRadius: designTokens.radii.pill,
                    backgroundColor: designTokens.colors.surfaceSoft,
                    border: `1px solid ${designTokens.colors.brand200}`,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: designTokens.colors.action
                  }}
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 5: Booking Goal & Integrations */}
        {step === 5 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: designTokens.typography.fontDisplay, fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Booking Goal &amp; Launch
            </h2>

            <Combobox
              label="Primary Customer Conversion Goal"
              value={formData.bookingGoal}
              onChange={(val) => updateField('bookingGoal', val as any)}
              options={[
                { value: 'PHONE_CALL', label: 'Direct Phone Calls (Call Now Button)' },
                { value: 'ONLINE_FORM', label: 'Online Enquiry Form' },
                { value: 'BOOKING_LINK', label: 'External Booking URL' },
                { value: 'WALK_IN', label: 'Physical In-Store Visit' }
              ]}
            />

            <div style={{ padding: '16px', borderRadius: designTokens.radii.card, backgroundColor: designTokens.colors.surfaceSoft }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Platform Integrations:</div>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: designTokens.colors.textSecondary }}>
                Connecting Google Business Profile or WordPress can be done now or skipped and completed later in Settings.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.skippedIntegrations}
                  onChange={(e) => updateField('skippedIntegrations', e.target.checked)}
                />
                Skip external integrations for now (I will connect later)
              </label>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '36px' }}>
          {step > 1 ? (
            <Button variant="ghost" size="md" onClick={() => setStep(step - 1)}>
              ← Back
            </Button>
          ) : <div />}

          <Button variant="primary" size="md" onClick={handleNext}>
            {step === 5 ? 'Complete Onboarding & Go to Dashboard →' : 'Save & Continue →'}
          </Button>
        </div>
      </div>
    </div>
  );
};
