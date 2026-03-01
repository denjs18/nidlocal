import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");

    const host = await db.hostProfile.findUnique({ where: { userId: user.id } });
    if (!host) return NextResponse.json({ data: [] });

    const bookings = await db.booking.findMany({
      where: {
        listing: { hostId: host.id },
        ...(status ? { status: status as never } : {}),
      },
      include: {
        listing: { select: { id: true, title: true, city: true, photos: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
        guest: { include: { user: { select: { name: true, email: true } } } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { checkIn: "desc" },
    });

    return NextResponse.json({ data: bookings });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
