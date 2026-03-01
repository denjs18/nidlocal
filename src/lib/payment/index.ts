// Couche d'abstraction PSP — Stripe par défaut

export interface CreateIntentResult {
  clientSecret: string;
  intentId: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
}

/**
 * Crée un Payment Intent pour le montant donné (en centimes).
 */
export async function createPaymentIntent(
  amountCents: number,
  metadata: Record<string, string>
): Promise<CreateIntentResult> {
  const { stripeCreateIntent } = await import("./providers/stripe");
  return stripeCreateIntent(amountCents, metadata);
}

/**
 * Annule/rembourse un paiement.
 */
export async function refundPayment(
  intentId: string,
  amountCents?: number
): Promise<RefundResult> {
  const { stripeRefund } = await import("./providers/stripe");
  return stripeRefund(intentId, amountCents);
}

/**
 * Calcule la commission et le montant net hôte.
 */
export function calcPayout(
  nightsAmount: number,
  cleaningFee: number,
  commissionRate: number
): { net: number; commission: number } {
  const base = nightsAmount + cleaningFee;
  const commission = Math.round(base * commissionRate);
  return { net: base - commission, commission };
}
