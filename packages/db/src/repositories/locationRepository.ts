import { Location, NewLocation } from '../schema/locations.js';
import { Business } from '../schema/businesses.js';

export interface PublicLocationProfile {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  countryCode: string;
  timezone: string;
  language: string;
  currency: string;
  addressVisibility: string;
  // If addressVisibility is not PUBLIC, streetAddress is redacted to null
  streetAddress: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude: string | null;
  longitude: string | null;
  publicPhone: string;
  publicEmail: string | null;
  bookingUrl: string | null;
}

export class LocationRepository {
  /**
   * Enforces cross-organization foreign key isolation.
   * Throws an error if a business does not belong to the given organization.
   */
  static validateTenantAssociation(organizationId: string, business: Business): void {
    if (business.organizationId !== organizationId) {
      throw new Error(
        `Cross-organization violation: Business ${business.id} belongs to organization ${business.organizationId}, not ${organizationId}`
      );
    }
  }

  /**
   * Projects a database Location entity into a safe public profile.
   * Strictly enforces residential privacy: if addressVisibility !== 'PUBLIC',
   * the street address is hidden/redacted and private contact details are excluded.
   */
  static toPublicProfile(location: Location): PublicLocationProfile {
    const isPublic = location.addressVisibility === 'PUBLIC';

    return {
      id: location.id,
      organizationId: location.organizationId,
      businessId: location.businessId,
      name: location.name,
      countryCode: location.countryCode,
      timezone: location.timezone,
      language: location.language,
      currency: location.currency,
      addressVisibility: location.addressVisibility,
      streetAddress: isPublic ? location.streetAddress : null, // Redacted for residential/SAB businesses
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      latitude: location.latitude,
      longitude: location.longitude,
      publicPhone: location.publicPhone,
      publicEmail: location.publicEmail,
      bookingUrl: location.bookingUrl
    };
  }
}
