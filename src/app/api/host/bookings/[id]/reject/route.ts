import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";
import { refundPayment } from "@/lib/payment";

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
    if (!["PENDING_REQUEST", "CONFIRMED"].includes(booking.status))
      return NextResponse.json({ code: "cannot_cancel" }, { status: 409 });

    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Refusé par l'hôte" },
      });
      if (booking.payment?.providerRef && ["AUTHORIZED", "CAPTURED"].includes(booking.payment.status)) {
        await refundPayment(booking.payment.providerRef);
        await tx.payment.update({ where: { bookingId: id }, data: { status: "REFUNDED" } });
      }
    });

    return NextResponse.json({ data: { status: "CANCELLED" } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
