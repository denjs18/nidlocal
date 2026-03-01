import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";

const VALID_ROLES = Object.values(UserRole);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé. Rôle administrateur requis." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const body = await req.json();
    const { role } = body as { role?: string };

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        {
          error: `Rôle invalide. Valeurs acceptées : ${VALID_ROLES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id },
      data: { role: role as UserRole },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        isSuspended: true,
        suspendedAt: true,
        suspendReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }
    console.error("[ADMIN] PATCH /api/admin/users/[id]", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
