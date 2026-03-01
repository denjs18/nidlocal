import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { id } = await params;
    const host = await db.hostProfile.findUnique({ where: { userId: user.id } });

    const booking = await db.booking.findUnique({
      where: { id },
      include: { listing: { select: { hostId: true } }, payment: true },
    });

    if (!booking) return NextResponse.json({ code: "not_found" }, { status: 404 });
    if (booking.listing.hostId !== host?.id && user.role !== "ADMIN")
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    if (booking.status !== "PENDING_REQUEST")
      return NextResponse.json({ code: "already_confirmed", message: "Cette réservation n'est pas en attente." }, { status: 409 });

    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });

      // Capture payment if authorized
      if (booking.payment?.status === "AUTHORIZED" && booking.payment.providerRef) {
        const { stripeCaptureIntent } = await import("@/lib/payment/providers/stripe");
        await stripeCaptureIntent(booking.payment.providerRef);
        await tx.payment.update({
          where: { bookingId: id },
          data: { status: "CAPTURED", capturedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ data: { status: "CONFIRMED" } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    console.error("[host/bookings/confirm]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
