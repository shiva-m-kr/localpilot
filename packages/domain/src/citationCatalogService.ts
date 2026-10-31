import {
  DirectoryCatalogItem,
  DirectoryRegion,
  DirectoryVertical,
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export const CURATED_DIRECTORY_CATALOG: DirectoryCatalogItem[] = [
  // --- INDIA (IN) ---
  {
    id: 'gbp-in',
    name: 'Google Business Profile',
    domain: 'google.com/business',
    region: 'IN',
    relevantVerticals: ['GENERAL_LOCAL', 'HOME_SERVICES', 'HEALTHCARE', 'B2B_COMMERCIAL', 'RETAIL_DINING', 'PROFESSIONAL_SERVICES'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'DIRECT_API',
    verificationRequirement: 'POSTAL_CARD',
    automationPermission: 'AUTOMATION_PERMITTED',
    fees: { feeType: 'FREE', amount: 0, currency: 'INR', billingInterval: 'NONE', disclosure: 'Free official Google listing' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://business.google.com',
    apiPartnerContractVerified: true,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'justdial-in',
    name: 'Justdial',
    domain: 'justdial.com',
    region: 'IN',
    relevantVerticals: ['GENERAL_LOCAL', 'HOME_SERVICES', 'HEALTHCARE', 'RETAIL_DINING', 'PROFESSIONAL_SERVICES'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'MANUAL_PORTAL',
    verificationRequirement: 'PHONE_OTP',
    automationPermission: 'MANUAL_ONLY',
    fees: { feeType: 'FREE', amount: 0, currency: 'INR', billingInterval: 'NONE', disclosure: 'Free basic listing available; paid sponsor placements optional' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://www.justdial.com/Free-Listing',
    apiPartnerContractVerified: false,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'indiamart-in',
    name: 'IndiaMART',
    domain: 'indiamart.com',
    region: 'IN',
    relevantVerticals: ['B2B_COMMERCIAL', 'HOME_SERVICES', 'PROFESSIONAL_SERVICES'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'MANUAL_PORTAL',
    verificationRequirement: 'PHONE_OTP',
    automationPermission: 'MANUAL_ONLY',
    fees: { feeType: 'FREE', amount: 0, currency: 'INR', billingInterval: 'NONE', disclosure: 'Free seller registration; optional paid catalog upgrades' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://seller.indiamart.com',
    apiPartnerContractVerified: false,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'sulekha-in',
    name: 'Sulekha',
    domain: 'sulekha.com',
    region: 'IN',
    relevantVerticals: ['HOME_SERVICES', 'PROFESSIONAL_SERVICES', 'HEALTHCARE'],
    authorityTier: 'TIER_2_INDUSTRY',
    submissionMethod: 'MANUAL_PORTAL',
    verificationRequirement: 'PHONE_OTP',
    automationPermission: 'MANUAL_ONLY',
    fees: { feeType: 'FREE', amount: 0, currency: 'INR', billingInterval: 'NONE', disclosure: 'Free business listing' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://business.sulekha.com',
    apiPartnerContractVerified: false,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'tradeindia-in',
    name: 'TradeIndia',
    domain: 'tradeindia.com',
    region: 'IN',
    relevantVerticals: ['B2B_COMMERCIAL', 'PROFESSIONAL_SERVICES'],
    authorityTier: 'TIER_2_INDUSTRY',
    submissionMethod: 'MANUAL_PORTAL',
    verificationRequirement: 'PHONE_OTP',
    automationPermission: 'MANUAL_ONLY',
    fees: { feeType: 'FREE', amount: 0, currency: 'INR', billingInterval: 'NONE', disclosure: 'Free supplier profile' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://www.tradeindia.com/join_now.html',
    apiPartnerContractVerified: false,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },

  // --- US & GLOBAL ---
  {
    id: 'gbp-us',
    name: 'Google Business Profile (US)',
    domain: 'google.com/business',
    region: 'US',
    relevantVerticals: ['GENERAL_LOCAL', 'HOME_SERVICES', 'HEALTHCARE', 'B2B_COMMERCIAL', 'RETAIL_DINING', 'PROFESSIONAL_SERVICES'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'DIRECT_API',
    verificationRequirement: 'POSTAL_CARD',
    automationPermission: 'AUTOMATION_PERMITTED',
    fees: { feeType: 'FREE', amount: 0, currency: 'USD', billingInterval: 'NONE', disclosure: 'Free official Google listing' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://business.google.com',
    apiPartnerContractVerified: true,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'yelp-us',
    name: 'Yelp for Business',
    domain: 'biz.yelp.com',
    region: 'US',
    relevantVerticals: ['GENERAL_LOCAL', 'HOME_SERVICES', 'RETAIL_DINING', 'HEALTHCARE'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'CLAIM_LINK',
    verificationRequirement: 'PHONE_OTP',
    automationPermission: 'MANUAL_ONLY',
    fees: { feeType: 'FREE', amount: 0, currency: 'USD', billingInterval: 'NONE', disclosure: 'Free business page; advertising optional' },
    requiresOwnerOtp: true,
    portalLoginUrl: 'https://biz.yelp.com/signup_business',
    apiPartnerContractVerified: false,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'apple-maps-global',
    name: 'Apple Business Connect',
    domain: 'businessconnect.apple.com',
    region: 'GLOBAL',
    relevantVerticals: ['GENERAL_LOCAL', 'HOME_SERVICES', 'RETAIL_DINING', 'HEALTHCARE'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'PARTNER_FEED',
    verificationRequirement: 'DOCUMENT_UPLOAD',
    automationPermission: 'PARTNER_AUTHORIZED_ONLY',
    fees: { feeType: 'FREE', amount: 0, currency: 'USD', billingInterval: 'NONE', disclosure: 'Free Apple Maps business listing' },
    requiresOwnerOtp: false,
    portalLoginUrl: 'https://businessconnect.apple.com',
    apiPartnerContractVerified: true,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'bing-places-global',
    name: 'Bing Places for Business',
    domain: 'bingplaces.com',
    region: 'GLOBAL',
    relevantVerticals: ['GENERAL_LOCAL', 'HOME_SERVICES', 'RETAIL_DINING', 'B2B_COMMERCIAL'],
    authorityTier: 'TIER_1_CORE',
    submissionMethod: 'DIRECT_API',
    verificationRequirement: 'BUSINESS_EMAIL',
    automationPermission: 'AUTOMATION_PERMITTED',
    fees: { feeType: 'FREE', amount: 0, currency: 'USD', billingInterval: 'NONE', disclosure: 'Free Microsoft Bing local listing' },
    requiresOwnerOtp: false,
    portalLoginUrl: 'https://www.bingplaces.com',
    apiPartnerContractVerified: true,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'bbb-us',
    name: 'Better Business Bureau (BBB)',
    domain: 'bbb.org',
    region: 'US',
    relevantVerticals: ['HOME_SERVICES', 'PROFESSIONAL_SERVICES', 'B2B_COMMERCIAL'],
    authorityTier: 'TIER_2_INDUSTRY',
    submissionMethod: 'MANUAL_PORTAL',
    verificationRequirement: 'DOCUMENT_UPLOAD',
    automationPermission: 'MANUAL_ONLY',
    fees: { feeType: 'PAID_SUBSCRIPTION', amount: 495, currency: 'USD', billingInterval: 'ANNUAL', disclosure: 'Accreditation requires annual membership dues; basic directory listing is free upon request' },
    requiresOwnerOtp: false,
    portalLoginUrl: 'https://www.bbb.org/get-accredited',
    apiPartnerContractVerified: false,
    lastPolicyVerifiedAt: '2026-10-15T00:00:00Z',
  },
];

export class CitationCatalogService {
  private catalog: DirectoryCatalogItem[];

  constructor(customCatalog?: DirectoryCatalogItem[]) {
    this.catalog = customCatalog || CURATED_DIRECTORY_CATALOG;
  }

  /**
   * Retrieves relevant curated directories for a given country and vertical
   */
  public getDirectories(params: {
    country: DirectoryRegion;
    vertical?: DirectoryVertical;
  }): DirectoryCatalogItem[] {
    return this.catalog.filter((dir) => {
      const regionMatch = dir.region === params.country || dir.region === 'GLOBAL';
      if (!regionMatch) return false;

      if (params.vertical) {
        return dir.relevantVerticals.includes(params.vertical) || dir.relevantVerticals.includes('GENERAL_LOCAL');
      }
      return true;
    });
  }

  /**
   * Evaluates the appropriate submission workflow strategy for a directory
   */
  public evaluateSubmissionStrategy(directoryId: string): {
    strategy: 'AUTOMATED_API_DISPATCH' | 'PARTNER_DATA_FEED' | 'OWNER_TASK_REQUIRED';
    reason: string;
    actionableUrl?: string;
    feeDisclosure: string;
    requiresOwnerOtp: boolean;
  } {
    const dir = this.catalog.find((d) => d.id === directoryId);
    if (!dir) {
      throw new ValidationFailedError(`Directory '${directoryId}' not found in catalog.`);
    }

    if (dir.automationPermission === 'AUTOMATION_PERMITTED' && dir.apiPartnerContractVerified) {
      return {
        strategy: 'AUTOMATED_API_DISPATCH',
        reason: 'Authorized direct API integration verified with active partner contract.',
        feeDisclosure: dir.fees.disclosure,
        requiresOwnerOtp: dir.requiresOwnerOtp,
      };
    }

    if (dir.automationPermission === 'PARTNER_AUTHORIZED_ONLY' && dir.apiPartnerContractVerified) {
      return {
        strategy: 'PARTNER_DATA_FEED',
        reason: 'Bulk verified partner data feed active for this network.',
        feeDisclosure: dir.fees.disclosure,
        requiresOwnerOtp: dir.requiresOwnerOtp,
      };
    }

    return {
      strategy: 'OWNER_TASK_REQUIRED',
      reason:
        dir.automationPermission === 'MANUAL_ONLY'
          ? 'Directory terms require manual business-owner verification or OTP. Automated bot submission is strictly prohibited.'
          : 'No active authorized API partner contract available.',
      actionableUrl: dir.portalLoginUrl,
      feeDisclosure: dir.fees.disclosure,
      requiresOwnerOtp: dir.requiresOwnerOtp,
    };
  }
}
