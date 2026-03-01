import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { constructWebhookEvent } from "@/lib/payment/providers/stripe";
import { incrementNightCounter } from "@/lib/compliance/rules";
import { calcPayout } from "@/lib/payment";

const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? "0.10");

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, sig);
  } catch (err) {
    console.error("[webhook] Signature invalide", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
    case "payment_intent.succeeded": {
      // Dans ces cases, event.data.object est bien un PaymentIntent
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata?.bookingId;
      if (!bookingId) break;

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { listing: { include: { host: true } } },
      });
      if (!booking) break;

      await db.$transaction(async (tx) => {
        await tx.payment.update({
          where: { bookingId },
          data: { status: "CAPTURED", capturedAt: new Date(), providerRef: intent.id },
        });

        if (booking.status === "PENDING_REQUEST") {
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED", confirmedAt: new Date() },
          });
        }

        const { net, commission } = calcPayout(
          booking.nightsAmount,
          booking.cleaningFee,
          COMMISSION_RATE
        );
        await tx.payout.create({
          data: {
            hostId: booking.listing.hostId,
            bookingId,
            amount: net,
            commissionRate: COMMISSION_RATE,
            commissionAmount: commission,
            status: "PENDING",
          },
        });
      });

      await incrementNightCounter(booking.listingId, booking.nights).catch(console.error);
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata?.bookingId;
      if (!bookingId) break;

      await db.payment.updateMany({
        where: { bookingId },
        data: { status: "FAILED" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
