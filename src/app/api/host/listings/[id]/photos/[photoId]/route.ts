import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { id, photoId } = await params;
    const hostProfile = await db.hostProfile.findUnique({ where: { userId: user.id } });
    const listing = await db.listing.findUnique({ where: { id }, select: { hostId: true } });
    if (!listing) return NextResponse.json({ code: "not_found" }, { status: 404 });
    if (listing.hostId !== hostProfile?.id && user.role !== "ADMIN")
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    await db.listingPhoto.delete({ where: { id: photoId, listingId: id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
