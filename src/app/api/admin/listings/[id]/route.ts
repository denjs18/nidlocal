import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { ListingStatus } from "@prisma/client";

const VALID_STATUSES = Object.values(ListingStatus);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé. Rôle administrateur requis." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });
    }

    const body = await req.json();
    const { status } = body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as ListingStatus)) {
      return NextResponse.json(
        {
          error: `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const targetStatus = status as ListingStatus;

    const updated = await db.listing.update({
      where: { id },
      data: {
        status: targetStatus,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    console.error("[ADMIN] PATCH /api/admin/listings/[id]", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
