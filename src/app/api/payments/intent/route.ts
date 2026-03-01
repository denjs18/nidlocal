import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { createPaymentIntent } from "@/lib/payment";

const schema = z.object({ bookingId: z.string().cuid() });

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: "validation_error" }, { status: 422 });
    }

    const booking = await db.booking.findUnique({
      where: { id: parsed.data.bookingId },
      include: {
        guest: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ code: "not_found" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est bien le voyageur
    if (booking.guest.userId !== user.id) {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }

    if (booking.payment?.status === "CAPTURED") {
      return NextResponse.json({ code: "already_paid" }, { status: 409 });
    }

    const { clientSecret, intentId } = await createPaymentIntent(
      booking.totalAmount,
      { bookingId: booking.id, listingId: booking.listingId }
    );

    // Créer ou mettre à jour le paiement
    await db.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        providerRef: intentId,
        status: "AUTHORIZED",
      },
      update: {
        providerRef: intentId,
        status: "AUTHORIZED",
      },
    });

    return NextResponse.json({ data: { clientSecret } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[payments/intent]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
