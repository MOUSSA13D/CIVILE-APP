export const ROLES = ['parent', 'mairie', 'hopital'] as const;
export type Role = typeof ROLES[number];

export const DECLARATION_STATUS = [
  'pending',
  'in_verification',
  'validated',
  'rejected',
] as const;
export type DeclarationStatus = typeof DECLARATION_STATUS[number];

export const STAMP_AMOUNT_FCFA = 500;

export const PAYMENT_PROVIDERS = ['wave', 'orange_money'] as const;
export type PaymentProvider = typeof PAYMENT_PROVIDERS[number];
