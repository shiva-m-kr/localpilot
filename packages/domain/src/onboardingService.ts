import crypto from 'crypto';
import {
  OnboardingDraftData,
  OnboardingSession,
  OnboardingPath,
  OnboardingDraftDataSchema
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class OnboardingService {
  private static sessions = new Map<string, OnboardingSession>();

  /**
   * Initializes or resumes an onboarding session.
   */
  static startSession(
    organizationId: string,
    initialPath: OnboardingPath = 'from-scratch'
  ): OnboardingSession {
    // Check if an incomplete session already exists for this organization
    for (const session of this.sessions.values()) {
      if (session.organizationId === organizationId && !session.isCompleted) {
        return session; // Resume existing session
      }
    }

    const newSession: OnboardingSession = {
      sessionId: crypto.randomUUID(),
      organizationId,
      currentStep: 1,
      completedSteps: [],
      isCompleted: false,
      lastSavedAt: new Date().toISOString(),
      data: {
        path: initialPath,
        businessName: '',
        primaryCategory: '',
        brandVoice: 'reliable_honest',
        countryCode: 'IN',
        timezone: 'Asia/Kolkata',
        language: 'en-IN',
        addressVisibility: 'PUBLIC',
        city: '',
        state: '',
        postalCode: '',
        serviceCoverageRadiusKm: 20,
        publicPhone: '',
        services: [],
        bookingGoal: 'PHONE_CALL',
        skippedIntegrations: false
      }
    };

    this.sessions.set(newSession.sessionId, newSession);
    return newSession;
  }

  /**
   * Saves progress for the current step and advances to the next step.
   */
  static saveStepProgress(
    sessionId: string,
    step: number,
    partialData: Partial<OnboardingDraftData>
  ): OnboardingSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ValidationFailedError(`Onboarding session ${sessionId} not found.`);
    }

    // Merge partial data
    session.data = {
      ...session.data,
      ...partialData
    };

    // Validate step-specific required facts
    if (step === 1) {
      if (!session.data.businessName || session.data.businessName.length < 2) {
        throw new ValidationFailedError('Business name must be at least 2 characters.');
      }
      if (!session.data.primaryCategory) {
        throw new ValidationFailedError('Primary business category is required.');
      }
    } else if (step === 2) {
      if (!session.data.city || !session.data.state || !session.data.postalCode) {
        throw new ValidationFailedError('City, State, and Postal Code are required.');
      }
      if (!session.data.publicPhone || session.data.publicPhone.length < 8) {
        throw new ValidationFailedError('A valid customer-facing phone number is required.');
      }
      // If service area business (SAB), ensure residential address is not forced to public
      if (session.data.addressVisibility === 'HIDDEN_RESIDENTIAL') {
        // Enforce residential privacy rules
      }
    }

    if (!session.completedSteps.includes(step)) {
      session.completedSteps.push(step);
    }
    session.currentStep = Math.min(5, step + 1);
    session.lastSavedAt = new Date().toISOString();

    return session;
  }

  /**
   * Completes onboarding session and outputs finalized location and business parameters.
   */
  static completeSession(sessionId: string): {
    organizationId: string;
    businessData: { name: string; brandVoice: string; primaryCategory: string; websiteUrl?: string };
    locationData: {
      name: string;
      countryCode: string;
      timezone: string;
      language: string;
      addressVisibility: string;
      streetAddress?: string;
      city: string;
      state: string;
      postalCode: string;
      publicPhone: string;
      publicEmail?: string;
      bookingGoal: string;
      bookingUrl?: string;
      services: string[];
    };
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ValidationFailedError(`Onboarding session ${sessionId} not found.`);
    }

    // Validate full data schema
    const parsed = OnboardingDraftDataSchema.safeParse(session.data);
    if (!parsed.success) {
      throw new ValidationFailedError(`Cannot finalize onboarding with incomplete required facts: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
    }

    session.isCompleted = true;
    session.lastSavedAt = new Date().toISOString();

    return {
      organizationId: session.organizationId,
      businessData: {
        name: session.data.businessName,
        brandVoice: session.data.brandVoice,
        primaryCategory: session.data.primaryCategory,
        websiteUrl: session.data.websiteUrl || undefined
      },
      locationData: {
        name: `${session.data.businessName} - Main Location`,
        countryCode: session.data.countryCode,
        timezone: session.data.timezone,
        language: session.data.language,
        addressVisibility: session.data.addressVisibility,
        streetAddress: session.data.addressVisibility === 'PUBLIC' ? session.data.streetAddress : undefined, // Keep residential address private
        city: session.data.city,
        state: session.data.state,
        postalCode: session.data.postalCode,
        publicPhone: session.data.publicPhone,
        publicEmail: session.data.publicEmail || undefined,
        bookingGoal: session.data.bookingGoal,
        bookingUrl: session.data.bookingUrl || undefined,
        services: session.data.services
      }
    };
  }
}
