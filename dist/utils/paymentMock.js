import { randomBytes } from 'crypto';
import { STAMP_AMOUNT_FCFA } from '../config/constants.js';
export async function processStampPayment(provider) {
    // Simulate external payment processing delay
    await new Promise((res) => setTimeout(res, 500));
    return {
        success: true,
        provider,
        amount: STAMP_AMOUNT_FCFA,
        transactionId: `TX-${randomBytes(4).toString('hex')}`,
    };
}
