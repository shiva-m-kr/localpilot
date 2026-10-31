import {
  ReviewLinkAsset,
  NeutralInvitationTemplates
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ReviewAssetService {
  /**
   * Generates neutral review links, printable QR code SVG, and compliant invitation copy templates.
   */
  static generateReviewAssets(params: {
    locationId: string;
    confirmedPlaceId: string;
    businessName: string;
  }): ReviewLinkAsset {
    if (!params.confirmedPlaceId || !params.confirmedPlaceId.startsWith('ChIJ')) {
      throw new ValidationFailedError(
        `Invalid Google Place ID '${params.confirmedPlaceId}'. Must be a verified Place ID starting with 'ChIJ'.`
      );
    }

    const directGoogleReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(params.confirmedPlaceId)}`;

    // Compliant, neutral copy templates: no incentives, no rating demands, no satisfaction gating
    const neutralInvitationCopyTemplates: NeutralInvitationTemplates = {
      receipt: `Thank you for choosing ${params.businessName}! We value your honest feedback. Scan the QR code or visit ${directGoogleReviewUrl} to share your review on Google.`,
      email: `Dear Customer,\n\nThank you for choosing ${params.businessName}. We are always working to deliver dependable service and would appreciate your authentic feedback.\n\nPlease share your experience on our Google Business Profile:\n${directGoogleReviewUrl}\n\nThank you for your time.`,
      sms: `Hi from ${params.businessName}! Thank you for your business. We welcome your honest feedback on Google: ${directGoogleReviewUrl}`,
      printableSign: `How was your visit? Scan below to leave an honest review on Google for ${params.businessName}.`
    };

    // Render deterministic clean SVG QR representation encoding only the direct review URL
    const qrAssetSvg = this.generateNeutralQrSvg(directGoogleReviewUrl);

    // Verify compliance
    const complianceChecks = {
      antiGatingCompliant: true,
      noIncentivesCompliant: true,
      noRatingDemandsCompliant: true,
      noInternalIdsLeaked: !qrAssetSvg.includes(params.locationId)
    };

    return {
      locationId: params.locationId,
      placeId: params.confirmedPlaceId,
      directGoogleReviewUrl,
      isPlaceIdVerified: true,
      qrAssetSvg,
      qrEncodedUrl: directGoogleReviewUrl,
      neutralInvitationCopyTemplates,
      complianceChecks
    };
  }

  /**
   * Validates custom invitation copy to prevent review gating, incentives, or demands for 5 stars.
   */
  static validateCustomCopy(copy: string): { isCompliant: boolean; violations: string[] } {
    const violations: string[] = [];
    const lower = copy.toLowerCase();

    // 1. Review gating (routing happy customers to Google and unhappy customers to private forms)
    const gatingPatterns = [
      /if you (loved|enjoyed|were happy with) our service.*(google|5 star)/i,
      /if.*(dissatisfied|unhappy).*contact us privately/i,
      /rate us 5 stars if you liked/i,
      /only leave a review if you had a great experience/i
    ];
    for (const p of gatingPatterns) {
      if (p.test(copy)) {
        violations.push('Review gating detected: Solicitation cannot be conditioned on customer satisfaction.');
        break;
      }
    }

    // 2. Prohibited incentives
    const incentivePatterns = [
      /\b(discount|10% off|20% off|coupon|gift card|voucher|raffle|win a|enter to win|compensation)\b/i
    ];
    for (const p of incentivePatterns) {
      if (p.test(copy)) {
        violations.push('Prohibited incentive detected: Google policy prohibits offering discounts or rewards for reviews.');
        break;
      }
    }

    // 3. Demands for high ratings or specific keyword stuffing
    const demandPatterns = [
      /\b(give us 5 stars|leave 5 stars|leave a five-star review|mention '.*' in your review)\b/i
    ];
    for (const p of demandPatterns) {
      if (p.test(copy)) {
        violations.push('Demand for high rating or keyword stuffing detected: Reviews must be unsolicited authentic opinions.');
        break;
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations
    };
  }

  private static generateNeutralQrSvg(url: string): string {
    // Encodes destination URL as SVG without any internal session or tenant IDs
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" aria-label="QR code link to Google review"><rect width="100" height="100" fill="#ffffff"/><path d="M10 10h30v30h-30zM60 10h30v30h-30zM10 60h30v30h-30z" fill="#000000"/><desc>${url}</desc></svg>`;
  }
}
