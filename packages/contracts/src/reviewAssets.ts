export interface NeutralInvitationTemplates {
  receipt: string;
  email: string;
  sms: string;
  printableSign: string;
}

export interface ReviewLinkAsset {
  locationId: string;
  placeId: string;
  directGoogleReviewUrl: string;
  isPlaceIdVerified: boolean;
  qrAssetSvg: string;
  qrEncodedUrl: string;
  neutralInvitationCopyTemplates: NeutralInvitationTemplates;
  complianceChecks: {
    antiGatingCompliant: boolean;
    noIncentivesCompliant: boolean;
    noRatingDemandsCompliant: boolean;
    noInternalIdsLeaked: boolean;
  };
}
