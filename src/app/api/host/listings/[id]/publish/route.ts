import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";
import { checkListingCompliance } from "@/lib/compliance/rules";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAnyRole("HOST", "ADMIN");

    const hostProfile = await db.hostProfile.findUnique({ where: { userId: user.id } });

    const listing = await db.listing.findUnique({
      where: { id: params.id },
      select: { id: true, hostId: true, status: true, title: true, description: true, pricePerNight: true },
    });

    if (!listing) {
      return NextResponse.json({ code: "not_found" }, { status: 404 });
    }

    if (listing.hostId !== hostProfile?.id && user.role !== "ADMIN") {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }

    // Vérifier les champs minimaux requis
    const missingFields: string[] = [];
    if (!listing.title || listing.title.length < 10) missingFields.push("title");
    if (!listing.description || listing.description.length < 20) missingFields.push("description");
    if (!listing.pricePerNight || listing.pricePerNight === 0) missingFields.push("pricePerNight");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { code: "incomplete_listing", message: "Annonce incomplète", details: missingFields },
        { status: 422 }
      );
    }

    // Vérifier conformité locale
    const compliance = await checkListingCompliance(listing.id);
    if (!compliance.ok) {
      return NextResponse.json(
        { code: "missing_registration", message: compliance.errors[0], errors: compliance.errors },
        { status: 422 }
      );
    }

    await db.listing.update({
      where: { id: listing.id },
      data: { status: "PENDING_REVIEW", complianceStatus: "COMPLIANT" },
    });

    return NextResponse.json({ data: { status: "PENDING_REVIEW" } });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ code: err.message.toLowerCase() }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
