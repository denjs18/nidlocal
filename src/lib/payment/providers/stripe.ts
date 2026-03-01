import Stripe from "stripe";
import type { CreateIntentResult, RefundResult } from "../index";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

export async function stripeCreateIntent(
  amountCents: number,
  metadata: Record<string, string>
): Promise<CreateIntentResult> {
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "eur",
    metadata,
    payment_method_types: ["card"],
    capture_method: "manual", // Autorisation + capture séparée
  });

  return {
    clientSecret: intent.client_secret!,
    intentId: intent.id,
  };
}

export async function stripeCaptureIntent(intentId: string): Promise<void> {
  await stripe.paymentIntents.capture(intentId);
}

export async function stripeRefund(
  intentId: string,
  amountCents?: number
): Promise<RefundResult> {
  const refund = await stripe.refunds.create({
    payment_intent: intentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });

  return {
    refundId: refund.id,
    amount: refund.amount,
  };
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
