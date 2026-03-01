import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";

const createSchema = z.object({
  streetAddress: z.string().min(5),
  addressComplement: z.string().optional(),
  city: z.string().min(2),
  postalCode: z.string().regex(/^\d{5}$/),
  inseeCode: z.string().regex(/^\d{5}$/),
  listingType: z.enum(["APARTMENT", "HOUSE", "PRIVATE_ROOM", "SHARED_ROOM", "OTHER"]),
  residenceStatus: z.enum(["PRIMARY", "SECONDARY", "PROFESSIONAL"]),
  title: z.string().min(10).max(100),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");

    const hostProfile = await db.hostProfile.findUnique({ where: { userId: user.id } });
    if (!hostProfile) {
      return NextResponse.json({ data: [] });
    }

    const listings = await db.listing.findMany({
      where: { hostId: hostProfile.id },
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        nightCounter: true,
        commune: { include: { localRules: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: listings });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ code: err.message.toLowerCase() }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");

    const hostProfile = await db.hostProfile.findUnique({ where: { userId: user.id } });
    if (!hostProfile) {
      return NextResponse.json({ code: "forbidden", message: "Profil hôte requis" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { inseeCode, ...data } = parsed.data;

    // Trouver ou créer la commune
    const commune = await db.commune.findUnique({ where: { inseeCode } });
    if (!commune) {
      return NextResponse.json(
        { code: "validation_error", message: "Commune introuvable (code INSEE invalide)" },
        { status: 422 }
      );
    }

    const listing = await db.listing.create({
      data: {
        ...data,
        hostId: hostProfile.id,
        communeId: commune.id,
        status: "DRAFT",
        pricePerNight: 0,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        maxGuests: 1,
        description: "",
      },
      select: { id: true, status: true, title: true },
    });

    return NextResponse.json({ data: listing }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ code: err.message.toLowerCase() }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    console.error("[host/listings/create]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
