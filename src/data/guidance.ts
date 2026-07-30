import { GuidanceCard, Milestone } from '@/types/domain';

const reviewedAt = '2026-07-18';
export const guidanceByMilestone: Record<Milestone, GuidanceCard> = {
  filed:{statusKey:'filed',version:1,changed:'Your application was received and assigned a receipt number.',meaning:'USCIS has accepted the filing into its system. This does not mean it has been approved.',nextSteps:['Save the receipt notice in a safe place.','Confirm the mailing address is correct.','Watch for a biometrics or other appointment notice.'],officialUrl:'https://www.uscis.gov/tools',reviewedAt},
  biometrics:{statusKey:'biometrics',version:1,changed:'USCIS recorded a biometrics-related update.',meaning:'Fingerprints, a photograph, or a signature may be required or may have been reused.',nextSteps:['Read the mailed notice for the authoritative appointment details.','Bring the notice and accepted photo identification.','Use the official rescheduling process if attendance is impossible.'],officialUrl:'https://www.uscis.gov/forms/filing-guidance/preparing-for-your-biometric-services-appointment',reviewedAt},
  review:{statusKey:'review',version:1,changed:'Your case is under review.',meaning:'An officer may be reviewing the filing, but the public status does not reveal internal activity or timing.',nextSteps:['Keep contact information current.','Gather originals of submitted evidence.','Check official processing times before making an inquiry.'],officialUrl:'https://egov.uscis.gov/processing-times/',reviewedAt},
  evidence:{statusKey:'evidence',version:1,changed:'USCIS indicates that additional evidence may be needed.',meaning:'The mailed or online notice—not this app—contains the exact request and deadline.',nextSteps:['Open the official notice immediately.','List every requested item and deadline.','Consider qualified legal help if the request is unclear.'],officialUrl:'https://www.uscis.gov/tools/uscis-tools-and-resources',reviewedAt},
  interview:{statusKey:'interview',version:1,changed:'An interview-related update was posted.',meaning:'USCIS may have scheduled or changed an appointment. The official notice controls.',nextSteps:['Confirm date, time, and location on the notice.','Prepare required originals and translations.','Plan travel and accessibility needs early.'],officialUrl:'https://www.uscis.gov/about-us/find-a-uscis-office',reviewedAt},
  decision:{statusKey:'decision',version:1,changed:'USCIS posted a decision-related update.',meaning:'The status may reflect approval, denial, reopening, or transfer. Read the exact notice before acting.',nextSteps:['Download or retain the official notice.','Follow only the deadlines stated in the notice.','Seek qualified advice promptly for an adverse decision.'],officialUrl:'https://www.uscis.gov/tools',reviewedAt},
  delivery:{statusKey:'delivery',version:1,changed:'A document or card moved into production or delivery.',meaning:'USCIS may provide a tracking number after the item is mailed.',nextSteps:['Confirm your mailing address.','Use official carrier tracking when available.','Follow USCIS instructions if the document does not arrive.'],officialUrl:'https://www.uscis.gov/forms/filing-guidance/how-to-track-delivery-of-your-notice-or-secure-identity-document-or-card',reviewedAt}
};

export function inferMilestone(status: string): Milestone {
  const s=status.toLowerCase();
  if (/card|document.*mailed|delivered|produced/.test(s)) return 'delivery';
  if (/approved|denied|decision|closed/.test(s)) return 'decision';
  if (/interview|oath|ceremony/.test(s)) return 'interview';
  if (/evidence|rfe|request for/.test(s)) return 'evidence';
  if (/fingerprint|biometric/.test(s)) return 'biometrics';
  if (/review|transferred|office/.test(s)) return 'review';
  return 'filed';
}
