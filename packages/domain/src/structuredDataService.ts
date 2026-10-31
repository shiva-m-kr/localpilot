import {
  SitePublicFacts,
  SchemaBusinessSubtype,
  SchemaValidationIssue,
  GeneratedStructuredDataResult,
} from '@localpilot/contracts';

export class StructuredDataService {
  /**
   * Maps category names to the most specific valid Schema.org local business subtype
   */
  public mapCategoryToSubtype(category: string): SchemaBusinessSubtype {
    const normalized = category.toLowerCase().trim();
    if (normalized.includes('plumb')) return 'Plumber';
    if (normalized.includes('electr')) return 'Electrician';
    if (normalized.includes('hvac') || normalized.includes('air condition') || normalized.includes('heating')) return 'HVACBusiness';
    if (normalized.includes('dent')) return 'Dentist';
    if (normalized.includes('salon') || normalized.includes('barber') || normalized.includes('hair')) return 'HairSalon';
    if (normalized.includes('restaur') || normalized.includes('cafe') || normalized.includes('bakery')) return 'Restaurant';
    if (normalized.includes('auto') || normalized.includes('car repair') || normalized.includes('mechanic')) return 'AutoRepair';
    if (normalized.includes('clinic') || normalized.includes('doctor') || normalized.includes('medical')) return 'MedicalBusiness';
    if (normalized.includes('law') || normalized.includes('attorney') || normalized.includes('legal')) return 'LegalService';
    if (normalized.includes('contractor') || normalized.includes('roof') || normalized.includes('builder')) return 'GeneralContractor';
    if (normalized.includes('account') || normalized.includes('tax') || normalized.includes('cpa')) return 'AccountingService';
    return 'LocalBusiness';
  }

  /**
   * Generates Schema.org JSON-LD with strict compliance to Google guidelines and SAB privacy
   */
  public generateLocalBusinessJsonLd(
    canonicalBaseUrl: string,
    facts: SitePublicFacts,
    options?: {
      sameAsUrls?: string[];
      hasSelfServingReviews?: boolean;
    }
  ): GeneratedStructuredDataResult {
    const issues: SchemaValidationIssue[] = [];
    const schemaType = this.mapCategoryToSubtype(facts.category);
    const entityId = `${canonicalBaseUrl.replace(/\/$/, '')}/#localbusiness`;

    const isSAB = facts.isSAB || facts.hasHiddenAddress;

    // Address construction
    let addressObj: Record<string, any>;
    if (isSAB) {
      // Hidden address: strictly suppress streetAddress and lat/long
      addressObj = {
        '@type': 'PostalAddress',
        addressLocality: facts.city,
        addressRegion: facts.stateOrRegion,
        postalCode: facts.postalCode,
        addressCountry: facts.country || 'IN',
      };
    } else {
      addressObj = {
        '@type': 'PostalAddress',
        streetAddress: facts.streetAddress || '',
        addressLocality: facts.city,
        addressRegion: facts.stateOrRegion,
        postalCode: facts.postalCode,
        addressCountry: facts.country || 'IN',
      };
      if (!facts.streetAddress) {
        issues.push({
          severity: 'WARNING',
          field: 'streetAddress',
          message: 'Storefront business is missing confirmed street address.',
          guidelineReference: 'https://schema.org/PostalAddress',
        });
      }
    }

    // Opening hours specification
    const openingHoursSpecs = (facts.operatingHours || []).map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${this.capitalize(h.dayOfWeek)}`,
      opens: h.opens,
      closes: h.closes,
    }));

    // Area served
    const areaServed = (facts.serviceAreas || []).map((area) => ({
      '@type': 'AdministrativeArea',
      name: area,
    }));

    const schemaObject: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      '@id': entityId,
      name: facts.businessName,
      description: facts.tagline || `${facts.businessName} providing professional ${facts.category} services.`,
      url: canonicalBaseUrl,
      telephone: facts.phone,
      address: addressObj,
    };

    if (facts.email) {
      schemaObject.email = facts.email;
    }

    if (openingHoursSpecs.length > 0) {
      schemaObject.openingHoursSpecification = openingHoursSpecs;
    }

    if (areaServed.length > 0) {
      schemaObject.areaServed = areaServed;
    }

    // Coordinates: strictly omit for SAB
    if (!isSAB && facts.latitude !== undefined && facts.longitude !== undefined) {
      schemaObject.geo = {
        '@type': 'GeoCoordinates',
        latitude: facts.latitude,
        longitude: facts.longitude,
      };
    }

    if (options?.sameAsUrls && options.sameAsUrls.length > 0) {
      schemaObject.sameAs = options.sameAsUrls;
    }

    // Google Self-Serving Review Rich Snippet Policy Check
    let selfServingRatingExcluded = false;
    if (options?.hasSelfServingReviews) {
      selfServingRatingExcluded = true;
      issues.push({
        severity: 'INFO',
        field: 'aggregateRating',
        message:
          'Self-serving AggregateRating excluded from LocalBusiness markup per Google Search guidelines. Google ignores self-serving review markup for local business rich snippets.',
        guidelineReference: 'https://developers.google.com/search/docs/appearance/structured-data/review-snippet#self-serving-reviews',
      });
    }

    const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(schemaObject, null, 2)}\n</script>`;

    return {
      entityId,
      schemaType,
      jsonLdScript,
      schemaObject,
      validationIssues: issues,
      isSABAddressSuppressed: isSAB,
      selfServingRatingExcluded,
      marketingDisclaimer:
        'Structured data follows Schema.org and Google Search guidelines. Google Search algorithms determine rich result presentation independently; structured markup does not guarantee rich snippets or review stars.',
    };
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
}
