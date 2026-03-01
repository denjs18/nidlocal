import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const destination = searchParams.get("destination");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = parseInt(searchParams.get("guests") ?? "1");
  const listingType = searchParams.get("listingType");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const hasEcoLabel = searchParams.get("hasEcoLabel") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where: Prisma.ListingWhereInput = {
    status: "PUBLISHED",
    maxGuests: { gte: guests },
    ...(listingType ? { listingType: listingType as Prisma.EnumListingTypeFilter } : {}),
    ...(minPrice ? { pricePerNight: { gte: parseInt(minPrice) * 100 } } : {}),
    ...(maxPrice ? { pricePerNight: { lte: parseInt(maxPrice) * 100 } } : {}),
    ...(hasEcoLabel ? { hasEcoLabel: true } : {}),
    // Recherche géographique basique par ville / département / région
    ...(destination
      ? {
          OR: [
            { city: { contains: destination, mode: "insensitive" } },
            { commune: { name: { contains: destination, mode: "insensitive" } } },
            { commune: { departmentName: { contains: destination, mode: "insensitive" } } },
            { commune: { region: { contains: destination, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // Exclure les dates réservées ou bloquées
  if (checkIn && checkOut) {
    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);
    where.blockedDates = {
      none: {
        date: { gte: ciDate, lt: coDate },
      },
    };
    where.bookings = {
      none: {
        status: { in: ["CONFIRMED", "PENDING_REQUEST"] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
      },
    };
  }

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        listingType: true,
        residenceStatus: true,
        city: true,
        latitude: true,
        longitude: true,
        pricePerNight: true,
        cleaningFee: true,
        maxGuests: true,
        bedrooms: true,
        beds: true,
        bathrooms: true,
        hasEcoLabel: true,
        complianceStatus: true,
        allowsInstantBook: true,
        cancellationPolicy: true,
        photos: { select: { url: true, caption: true }, orderBy: { position: "asc" }, take: 5 },
        host: { select: { displayName: true, avatar: true, isVerified: true } },
        reviews: { select: { rating: true } },
      },
    }),
    db.listing.count({ where }),
  ]);

  // Enrichir avec rating moyen
  const enriched = listings.map((l) => {
    const ratings = l.reviews.map((r) => r.rating);
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return {
      ...l,
      reviews: undefined,
      averageRating: avg ? Math.round(avg * 10) / 10 : null,
      totalReviews: ratings.length,
    };
  });

  // Bounds pour la carte
  const coords = enriched.filter((l) => l.latitude && l.longitude);
  const bounds =
    coords.length > 0
      ? {
          north: Math.max(...coords.map((l) => l.latitude!)),
          south: Math.min(...coords.map((l) => l.latitude!)),
          east: Math.max(...coords.map((l) => l.longitude!)),
          west: Math.min(...coords.map((l) => l.longitude!)),
        }
      : null;

  return NextResponse.json({
    data: {
      listings: enriched,
      total,
      page,
      pages: Math.ceil(total / limit),
      bounds,
    },
  });
}
