import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

const blockSchema = z.object({
  listingId: z.string().cuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { searchParams } = req.nextUrl;
    const listingId = searchParams.get("listingId");
    const host = await db.hostProfile.findUnique({ where: { userId: user.id } });

    const blocked = await db.blockedDate.findMany({
      where: {
        ...(listingId ? { listingId } : { listing: { hostId: host?.id } }),
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ data: blocked });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const body = await req.json();
    const parsed = blockSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ code: "validation_error" }, { status: 422 });

    const host = await db.hostProfile.findUnique({ where: { userId: user.id } });
    const listing = await db.listing.findUnique({ where: { id: parsed.data.listingId }, select: { hostId: true } });
    if (!listing) return NextResponse.json({ code: "not_found" }, { status: 404 });
    if (listing.hostId !== host?.id && user.role !== "ADMIN")
      return NextResponse.json({ code: "forbidden" }, { status: 403 });

    const created = await db.$transaction(
      parsed.data.dates.map((d) =>
        db.blockedDate.upsert({
          where: { listingId_date: { listingId: parsed.data.listingId, date: new Date(d) } },
          create: { listingId: parsed.data.listingId, date: new Date(d), reason: parsed.data.reason },
          update: { reason: parsed.data.reason },
        })
      )
    );
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
