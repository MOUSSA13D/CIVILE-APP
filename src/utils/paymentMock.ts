import { randomBytes } from 'crypto';
import { PaymentProvider, STAMP_AMOUNT_FCFA } from '../config/constants.js';

export type PaymentResult = {
  success: boolean;
  provider: PaymentProvider;
  amount: number;
  transactionId: string;
};

export async function processStampPayment(provider: PaymentProvider): Promise<PaymentResult> {
  // Simulate external payment processing delay
  await new Promise((res) => setTimeout(res, 500));
  return {
    success: true,
    provider,
    amount: STAMP_AMOUNT_FCFA,
    transactionId: `TX-${randomBytes(4).toString('hex')}`,
  };
}
