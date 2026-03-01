import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/session";
import { checkNightCap, calcTouristTax } from "@/lib/compliance/rules";
import { getStayType } from "@/lib/utils/formatting";

const schema = z.object({
  listingId: z.string().cuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(20),
});

const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? "0.10");
const SERVICE_FEE_RATE = 0.08; // 8% frais de service voyageur

export async function POST(req: NextRequest) {
  try {
    const user = await requireAnyRole("GUEST", "HOST");

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { listingId, checkIn, checkOut, guests } = parsed.data;
    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);

    if (ciDate >= coDate) {
      return NextResponse.json(
        { code: "validation_error", message: "La date de départ doit être après l'arrivée" },
        { status: 422 }
      );
    }

    const nights = Math.round((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24));

    // Récupérer l'annonce
    const listing = await db.listing.findUnique({
      where: { id: listingId, status: "PUBLISHED" },
      include: {
        commune: { include: { localRules: true } },
      },
    });

    if (!listing) {
      return NextResponse.json({ code: "not_found", message: "Logement introuvable" }, { status: 404 });
    }

    if (guests > listing.maxGuests) {
      return NextResponse.json({ code: "guests_exceeded", message: `Maximum ${listing.maxGuests} voyageurs` }, { status: 422 });
    }

    // Vérifier disponibilité
    const conflict = await db.booking.findFirst({
      where: {
        listingId,
        status: { in: ["CONFIRMED", "PENDING_REQUEST"] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
      },
    });
    if (conflict) {
      return NextResponse.json({ code: "dates_unavailable", message: "Ces dates ne sont pas disponibles" }, { status: 409 });
    }

    const blockedConflict = await db.blockedDate.findFirst({
      where: {
        listingId,
        date: { gte: ciDate, lt: coDate },
      },
    });
    if (blockedConflict) {
      return NextResponse.json({ code: "dates_unavailable", message: "Ces dates sont bloquées" }, { status: 409 });
    }

    // Vérifier plafond de nuits
    const capCheck = await checkNightCap(listingId, nights);
    if (!capCheck.allowed) {
      return NextResponse.json(
        {
          code: "night_cap_exceeded",
          message: `Ce logement a atteint son plafond annuel de nuitées. Il reste ${capCheck.remaining} nuit(s) disponible(s).`,
        },
        { status: 409 }
      );
    }

    // Calcul financier
    const nightsAmount = listing.pricePerNight * nights;
    const cleaningFee = listing.cleaningFee;
    const serviceFee = Math.round((nightsAmount + cleaningFee) * SERVICE_FEE_RATE);
    const touristTaxRates = listing.commune.localRules?.touristTaxRates as Record<string, number> | null;
    const touristTax = calcTouristTax(touristTaxRates, listing.residenceStatus, nights, guests);
    const totalAmount = nightsAmount + cleaningFee + serviceFee + touristTax;
    const stayType = getStayType(nights);

    // Récupérer le profil invité
    const guestProfile = await db.guestProfile.findUnique({
      where: { userId: user.id },
    });
    if (!guestProfile) {
      return NextResponse.json({ code: "forbidden", message: "Profil voyageur requis" }, { status: 403 });
    }

    const booking = await db.booking.create({
      data: {
        listingId,
        guestId: guestProfile.id,
        checkIn: ciDate,
        checkOut: coDate,
        nights,
        guests,
        stayType,
        status: listing.allowsInstantBook ? "CONFIRMED" : "PENDING_REQUEST",
        nightsAmount,
        cleaningFee,
        serviceFee,
        touristTax,
        totalAmount,
        ...(listing.allowsInstantBook ? { confirmedAt: new Date() } : {}),
      },
      select: { id: true, status: true, totalAmount: true, stayType: true, nights: true },
    });

    return NextResponse.json({
      data: {
        bookingId: booking.id,
        status: booking.status,
        breakdown: { nights, nightsAmount, cleaningFee, serviceFee, touristTax, totalAmount, stayType },
      },
    }, { status: 201 });

  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[bookings/create]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAnyRole("GUEST", "HOST");
    const guestProfile = await db.guestProfile.findUnique({ where: { userId: user.id } });
    if (!guestProfile) return NextResponse.json({ data: [] });

    const bookings = await db.booking.findMany({
      where: { guestId: guestProfile.id },
      include: {
        listing: {
          select: {
            id: true, title: true, city: true, checkInTime: true, checkOutTime: true, cancellationPolicy: true,
            photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
            host: { select: { displayName: true, avatar: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: bookings });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
