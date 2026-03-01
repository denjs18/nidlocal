import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const schema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { bookingId, rating, comment } = parsed.data;

    // Find booking that belongs to this user and is completed
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        status: "COMPLETED",
        guest: {
          user: {
            id: user.id,
          },
        },
      },
      include: {
        guest: true,
        review: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { code: "not_found", message: "Réservation introuvable ou non éligible à un avis" },
        { status: 404 }
      );
    }

    // Check no review already exists for this booking
    if (booking.review) {
      return NextResponse.json(
        { code: "already_reviewed", message: "Un avis a déjà été soumis pour cette réservation" },
        { status: 409 }
      );
    }

    const review = await db.review.create({
      data: {
        bookingId: booking.id,
        listingId: booking.listingId,
        guestId: booking.guestId,
        rating,
        comment,
      },
    });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[reviews/create]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
