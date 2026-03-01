import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

// Export CSV natif (sans dépendance lourde pour le CSV basique)
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] ?? "";
          const s = String(val).replace(/"/g, '""');
          return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
        })
        .join(";")
    ),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("MUNICIPALITY");
    const { searchParams } = req.nextUrl;
    const format = searchParams.get("format") ?? "csv";
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().getFullYear(), 0, 1);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const type = searchParams.get("type") ?? "listings";

    const muniUser = await db.municipalityUser.findUnique({ where: { userId: user.id } });
    if (!muniUser) return NextResponse.json({ code: "forbidden" }, { status: 403 });

    let rows: Record<string, unknown>[] = [];

    if (type === "listings") {
      const listings = await db.listing.findMany({
        where: { communeId: muniUser.communeId, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          listingType: true,
          residenceStatus: true,
          city: true,
          postalCode: true,
          registrationNumber: true,
          hasRegistration: true,
          maxGuests: true,
          pricePerNight: true,
          createdAt: true,
        },
      });
      rows = listings.map((l) => ({
        id: l.id,
        titre: l.title,
        type: l.listingType,
        statut_residence: l.residenceStatus,
        ville: l.city,
        code_postal: l.postalCode,
        n_enregistrement: l.registrationNumber ?? "",
        enregistrement_fourni: l.hasRegistration ? "oui" : "non",
        capacite_max: l.maxGuests,
        prix_nuit_eur: (l.pricePerNight / 100).toFixed(2),
        date_creation: l.createdAt.toISOString().slice(0, 10),
      }));
    } else if (type === "nights") {
      const bookings = await db.booking.findMany({
        where: {
          listing: { communeId: muniUser.communeId },
          status: "COMPLETED",
          checkIn: { gte: from },
          checkOut: { lte: to },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          nights: true,
          guests: true,
          touristTax: true,
          listing: { select: { listingType: true, residenceStatus: true, city: true, postalCode: true } },
        },
      });
      rows = bookings.map((b) => ({
        reservation_id: b.id,
        date_arrivee: b.checkIn.toISOString().slice(0, 10),
        date_depart: b.checkOut.toISOString().slice(0, 10),
        nb_nuits: b.nights,
        nb_voyageurs: b.guests,
        taxe_sejour_eur: (b.touristTax / 100).toFixed(2),
        type_logement: b.listing.listingType,
        statut_residence: b.listing.residenceStatus,
        ville: b.listing.city,
        code_postal: b.listing.postalCode,
      }));
    }

    const csvContent = toCSV(rows);
    const filename = `nidlocal-export-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ code: "forbidden" }, { status: 403 });
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
