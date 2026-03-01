import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { refundPayment } from "@/lib/payment";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        guest: { include: { user: { select: { id: true } } } },
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ code: "not_found" }, { status: 404 });
    }

    if (booking.guest.user.id !== user.id) {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }

    if (!["CONFIRMED", "PENDING_REQUEST"].includes(booking.status)) {
      return NextResponse.json(
        { code: "cannot_cancel", message: "Cette réservation ne peut plus être annulée." },
        { status: 409 }
      );
    }

    const hoursUntilCheckIn =
      (booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn < 24) {
      return NextResponse.json(
        { code: "cannot_cancel", message: "Annulation impossible moins de 24h avant l'arrivée." },
        { status: 409 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: "Annulé par le voyageur",
        },
      });

      if (booking.payment?.status === "CAPTURED" && booking.payment.providerRef) {
        await refundPayment(booking.payment.providerRef);
        await tx.payment.update({
          where: { bookingId: id },
          data: { status: "REFUNDED" },
        });
      }
    });

    return NextResponse.json({ data: { status: "CANCELLED" } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[bookings/cancel]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
