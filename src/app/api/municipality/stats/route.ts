import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("MUNICIPALITY");
    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().getFullYear(), 0, 1);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

    // Récupérer la commune de l'agent
    const muniUser = await db.municipalityUser.findUnique({
      where: { userId: user.id },
      include: { commune: true },
    });

    if (!muniUser) {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }

    const communeId = muniUser.communeId;

    const [totalListings, byStatus, bookingsInPeriod] = await Promise.all([
      // Total annonces publiées
      db.listing.count({
        where: { communeId, status: "PUBLISHED" },
      }),

      // Répartition par statut de résidence
      db.listing.groupBy({
        by: ["residenceStatus"],
        where: { communeId, status: "PUBLISHED" },
        _count: true,
      }),

      // Réservations terminées sur la période
      db.booking.findMany({
        where: {
          listing: { communeId },
          status: "COMPLETED",
          checkIn: { gte: from },
          checkOut: { lte: to },
        },
        select: {
          nights: true,
          checkIn: true,
          guests: true,
          touristTax: true,
        },
      }),
    ]);

    // Agréger par mois
    const nightsByMonth: Record<string, number> = {};
    let totalNights = 0;
    for (const b of bookingsInPeriod) {
      const month = b.checkIn.toISOString().slice(0, 7); // "2025-03"
      nightsByMonth[month] = (nightsByMonth[month] ?? 0) + b.nights;
      totalNights += b.nights;
    }

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) {
      statusMap[s.residenceStatus] = s._count;
    }

    return NextResponse.json({
      data: {
        commune: { id: muniUser.commune.id, name: muniUser.commune.name },
        totalListings,
        byResidenceStatus: {
          primary: statusMap["PRIMARY"] ?? 0,
          secondary: statusMap["SECONDARY"] ?? 0,
          professional: statusMap["PROFESSIONAL"] ?? 0,
        },
        totalNights,
        nightsByMonth: Object.entries(nightsByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, nights]) => ({ month, nights })),
        totalTouristTax: bookingsInPeriod.reduce((acc, b) => acc + b.touristTax, 0),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ code: "forbidden" }, { status: 403 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
