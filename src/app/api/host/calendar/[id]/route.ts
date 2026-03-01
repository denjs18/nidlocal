import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { id } = await params;
    const host = await db.hostProfile.findUnique({ where: { userId: user.id } });
    const blocked = await db.blockedDate.findUnique({ where: { id }, include: { listing: { select: { hostId: true } } } });
    if (!blocked) return NextResponse.json({ code: "not_found" }, { status: 404 });
    if (blocked.listing.hostId !== host?.id && user.role !== "ADMIN")
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    await db.blockedDate.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
