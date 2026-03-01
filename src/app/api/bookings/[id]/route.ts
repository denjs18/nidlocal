import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            checkInTime: true,
            checkOutTime: true,
            cancellationPolicy: true,
            allowsInstantBook: true,
            photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
            host: { select: { displayName: true, avatar: true } },
          },
        },
        guest: { include: { user: { select: { id: true, name: true, email: true } } } },
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ code: "not_found" }, { status: 404 });
    }

    if (booking.guest.user.id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: booking });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
