import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().max(60).optional(),
  bio: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();

    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        guestProfile: {
          select: {
            id: true,
            bio: true,
            phone: true,
            avatar: true,
          },
        },
        hostProfile: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            phone: true,
            avatar: true,
            isVerified: true,
            rating: true,
            totalReviews: true,
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ code: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ data: userData });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, displayName, bio } = parsed.data;

    // Mise à jour en parallèle : user + profils existants
    await Promise.all([
      // Mettre à jour le nom de l'utilisateur si fourni
      name !== undefined
        ? db.user.update({ where: { id: user.id }, data: { name } })
        : Promise.resolve(),

      // Mettre à jour le profil hôte si présent (displayName + bio)
      displayName !== undefined || bio !== undefined
        ? db.hostProfile.updateMany({
            where: { userId: user.id },
            data: {
              ...(displayName !== undefined ? { displayName: displayName || null } : {}),
              ...(bio !== undefined ? { bio: bio || null } : {}),
            },
          })
        : Promise.resolve(),

      // Mettre à jour le profil voyageur si présent (bio seulement — pas de displayName)
      bio !== undefined
        ? db.guestProfile.updateMany({
            where: { userId: user.id },
            data: { bio: bio || null },
          })
        : Promise.resolve(),
    ]);

    // Retourner le profil mis à jour
    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        guestProfile: {
          select: {
            id: true,
            bio: true,
            phone: true,
            avatar: true,
          },
        },
        hostProfile: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            phone: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[api/account/profile PATCH]", err);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
