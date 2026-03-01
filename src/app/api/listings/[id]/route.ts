import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const listing = await db.listing.findUnique({
    where: { id: params.id },
    include: {
      photos: { orderBy: { position: "asc" } },
      amenities: { include: { amenity: true } },
      host: {
        include: {
          user: { select: { name: true, createdAt: true } },
        },
      },
      commune: { include: { localRules: true } },
      nightCounter: true,
      reviews: {
        where: { isPublic: true },
        include: {
          guest: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!listing) {
    return NextResponse.json(
      { code: "not_found", message: "Logement introuvable" },
      { status: 404 }
    );
  }

  if (listing.status === "SUSPENDED") {
    return NextResponse.json(
      { code: "suspended", message: "Ce logement n'est plus disponible" },
      { status: 403 }
    );
  }

  if (listing.status !== "PUBLISHED") {
    return NextResponse.json(
      { code: "not_found", message: "Logement introuvable" },
      { status: 404 }
    );
  }

  const ratings = listing.reviews.map((r) => r.rating);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return NextResponse.json({
    data: {
      ...listing,
      averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
      totalReviews: ratings.length,
    },
  });
}
