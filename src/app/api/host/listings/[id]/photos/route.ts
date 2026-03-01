import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";
import { uploadFile, generateFilename } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { id } = await params;
    const hostProfile = await db.hostProfile.findUnique({ where: { userId: user.id } });
    const listing = await db.listing.findUnique({ where: { id }, select: { id: true, hostId: true } });
    if (!listing) return NextResponse.json({ code: "not_found" }, { status: 404 });
    if (listing.hostId !== hostProfile?.id && user.role !== "ADMIN")
      return NextResponse.json({ code: "forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ code: "no_file" }, { status: 422 });

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) return NextResponse.json({ code: "file_too_large" }, { status: 422 });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(file.type)) return NextResponse.json({ code: "invalid_type" }, { status: 422 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateFilename(file.name, "listing");
    const { url } = await uploadFile(buffer, filename, file.type, `listings/${id}`);

    const lastPhoto = await db.listingPhoto.findFirst({
      where: { listingId: id }, orderBy: { position: "desc" },
    });
    const position = (lastPhoto?.position ?? -1) + 1;

    const photo = await db.listingPhoto.create({
      data: { listingId: id, url, position },
    });
    return NextResponse.json({ data: photo }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    console.error("[photos/upload]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
