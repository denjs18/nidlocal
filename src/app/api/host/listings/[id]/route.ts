import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

const patchSchema = z.object({
  title: z.string().min(10).max(100).optional(),
  description: z.string().min(20).optional(),
  streetAddress: z.string().optional(),
  addressComplement: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  listingType: z.enum(["APARTMENT","HOUSE","PRIVATE_ROOM","SHARED_ROOM","OTHER"]).optional(),
  residenceStatus: z.enum(["PRIMARY","SECONDARY","PROFESSIONAL"]).optional(),
  bedrooms: z.number().int().min(0).optional(),
  beds: z.number().int().min(1).optional(),
  bathrooms: z.number().int().min(0).optional(),
  maxGuests: z.number().int().min(1).max(20).optional(),
  surfaceArea: z.number().optional(),
  pricePerNight: z.number().int().min(100).optional(),
  cleaningFee: z.number().int().min(0).optional(),
  minStay: z.number().int().min(1).optional(),
  maxStay: z.number().int().optional(),
  cancellationPolicy: z.enum(["FLEXIBLE","MODERATE","STRICT"]).optional(),
  allowsInstantBook: z.boolean().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  houseRules: z.string().optional(),
  hasEcoLabel: z.boolean().optional(),
  registrationNumber: z.string().optional(),
  hasRegistration: z.boolean().optional(),
  amenityIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");
    const { id } = await params;
    const hostProfile = await db.hostProfile.findUnique({ where: { userId: user.id } });
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { position: "asc" } },
        amenities: { include: { amenity: true } },
        commune: true,
      },
    });
    if (!listing) return NextResponse.json({ code: "not_found" }, { status: 404 });
    if (listing.hostId !== hostProfile?.id && user.role !== "ADMIN")
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    return NextResponse.json({ data: listing });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ code: "validation_error", details: parsed.error.flatten().fieldErrors }, { status: 422 });

    const { amenityIds, ...fields } = parsed.data;

    await db.$transaction(async (tx) => {
      await tx.listing.update({ where: { id }, data: fields });
      if (amenityIds !== undefined) {
        await tx.listingAmenity.deleteMany({ where: { listingId: id } });
        if (amenityIds.length > 0) {
          await tx.listingAmenity.createMany({
            data: amenityIds.map((amenityId) => ({ listingId: id, amenityId })),
          });
        }
      }
    });

    const updated = await db.listing.findUnique({
      where: { id },
      include: { photos: { orderBy: { position: "asc" } }, amenities: { include: { amenity: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    console.error("[host/listings/patch]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
