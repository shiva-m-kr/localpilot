import {
  SitePublicFacts,
  DiscoveredDirectoryListing,
  CitationListingMatchResult,
  FieldMismatchDetail,
  NapMatchConfidence,
  OverallNapStatus,
} from '@localpilot/contracts';

export class CitationNapService {
  /**
   * Compares a discovered live directory listing against confirmed business facts
   */
  public compareListing(
    locationId: string,
    confirmedFacts: SitePublicFacts,
    discovered: DiscoveredDirectoryListing
  ): CitationListingMatchResult {
    const isSAB = confirmedFacts.isSAB || confirmedFacts.hasHiddenAddress;
    const comparisons: FieldMismatchDetail[] = [];

    // 1. Name Comparison
    const nameDiff = this.compareNames(confirmedFacts.businessName, discovered.observedName);
    comparisons.push(nameDiff);

    // 2. Phone Comparison
    const phoneDiff = this.comparePhones(confirmedFacts.phone, discovered.observedPhone);
    comparisons.push(phoneDiff);

    // 3. Address Comparison (with SAB privacy guard)
    const addressDiff = this.compareAddresses(confirmedFacts, discovered.observedAddress, discovered.observedCity);
    comparisons.push(addressDiff);

    // 4. Website Comparison
    const websiteDiff = this.compareWebsites(confirmedFacts.websiteUrl, discovered.observedWebsite);
    comparisons.push(websiteDiff);

    // 5. Match Confidence & Ambiguity
    let matchConfidence: NapMatchConfidence = 'HIGH_CONFIDENCE_MATCH';
    if (nameDiff.status === 'CRITICAL_MISMATCH' || phoneDiff.status === 'CRITICAL_MISMATCH') {
      // If phone matches but name has notable variation, or vice-versa
      if (phoneDiff.status === 'EXACT_MATCH' || phoneDiff.status === 'FORMATTING_VARIATION') {
        matchConfidence = 'AMBIGUOUS_MATCH_REQUIRES_OWNER_CONFIRMATION';
      } else {
        matchConfidence = 'NO_MATCH_FOUND';
      }
    }

    // 6. Overall NAP Status
    let overallNapStatus: OverallNapStatus = 'CONSISTENT';
    const hasCritical = comparisons.some((c) => c.status === 'CRITICAL_MISMATCH');
    const hasFormatting = comparisons.some((c) => c.status === 'FORMATTING_VARIATION');

    if (matchConfidence === 'AMBIGUOUS_MATCH_REQUIRES_OWNER_CONFIRMATION') {
      overallNapStatus = 'PENDING_OWNER_CONFIRMATION';
    } else if (hasCritical) {
      overallNapStatus = 'CRITICAL_NAP_CONFLICT';
    } else if (hasFormatting) {
      overallNapStatus = 'NEEDS_UPDATE';
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `cit-${Date.now()}`,
      locationId: locationId as any,
      directoryId: discovered.directoryId,
      directoryName: discovered.directoryName,
      listingUrl: discovered.listingUrl,
      matchConfidence,
      isOwnedAndVerified: false, // Discovered listing is not automatically counted as owned
      overallNapStatus,
      fieldComparisons: comparisons,
      isSABProtected: isSAB,
      observedAt: new Date().toISOString(),
    };
  }

  private compareNames(confirmed: string, observed: string): FieldMismatchDetail {
    if (confirmed.trim().toLowerCase() === observed.trim().toLowerCase()) {
      return {
        field: 'NAME',
        status: 'EXACT_MATCH',
        confirmedValue: confirmed,
        observedValue: observed,
        isCosmetic: false,
        differenceExplanation: 'Business names match exactly.',
      };
    }

    const normConfirmed = this.normalizeBusinessName(confirmed);
    const normObserved = this.normalizeBusinessName(observed);

    if (normConfirmed === normObserved) {
      return {
        field: 'NAME',
        status: 'FORMATTING_VARIATION',
        confirmedValue: confirmed,
        observedValue: observed,
        isCosmetic: true,
        differenceExplanation: 'Harmless legal suffix or punctuation variation (e.g. LLC / Pvt Ltd).',
      };
    }

    return {
      field: 'NAME',
      status: 'CRITICAL_MISMATCH',
      confirmedValue: confirmed,
      observedValue: observed,
      isCosmetic: false,
      differenceExplanation: `Business name mismatch: Confirmed '${confirmed}' differs from observed '${observed}'.`,
    };
  }

  private comparePhones(confirmedPhone: string, observedPhone?: string): FieldMismatchDetail {
    if (!observedPhone) {
      return {
        field: 'PHONE',
        status: 'MISSING_ON_DIRECTORY',
        confirmedValue: confirmedPhone,
        observedValue: '',
        isCosmetic: false,
        differenceExplanation: 'Phone number is missing on directory listing.',
      };
    }

    const cleanConfirmed = this.normalizePhoneDigits(confirmedPhone);
    const cleanObserved = this.normalizePhoneDigits(observedPhone);

    if (cleanConfirmed === cleanObserved) {
      if (confirmedPhone.trim() === observedPhone.trim()) {
        return {
          field: 'PHONE',
          status: 'EXACT_MATCH',
          confirmedValue: confirmedPhone,
          observedValue: observedPhone,
          isCosmetic: false,
          differenceExplanation: 'Phone numbers match exactly.',
        };
      }
      return {
        field: 'PHONE',
        status: 'FORMATTING_VARIATION',
        confirmedValue: confirmedPhone,
        observedValue: observedPhone,
        isCosmetic: true,
        differenceExplanation: 'Phone formatting difference (e.g. spaces/dashes/country code prefix). Digits match.',
      };
    }

    return {
      field: 'PHONE',
      status: 'CRITICAL_MISMATCH',
      confirmedValue: confirmedPhone,
      observedValue: observedPhone,
      isCosmetic: false,
      differenceExplanation: 'Critical phone number disagreement. Customers may call wrong number.',
    };
  }

  private compareAddresses(
    facts: SitePublicFacts,
    observedAddress?: string,
    observedCity?: string
  ): FieldMismatchDetail {
    if (facts.isSAB || facts.hasHiddenAddress) {
      // Service Area Business Address Privacy Guard
      return {
        field: 'ADDRESS',
        status: 'NOT_APPLICABLE_SAB_HIDDEN',
        confirmedValue: `[HIDDEN RESIDENTIAL ADDRESS] - Serving ${facts.city}`,
        observedValue: observedAddress ? `Serving ${observedCity || facts.city}` : 'No street address displayed',
        isCosmetic: false,
        differenceExplanation:
          'Service Area Business (SAB) address is intentionally hidden per Google/industry privacy guidelines. Street address is not required on directory.',
      };
    }

    if (!observedAddress) {
      return {
        field: 'ADDRESS',
        status: 'MISSING_ON_DIRECTORY',
        confirmedValue: facts.streetAddress || `${facts.city}, ${facts.stateOrRegion}`,
        observedValue: '',
        isCosmetic: false,
        differenceExplanation: 'Physical address missing on directory listing.',
      };
    }

    const normConfirmed = this.normalizeAddressString(facts.streetAddress || '');
    const normObserved = this.normalizeAddressString(observedAddress);

    if (normConfirmed === normObserved) {
      if (facts.streetAddress?.trim() === observedAddress.trim()) {
        return {
          field: 'ADDRESS',
          status: 'EXACT_MATCH',
          confirmedValue: facts.streetAddress || '',
          observedValue: observedAddress,
          isCosmetic: false,
          differenceExplanation: 'Addresses match exactly.',
        };
      }
      return {
        field: 'ADDRESS',
        status: 'FORMATTING_VARIATION',
        confirmedValue: facts.streetAddress || '',
        observedValue: observedAddress,
        isCosmetic: true,
        differenceExplanation: 'Harmless address abbreviation variation (e.g. "St" vs "Street", "Rd" vs "Road").',
      };
    }

    return {
      field: 'ADDRESS',
      status: 'CRITICAL_MISMATCH',
      confirmedValue: facts.streetAddress || '',
      observedValue: observedAddress,
      isCosmetic: false,
      differenceExplanation: 'Physical street address mismatch between confirmed records and directory listing.',
    };
  }

  private compareWebsites(confirmedUrl?: string, observedUrl?: string): FieldMismatchDetail {
    if (!confirmedUrl && !observedUrl) {
      return {
        field: 'WEBSITE',
        status: 'EXACT_MATCH',
        confirmedValue: '',
        observedValue: '',
        isCosmetic: false,
        differenceExplanation: 'No website URL specified.',
      };
    }

    if (!observedUrl) {
      return {
        field: 'WEBSITE',
        status: 'MISSING_ON_DIRECTORY',
        confirmedValue: confirmedUrl || '',
        observedValue: '',
        isCosmetic: false,
        differenceExplanation: 'Website link missing on directory listing.',
      };
    }

    const normConfirmed = this.normalizeUrl(confirmedUrl || '');
    const normObserved = this.normalizeUrl(observedUrl);

    if (normConfirmed === normObserved) {
      if (confirmedUrl === observedUrl) {
        return {
          field: 'WEBSITE',
          status: 'EXACT_MATCH',
          confirmedValue: confirmedUrl || '',
          observedValue: observedUrl,
          isCosmetic: false,
          differenceExplanation: 'Website URLs match exactly.',
        };
      }
      return {
        field: 'WEBSITE',
        status: 'FORMATTING_VARIATION',
        confirmedValue: confirmedUrl || '',
        observedValue: observedUrl,
        isCosmetic: true,
        differenceExplanation: 'Cosmetic URL variation (http vs https, www vs non-www, trailing slash).',
      };
    }

    return {
      field: 'WEBSITE',
      status: 'CRITICAL_MISMATCH',
      confirmedValue: confirmedUrl || '',
      observedValue: observedUrl,
      isCosmetic: false,
      differenceExplanation: 'Different website domains or landing page destinations.',
    };
  }

  private normalizeBusinessName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(llc|ltd|inc|incorporated|pvt|private|limited|corp|corporation)\b/gi, '')
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  }

  private normalizePhoneDigits(phone: string): string {
    // Keep only numeric digits
    let digits = phone.replace(/\D/g, '');
    // If starting with Indian country code 91 and 12 digits, strip country code to compare base 10 digits
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    } else if (digits.length === 11 && digits.startsWith('1')) {
      digits = digits.slice(1); // US country code 1
    }
    return digits;
  }

  private normalizeAddressString(addr: string): string {
    return addr
      .toLowerCase()
      .replace(/\bstreet\b/g, 'st')
      .replace(/\broad\b/g, 'rd')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\bfloor\b/g, 'fl')
      .replace(/\bblock\b/g, 'blk')
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  }

  private normalizeUrl(urlStr: string): string {
    try {
      let u = urlStr.trim().toLowerCase();
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = 'https://' + u;
      }
      const parsed = new URL(u);
      let host = parsed.hostname.replace(/^www\./, '');
      let path = parsed.pathname.replace(/\/$/, '');
      return `${host}${path}`;
    } catch {
      return urlStr.trim().toLowerCase();
    }
  }
}
